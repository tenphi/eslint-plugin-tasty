import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './valid-transition.js';

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
  },
});

tester.run('valid-transition', rule, {
  valid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { transition: 'fill 0.3s' } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { transition: '$$gradient-angle 0.3s' } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { transition: '##theme 0.3s' } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { transition: '$$rotation 0.2s ease-out, ##accent 0.3s' } });
      `,
    },
    // Kebab-case CSS property names — the spelling a CSS `transition` uses.
    // Tasty emits an unmapped name verbatim, so these are correct.
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { transition: 'text-decoration-color 0.3s' } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { transition: 'color, text-underline-offset' } });
      `,
    },
    // Raw custom property — getTiming() handles the `--name` form.
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { transition: '--gradient-angle 0.3s' } });
      `,
    },
  ],
  invalid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { transition: 'foobar 0.3s' } });
      `,
      errors: [{ messageId: 'unknownTransition' }],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { transition: 'background-color 0.3s' } });
      `,
      errors: [
        {
          messageId: 'preferSemanticTransition',
          suggestions: [
            {
              messageId: 'useSemantic',
              output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { transition: 'fill 0.3s' } });
      `,
            },
          ],
        },
      ],
    },
  ],
});
