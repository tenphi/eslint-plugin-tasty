import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './valid-boolean-property.js';

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
  },
});

tester.run('valid-boolean-property', rule, {
  valid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { border: true, radius: true, padding: true } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { hide: true, preset: true } });
      `,
    },
    {
      // `false` is a tombstone on every property, `fill` included — only `true`
      // is restricted.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: false } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { textAlign: false } });
      `,
    },
  ],
  invalid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { textAlign: true } });
      `,
      errors: [{ messageId: 'invalidBooleanTrue' }],
    },
    {
      // `fill` has no default color. Tasty 3.14 ignores true, so reporting it
      // still prevents a silently missing background.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: true } });
      `,
      errors: [{ messageId: 'invalidBooleanTrue' }],
    },
    {
      // Unlike `color: true`, `svgFill: true` emits `fill: true`.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { svgFill: true } });
      `,
      errors: [{ messageId: 'invalidBooleanTrue' }],
    },
    {
      // Including in a state map, where it is just as invisible.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: { '': '#surface', hovered: true } } });
      `,
      errors: [{ messageId: 'invalidBooleanTrue' }],
    },
  ],
});
