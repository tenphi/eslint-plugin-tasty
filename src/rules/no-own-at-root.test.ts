import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './no-own-at-root.js';

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
  },
});

tester.run('no-own-at-root', rule, {
  valid: [
    // @own() inside sub-element is fine
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          Icon: {
            fill: {
              '': '#white',
              '@own(:hover)': '#blue',
            },
          },
        }});
      `,
    },
    // Plain pseudo-class at root is fine
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          fill: {
            '': '#white',
            ':hover': '#blue',
          },
        }});
      `,
    },
    // Non-tasty code is ignored
    {
      code: `
        const obj = { fill: { '@own(:hover)': 'red' } };
      `,
    },
  ],
  invalid: [
    // @own() at root level
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          fill: {
            '': '#white',
            '@own(:hover)': '#blue',
          },
        }});
      `,
      errors: [{ messageId: 'ownAtRoot' }],
    },
    // @own() in complex expression at root
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          transform: {
            '': 'scale(1)',
            '@parent(:hover) & !@own(:hover)': 'scale(0.95)',
          },
        }});
      `,
      errors: [{ messageId: 'ownAtRoot' }],
    },
  ],
});
