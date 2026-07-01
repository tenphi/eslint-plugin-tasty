import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { recommended, strict } from './index.js';

/**
 * End-to-end conformance test that runs the *built* plugin through the real
 * `oxlint` binary via its JS-plugins runtime. This guards Oxlint compatibility:
 * the plugin must load and every rule must run under Oxlint, not just ESLint.
 *
 * Oxlint loads plugins as JavaScript, so it needs `dist/index.js`. The suite
 * rebuilds automatically when `dist` is missing or older than the sources.
 */

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, '..');
const distEntry = join(repoRoot, 'dist', 'index.js');
const oxlintBin = join(
  repoRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'oxlint.cmd' : 'oxlint',
);

function newestSourceMtime(dir: string): number {
  let newest = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      newest = Math.max(newest, newestSourceMtime(full));
    } else if (entry.isFile() && !entry.name.endsWith('.test.ts')) {
      newest = Math.max(newest, statSync(full).mtimeMs);
    }
  }
  return newest;
}

function ensureBuilt(): void {
  const stale =
    !existsSync(distEntry) ||
    statSync(distEntry).mtimeMs < newestSourceMtime(join(repoRoot, 'src'));
  if (stale) {
    execFileSync('pnpm', ['build'], { cwd: repoRoot, stdio: 'inherit' });
  }
}

interface Diagnostic {
  code: string;
  severity: string;
  filename: string;
  labels: { span: { line: number; column: number } }[];
}

/** Runs oxlint over a directory and returns the parsed JSON diagnostics. */
function runOxlint(dir: string, configPath: string): Diagnostic[] {
  let stdout: string;
  try {
    stdout = execFileSync(oxlintBin, ['-c', configPath, '--format=json', '.'], {
      cwd: dir,
      encoding: 'utf8',
    });
  } catch (error) {
    // oxlint exits non-zero when it reports errors; diagnostics are on stdout.
    const err = error as { stdout?: string };
    if (typeof err.stdout !== 'string') throw error;
    stdout = err.stdout;
  }
  return (JSON.parse(stdout).diagnostics ?? []) as Diagnostic[];
}

/** Maps `tasty(rule-name)` diagnostic codes to the plain rule name. */
function ruleName(code: string): string {
  const match = /^tasty\(([^)]+)\)$/.exec(code);
  return match ? match[1] : code;
}

describe('oxlint conformance', () => {
  let tempDir: string;
  let diagnosticsByFile: Map<string, Set<string>>;

  beforeAll(() => {
    ensureBuilt();

    tempDir = mkdtempSync(join(tmpdir(), 'tasty-oxlint-'));

    const fixtures: Record<string, string> = {
      'known-property.tsx': [
        `import { tasty } from '@tenphi/tasty';`,
        `export const C = tasty({ styles: { pading: '1x' } });`,
      ].join('\n'),

      'no-important.tsx': [
        `import { tasty } from '@tenphi/tasty';`,
        `export const C = tasty({ styles: { padding: '1x !important' } });`,
      ].join('\n'),

      'nested-selector.tsx': [
        `import { tasty } from '@tenphi/tasty';`,
        `export const C = tasty({ styles: { '&:hover': { color: '#fff' } } });`,
      ].join('\n'),

      'prefer-shorthand.tsx': [
        `import { tasty } from '@tenphi/tasty';`,
        `export const C = tasty({ styles: { boxShadow: '0 0 0 1px' } });`,
      ].join('\n'),

      // TypeScript `satisfies` form — exercises TS-specific AST selectors.
      'satisfies.tsx': [
        `import type { Styles } from '@tenphi/tasty';`,
        `export const buttonStyles = { padding: '1x !important' } satisfies Styles;`,
      ].join('\n'),

      // Valid styles — must produce zero tasty diagnostics (no false positives).
      'clean.tsx': [
        `import { tasty } from '@tenphi/tasty';`,
        `export const C = tasty({ styles: { padding: '1x', radius: '1r' } });`,
      ].join('\n'),
    };

    for (const [name, source] of Object.entries(fixtures)) {
      writeFileSync(join(tempDir, name), source + '\n');
    }

    // Enable the full strict ruleset so every rule must load and run under
    // Oxlint. Built-in Oxlint rules are silenced to isolate tasty diagnostics.
    const config = {
      plugins: [],
      categories: { correctness: 'off' as const },
      jsPlugins: [{ name: 'tasty', specifier: distEntry }],
      rules: { ...strict },
    };
    const configPath = join(tempDir, '.oxlintrc.json');
    writeFileSync(configPath, JSON.stringify(config, null, 2));

    const diagnostics = runOxlint(tempDir, configPath);

    diagnosticsByFile = new Map();
    for (const diagnostic of diagnostics) {
      const rules =
        diagnosticsByFile.get(diagnostic.filename) ?? new Set<string>();
      rules.add(ruleName(diagnostic.code));
      diagnosticsByFile.set(diagnostic.filename, rules);
    }
  });

  afterAll(() => {
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  });

  it('loads the plugin and runs its rules under Oxlint', () => {
    // If the plugin failed to load, Oxlint silently drops every rule and no
    // tasty diagnostics appear at all.
    const allRules = new Set<string>();
    for (const rules of diagnosticsByFile.values()) {
      for (const rule of rules) allRules.add(rule);
    }
    expect(allRules.size).toBeGreaterThan(0);
  });

  it('flags unknown properties (known-property)', () => {
    expect(diagnosticsByFile.get('known-property.tsx')).toContain(
      'known-property',
    );
  });

  it('flags !important (no-important + valid-value)', () => {
    const rules = diagnosticsByFile.get('no-important.tsx');
    expect(rules).toContain('no-important');
    expect(rules).toContain('valid-value');
  });

  it('flags nested selectors (no-nested-selector)', () => {
    expect(diagnosticsByFile.get('nested-selector.tsx')).toContain(
      'no-nested-selector',
    );
  });

  it('flags native CSS properties (prefer-shorthand-property)', () => {
    expect(diagnosticsByFile.get('prefer-shorthand.tsx')).toContain(
      'prefer-shorthand-property',
    );
  });

  it('detects style objects declared with `satisfies Styles`', () => {
    expect(diagnosticsByFile.get('satisfies.tsx')).toContain('no-important');
  });

  it('produces no diagnostics for valid styles (no false positives)', () => {
    expect(diagnosticsByFile.get('clean.tsx')).toBeUndefined();
  });

  it('keeps `recommended` a subset of `strict`', () => {
    for (const rule of Object.keys(recommended)) {
      expect(strict).toHaveProperty(rule);
    }
  });
});
