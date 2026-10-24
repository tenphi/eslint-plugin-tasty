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

describe('protectedComponents configuration', () => {
  const ui = { source: '@my-org/ui', exclude: ['Text'] };
  const icons = { source: '@my-org/icons', allowedStyleProps: ['position'] };

  it('defaults to an empty list', () => {
    expect(
      loadConfig(join(project(), 'component.ts')).protectedComponents,
    ).toEqual([]);
  });

  it('appends entries along the extends chain, and false drops inherited ones', () => {
    const root = project();
    mkdirSync(join(root, 'src'));
    writeConfig(join(root, 'base.json'), { protectedComponents: [ui] });
    writeConfig(join(root, 'tasty.config.json'), {
      extends: './base.json',
      protectedComponents: [icons],
    });
    expect(loadConfig(join(root, 'component.ts')).protectedComponents).toEqual([
      ui,
      icons,
    ]);

    writeConfig(join(root, 'src/tasty.config.json'), {
      protectedComponents: false,
    });
    expect(
      loadConfig(join(root, 'src/component.ts')).protectedComponents,
    ).toEqual([]);
  });
});
