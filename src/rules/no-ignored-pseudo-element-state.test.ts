import { fileURLToPath } from 'node:url';
import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './no-ignored-pseudo-element-state.js';

const filename = fileURLToPath(
  new URL('../../test/fixtures/style-functions/component.ts', import.meta.url),
);
const tester = new RuleTester({
  defaultFilenames: { ts: filename, tsx: filename.replace(/ts$/, 'tsx') },
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});
const sub = (selector: string, state: string) =>
  `import { tasty } from '@tenphi/tasty'; tasty({ styles: { Target: { $: ${JSON.stringify(selector)}, color: { '': '#text', ${JSON.stringify(state)}: '#active' } } } });`;
const error = (state: string, selector: string, mismatch: string) => ({
  messageId: 'ignoredState' as const,
  data: { state, selector, mismatch },
});

tester.run('no-ignored-pseudo-element-state', rule, {
  valid: [
    // A pseudo-element can be in a pseudo-class state: @own() puts it after.
    ...[
      '@own(:hover)',
      '@own(:focus-visible | :hover)',
      '@own(!:hover)',
      '@own(:not(:hover))',
      '@own(:is(:hover, :focus))',
      // Root, @parent, @root and at-rule states describe other things.
      'selected',
      ':focus',
      '[open]',
      'theme=dark',
      '@parent([open])',
      '@parent(hovered, >)',
      '@root(theme=dark)',
      '@media(w < 768px)',
      '@(layout, w < 600px)',
      '@supports(display: grid)',
      '@starting',
      // Aliases are resolved by Tasty, not here.
      '@own(@open)',
      // Malformed keys are valid-state-key's to report.
      '@own([open]',
    ].map((state) => sub('a::before', state)),
    // Selectors that end in an element keep attribute states.
    ...['>@', 'a.link', 'a[title="x::y"]', '::before span', 'Label'].map(
      (selector) => sub(selector, '@own([open])'),
    ),
    `import { tasty } from '@tenphi/tasty'; tasty({ styles: { Target: { color: { '': '#text', '@own([open])': '#active' } } } });`,
    `import { tasty } from '@tenphi/tasty'; tasty({ styles: { Target: { $: dynamic, color: { '@own([open])': '#active' } } } });`,
    `import { tasty } from '@tenphi/tasty'; tasty({ styles: { Target: { $: 'a[rel="next"]::before', content: '"→"' } } });`,
    `import { tasty } from '@tenphi/tasty'; tasty({ styles: { color: { '': '#text', '@own([open])': '#active' }, '&:hover': { color: { 'hovered': '#x' } } } });`,
    `import { tasty } from '@tenphi/tasty'; tasty({ styles: { Target: { $: 'a::before', '& > span': { color: { '@own([open])': '#x' } } } } });`,
    `import { tasty } from '@tenphi/tasty'; tasty({ styles: { Link: { $: 'a::before', Inner: { $: 'span', color: { '@own([open])': '#x' } } } } });`,
    `import { tasty } from '@tenphi/tasty'; tasty({ styles: { Link: { $: dynamic, Inner: { $: '&:hover', color: { '@own([open])': '#x' } } } } });`,
    `const metadata = { Target: { $: 'a::before', color: { '@own([open])': '#x' } } };`,
    `import { tasty } from 'unrelated'; tasty({ styles: { Target: { $: 'a::before', color: { '@own([open])': '#x' } } } });`,
    // A selector-mode base that ends in an element, or is not a literal.
    `import { useGlobalStyles } from '@tenphi/tasty'; useGlobalStyles('.card', { color: { '': 'red', '[data-on]': 'blue', selected: 'green' } });`,
    `import { useGlobalStyles } from '@tenphi/tasty'; useGlobalStyles(selector, { color: { '': 'red', '[data-on]': 'blue' } });`,
    `import { useGlobalStyles } from '@tenphi/tasty'; useGlobalStyles('.card::before', { color: { '': 'red', ':hover': 'blue', '@parent(.dark)': 'green', '@root(.dark)': 'gray' } });`,
    `import { tastyStatic } from '@tenphi/tasty/static'; tastyStatic('.host::part(x)', { color: { '': 'red', ':focus': 'blue' } });`,
    `import { tastyStatic } from '@tenphi/tasty/static'; tastyStatic(base, { color: { '': 'red', selected: 'blue' } });`,
  ],
  invalid: [
    // Tasty's own list of dropped states (tenphi/tasty#406).
    ...[
      ['@own([rel="next"])', 'attributes'],
      ['!@own([open])', 'attributes'],
      ['@own(hovered)', 'modifiers'],
      ['@own(theme=dark)', 'modifiers'],
      ['@own(.active)', 'classes or ids'],
      ['@own(:first-child)', 'position in the DOM tree'],
      ['@own(:nth-child(2n))', 'position in the DOM tree'],
      ['@own(:has(img))', 'position in the DOM tree'],
      ['@own(:empty)', 'position in the DOM tree'],
      ['@own(:not([open]))', 'attributes'],
      ['@own(:hover | [open])', 'attributes'],
      ['@own(:hover) & @own([open])', 'attributes'],
      [':focus & @own([open])', 'attributes'],
      ['@own([open] & hovered)', 'attributes'],
    ].map(([state, mismatch]) => ({
      code: sub('a::before', state),
      errors: [error(state, 'a::before', mismatch)],
    })),
    ...[
      '@::marker',
      'dialog::backdrop',
      'summary::-webkit-details-marker',
      '>@::part(label)',
      '@::part(label):hover',
      'a[rel="next"]::before',
      'li:first-child::marker',
      'a:before',
      'p:first-letter',
      String.raw`a:b\65 fore`,
      '::slotted(img)',
      '&::after',
    ].map((selector) => ({
      code: sub(selector, '@own([open])'),
      errors: [error('@own([open])', selector, 'attributes')],
    })),
    {
      name: 'each item of a $ list on its own',
      code: sub('summary::marker, summary', '@own([open])'),
      errors: [error('@own([open])', 'summary::marker', 'attributes')],
    },
    {
      name: 'every mismatching key in a map, other properties and tokens too',
      code: `import { tasty } from '@tenphi/tasty'; tasty({ styles: { Icon: {
        $: 'a::before',
        content: { '': 'none', '@own(:hover)': '""', '@own([rel])': '"x"' },
        color: { '': '#text', ':focus': '#accent', '@own(hovered)': '#active' },
        $size: { '': '1x', '@own(:first-child)': '2x' },
        '#icon': { '': '#text', ['@own(.active)']: '#active' },
      } } });`,
      errors: [
        error('@own([rel])', 'a::before', 'attributes'),
        error('@own(hovered)', 'a::before', 'modifiers'),
        error('@own(:first-child)', 'a::before', 'position in the DOM tree'),
        error('@own(.active)', 'a::before', 'classes or ids'),
      ],
    },
    {
      name: 'an & key that ends in a pseudo-element',
      code: `import { tasty } from '@tenphi/tasty'; tasty({ styles: { '&::before': { color: { '': 'red', '@own(:hover)': 'blue', '@own([open])': 'green' } } } });`,
      errors: [error('@own([open])', '&::before', 'attributes')],
    },
    {
      name: 'an & key under a sub-element that ends in a pseudo-element',
      code: `import { tasty } from '@tenphi/tasty'; tasty({ styles: { Icon: { $: 'a::before', '&:hover': { color: { '': 'red', '@own([open])': 'green' } } } } });`,
      errors: [error('@own([open])', 'a::before:hover', 'attributes')],
    },
    {
      name: 'a nested sub-element whose $ attaches to its owner with &',
      code: `import { tasty } from '@tenphi/tasty'; tasty({ styles: { Link: { $: 'a', Arrow: { $: '&::after', color: { '': 'red', '@own(hovered)': 'green' } } }, Part: { $: '@::part(x)', State: { $: '&:hover', color: { '': 'red', '@own(.on)': 'green' } } } } });`,
      errors: [
        error('@own(hovered)', 'a::after', 'modifiers'),
        error('@own(.on)', '@::part(x):hover', 'classes or ids'),
      ],
    },
    {
      name: 'root states of a selector-mode base that ends in a pseudo-element',
      code: `import { useGlobalStyles } from '@tenphi/tasty'; useGlobalStyles('.card::before', { color: { '': 'red', '[data-on]': 'blue', selected: 'green', '@own(:first-child)': 'gray' } });`,
      errors: [
        error('[data-on]', '.card::before', 'attributes'),
        error('selected', '.card::before', 'modifiers'),
        error(
          '@own(:first-child)',
          '.card::before',
          'position in the DOM tree',
        ),
      ],
    },
    {
      name: 'the items of a selector-mode base list by what they end in',
      code: `import { useGlobalStyles } from '@tenphi/tasty'; useGlobalStyles('.b, .a::before, .c:after', { color: { '': 'red', '[data-on]': 'blue' } });`,
      errors: [error('[data-on]', '.a::before', 'attributes')],
    },
    {
      name: 'tastyStatic selector mode, including sub-elements and & keys',
      code: `import { tastyStatic } from '@tenphi/tasty/static'; tastyStatic('.card::before', { color: { '': 'red', '.dark': 'blue' }, '&:hover': { fill: { '': '#a', hovered: '#b' } } });`,
      errors: [
        error('.dark', '.card::before', 'classes or ids'),
        error('hovered', '.card::before', 'modifiers'),
      ],
    },
    ...[
      `import { tasty } from '@tenphi/tasty'; tasty({ variants: { Active: { Icon: { $: 'a::before', color: { '@own([open])': '#x' } } } } });`,
      `import { tasty } from '@tenphi/tasty'; tasty(Base, { styles: { Outer: { Icon: { $: 'a::before', color: { '@own([open])': '#x' } } as const } } });`,
      `import { tasty } from '@tenphi/tasty'; tasty({ styles: { Icon: { $: 'a::before' as const, color: { '@own([open])': '#x' } satisfies object } } });`,
      `import { tasty } from '@tenphi/tasty'; tasty({ styles: { Icon: { [\`$\`]: \`a::before\`, color: { '@own([open])': '#x' } } } });`,
      `import { useStyles } from '@tenphi/tasty'; useStyles({ Icon: { $: 'a::before', color: { '@own([open])': '#x' } } });`,
      `const iconStyles = { Icon: { $: 'a::before', color: { '@own([open])': '#x' } } };`,
      `const node = <Card styles={{ Icon: { $: 'a::before', color: { '@own([open])': '#x' } } }} />;`,
    ].map((code) => ({
      code,
      errors: [error('@own([open])', 'a::before', 'attributes')],
    })),
  ],
});
