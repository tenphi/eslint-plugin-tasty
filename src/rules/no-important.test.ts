import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './no-important.js';

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
  },
});

tester.run('no-important', rule, {
  valid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: '#red' } });
      `,
    },
  ],
  invalid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: '#red !important' } });
      `,
      errors: [{ messageId: 'noImportant' }],
    },
  ],
});
