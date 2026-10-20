import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './valid-transition.js';
import { SEMANTIC_TRANSITIONS } from '../constants.js';

const known = [...SEMANTIC_TRANSITIONS].join(', ');

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
    // Tasty compiles `zIndex` to `z-index`.
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { transition: 'zIndex 0.2s, inset, text, gap' } });
      `,
    },
    // No Tasty transition name covers these, so the CSS name is the answer:
    // no `flow` / `gridColumns` / `gridRows` suggestion.
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { transition: 'flex-direction 0.2s, grid-auto-flow 0.2s' } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { transition: 'grid-template-columns 0.3s, grid-template-rows 0.3s' } });
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
    // Not Tasty transition names: Tasty emits them verbatim as CSS properties.
    // `flow` is in the CSS property dataset, but no browser implements it.
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { transition: 'flow 0.2s' } });
      `,
      errors: [
        { messageId: 'unknownTransition', data: { name: 'flow', known } },
      ],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { transition: 'dimension 0.2s' } });
      `,
      errors: [
        { messageId: 'unknownTransition', data: { name: 'dimension', known } },
      ],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { transition: 'gridColumns 0.3s, gridRows 0.3s' } });
      `,
      errors: [
        {
          messageId: 'unknownTransition',
          data: { name: 'gridColumns', known },
        },
        { messageId: 'unknownTransition', data: { name: 'gridRows', known } },
      ],
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
