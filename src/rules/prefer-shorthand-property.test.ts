import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './prefer-shorthand-property.js';

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

// A path inside a directory carrying `ownedSources` in its tasty.config.json.
// The file itself need not exist — only the config the loader walks up to does.
const OWNED_SOURCES_FIXTURE = 'test/fixtures/owned-sources/component.tsx';

tester.run('prefer-shorthand-property', rule, {
  valid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: '#purple', radius: '1r' } });
      `,
    },
    // Extending a component imported from a package: the token seam would have
    // to be added to someone else's file, and the shorthand rewrite would
    // clobber the base, so there is nothing actionable left to report.
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        import { Button } from '@uikit/button';
        tasty(Button, { styles: { paddingTop: '2x' } });
      `,
    },
    // Same through a namespace import — the root identifier carries the source.
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        import * as UI from '@uikit';
        tasty(UI.Button, { styles: { backgroundColor: '#purple' } });
      `,
    },
    // A `styles` prop on an imported component is an override layer too.
    {
      code: `
        import { Card } from '@uikit/card';
        const view = <Card styles={{ paddingTop: '2x' }} />;
      `,
    },
    // A package NOT listed in `ownedSources` stays silent even next to a config
    // that lists another one.
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        import { Button } from '@uikit/button';
        tasty(Button, { styles: { paddingTop: '2x' } });
      `,
      filename: OWNED_SOURCES_FIXTURE,
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
    // `Button` is not imported, so it is declared in this very file — the base is
    // the author's to change and the seam is worth naming. An unresolvable base
    // lands here too: silence is for a base that is demonstrably someone else's.
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
    // A relative import is this project's own file, so the seam is actionable.
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        import { Button } from './button';
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
    // A `styles` prop is an override layer over the component's own styles —
    // reported without a fix, like any other layer. The base definition in the
    // same file is clean.
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        const Card = tasty({ styles: { padding: '1x' } });
        const view = <Card styles={{ paddingTop: '2x' }} />;
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
    // `ownedSources: ['@my-org/*']` in the fixture's tasty.config.json opts a
    // design system published from this monorepo back in.
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        import { Button } from '@my-org/ui';
        tasty(Button, { styles: { paddingTop: '2x' } });
      `,
      filename: OWNED_SOURCES_FIXTURE,
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
  ],
});
