import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './known-property.js';

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
  },
});

tester.run('known-property', rule, {
  valid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: '#purple', padding: '2x' } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { display: 'flex', gap: '2x', flow: 'column' } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { Title: { preset: 'h3' } } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { '$spacing': '2x' } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { '#accent': 'purple' } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { '@keyframes': { pulse: {} } } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { recipe: 'card' } });
      `,
    },
    // SVG presentation attributes are valid
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { strokeWidth: '2', stroke: '#purple', fillOpacity: '0.5' } });
      `,
    },
    // Modern CSS the hand-maintained property list used to reject
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { mask: 'url(#m)', maskSize: 'cover', maskMode: 'alpha' } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { anchorName: '--trigger', positionArea: 'block-end', positionTryFallbacks: 'flip-block' } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { viewTransitionName: 'card', fieldSizing: 'content', textBox: 'trim-both cap alphabetic' } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { cornerShape: 'squircle', readingFlow: 'grid-order', interpolateSize: 'allow-keywords' } });
      `,
    },
    // SVG geometry properties are real CSS properties in SVG 2
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { cx: '50%', cy: '50%', r: '40%', d: 'path("M0 0")' } });
      `,
    },
    // Not a tasty call — should be ignored
    {
      code: `
        const tasty = (x) => x;
        tasty({ styles: { colour: '#purple' } });
      `,
    },
    // A map of style objects is not itself a style object: its keys are
    // variant names, and a value that names a shared constant is opaque.
    {
      code: `
        import type { Styles } from '@tenphi/tasty';
        export const ITEM_VARIANTS: Record<ItemVariant, Styles> = {
          'current.item': CURRENT_ITEM_STYLES,
          default: { fill: '#purple' },
        };
      `,
    },
    {
      code: `
        import type { Styles } from '@tenphi/tasty';
        const BLOCKS: { [key: string]: Styles } = { header: { padding: '2x' } };
      `,
    },
    // An unannotated constant is a shared value, not a style object by name.
    `const CARD_STYLES = { colour: '#purple' };`,
  ],
  invalid: [
    {
      // The annotation is read before the constant-case exclusion.
      code: `
        import type { Styles } from '@tenphi/tasty';
        export const CARD_STYLES: Styles = { colour: '#purple' };
      `,
      errors: [{ messageId: 'unknownProperty', data: { name: 'colour' } }],
    },
    {
      // The values of a `Record<K, Styles>` are the style objects.
      code: `
        import type { Styles } from '@tenphi/tasty';
        export const ITEM_VARIANTS: Record<string, Styles> = {
          'current.item': { colour: '#purple' },
          Primary: { boarder: true },
        };
      `,
      errors: [
        { messageId: 'unknownProperty', data: { name: 'colour' } },
        { messageId: 'unknownProperty', data: { name: 'boarder' } },
      ],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { colour: '#purple' } });
      `,
      errors: [{ messageId: 'unknownProperty', data: { name: 'colour' } }],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { boarder: true } });
      `,
      errors: [{ messageId: 'unknownProperty', data: { name: 'boarder' } }],
    },
    // A near-miss of a modern property is still a typo — widening the list to cover
    // `maskSize` must not turn the rule into a pass-through for anything camelCase.
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { markSize: 'cover' } });
      `,
      errors: [{ messageId: 'unknownProperty', data: { name: 'markSize' } }],
    },
  ],
});
