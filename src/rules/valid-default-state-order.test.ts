import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './valid-default-state-order.js';

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
  },
});

tester.run('valid-default-state-order', rule, {
  valid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: { '': '#purple', hovered: '#danger' } } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: { _: '#purple', hovered: '#danger' } } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({
          styles: {
            fill: { '': '#surface', _: '#purple', hovered: '#danger' },
          },
        });
      `,
    },
  ],
  invalid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: { hovered: '#danger', '': '#purple' } } });
      `,
      errors: [{ messageId: 'misplacedDefaultState' }],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: { _: '#purple', '': '#surface' } } });
      `,
      errors: [{ messageId: 'redundantDefaultState' }],
    },
  ],
});
