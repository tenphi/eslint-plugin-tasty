import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './prefer-directional-shorthand.js';

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
  },
});

tester.run('prefer-directional-shorthand', rule, {
  valid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { margin: '1x bottom' } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { margin: '1x 2x' } });
      `,
    },
  ],
  invalid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { margin: '0 0 1x 0' } });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { margin: '1x bottom' } });
      `,
      errors: [{ messageId: 'preferDirectionalShorthand' }],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { padding: '0 0 0 2x' } });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { padding: '2x left' } });
      `,
      errors: [{ messageId: 'preferDirectionalShorthand' }],
    },
  ],
});
