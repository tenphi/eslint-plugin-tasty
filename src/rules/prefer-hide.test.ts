import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './prefer-hide.js';

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
  },
});

tester.run('prefer-hide', rule, {
  valid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { hide: true, display: 'flex' } });
      `,
    },
  ],
  invalid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { display: 'none' } });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { hide: true } });
      `,
      errors: [{ messageId: 'preferHide' }],
    },
    {
      // State-map case: report-only (no safe fix — parent key can't change).
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({
          styles: {
            display: { '': 'flex', hovered: 'none' },
          },
        });
      `,
      errors: [{ messageId: 'preferHide' }],
    },
  ],
});
