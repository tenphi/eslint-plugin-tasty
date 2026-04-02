import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './valid-sub-element.js';

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
  },
});

tester.run('valid-sub-element', rule, {
  valid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          Title: { preset: 'h3' },
          Content: { color: '#text' },
        }});
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          Fill: false,
        }});
      `,
    },
  ],
  invalid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { Title: '#purple' } });
      `,
      errors: [{ messageId: 'subElementNotObject' }],
    },
  ],
});
