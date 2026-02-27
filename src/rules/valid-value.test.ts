import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './valid-value.js';

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
  },
});

tester.run('valid-value', rule, {
  valid: [
    // Color properties with valid color tokens
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: '#purple.5' } });
      `,
    },
    // Padding with directional mods
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { padding: '2x top bottom' } });
      `,
    },
    // Border with color + direction + style mod
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { border: '1bw solid #red top' } });
      `,
    },
    // Width with min/max mod
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { width: 'min 200px' } });
      `,
    },
    // Height with max mod
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { height: 'max 100vh' } });
      `,
    },
    // Display with keyword mod
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { display: 'flex' } });
      `,
    },
    // Flow with valid mods
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { flow: 'column wrap' } });
      `,
    },
    // Gap (value only, no mods needed)
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { gap: '2x' } });
      `,
    },
    // Opacity (value only)
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { opacity: '0.5' } });
      `,
    },
    // Radius with shape mod
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { radius: '1r round' } });
      `,
    },
    // Radius with directional mod
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { radius: '1r top-left bottom-right' } });
      `,
    },
    // Outline with color and style
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { outline: '2px solid #purple' } });
      `,
    },
    // Shadow with color
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { shadow: '0 2px 4px #dark.2' } });
      `,
    },
    // Passthrough properties accept anything
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { cursor: 'pointer' } });
      `,
    },
    // State map values
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: { '': '#white', ':hover': '#purple.1' } } });
      `,
    },
    // Sub-elements are skipped (uppercase keys)
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { Input: { fill: '#white' } } });
      `,
    },
    // Token definitions are skipped (# keys)
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { '#accent': 'rgb(100, 200, 50)' } });
      `,
    },
    // Custom property definitions are skipped ($ keys)
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { '$spacing': '8px' } });
      `,
    },
    // CSS functions are valid values
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: 'rgb(255, 0, 0)' } });
      `,
    },
    // Fade with directional mods
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fade: 'top bottom' } });
      `,
    },
    // Inset with directional mods
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { inset: '0 top left' } });
      `,
    },
    // Color with custom property
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: '$bg-color' } });
      `,
    },
    // Overflow with known mod
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { overflow: 'hidden' } });
      `,
    },
    // Position with known mod
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { position: 'absolute' } });
      `,
    },
  ],
  invalid: [
    // Unbalanced parentheses
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: 'rgb(255, 0, 0' } });
      `,
      errors: [{ messageId: 'unbalancedParens' }],
    },
    // !important not allowed
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: '#red !important' } });
      `,
      errors: [{ messageId: 'importantNotAllowed' }],
    },
    // fill doesn't accept mods — typo 'purle' becomes a mod
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: 'purle' } });
      `,
      errors: [{ messageId: 'unexpectedMod' }],
    },
    // padding doesn't accept colors
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { padding: '#red' } });
      `,
      errors: [{ messageId: 'unexpectedColor' }],
    },
    // padding invalid directional mod
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { padding: '2x topp' } });
      `,
      errors: [{ messageId: 'invalidMod' }],
    },
    // gap doesn't accept mods
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { gap: '2x foo' } });
      `,
      errors: [{ messageId: 'unexpectedMod' }],
    },
    // width invalid mod
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { width: 'medium 200px' } });
      `,
      errors: [{ messageId: 'invalidMod' }],
    },
    // border with invalid mod
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { border: '1bw sollid #red' } });
      `,
      errors: [{ messageId: 'invalidMod' }],
    },
    // radius with invalid mod
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { radius: '1r circle' } });
      `,
      errors: [{ messageId: 'invalidMod' }],
    },
    // opacity doesn't accept mods
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { opacity: 'half' } });
      `,
      errors: [{ messageId: 'unexpectedMod' }],
    },
    // State map value error
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: { '': '#white', ':hover': 'purle' } } });
      `,
      errors: [{ messageId: 'unexpectedMod' }],
    },
    // gap doesn't accept colors
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { gap: '#red' } });
      `,
      errors: [{ messageId: 'unexpectedColor' }],
    },
  ],
});
