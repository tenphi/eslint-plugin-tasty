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
        tasty({ styles: { fill: true, hide: true, preset: true } });
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
  ],
});
