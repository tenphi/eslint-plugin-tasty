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
    {
      // With `pixels: 'replaceable'`, a length with no exact unit is allowed:
      // layout sizes, hairlines, and numeric inputs alike.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({
          styles: {
            width: 'max 520px',
            height: { '': '28px', compact: '22px' },
            inset: '-2px 0 auto 3px',
            gap: 17,
            radius: '4px',
            border: '2px solid #accent',
          },
        });
      `,
      options: [{ pixels: 'replaceable' }],
    },
    {
      // Type-scale lengths have no unit: `x` is the spacing scale, so a 16px
      // line height or a 40px font size is not replaceable.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fontSize: '40px', lineHeight: '16px', letterSpacing: '8px' } });
      `,
      options: [{ pixels: 'replaceable' }],
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
      // With `pixels: 'replaceable'`, only the part of a value with an exact
      // unit is reported, and the fix leaves the rest of the value alone.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { padding: '8px 17px', border: '1px solid #accent', width: 64 } });
      `,
      options: [{ pixels: 'replaceable' }],
      errors: [
        {
          messageId: 'preferToken',
          data: { raw: '8px', suggestion: '1x' },
          suggestions: [
            {
              messageId: 'replaceWithToken',
              output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { padding: '1x 17px', border: '1px solid #accent', width: 64 } });
      `,
            },
          ],
        },
        {
          messageId: 'preferToken',
          data: { raw: '1px', suggestion: '1bw' },
          suggestions: [
            {
              messageId: 'replaceWithToken',
              output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { padding: '8px 17px', border: '1bw solid #accent', width: 64 } });
      `,
            },
          ],
        },
        {
          messageId: 'preferToken',
          data: { raw: '64px', suggestion: '8x' },
          suggestions: [
            {
              messageId: 'replaceWithToken',
              output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { padding: '8px 17px', border: '1px solid #accent', width: '8x' } });
      `,
            },
          ],
        },
      ],
    },
    {
      // `pixels: 'all'` is the default: a length with no exact unit is reported.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { width: '520px' } });
      `,
      options: [{ pixels: 'all' }],
      errors: [{ messageId: 'rawPixelValue', data: { raw: '520px' } }],
    },
    {
      // By default a type-scale length is still reported, without an `x`
      // suggestion, while a spacing length beside it keeps its suggestion.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { lineHeight: '16px', padding: '16px' } });
      `,
      errors: [
        { messageId: 'rawPixelValue', data: { raw: '16px' } },
        {
          messageId: 'preferToken',
          data: { raw: '16px', suggestion: '2x' },
          suggestions: [
            {
              messageId: 'replaceWithToken',
              output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { lineHeight: '16px', padding: '2x' } });
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
