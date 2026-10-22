import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './no-own-at-root.js';

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
  },
});

tester.run('no-own-at-root', rule, {
  valid: [
    // @own() inside sub-element is fine
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          Icon: {
            fill: {
              '': '#white',
              '@own(:hover)': '#blue',
            },
          },
        }});
      `,
    },
    // Plain pseudo-class at root is fine
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          fill: {
            '': '#white',
            ':hover': '#blue',
          },
        }});
      `,
    },
    // Shared styles may be spread into a sub-element, where @own() matters.
    {
      code: `
        import { tasty, type Styles } from '@tenphi/tasty';
        const CELL_STYLES: Styles = {
          textAlign: { '': 'start', '@own(align=center)': 'center' },
          position: { '': 'static', '@own(pin=start | pin=end)': 'sticky' },
          Icon: { fill: { '': '#white', '@own(:hover)': '#blue' } },
        };
        const VARIANTS: Record<string, Styles> = {
          pinned: { position: { '': 'static', '@own(pin)': 'sticky' } },
        };
        const cellStyles = { fill: { '': '#white', '@own(selected)': '#blue' } };
        tasty({
          styles: {
            Cell: { $: '> Body > Row >', ...CELL_STYLES },
            HeaderCell: { $: '> Head > Row >', ...CELL_STYLES },
          },
        });
      `,
    },
    // Non-tasty code is ignored
    {
      code: `
        const obj = { fill: { '@own(:hover)': 'red' } };
      `,
    },
  ],
  invalid: [
    // @own() at root level
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          fill: {
            '': '#white',
            '@own(:hover)': '#blue',
          },
        }});
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          fill: {
            '': '#white',
            ':hover': '#blue',
          },
        }});
      `,
      errors: [{ messageId: 'ownAtRoot' }],
    },
    // @own() in complex expression at root
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          transform: {
            '': 'scale(1)',
            '@parent(:hover) & !@own(:hover)': 'scale(0.95)',
          },
        }});
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          transform: {
            '': 'scale(1)',
            '@parent(:hover) & !:hover': 'scale(0.95)',
          },
        }});
      `,
      errors: [{ messageId: 'ownAtRoot' }],
    },
    // Every @own() term is unwrapped on its own, and a term with operators
    // inside stays grouped.
    ...[
      [
        '@own(kind=selection) | @own(kind=actions)',
        'kind=selection | kind=actions',
      ],
      ['@own(pin-edge) & @own(pin=start)', 'pin-edge & pin=start'],
      [
        '@own(cell-selected) & @own(pin-edge) & @own(pin=end)',
        'cell-selected & pin-edge & pin=end',
      ],
      ['@own(pin=start | pin=end)', 'pin=start | pin=end'],
      ['@own(hovered | focused) & active', '(hovered | focused) & active'],
      ['!@own(hovered & focused) | active', '!(hovered & focused) | active'],
    ].map(([before, after]) => ({
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: { '': '#white', '${before}': '#blue' } } });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: { '': '#white', '${after}': '#blue' } } });
      `,
      errors: [{ messageId: 'ownAtRoot' as const }],
    })),
    {
      // A comma inside @own() would not survive grouping: report, don't fix.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: { '': '#white', '@own(hovered, focused) & active': '#blue' } } });
      `,
      output: null,
      errors: [{ messageId: 'ownAtRoot' }],
    },
  ],
});
