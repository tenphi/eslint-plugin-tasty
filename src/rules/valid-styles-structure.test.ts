import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './valid-styles-structure.js';

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2024, sourceType: 'module' },
});

const wrap = (styles: string) => `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { ${styles} } });
      `;

tester.run('valid-styles-structure', rule, {
  valid: [
    // v3 at-rule keys match the CSS at-rule names Tasty emits.
    wrap(`'@keyframes': { fade: { from: { opacity: 0 } } }`),
    wrap(`'@property': { '$elevation': { syntax: '<number>' } }`),
    wrap(`'@font-face': { Inter: { src: 'url(/inter.woff2)' } }`),
    wrap(`'@counter-style': { dashes: { system: 'cyclic', symbols: '"—"' } }`),
    wrap(
      `'@function': { $$negative: { args: ['$value'], result: '(-1 * $value)' } }`,
    ),

    // `recipe` takes a string.
    wrap(`recipe: 'card elevated'`),
    wrap(`recipe: \`card\``),

    // Ordinary styles are untouched.
    wrap(`padding: '2x'`),

    // A value the plugin cannot see into may well evaluate to an object.
    `
        import { tasty } from '@tenphi/tasty';
        const faces = { Inter: { src: 'url(a.woff2)' } };
        tasty({ styles: { '@font-face': faces } });
      `,
    `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { '@counter-style': theme.counters } });
      `,
    `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { '@function': buildFns() } });
      `,
  ],
  invalid: [
    // The v2 camelCase spellings are reported and auto-fixed.
    {
      code: wrap(`'@properties': { '$x': { syntax: '<number>' } }`),
      output: wrap(`'@property': { '$x': { syntax: '<number>' } }`),
      errors: [{ messageId: 'renamedSpecialKey' }],
    },
    {
      code: wrap(`'@fontFace': { Inter: { src: 'url(a.woff2)' } }`),
      output: wrap(`'@font-face': { Inter: { src: 'url(a.woff2)' } }`),
      errors: [{ messageId: 'renamedSpecialKey' }],
    },
    {
      code: wrap(`'@counterStyle': { d: { system: 'cyclic' } }`),
      output: wrap(`'@counter-style': { d: { system: 'cyclic' } }`),
      errors: [{ messageId: 'renamedSpecialKey' }],
    },
    // A double-quoted key keeps its quote style.
    {
      code: wrap(`"@fontFace": { Inter: { src: 'url(a.woff2)' } }`),
      output: wrap(`"@font-face": { Inter: { src: 'url(a.woff2)' } }`),
      errors: [{ messageId: 'renamedSpecialKey' }],
    },

    // Structure validation for each at-rule.
    {
      code: wrap(`'@keyframes': 'nope'`),
      errors: [{ messageId: 'invalidKeyframesStructure' }],
    },
    {
      code: wrap(`'@property': 'nope'`),
      errors: [{ messageId: 'invalidPropertiesStructure' }],
    },
    {
      code: wrap(`'@font-face': 'nope'`),
      errors: [{ messageId: 'invalidFontFaceStructure' }],
    },
    {
      code: wrap(`'@counter-style': 'nope'`),
      errors: [{ messageId: 'invalidCounterStyleStructure' }],
    },
    {
      code: wrap(`'@function': 'nope'`),
      errors: [{ messageId: 'invalidFunctionStructure' }],
    },
    {
      code: wrap(`recipe: { card: true }`),
      errors: [{ messageId: 'recipeNotString' }],
    },
    // An array is conclusively not a descriptor object.
    {
      code: wrap(`'@font-face': ['nope']`),
      errors: [{ messageId: 'invalidFontFaceStructure' }],
    },
  ],
});
