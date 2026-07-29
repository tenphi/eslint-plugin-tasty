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
    // `inset` identity is `auto`, not `0` — the zeros are real offsets that a
    // directional shorthand would drop.
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { inset: 'auto 0 0 0' } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { inset: '0 auto 0 0' } });
      `,
    },
    // `radius` positions are corners and a directional modifier addresses a
    // corner *pair*, so a single-corner value has no equivalent.
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { radius: '0 1r 0 0' } });
      `,
    },
    // Four `border` tokens parse as one border value, not a box.
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { border: '0 0 1bw 0' } });
      `,
    },
    // Each `fade` side becomes its own gradient layer.
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fade: '0 0 2x 0' } });
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
    // `inset` still collapses when the placeholders really are `auto`.
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { inset: '0 auto auto auto' } });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { inset: '0 top' } });
      `,
      errors: [{ messageId: 'preferDirectionalShorthand' }],
    },
  ],
});
