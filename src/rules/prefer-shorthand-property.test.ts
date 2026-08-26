import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './prefer-shorthand-property.js';

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
  },
});

tester.run('prefer-shorthand-property', rule, {
  valid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: '#purple', radius: '1r' } });
      `,
    },
  ],
  invalid: [
    // A CSS-wide keyword is pointed at `preset`, not `font`: `font` appends a
    // fallback stack (`inherit, var(--font-sans, …)`), while a keyword used as
    // the preset name is emitted verbatim across the typography group.
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fontFamily: 'inherit' } });
      `,
      errors: [
        {
          messageId: 'preferShorthand',
          data: { native: 'fontFamily', alternative: "preset: 'inherit'" },
        },
      ],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fontFamily: 'UNSET' } });
      `,
      errors: [
        {
          messageId: 'preferShorthand',
          data: { native: 'fontFamily', alternative: "preset: 'unset'" },
        },
      ],
    },
    // A real font stack still points at `font`.
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fontFamily: 'Inter' } });
      `,
      errors: [
        {
          messageId: 'preferShorthand',
          data: { native: 'fontFamily', alternative: "font: '...'" },
        },
      ],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { backgroundColor: '#purple' } });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: '#purple' } });
      `,
      errors: [{ messageId: 'preferShorthand' }],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { borderRadius: '6px' } });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { radius: '6px' } });
      `,
      errors: [{ messageId: 'preferShorthand' }],
    },
    {
      // No safeFix for directional/min-max/image mappings → report-only.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { backgroundImage: 'url(/img.png)' } });
      `,
      errors: [{ messageId: 'preferShorthand' }],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { gridTemplateColumns: '1fr 2fr' } });
      `,
      errors: [{ messageId: 'preferShorthand' }],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { lineClamp: 3 } });
      `,
      errors: [{ messageId: 'preferShorthand' }],
    },
    // Extension layers merge per key, so the rename would replace the base
    // component's whole property: the fix is withheld and the report points at
    // a token seam in the base instead.
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty(Button, { styles: { paddingTop: '2x' } });
      `,
      errors: [
        {
          messageId: 'preferShorthandExtending',
          data: {
            native: 'paddingTop',
            alternative: "padding: '... top'",
            property: 'padding',
          },
        },
      ],
    },
    // Even the carry-over renames lose their fix here — `fill` replaces the
    // base's whole `fill`, including a state map the layer never mentioned.
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty(Button, { styles: { backgroundColor: '#purple' } });
      `,
      errors: [
        {
          messageId: 'preferShorthandExtending',
          data: {
            native: 'backgroundColor',
            alternative: "fill: '...'",
            property: 'fill',
          },
        },
      ],
    },
    // Sub-element objects inherit the layer's extending context.
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty(Button, { styles: { Icon: { borderRadius: '6px' } } });
      `,
      errors: [
        {
          messageId: 'preferShorthandExtending',
          data: {
            native: 'borderRadius',
            alternative: "radius: '...'",
            property: 'radius',
          },
        },
      ],
    },
    {
      code: `
        import { tastyStatic } from '@tenphi/tasty';
        tastyStatic(Base, { marginLeft: '2x' });
      `,
      errors: [
        {
          messageId: 'preferShorthandExtending',
          data: {
            native: 'marginLeft',
            alternative: "margin: '... left'",
            property: 'margin',
          },
        },
      ],
    },
    // Selector mode is not an extension layer — the fix stands.
    {
      code: `
        import { tastyStatic } from '@tenphi/tasty';
        tastyStatic('.card', { backgroundColor: '#purple' });
      `,
      output: `
        import { tastyStatic } from '@tenphi/tasty';
        tastyStatic('.card', { fill: '#purple' });
      `,
      errors: [{ messageId: 'preferShorthand' }],
    },
  ],
});
