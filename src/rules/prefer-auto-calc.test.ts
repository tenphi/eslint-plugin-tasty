import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './prefer-auto-calc.js';

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
  },
});

tester.run('prefer-auto-calc', rule, {
  valid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { width: '(100% - 2x)' } });
      `,
    },
  ],
  invalid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { width: 'calc(100% - 2x)' } });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { width: '(100% - 2x)' } });
      `,
      errors: [{ messageId: 'preferAutoCalc' }],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({
          styles: {
            margin: { hovered: 'calc(1x + 2x)' },
          },
        });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({
          styles: {
            margin: { hovered: '(1x + 2x)' },
          },
        });
      `,
      errors: [{ messageId: 'preferAutoCalc' }],
    },
  ],
});
