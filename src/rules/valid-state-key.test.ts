import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './valid-state-key.js';

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
  },
});

tester.run('valid-state-key', rule, {
  valid: [
    // Default (empty) state
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
    // Pseudo-classes
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          fill: {
            '': '#white',
            ':hover': '#blue',
            ':focus-visible': '#red',
          },
        }});
      `,
    },
    // Combined states with AND
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          fill: {
            '': '#white',
            'hovered & !disabled': '#blue',
          },
        }});
      `,
    },
    // Value modifier
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          fill: {
            '': '#white',
            'theme=dark': '#dark',
          },
        }});
      `,
    },
    // @media dimension query
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          padding: {
            '': '2x',
            '@media(w < 768px)': '1x',
          },
        }});
      `,
    },
    // @media range query
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          fill: {
            '': '#white',
            '@media(600px <= w < 1200px)': '#blue',
          },
        }});
      `,
    },
    // @root state
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          fill: {
            '': '#white',
            '@root(theme=dark)': '#dark',
          },
        }});
      `,
    },
    // @starting
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          fill: {
            '': '#white',
            '@starting': '#transparent',
          },
        }});
      `,
    },
    // @supports
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          fill: {
            '': '#white',
            '@supports(display: grid)': '#blue',
          },
        }});
      `,
    },
    // OR operator
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          fill: {
            '': '#white',
            'hovered | focused': '#blue',
          },
        }});
      `,
    },
    // Value modifier with operators
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          fill: {
            '': '#white',
            'size=large': '#blue',
            'size^=sm': '#green',
          },
        }});
      `,
    },
    // Class selector
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          fill: {
            '': '#white',
            '.active': '#blue',
          },
        }});
      `,
    },
    // Attribute selector
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          fill: {
            '': '#white',
            '[aria-expanded="true"]': '#blue',
          },
        }});
      `,
    },
    // Container query
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          width: {
            '': '100%',
            '@(w < 600px)': '50%',
          },
        }});
      `,
    },
    // @parent state
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          fill: {
            '': '#white',
            '@parent(hovered)': '#blue',
          },
        }});
      `,
    },
    // @parent with direct parent syntax
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          fill: {
            '': '#white',
            '@parent(theme=dark, >)': '#dark',
          },
        }});
      `,
    },
    // Non-tasty code should be ignored
    {
      code: `
        const obj = { fill: { '???': 'red' } };
      `,
    },
    // Local state alias defined and referenced in the same styles object
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          '@active': '@root(active)',
          fill: {
            '': '#white',
            '@active': '#blue',
          },
        }});
      `,
    },
    // Local state alias used in combined expression
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          '@active': '@root(active)',
          fill: {
            '': '#white',
            '@active & hovered': '#blue',
          },
        }});
      `,
    },
    // Local state alias referenced inside a sub-element
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          '@active': '@root(active)',
          Title: {
            fill: {
              '': '#white',
              '@active': '#blue',
            },
          },
        }});
      `,
    },
    // Multiple local state aliases
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          '@dark': '@root(schema=dark)',
          '@mobile': '@media(w < 768px)',
          fill: {
            '': '#white',
            '@dark': '#dark-bg',
          },
          padding: {
            '': '2x',
            '@mobile': '1x',
          },
        }});
      `,
    },
  ],
  invalid: [
    // Unrecognized characters
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          fill: {
            '': '#white',
            '???': '#blue',
          },
        }});
      `,
      errors: [{ messageId: 'invalidStateKey' }],
    },
    // Invalid token (starts with number)
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          fill: {
            '': '#white',
            '123invalid': '#blue',
          },
        }});
      `,
      errors: [{ messageId: 'invalidStateKey' }],
    },
    // @own() outside sub-element
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          fill: {
            '': '#white',
            '@own(hovered)': '#blue',
          },
        }});
      `,
      errors: [{ messageId: 'ownOutsideSubElement' }],
    },
  ],
});
