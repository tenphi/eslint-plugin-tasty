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
