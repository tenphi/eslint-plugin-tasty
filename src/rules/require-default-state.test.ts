import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './require-default-state.js';

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

tester.run('require-default-state', rule, {
  valid: [
    // State map with a bare '' default
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          fill: {
            '': '#white',
            'hovered': '#blue',
          },
        }});
      `,
    },
    // State map with a '_' fallback floor instead of a '' default
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          inset: {
            '_': 'auto',
            '@(scroll-state(stuck: top))': '0 auto auto auto',
          },
        }});
      `,
    },
    // Both '_' floor and '' default present
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          fill: {
            '_': '#white',
            '': '#gray',
            'hovered': '#blue',
          },
        }});
      `,
    },
    // Extending a component: omitting the default is intentional
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        const Base = tasty({ styles: { fill: { '': '#white' } } });
        tasty(Base, { styles: {
          fill: {
            'hovered': '#blue',
          },
        }});
      `,
    },
    // Non-tasty code is ignored
    {
      code: `
        const obj = { fill: { 'hovered': 'red' } };
      `,
    },
    // A `styles` prop is an extension layer: the component it lands on already
    // provides the normal-state value, so omitting '' is intentional here for
    // the same reason it is in `tasty(Base, {…})`.
    {
      code: `
        import { Card } from './card';
        const view = <Card styles={{ fill: { 'hovered': '#blue' } }} />;
      `,
    },
  ],
  invalid: [
    // State map with neither '' default nor '_' floor
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          fill: {
            'hovered': '#blue',
            'pressed': '#red',
          },
        }});
      `,
      errors: [{ messageId: 'missingDefaultState' }],
    },
  ],
});
