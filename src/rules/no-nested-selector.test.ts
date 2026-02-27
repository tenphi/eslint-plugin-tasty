import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './no-nested-selector.js';

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
  },
});

tester.run('no-nested-selector', rule, {
  valid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { Image: { width: '100%' } } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: { '': '#white', ':hover': '#blue' } } });
      `,
    },
  ],
  invalid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { '& img': { width: '100%' } } });
      `,
      errors: [{ messageId: 'noNestedSelector', data: { key: '& img' } }],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { '&:hover': { fill: '#blue' } } });
      `,
      errors: [{ messageId: 'noNestedSelector', data: { key: '&:hover' } }],
    },
  ],
});
