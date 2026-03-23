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
  ],
});
