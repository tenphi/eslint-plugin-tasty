import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './no-nested-state-map.js';

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
  },
});

tester.run('no-nested-state-map', rule, {
  valid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          fill: {
            '': '#white',
            'hovered': '#blue',
            'hovered & pressed': '#red',
          },
        }});
      `,
    },
  ],
  invalid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          fill: {
            '': '#white',
            'hovered': {
              '': '#blue',
              'pressed': '#red',
            },
          },
        }});
      `,
      errors: [{ messageId: 'nestedStateMap' }],
    },
  ],
});
