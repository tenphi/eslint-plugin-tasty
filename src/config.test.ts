import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';
import type { TastyValidationConfig } from './types.js';

const roots: string[] = [];
function project() {
  const root = mkdtempSync(join(tmpdir(), 'tasty-style-functions-'));
  roots.push(root);
  writeFileSync(join(root, 'package.json'), '{}');
  return root;
}
function writeConfig(path: string, config: TastyValidationConfig) {
  writeFileSync(path, JSON.stringify(config));
}

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe('styleFunctions configuration', () => {
  it('defaults to an empty map', () => {
    expect(loadConfig(join(project(), 'component.ts')).styleFunctions).toEqual(
      {},
    );
  });

  it('merges extends and directory configs by name, replacing entire signatures', () => {
    const root = project();
    mkdirSync(join(root, 'src'));
    writeConfig(join(root, 'base.json'), {
      styleFunctions: {
        defineComponent: { argument: 0, kind: 'options', partial: true },
        mergeStyles: { argument: 'all', kind: 'styles', partial: true },
      },
    });
    writeConfig(join(root, 'tasty.config.json'), {
      extends: './base.json',
      importSources: ['@my-org/styling'],
      styleFunctions: {
        defineComponent: { argument: 1, kind: 'options' },
      },
    });
    writeConfig(join(root, 'src/tasty.config.json'), {
      styleFunctions: {
        resolveComponentStyles: { argument: 1, kind: 'styles' },
      },
    });

    const resolved = loadConfig(join(root, 'src/component.ts'));
    expect(resolved.importSources).toContain('@my-org/styling');
    expect(resolved.styleFunctions).toEqual({
      defineComponent: { argument: 1, kind: 'options' },
      mergeStyles: { argument: 'all', kind: 'styles', partial: true },
      resolveComponentStyles: { argument: 1, kind: 'styles' },
    });
  });
});
