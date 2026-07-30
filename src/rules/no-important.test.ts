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
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: '#red' } });
      `,
      errors: [{ messageId: 'noImportant' }],
    },
    {
      // A sub-element's styles are a style object in their own right and are
      // visited separately, so they must be reported exactly once — not once
      // as a "state" of `Icon` and again on their own.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { Icon: { fill: '#red !important' } } });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { Icon: { fill: '#red' } } });
      `,
      errors: [{ messageId: 'noImportant' }],
    },
    {
      // A genuine state map inside a sub-element is still reported.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { Icon: { fill: { '': '#red !important' } } } });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { Icon: { fill: { '': '#red' } } } });
      `,
      errors: [{ messageId: 'noImportant' }],
    },
  ],
});
