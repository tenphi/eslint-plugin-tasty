import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './no-unknown-state-alias.js';

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
  },
});

tester.run('no-unknown-state-alias', rule, {
  valid: [
    // No states configured and no local aliases — rule is inactive
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          fill: {
            '': '#white',
            '@anything': '#blue',
          },
        }});
      `,
    },
    // Local state alias defined and referenced — should be recognized
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
    // Local state alias used in sub-element
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
    // Built-in state prefixes with local aliases present
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          '@active': '@root(active)',
          fill: {
            '': '#white',
            '@media(w < 768px)': '#small',
            '@root(theme=dark)': '#dark',
            '@active': '#blue',
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
            '@mobile': '#small-bg',
          },
        }});
      `,
    },
    // Known alias at the start of a compound key
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          '@selected': ':checked',
          fill: {
            '': '#white',
            '@selected | indeterminate': '#blue',
            '@selected & @media(w < 768px)': '#purple',
            '@selected & !disabled': '#green',
          },
        }});
      `,
    },
    // Known alias inside groups, after operators, and in computed keys
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          '@selected': ':checked',
          fill: {
            '': '#white',
            '(@selected | indeterminate)': '#blue',
            'hovered & @selected': '#purple',
            '!@selected': '#gray',
            ['@selected, indeterminate']: '#green',
          },
        }});
      `,
    },
    // Built-in prefixes mixed with aliases in compound keys
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          '@selected': ':checked',
          fill: {
            '': '#white',
            '@root(theme=dark) & @selected': '#dark',
            '@starting | @selected': '#clear',
            '@(w < 600px) & @selected': '#small',
            '@supports(display: grid) | @root(@selected)': '#grid',
          },
        }});
      `,
    },
  ],
  invalid: [
    // Local alias defined but unknown alias used
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          '@active': '@root(active)',
          fill: {
            '': '#white',
            '@unknown': '#blue',
          },
        }});
      `,
      errors: [{ messageId: 'unknownAlias' }],
    },
    // Unknown alias in compound keys is reported by its own name
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          '@selected': ':checked',
          fill: {
            '': '#white',
            '@unknown | indeterminate': '#blue',
            'hovered & @missing': '#purple',
            '(@absent | indeterminate)': '#green',
            '@root(@nested)': '#gray',
          },
        }});
      `,
      errors: [
        { messageId: 'unknownAlias', data: { alias: '@unknown' } },
        { messageId: 'unknownAlias', data: { alias: '@missing' } },
        { messageId: 'unknownAlias', data: { alias: '@absent' } },
        { messageId: 'unknownAlias', data: { alias: '@nested' } },
      ],
    },
    // Each distinct unknown alias in a key is reported once
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          '@selected': ':checked',
          fill: {
            '': '#white',
            '@selected & @unknown | @unknown & @other': '#blue',
          },
        }});
      `,
      errors: [
        { messageId: 'unknownAlias', data: { alias: '@unknown' } },
        { messageId: 'unknownAlias', data: { alias: '@other' } },
      ],
    },
  ],
});
