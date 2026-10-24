import { Linter } from 'eslint';
import * as parser from '@typescript-eslint/parser';
import { resolve } from 'node:path';
import plugin from '../index.js';

/**
 * `no-style-spread` recommends `mergeStyles(...)`, so the objects handed to it
 * must stay as linted as the spread they replace.
 */
describe('mergeStyles() arguments', () => {
  const linter = new Linter();
  // `tokens` there lists `#surface`, so other color tokens are unknown.
  const filename = resolve('test/fixtures/style-values/component.ts');
  const rules = [
    'valid-color-token',
    'known-property',
    'require-default-state',
    'no-style-spread',
  ];
  const config = [
    {
      files: ['**/*.ts'],
      languageOptions: { parser },
      plugins: { tasty: plugin },
      rules: Object.fromEntries(rules.map((rule) => [`tasty/${rule}`, 'warn'])),
    },
  ] as never;

  function check(code: string) {
    return linter
      .verify(code, config, { filename })
      .map(({ ruleId, messageId }) => `${ruleId}:${messageId}`);
  }

  it('lints every object argument, like a `Styles` declaration', () => {
    expect(
      check(`
        import { mergeStyles, type Styles } from '@tenphi/tasty';
        const BASE: Styles = { fill: '#surface' };
        export const A: Styles = mergeStyles(BASE, {
          fill: { '': '#no-such-color-token', hovered: '#surface' },
          color: '#another-missing-token',
          colour: '#surface',
          ...BASE,
        });
      `),
    ).toEqual([
      'tasty/valid-color-token:unknownToken',
      'tasty/valid-color-token:unknownToken',
      'tasty/known-property:unknownProperty',
      'tasty/no-style-spread:styleSpread',
    ]);
  });

  it('treats only the base as needing state-map defaults', () => {
    // An override's state map without '' extends the one below it.
    expect(
      check(`
        import { mergeStyles } from '@tenphi/tasty';
        mergeStyles({ fill: { hovered: '#surface' } }, { fill: { pressed: '#surface' } });
        mergeStyles(base, { fill: { hovered: '#surface' } }, { fill: { pressed: '#surface' } });
      `),
    ).toEqual(['tasty/require-default-state:missingDefaultState']);
  });

  it('lints arguments nested inside another style context', () => {
    expect(
      check(`
        import { tasty, mergeStyles } from '@tenphi/tasty';
        tasty({ styles: mergeStyles(base, { colour: '#surface' }) });
      `),
    ).toEqual(['tasty/known-property:unknownProperty']);
  });

  it.each(
    Object.entries({
      'an unrelated import': `import { mergeStyles } from 'unrelated'; mergeStyles(base, { colour: '#x' });`,
      'a shadowed import': `import { mergeStyles } from '@tenphi/tasty'; function f(mergeStyles) { mergeStyles(base, { colour: '#x' }); }`,
      'a local helper': `const mergeStyles = (...args) => args; mergeStyles(base, { colour: '#x' });`,
      'a nested non-argument object': `import { mergeStyles } from '@tenphi/tasty'; mergeStyles(base, pick({ colour: '#x' }));`,
    }),
  )('ignores %s', (_, code) => {
    expect(check(code)).toEqual([]);
  });
});

describe('local state aliases around mergeStyles()', () => {
  const linter = new Linter();
  // `states` there lists `@mobile`, so both alias rules are active.
  const filename = resolve('test/fixtures/style-functions/component.ts');
  const config = [
    {
      files: ['**/*.ts'],
      languageOptions: { parser },
      plugins: { tasty: plugin },
      rules: {
        'tasty/no-unknown-state-alias': 'error',
        'tasty/valid-state-key': 'error',
      },
    },
  ] as never;

  function check(code: string) {
    return linter
      .verify(code, config, { filename })
      .map(({ ruleId, message }) => `${ruleId}: ${message}`);
  }

  it('sees the enclosing styles from a sub-element mergeStyles() call', () => {
    expect(
      check(`
        import { mergeStyles, tasty } from '@tenphi/tasty';
        const BASE = { display: 'grid' };
        export const A = tasty({
          styles: {
            '@native-row': ':has(> a)',
            padding: { '': '1x', '@native-row': 0 },
            Icon: mergeStyles(BASE, {
              pointerEvents: { '': 'auto', '@native-row': 'none' },
              Glyph: { fill: { '': '#white', '@native-row': '#black' } },
            }),
          },
        });
      `),
    ).toEqual([]);
  });

  it('merges the aliases of every argument', () => {
    expect(
      check(`
        import { mergeStyles, tasty } from '@tenphi/tasty';
        tasty({
          styles: mergeStyles(
            { '@pinned': ':has(> [data-pinned])' },
            { fill: { '': '#white', '@pinned': '#black' } },
          ),
        });
      `),
    ).toEqual([]);
  });

  it('sees aliases of enclosing sub-elements, as Tasty does', () => {
    expect(
      check(`
        import { tasty } from '@tenphi/tasty';
        tasty({
          styles: {
            Row: {
              '@pinned': ':has(> [data-pinned])',
              Cell: { fill: { '': '#white', '@pinned': '#black' } },
            },
          },
        });
      `),
    ).toEqual([]);
  });

  it('still reports aliases defined only in a sibling or another call', () => {
    expect(
      check(`
        import { mergeStyles, tasty } from '@tenphi/tasty';
        tasty({
          styles: {
            Row: { '@pinned': ':has(> [data-pinned])' },
            Cell: { fill: { '': '#white', '@pinned': '#black' } },
            Icon: mergeStyles(base, { fill: { '': '#white', '@other': '#black' } }),
          },
        });
        mergeStyles({ '@other': ':hover' }, {});
      `).map((line) => line.split(':')[0]),
    ).toEqual([
      'tasty/no-unknown-state-alias',
      'tasty/valid-state-key',
      'tasty/no-unknown-state-alias',
      'tasty/valid-state-key',
    ]);
  });
});

describe('settings.tasty.mergeFunctions', () => {
  const linter = new Linter();
  const filename = resolve('test/fixtures/style-values/component.tsx');
  const rules = [
    'known-property',
    'require-default-state',
    'no-runtime-styles-mutation',
  ];

  function check(code: string, mergeFunctions?: unknown) {
    const config = [
      {
        files: ['**/*.tsx'],
        languageOptions: {
          parser,
          parserOptions: { ecmaFeatures: { jsx: true } },
        },
        plugins: { tasty: plugin },
        settings: { tasty: { mergeFunctions } },
        rules: Object.fromEntries(
          rules.map((rule) => [`tasty/${rule}`, 'warn']),
        ),
      },
    ] as never;
    return linter
      .verify(code, config, { filename })
      .map(({ ruleId, messageId }) => `${ruleId}:${messageId}`);
  }

  const helper = `
    import { mergeStyleLayers } from '../../utils/styles';
    function InlineInput({ styles, inputStyles, size }) {
      const mergedStyles = mergeStyleLayers(
        styles,
        inputStyles ? { Input: { paddding: '1x', fontSize: size } } : null,
      );
      return <Element styles={mergedStyles} />;
    }
  `;

  it('leaves project helpers alone by default', () => {
    expect(check(helper)).toEqual([]);
  });

  it('lints the object arguments of a listed helper, like mergeStyles', () => {
    expect(check(helper, ['mergeStyleLayers'])).toEqual([
      'tasty/known-property:unknownProperty',
      'tasty/no-runtime-styles-mutation:dynamicStyleValue',
    ]);
  });

  it('treats only the first argument as the base', () => {
    expect(
      check(
        `
          import { mergeStyleLayers } from './styles';
          mergeStyleLayers({ fill: { hovered: '#surface' } }, { fill: { pressed: '#surface' } });
        `,
        ['mergeStyleLayers'],
      ),
    ).toEqual(['tasty/require-default-state:missingDefaultState']);
  });

  it.each(
    Object.entries({
      'an aliased import': `import { mergeStyleLayers as merge } from './styles'; merge(base, { colour: '#surface' });`,
      'a default import': `import mergeStyleLayers from './styles'; mergeStyleLayers(base, { colour: '#surface' });`,
      'a local declaration': `function mergeStyleLayers(...layers) { return layers; } mergeStyleLayers(base, { colour: '#surface' });`,
      'a local const': `const mergeStyleLayers = (...layers) => layers; mergeStyleLayers(base, { colour: '#surface' });`,
    }),
  )('recognizes %s', (_, code) => {
    expect(check(code, ['mergeStyleLayers'])).toEqual([
      'tasty/known-property:unknownProperty',
    ]);
  });

  it.each(
    Object.entries({
      'an unlisted helper': `import { mergeOther } from './styles'; mergeOther(base, { colour: '#surface' });`,
      'a shadowing parameter': `import { mergeStyleLayers } from './styles'; function f(mergeStyleLayers) { mergeStyleLayers(base, { colour: '#surface' }); }`,
      'a type-only import': `import type { mergeStyleLayers } from './styles'; mergeStyleLayers(base, { colour: '#surface' });`,
      'a nested non-argument object': `import { mergeStyleLayers } from './styles'; mergeStyleLayers(base, pick({ colour: '#surface' }));`,
    }),
  )('ignores %s', (_, code) => {
    expect(check(code, ['mergeStyleLayers'])).toEqual([]);
  });

  it.each([['mergeStyleLayers'], [['mergeStyleLayers', 1]], [{}]])(
    'rejects an invalid setting: %j',
    (mergeFunctions) => {
      expect(() =>
        check(`mergeStyleLayers(base, {});`, mergeFunctions),
      ).toThrow('tasty: mergeFunctions must be an array of function names.');
    },
  );
});
