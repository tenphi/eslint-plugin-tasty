import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './valid-default-state-order.js';

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
  },
});

tester.run('valid-default-state-order', rule, {
  valid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: { '': '#purple', hovered: '#danger' } } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: { _: '#purple', hovered: '#danger' } } });
      `,
    },
    {
      // Ideal order: '_' floor first, '' default right after it.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({
          styles: {
            fill: { _: '#purple', '': '#surface', hovered: '#danger' },
          },
        });
      `,
    },
  ],
  invalid: [
    {
      // No '_': '' must be first.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: { hovered: '#danger', '': '#purple' } } });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: { '': '#purple', hovered: '#danger' } } });
      `,
      errors: [{ messageId: 'misplacedDefaultState' }],
    },
    {
      // Both '_' and '' with no other states → '' is redundant.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: { _: '#purple', '': '#surface' } } });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: { _: '#purple' } } });
      `,
      errors: [{ messageId: 'redundantDefaultState' }],
    },
    {
      // (a) '' before '_' with other states → move '_' to the top.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({
          styles: {
            fill: { '': '#surface', _: '#purple', hovered: '#danger' },
          },
        });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({
          styles: {
            fill: { _: '#purple', '': '#surface', hovered: '#danger' },
          },
        });
      `,
      errors: [{ messageId: 'misplacedFloorState' }],
    },
    {
      // (b) both '_' and '' misplaced → move '_' to top (pass 1), then '' to
      // index 1 (pass 2). Two fix passes → array form of `output`.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({
          styles: {
            fill: { hovered: '#danger', '': '#surface', _: '#purple' },
          },
        });
      `,
      output: [
        `
        import { tasty } from '@tenphi/tasty';
        tasty({
          styles: {
            fill: { _: '#purple', hovered: '#danger', '': '#surface' },
          },
        });
      `,
        `
        import { tasty } from '@tenphi/tasty';
        tasty({
          styles: {
            fill: { _: '#purple', '': '#surface', hovered: '#danger' },
          },
        });
      `,
      ],
      errors: [{ messageId: 'misplacedFloorState' }],
    },
    {
      // (d) '_'-only map, '_' not first → move '_' to the top.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: { hovered: '#danger', _: '#purple' } } });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: { _: '#purple', hovered: '#danger' } } });
      `,
      errors: [{ messageId: 'misplacedFloorState' }],
    },
  ],
});
