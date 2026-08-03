import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './valid-directional-modifier.js';

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2024, sourceType: 'module' },
});

const wrap = (styles: string) => `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { ${styles} } });
      `;

tester.run('valid-directional-modifier', rule, {
  valid: [
    // One value per directional group — the canonical v3 form.
    wrap(`padding: '2x top'`),
    wrap(`padding: '1x left right'`),
    wrap(`padding: '2x top, 4x right'`),
    wrap(`margin: '1x right, 2x top'`),
    wrap(`scrollMargin: '2x top, 4x bottom'`),
    wrap(`fade: '3x top, 1x bottom'`),

    // A group naming no direction keeps plain CSS shorthand order.
    wrap(`padding: '1x 2x'`),
    wrap(`padding: '1x 2x 3x 4x'`),
    wrap(`fade: '3x 1x'`),
    wrap(`inset: 'dock'`),

    // `dock` is the one two-value directional form.
    wrap(`inset: '2x 4x bottom dock'`),
    wrap(`inset: '2x bottom dock'`),

    // A CSS-wide keyword carries no value of its own.
    wrap(`padding: 'inherit top'`),

    // Output modifier alongside a direction.
    wrap(`padding: '2x top longhand'`),

    // `border` groups legitimately carry width + style + color.
    wrap(`border: '1bw solid #purple top'`),
    wrap(`border: '1bw top, 2bw bottom'`),

    // `radius` corners, and its two-value leaf form.
    wrap(`radius: '1r top-left'`),
    wrap(`radius: '1r 2r leaf'`),

    // State maps are checked per branch.
    wrap(`padding: { '': '2x top', ':hover': '4x right' }`),

    // Not style values: a `$` affix holds a selector, sub-elements recurse
    // separately, and at-rule blocks are descriptor maps.
    wrap(`Title: { $: '.active', fill: '#purple' }`),
    wrap(`'@property': { '$x': { syntax: '<number>' } }`),

    // Properties with no directional vocabulary and no direction word.
    wrap(`fill: '#purple'`),
    wrap(`width: '10x'`),
  ],
  invalid: [
    // The removed positional form, in each of its interchangeable spellings.
    {
      code: wrap(`padding: '2x 4x top right'`),
      errors: [{ messageId: 'tooManyValues' }],
    },
    {
      code: wrap(`padding: '2x top 4x right'`),
      errors: [{ messageId: 'tooManyValues' }],
    },
    {
      code: wrap(`padding: 'top 2x right 4x'`),
      errors: [{ messageId: 'tooManyValues' }],
    },
    {
      code: wrap(`margin: 'right 1x top 2x'`),
      errors: [{ messageId: 'tooManyValues' }],
    },
    {
      code: wrap(`scrollMargin: '2x 4x top right'`),
      errors: [{ messageId: 'tooManyValues' }],
    },
    {
      code: wrap(`fade: '3x 1x top bottom'`),
      errors: [{ messageId: 'tooManyValues' }],
    },

    // Two values without `dock`, and three values with it.
    {
      code: wrap(`inset: '2x 4x bottom'`),
      errors: [{ messageId: 'tooManyValues' }],
    },
    {
      code: wrap(`inset: '2x 4x 6x bottom dock'`),
      errors: [{ messageId: 'tooManyValues' }],
    },

    // `dock` is inset-only, so padding gets the strict one-value rule.
    {
      code: wrap(`padding: '2x 4x bottom dock'`),
      errors: [{ messageId: 'tooManyValues' }],
    },

    // Only the offending group is reported.
    {
      code: wrap(`padding: '2x top, 4x 8x right'`),
      errors: [{ messageId: 'tooManyValues' }],
    },

    // A direction word on a property that has no directional vocabulary.
    {
      code: wrap(`fill: '#purple top'`),
      errors: [{ messageId: 'unsupportedProperty' }],
    },
    {
      code: wrap(`width: '1x top'`),
      errors: [{ messageId: 'unsupportedProperty' }],
    },

    // A direction word outside the property's own set.
    {
      code: wrap(`padding: '1x top-left'`),
      errors: [{ messageId: 'invalidDirectionalModifier' }],
    },

    // Inside a state-map branch.
    {
      code: wrap(`padding: { '': '2x top', ':hover': '2x 4x top right' }`),
      errors: [{ messageId: 'tooManyValues' }],
    },
  ],
});
