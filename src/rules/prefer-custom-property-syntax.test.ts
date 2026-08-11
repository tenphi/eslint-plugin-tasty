import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './prefer-custom-property-syntax.js';

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
  },
});

tester.run('prefer-custom-property-syntax', rule, {
  valid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: '#purple', gap: '$spacing' } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: '#clear', color: '#current' } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { border: '1bw solid #accent' } });
      `,
    },
    {
      // Custom property without a -color suffix is fine.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { gap: '$card-padding' } });
      `,
    },
    {
      // Non-tasty import — rule should not fire.
      code: `
        import { tasty } from 'somewhere-else';
        tasty({ styles: { fill: 'var(--accent-color)' } });
      `,
    },
    {
      // `-color` must END the name. `$purple-color-rgb` is its own property, not
      // `$purple-color` followed by `-rgb`; rewriting it to `#purple-rgb` produced
      // `var(--purple-rgb-color)`, which does not exist.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { gap: '$purple-color-rgb' } });
      `,
    },
    {
      // Same shape after one --fix pass had already run: must stay put.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: 'rgb($purple-color-rgb / 0.05)' } });
      `,
    },
    {
      // `-color` in the middle of a hand-authored name, likewise untouched.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { gap: '$cui-text-color-secondary' } });
      `,
    },
    {
      // fontFamily has its own handler and passes the value through verbatim, so
      // `$font-sans` would emit a literal `font-family: $font-sans`.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fontFamily: 'var(--font-sans)' } });
      `,
    },
    {
      // Colour properties expand `#token` but not `$name`, so the `$` form is
      // suppressed here even though the same rewrite is correct on `gap`.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: 'rgb(var(--purple-color-rgb) / 0.05)' } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { color: 'var(--cui-text-color-secondary)' } });
      `,
    },
    {
      // And the mirror image: dimension properties expand `$name` but not `#token`.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fontSize: 'var(--accent-color)' } });
      `,
    },
    {
      // A state map inherits the outer property's expansion rules.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { color: { '': 'var(--row-color-secondary)' } } });
      `,
    },
    {
      // React inline styles, not tasty. `#shadow-sm` is a correct rewrite *inside*
      // tasty and meaningless here — nothing resolves the token, so applying it
      // deleted the shadow. The variable name said `styles`; the type says otherwise,
      // and the type wins.
      code: `
        import { tasty } from '@tenphi/tasty';
        const styles: { wrapper: CSSProperties } = {
          wrapper: { boxShadow: '0px 1px 6px 0px var(--shadow-sm-color)' },
        };
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        const tableStyles: Record<string, CSSProperties> = {
          td: { color: 'var(--accent-color)' },
        };
      `,
    },
    {
      // Same shape, but annotated as tasty — still reported.
      code: `
        import { tasty } from '@tenphi/tasty';
        const real: Styles = { gap: '$spacing' };
      `,
    },
  ],
  invalid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { gap: 'var(--spacing)' } });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { gap: '$spacing' } });
      `,
      errors: [{ messageId: 'preferCustomPropertySyntax' }],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: 'var(--accent-color, black)' } });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: '(#accent, black)' } });
      `,
      errors: [{ messageId: 'preferCustomPropertySyntax' }],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { margin: 'var(--gap, 1x)' } });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { margin: '($gap, 1x)' } });
      `,
      errors: [{ messageId: 'preferCustomPropertySyntax' }],
    },
    {
      // var() with a transparent fallback is normalized to #clear (one report,
      // the standalone keyword inside var() is not double-reported).
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: 'var(--accent-color, transparent)' } });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: '(#accent, #clear)' } });
      `,
      errors: [{ messageId: 'preferCustomPropertySyntax' }],
    },
    {
      // Multiple var() in one value — both fixed in one --fix pass.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { gap: 'var(--spacing) var(--accent-color)' } });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { gap: '$spacing #accent' } });
      `,
      errors: [
        { messageId: 'preferCustomPropertySyntax' },
        { messageId: 'preferCustomPropertySyntax' },
      ],
    },
    {
      // $x-color → #x
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: '$text-color' } });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: '#text' } });
      `,
      errors: [{ messageId: 'preferColorToken' }],
    },
    {
      // The guard is per-property, not a blanket mute: `gap` does expand `$name`,
      // so the same value the `fill` case above leaves alone is still reported —
      // and with the full, correct property name.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { gap: 'var(--purple-color-rgb)' } });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { gap: '$purple-color-rgb' } });
      `,
      errors: [{ messageId: 'preferCustomPropertySyntax' }],
    },
    {
      // `-color` at the end still converts.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { gap: '$purple-color' } });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { gap: '#purple' } });
      `,
      errors: [{ messageId: 'preferColorToken' }],
    },
    {
      // $x-color with opacity suffix → #x.N
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { border: '$border-color.5' } });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { border: '#border.5' } });
      `,
      errors: [{ messageId: 'preferColorToken' }],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: 'transparent' } });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: '#clear' } });
      `,
      errors: [{ messageId: 'preferClearToken' }],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { color: 'currentColor' } });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { color: '#current' } });
      `,
      errors: [{ messageId: 'preferCurrentToken' }],
    },
    {
      // transparent as a fallback tuple member (not inside var()) is still flagged.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: '(#surface, transparent)' } });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: '(#surface, #clear)' } });
      `,
      errors: [{ messageId: 'preferClearToken' }],
    },
    {
      // Multiple issues in one value: $text-color + currentColor.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { color: '$text-color currentColor' } });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { color: '#text #current' } });
      `,
      errors: [
        { messageId: 'preferColorToken' },
        { messageId: 'preferCurrentToken' },
      ],
    },
  ],
});
