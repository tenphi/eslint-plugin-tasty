import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './valid-radius-shape.js';

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
  },
});

tester.run('valid-radius-shape', rule, {
  valid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { radius: 'round' } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { radius: '1r' } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { radius: '4px 8px' } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { radius: 'none' } });
      `,
    },
    {
      // Non-tasty code is ignored.
      code: `
        const obj = { radius: 'rount' };
      `,
    },
  ],
  invalid: [
    {
      // Typo close to a known shape → suggestion offered.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { radius: 'rount' } });
      `,
      errors: [
        {
          messageId: 'unknownShape',
          suggestions: [
            {
              messageId: 'replaceWithShape',
              output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { radius: 'round' } });
      `,
            },
          ],
        },
      ],
    },
    {
      // No close match → report-only (no suggestion).
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { radius: 'xyz' } });
      `,
      errors: [{ messageId: 'unknownShape' }],
    },
  ],
});
