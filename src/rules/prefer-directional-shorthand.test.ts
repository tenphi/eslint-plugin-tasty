import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './prefer-directional-shorthand.js';

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
  },
});

const wrap = (styles: string) => `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { ${styles} } });
      `;

tester.run('prefer-directional-shorthand', rule, {
  valid: [
    { code: wrap("margin: '1x bottom'") },
    { code: wrap("margin: '1x 2x'") },
    // `inset` identity is `auto`, so a lone `0` among placeholders is already
    // the collapsed form.
    { code: wrap("inset: 'auto auto auto auto'") },
    // Mixed real values have no directional equivalent.
    { code: wrap("inset: '1x 2x 0 auto'") },
    { code: wrap("margin: '1x 2x 3x 4x'") },
    { code: wrap("radius: '1r 2r 0 0'") },
    // Three real values but unequal, so `dock` does not apply.
    { code: wrap("inset: 'auto 0 1x 0'") },
    // `dock` only applies to inset, not to padding/margin.
    { code: wrap("padding: '0 1x 1x 1x'") },
  ],
  invalid: [
    {
      code: wrap("margin: '0 0 1x 0'"),
      output: wrap("margin: '1x bottom'"),
      errors: [{ messageId: 'preferDirectionalShorthand' }],
    },
    {
      code: wrap("padding: '0 0 0 2x'"),
      output: wrap("padding: '2x left'"),
      errors: [{ messageId: 'preferDirectionalShorthand' }],
    },
    // inset: identity is `auto`, single real value.
    {
      code: wrap("inset: '0 auto auto auto'"),
      output: wrap("inset: '0 top'"),
      errors: [{ messageId: 'preferDirectionalShorthand' }],
    },
    // inset: one edge pinned, perpendicular pair spanned -> `dock`.
    {
      code: wrap("inset: 'auto 0 0 0'"),
      output: wrap("inset: '0 bottom dock'"),
      errors: [{ messageId: 'preferDirectionalShorthand' }],
    },
    {
      code: wrap("inset: '0 0 0 auto'"),
      output: wrap("inset: '0 right dock'"),
      errors: [{ messageId: 'preferDirectionalShorthand' }],
    },
    // radius: positions are corners, not sides.
    {
      code: wrap("radius: '0 1r 0 0'"),
      output: wrap("radius: '1r top-right'"),
      errors: [{ messageId: 'preferDirectionalShorthand' }],
    },
    {
      code: wrap("radius: '4px 0 0 0'"),
      output: wrap("radius: '4px top-left'"),
      errors: [{ messageId: 'preferDirectionalShorthand' }],
    },
    {
      code: wrap("radius: '0 0 4px 0'"),
      output: wrap("radius: '4px bottom-right'"),
      errors: [{ messageId: 'preferDirectionalShorthand' }],
    },
    // fade: the extra groups are zero-length, so collapsing is equivalent.
    {
      code: wrap("fade: '0 0 2x 0'"),
      output: wrap("fade: '2x bottom'"),
      errors: [{ messageId: 'preferDirectionalShorthand' }],
    },
    // border: report-only, because the 4-value form currently renders no
    // border at all and applying the fix changes the output.
    {
      code: wrap("border: '0 0 1bw 0'"),
      output: null,
      errors: [
        {
          messageId: 'preferDirectionalUnrendered',
          suggestions: [
            {
              messageId: 'preferDirectionalShorthand',
              output: wrap("border: '1bw bottom'"),
            },
          ],
        },
      ],
    },
    // `margin` identity is `0`, so a single `auto` is the real value and
    // `margin: 'auto top'` emits the same `margin: auto 0 0 0`.
    {
      code: wrap("margin: 'auto 0 0 0'"),
      output: wrap("margin: 'auto top'"),
      errors: [{ messageId: 'preferDirectionalShorthand' }],
    },
    // state maps are checked per state
    {
      code: wrap("margin: { '': '0 0 1x 0' }"),
      output: wrap("margin: { '': '1x bottom' }"),
      errors: [{ messageId: 'preferDirectionalShorthand' }],
    },
  ],
});
