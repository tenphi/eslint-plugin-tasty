import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './consistent-token-usage.js';

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
  },
});

tester.run('consistent-token-usage', rule, {
  valid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { gap: '1x' } });
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
        tasty({ styles: { border: '2bw solid #accent' } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { width: '50%' } });
      `,
    },
    {
      // Non-tasty code is ignored.
      code: `
        const obj = { gap: '8px' };
      `,
    },
  ],
  invalid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { gap: '8px' } });
      `,
      errors: [
        {
          messageId: 'preferToken',
          suggestions: [
            {
              messageId: 'replaceWithToken',
              output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { gap: '1x' } });
      `,
            },
          ],
        },
      ],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { radius: '6px' } });
      `,
      errors: [
        {
          messageId: 'preferToken',
          suggestions: [
            {
              messageId: 'replaceWithToken',
              output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { radius: '1r' } });
      `,
            },
          ],
        },
      ],
    },
    {
      // 1px inside a border shorthand → replace with 1bw (range edit).
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { border: '1px solid #accent' } });
      `,
      errors: [
        {
          messageId: 'preferToken',
          suggestions: [
            {
              messageId: 'replaceWithToken',
              output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { border: '1bw solid #accent' } });
      `,
            },
          ],
        },
      ],
    },
    {
      // A sub-element's styles are a style object in their own right and are
      // visited separately, so they must be reported exactly once — not once
      // as a "state" of `Icon` and again on their own.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { Icon: { width: '64px' } } });
      `,
      errors: [
        {
          messageId: 'preferToken',
          suggestions: [
            {
              messageId: 'replaceWithToken',
              output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { Icon: { width: '8x' } } });
      `,
            },
          ],
        },
      ],
    },
    {
      // A genuine state map inside a sub-element is still reported, and the
      // parent property name is still used to scope the radius check.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { Icon: { radius: { '': '6px' } } } });
      `,
      errors: [
        {
          messageId: 'preferToken',
          suggestions: [
            {
              messageId: 'replaceWithToken',
              output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { Icon: { radius: { '': '1r' } } } });
      `,
            },
          ],
        },
      ],
    },
    {
      // Multiple 1px tokens in one border value.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { border: '1px 1px #accent' } });
      `,
      errors: [
        {
          messageId: 'preferToken',
          suggestions: [
            {
              messageId: 'replaceWithToken',
              output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { border: '1bw 1bw #accent' } });
      `,
            },
          ],
        },
      ],
    },
  ],
});
