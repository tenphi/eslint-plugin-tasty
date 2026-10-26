import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from './config.js';
import type { TastyValidationConfig } from './types.js';
import { version } from './version.js';

const roots: string[] = [];
function project() {
  const root = mkdtempSync(join(tmpdir(), 'tasty-style-functions-'));
  roots.push(root);
  writeFileSync(join(root, 'package.json'), '{}');
  return root;
}
function writeConfig(path: string, config: TastyValidationConfig | unknown) {
  writeFileSync(path, JSON.stringify(config));
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function warnings() {
  return vi.spyOn(console, 'warn').mockImplementation(() => undefined);
}

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

describe('requires', () => {
  it('loads a config whose range the installed plugin satisfies', () => {
    const root = project();
    writeConfig(join(root, 'tasty.config.json'), {
      requires: `>=${version}`,
      tokens: ['#brand'],
    });
    expect(loadConfig(join(root, 'component.ts')).tokens).toEqual(['#brand']);
  });

  it('fails naming the config, the range and the installed version', () => {
    const root = project();
    const path = join(root, 'tasty.config.json');
    writeConfig(path, { requires: '>=99.0.0' });
    expect(() => loadConfig(join(root, 'component.ts'))).toThrow(
      `tasty: ${path} requires @tenphi/eslint-plugin-tasty >=99.0.0, but ${version} is installed. Upgrade the plugin.`,
    );
  });

  it('checks every config in the extends chain', () => {
    const root = project();
    const base = join(root, 'base.json');
    writeConfig(base, { requires: '^0.1.0' });
    writeConfig(join(root, 'tasty.config.json'), {
      extends: './base.json',
      requires: `>=${version}`,
    });
    expect(() => loadConfig(join(root, 'component.ts'))).toThrow(
      `tasty: ${base} requires @tenphi/eslint-plugin-tasty ^0.1.0`,
    );
  });

  it('rejects a value that is not a semver range', () => {
    for (const requires of ['soon', '', '  ', 113, ['>=1.0.0']]) {
      const root = project();
      writeConfig(join(root, 'tasty.config.json'), { requires });
      expect(() => loadConfig(join(root, 'component.ts'))).toThrow(
        "'requires' must be a semver range",
      );
    }
  });
});

describe('config warnings', () => {
  it('lists unknown keys once per config, but not the VS Code extension keys', () => {
    const warn = warnings();
    const root = project();
    const path = join(root, 'tasty.config.json');
    writeConfig(path, {
      tokens: ['#brand'],
      protectedComponent: [],
      futureKey: true,
      presetDescriptions: { h1: 'Heading' },
      stateDescriptions: { '@dark': 'Dark theme' },
    });
    expect(loadConfig(join(root, 'component.ts')).tokens).toEqual(['#brand']);
    expect(warn.mock.calls).toEqual([
      [
        `[eslint-plugin-tasty] ${path}: ignoring unknown keys 'protectedComponent', 'futureKey'. Check the spelling, or upgrade @tenphi/eslint-plugin-tasty (${version} is installed) if the config was written for a newer version.`,
      ],
    ]);

    // A reload of the same config says nothing new.
    utimesSync(path, new Date(), new Date(Date.now() + 1000));
    loadConfig(join(root, 'component.ts'));
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('warns when extends names nothing usable, and ignores it', () => {
    const warn = warnings();
    const cases: [unknown, string][] = [
      [['./base.json'], `not ["./base.json"]`],
      ['@my-org/missing', "names '@my-org/missing', which cannot be resolved"],
      ['@my-org/plain', "names '@my-org/plain', which has no tasty.config.*"],
    ];
    for (const [target, message] of cases) {
      const root = project();
      const pkg = join(root, 'node_modules/@my-org/plain');
      mkdirSync(pkg, { recursive: true });
      writeFileSync(join(pkg, 'package.json'), '{}');
      writeConfig(join(root, 'tasty.config.json'), {
        extends: target,
        tokens: ['#brand'],
      });
      expect(loadConfig(join(root, 'component.ts')).tokens).toEqual(['#brand']);
      expect(warn.mock.lastCall?.[0]).toContain(message);
    }
    expect(warn).toHaveBeenCalledTimes(cases.length);
  });

  it('fails when a relative extends is not a file, until it is created', () => {
    const root = project();
    writeConfig(join(root, 'tasty.config.json'), {
      extends: './missing.json',
      tokens: ['#brand'],
    });
    const failure = () => {
      try {
        loadConfig(join(root, 'component.ts'));
      } catch (error) {
        return error;
      }
    };
    const first = failure();
    expect(first).toBeInstanceOf(Error);
    expect((first as Error).message).toBe(
      `tasty: ${join(root, 'tasty.config.json')}: 'extends' points to ${join(root, 'missing.json')}, which is not a file.`,
    );
    // The failure is cached rather than reloaded for every rule and file.
    expect(failure()).toBe(first);

    writeConfig(join(root, 'missing.json'), { units: ['cols'] });
    const config = loadConfig(join(root, 'component.ts'));
    expect([config.tokens, config.units]).toEqual([['#brand'], ['cols']]);
  });

  it('resolves an extends that names a file inside a package', () => {
    const warn = warnings();
    const extend = (target: string) => {
      const root = project();
      const pkg = join(root, 'node_modules/@my-org/ui');
      mkdirSync(join(pkg, 'lint/strict'), { recursive: true });
      writeFileSync(join(pkg, 'package.json'), '{}');
      writeConfig(join(pkg, 'lint/tasty.json'), { tokens: ['#file'] });
      writeConfig(join(pkg, 'lint/strict/tasty.config.json'), {
        tokens: ['#dir'],
      });
      writeConfig(join(root, 'tasty.config.json'), { extends: target });
      return { pkg, tokens: loadConfig(join(root, 'component.ts')).tokens };
    };
    expect(extend('@my-org/ui/lint/tasty.json').tokens).toEqual(['#file']);
    expect(extend('@my-org/ui/lint/tasty').tokens).toEqual(['#file']);
    expect(extend('@my-org/ui/lint/strict').tokens).toEqual(['#dir']);
    expect(warn).not.toHaveBeenCalled();
    const { pkg, tokens } = extend('@my-org/ui/lint/missing');
    expect(tokens).toEqual([]);
    expect(warn.mock.lastCall?.[0]).toContain(
      `but ${join(pkg, 'lint/missing')} is not a config file`,
    );
  });

  it('warns about an extends cycle', () => {
    const warn = warnings();
    const root = project();
    const base = join(root, 'base.json');
    writeConfig(base, { extends: './tasty.config.json', units: ['cols'] });
    writeConfig(join(root, 'tasty.config.json'), {
      extends: './base.json',
      tokens: ['#brand'],
    });
    const config = loadConfig(join(root, 'component.ts'));
    expect([config.tokens, config.units]).toEqual([['#brand'], ['cols']]);
    expect(warn.mock.lastCall?.[0]).toContain(
      `${join(root, 'tasty.config.json')} is extended again by its own extends chain`,
    );
  });

  it('ignores a config that is not an object', () => {
    const warn = warnings();
    const root = project();
    writeConfig(join(root, 'tasty.config.json'), ['#brand']);
    expect(loadConfig(join(root, 'component.ts')).tokens).toEqual([]);
    expect(warn.mock.lastCall?.[0]).toContain('the config must be an object');
  });
});
