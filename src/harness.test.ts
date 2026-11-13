/**
 * The agent harness in `harness/`: the manifest, the hook, the always-on rule,
 * and what `tasty-lint:check` and the `check-edit` hook compute. The lint logic
 * runs against the source plugin, so most tests need no build. The CLI tests run
 * only once `dist/` exists, as they do in CI after `pnpm build`.
 */
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import * as tsParser from '@typescript-eslint/parser';
import { ESLint } from 'eslint';

import {
  collectProblems,
  createLinter,
  formatProblems,
  importsFrom,
  isLintable,
  newProblems,
  summarize,
} from '../harness/dev.harnesspm/scripts/lint.mjs';
import { recommended, strict } from './configs';
import plugin from './index';

const ROOT = join(__dirname, '..');
const HARNESS = join(ROOT, 'harness');
const FIXTURES = join(ROOT, 'test/fixtures/harness');

interface Problem {
  file: string;
  line: number;
  column: number;
  rule: string | null;
  severity: 'error' | 'warning';
  message: string;
}

async function lint(
  code: string,
  file = 'Card.tsx',
  rules = recommended,
): Promise<Problem[]> {
  const eslint = createLinter({
    ESLint,
    plugin,
    rules,
    parser: tsParser,
    cwd: FIXTURES,
  });
  const results = await eslint.lintText(code, {
    filePath: join(FIXTURES, file),
  });
  return collectProblems(results, FIXTURES).problems;
}

const card = (styles: string) =>
  `import { tasty } from '@tenphi/tasty';\n\nexport const Card = tasty({\n  styles: ${styles},\n});\n`;

describe('tasty-lint lint logic', () => {
  it('reports only tasty/* problems, with their place', async () => {
    const problems = await lint(
      readFileSync(join(FIXTURES, 'Card.tsx'), 'utf8'),
    );

    expect(problems).toEqual([
      expect.objectContaining({
        file: 'Card.tsx',
        line: 5,
        column: 11,
        rule: 'tasty/no-raw-color-values',
        severity: 'warning',
      }),
      expect.objectContaining({
        line: 7,
        rule: 'tasty/valid-preset',
        severity: 'error',
      }),
    ]);
  });

  it('runs the strict-only rules with the strict preset', async () => {
    const code = card(`{ padding: '$spacign' }`);

    expect(await lint(code)).toEqual([]);
    expect((await lint(code, 'Card.tsx', strict)).map((p) => p.rule)).toEqual([
      'tasty/valid-custom-property',
    ]);
  });

  it('honors disable comments for its rules and ignores those for other plugins', async () => {
    const code = card(`{
    // eslint-disable-next-line tasty/no-raw-color-values -- brand color
    fill: '#ff0000',
    // eslint-disable-next-line react-hooks/exhaustive-deps
    color: '#text',
  }`);

    expect(await lint(code)).toEqual([]);
  });

  it('parses JSX in JavaScript files without the TypeScript parser', async () => {
    const eslint = createLinter({
      ESLint,
      plugin,
      rules: recommended,
      cwd: FIXTURES,
    });
    const results = await eslint.lintText(
      readFileSync(join(FIXTURES, 'Kit.jsx'), 'utf8'),
      { filePath: join(FIXTURES, 'Kit.jsx') },
    );

    // `@acme/ui` is in the fixture's importSources.
    expect(
      collectProblems(results, FIXTURES).problems.map((p) => p.rule),
    ).toEqual(['tasty/no-styles-prop', 'tasty/valid-color-token']);
  });

  it('keeps parse errors and the files ESLint skipped', () => {
    const { problems, skipped } = collectProblems(
      [
        {
          filePath: join(FIXTURES, 'a.tsx'),
          messages: [
            {
              ruleId: null,
              fatal: true,
              severity: 2,
              line: 1,
              column: 5,
              message: 'Parsing error: x',
            },
            {
              ruleId: 'no-console',
              severity: 2,
              line: 2,
              column: 1,
              message: 'other plugin',
            },
          ],
        },
        {
          filePath: join(FIXTURES, 'b.tsx'),
          messages: [
            { ruleId: null, severity: 1, message: 'File ignored by default.' },
          ],
        },
      ],
      FIXTURES,
    );

    expect(problems).toEqual([
      {
        file: 'a.tsx',
        line: 1,
        column: 5,
        rule: null,
        severity: 'error',
        message: 'Parsing error: x',
      },
    ]);
    expect(skipped).toEqual([
      { file: 'b.tsx', reason: 'File ignored by default.' },
    ]);
  });

  it('keeps only the problems an edit added, also when lines moved', async () => {
    // A problem matches by the text of its line, so each property gets its own.
    const before = card(`{\n    fill: '#ff0000',\n    preset: 't3',\n  }`);
    const after = `// A new first line moves every problem down.\n${card(`{\n    fill: '#ff0000',\n    preset: 'h9',\n  }`)}`;

    const added = newProblems(
      await lint(after),
      after,
      await lint(before),
      before,
    );

    expect(added.map((p: Problem) => p.rule)).toEqual(['tasty/valid-preset']);
  });

  it('prints one line per problem and the page of each rule', () => {
    const problems: Problem[] = [
      {
        file: 'src/Card.tsx',
        line: 5,
        column: 11,
        rule: 'tasty/no-raw-color-values',
        severity: 'warning',
        message: 'Use a token.',
      },
      {
        file: 'src/Card.tsx',
        line: 9,
        column: 3,
        rule: 'tasty/no-raw-color-values',
        severity: 'warning',
        message: 'Use a token.',
      },
      {
        file: 'src/Card.tsx',
        line: 1,
        column: 1,
        rule: null,
        severity: 'error',
        message: 'Parsing error: x',
      },
    ];

    expect(
      formatProblems(problems, (name: string) => `docs/rules/${name}.md`),
    ).toBe(
      [
        'src/Card.tsx:5:11  tasty/no-raw-color-values  Use a token.',
        'src/Card.tsx:9:3  tasty/no-raw-color-values  Use a token.',
        'src/Card.tsx:1:1  parse error  Parsing error: x',
        '',
        'Rule pages:',
        '  tasty/no-raw-color-values  docs/rules/no-raw-color-values.md',
      ].join('\n'),
    );
    expect(summarize(problems)).toBe('3 problems (1 error, 2 warnings)');
  });

  it('tells Tasty imports from other text before anything is parsed', () => {
    expect(importsFrom(`import { tasty } from '@tenphi/tasty';`)).toBe(true);
    expect(
      importsFrom(`import { tastyStatic } from "@tenphi/tasty/static";`),
    ).toBe(true);
    expect(
      importsFrom(`import { Button } from '@acme/ui/button';`, ['@acme/ui']),
    ).toBe(true);
    expect(
      importsFrom(`import { Button } from '@acme/uikit';`, ['@acme/ui']),
    ).toBe(false);
    expect(importsFrom(`const tasty = 1; // @tenphi/tasty`)).toBe(false);
  });

  it('lints JavaScript and TypeScript sources, not declarations', () => {
    for (const file of [
      'a.ts',
      'a.tsx',
      'a.js',
      'a.jsx',
      'a.mts',
      'a.cts',
      'a.mjs',
      'a.cjs',
    ]) {
      expect(isLintable(file), file).toBe(true);
    }
    for (const file of ['a.d.ts', 'a.d.mts', 'a.css', 'a.md', 'a.json']) {
      expect(isLintable(file), file).toBe(false);
    }
  });
});

describe('harness files', () => {
  const plugin = JSON.parse(
    readFileSync(join(HARNESS, 'plugin.json'), 'utf8'),
  ) as {
    name: string;
    extensions: {
      'dev.harnesspm': {
        docs: string;
        scripts: Record<
          string,
          { file: string; description?: string; allow?: boolean }
        >;
      };
    };
  };
  const ext = plugin.extensions['dev.harnesspm'];

  it('names the plugin tasty-lint and points at the rule docs', () => {
    expect(plugin.name).toBe('tasty-lint');
    expect(existsSync(join(HARNESS, ext.docs, 'rules'))).toBe(true);
  });

  it('points every script at a file, and offers only check to agents', () => {
    for (const script of Object.values(ext.scripts)) {
      expect(existsSync(join(HARNESS, script.file))).toBe(true);
    }
    expect(ext.scripts.check).toMatchObject({ allow: true });
    expect(ext.scripts.check.description).toBeTruthy();
    // Without a description, a script is for hooks only.
    expect(ext.scripts['check-edit'].description).toBeUndefined();
  });

  it('runs the check-edit hook after Claude Code edits a file', () => {
    const { hooks } = JSON.parse(
      readFileSync(join(HARNESS, 'dev.harnesspm/hooks.json'), 'utf8'),
    );

    expect(hooks).toEqual({
      PostToolUse: [
        {
          id: 'check-edit',
          // Codex's apply_patch gives patch text, not a file path.
          matcher: { claude: 'Edit|Write|MultiEdit' },
          run: 'check-edit',
          timeout: 30,
        },
      ],
    });
  });

  it('keeps the always-on rule short, since every consumer pays for it', () => {
    const rule = readFileSync(
      join(HARNESS, 'dev.harnesspm/rules/usage.md'),
      'utf8',
    );

    expect(Buffer.byteLength(rule)).toBeLessThanOrEqual(400);
    // Sections a consumer can patch one by one.
    expect(rule.match(/^## /gm)?.length).toBeGreaterThanOrEqual(2);
    expect(rule).toContain('tasty-lint:check');
  });
});

const BUILD = join(ROOT, 'dist/index.js');

describe.runIf(existsSync(BUILD))('tasty-lint CLI (needs pnpm build)', () => {
  const scripts = join(HARNESS, 'dev.harnesspm/scripts');
  const node = (
    script: string,
    args: string[],
    {
      cwd = FIXTURES,
      project = cwd,
      input,
    }: { cwd?: string; project?: string; input?: string } = {},
  ) =>
    spawnSync(process.execPath, [join(scripts, script), ...args], {
      cwd,
      input,
      encoding: 'utf8',
      env: { ...process.env, HARNESSPM_PROJECT_DIR: project },
    });
  const hook = (payload: object, cwd = FIXTURES) =>
    node('check-edit.mjs', [], {
      cwd,
      input: JSON.stringify({ cwd, ...payload }),
    });

  describe('check', () => {
    it('prints each problem and its page, and fails on errors', () => {
      const run = node('check.mjs', ['Card.tsx', 'Clean.tsx']);

      expect(run.status).toBe(1);
      expect(run.stdout).toContain(
        'Card.tsx:5:11  tasty/no-raw-color-values  Use a color token',
      );
      expect(run.stdout).toContain('Card.tsx:7:13  tasty/valid-preset');
      expect(run.stdout).toMatch(
        /tasty\/valid-preset {2}\S*docs\/rules\/valid-preset\.md/,
      );
      expect(run.stdout).toContain(
        '2 problems (1 error, 1 warning) in 2 files (recommended rules).',
      );
    });

    it('passes a clean file, and warnings alone', () => {
      expect(node('check.mjs', ['Clean.tsx']).stdout).toContain(
        'No tasty/* problems in 1 file (recommended rules).',
      );
      expect(node('check.mjs', ['Kit.jsx', '--strict']).status).toBe(1);
    });

    it('prints JSON', () => {
      const result = JSON.parse(
        node('check.mjs', ['Card.tsx', '--json']).stdout,
      );

      expect(result.preset).toBe('recommended');
      expect(result.problems[1]).toMatchObject({
        rule: 'tasty/valid-preset',
        severity: 'error',
        page: expect.stringMatching(/docs\/rules\/valid-preset\.md$/),
      });
    });

    it('fails clearly on a missing file or option', () => {
      const missing = node('check.mjs', ['Nope.tsx']);
      expect(missing.status).toBe(2);
      expect(missing.stderr).toContain('cannot find Nope.tsx');
      expect(node('check.mjs', ['Card.tsx', '--fix']).status).toBe(2);
    });

    it('reads a path from the project root when the shell is elsewhere', () => {
      // An agent's shell may have moved, such as into node_modules.
      const run = node('check.mjs', ['Card.tsx'], {
        cwd: ROOT,
        project: FIXTURES,
      });

      expect(run.stdout).toContain('Card.tsx:7:13  tasty/valid-preset');
      expect(run.stdout).not.toContain('Skipped');
    });

    it('does not pass when nothing was linted', () => {
      const run = node('check.mjs', ['package.json']);

      expect(run.status).toBe(2);
      expect(run.stdout).toContain('Nothing linted in package.json.');
      expect(run.stdout).toContain('Skipped package.json');
    });
  });

  describe('check-edit hook', () => {
    it('hands the problems of an edited Tasty file back with exit 2', () => {
      const run = hook({
        tool_name: 'Edit',
        tool_input: { file_path: 'Card.tsx' },
      });

      expect(run.status).toBe(2);
      expect(run.stdout).toBe('');
      expect(run.stderr).toContain('2 Tasty lint problems in Card.tsx');
      expect(run.stderr).toContain('Card.tsx:7:13  tasty/valid-preset');
      expect(run.stderr).toContain('eslint-disable-next-line tasty/<rule>');
    });

    it('prints paths from the project root, wherever the shell is', () => {
      const run = node('check-edit.mjs', [], {
        cwd: ROOT,
        project: FIXTURES,
        input: JSON.stringify({
          cwd: join(ROOT, 'node_modules'),
          tool_input: { file_path: join(FIXTURES, 'Card.tsx') },
        }),
      });

      expect(run.stderr).toContain('Card.tsx:7:13  tasty/valid-preset');
      expect(run.stderr).toContain(
        '  tasty/valid-preset  ../../../docs/rules/valid-preset.md',
      );
    });

    it('lints a file that imports only a configured import source', () => {
      expect(
        hook({ tool_input: { file_path: join(FIXTURES, 'Kit.jsx') } }).status,
      ).toBe(2);
    });

    it('stays silent on clean files, other files and problems the file had before', () => {
      const silent = (payload: object) => {
        const run = hook(payload);
        expect(run.status, JSON.stringify(payload)).toBe(0);
        expect(run.stderr).toBe('');
      };
      const card = readFileSync(join(FIXTURES, 'Card.tsx'), 'utf8');

      silent({ tool_input: { file_path: 'Clean.tsx' } });
      silent({ tool_input: { file_path: 'plain.ts' } });
      silent({ tool_input: { file_path: 'package.json' } });
      silent({ tool_input: { file_path: 'Missing.tsx' } });
      silent({ tool_input: {} });
      silent({
        tool_input: { file_path: 'Card.tsx' },
        tool_response: { originalFile: `// before\n${card}` },
      });
    });
  });

  describe('without a TypeScript parser in the project', () => {
    let dir: string;

    beforeAll(() => {
      dir = realpathSync(mkdtempSync(join(tmpdir(), 'tasty-lint-')));
      writeFileSync(join(dir, 'package.json'), '{"name":"app"}');
      writeFileSync(
        join(dir, 'Card.tsx'),
        "import { tasty } from '@tenphi/tasty';\nexport const Card = tasty({ styles: { fill: '#ff0000' } });\n",
      );
    });

    afterAll(() => rmSync(dir, { recursive: true, force: true }));

    it('says what to install', () => {
      const check = node('check.mjs', ['Card.tsx'], { cwd: dir });
      expect(check.status).toBe(2);
      expect(check.stderr).toContain('Install typescript-eslint');

      // A hook reports a setup problem to the person, not to the agent.
      const edit = hook({ tool_input: { file_path: 'Card.tsx' } }, dir);
      expect(edit.status).toBe(1);
      expect(edit.stderr).toContain('Install typescript-eslint');
    });
  });
});
