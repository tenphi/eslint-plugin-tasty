import { fileURLToPath } from 'node:url';
import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './no-state-in-selector.js';

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
const styles = (selector: string) =>
  `import { tasty } from '@tenphi/tasty'; tasty({ styles: { Media: { $: ${JSON.stringify(selector)}, inlineSize: 'max 100%' } } });`;
const error = (condition: string) => ({
  messageId: 'stateInSelector' as const,
  data: { condition },
});
const customImports = `import { defineComponent, extendComponent, resolveComponentStyles, mergeStyles } from '@my-org/styling';`;

tester.run('no-state-in-selector', rule, {
  valid: [
    ...[
      'img, picture, video, canvas, svg, iframe',
      ':where(picture)',
      ':is(img, :where(picture, svg))',
      '>Body> Cell',
      '> @',
      '&::before',
      '@::after',
      'p::first-line',
      '::part(label)',
      '::slotted(img)',
      ':before',
      ':after',
      ':first-line',
      ':first-letter',
      '> .media + #preview',
      '[data-element="Media"] > img',
      '[data-element=":hover[width]"]',
      ':where([data-element="Media"])',
      'svg|svg, *|img',
      String.raw`.hover\:state`,
      String.raw`#attribute\[width\]`,
      String.raw`:w\68 ere(picture)`,
      String.raw`:W\48 ERE(picture)`,
      String.raw`:b\65 fore`,
      String.raw`[data\2d element="Media"]`,
      'img /* :hover [width] */',
      // Conditions on the element a pseudo-element belongs to stay in `$`:
      // Tasty applies @own() to the pseudo-element itself.
      'a[rel="next"]::before',
      'dialog[open]::backdrop',
      'li:last-child::marker',
      'a:hover::before',
      '@:hover::marker',
      '&:focus-visible::before',
      'summary[open]::-webkit-details-marker',
      ':is(a:hover, button[disabled])::after',
      'a[rel]:before',
      'li:nth-child(2n):after',
      'p:first-child:first-line',
      String.raw`a[rel]:b\65 fore`,
      'a[rel="next"]::BEFORE',
      'x-button[disabled]::part(label)',
      '@:hover::part(label)',
      '::slotted(img:hover)',
      '::slotted(img[width])',
      'a:hover::after::marker',
      '::after:hover::marker',
      'summary[open]::marker, li:last-child::marker',
      'summary:not([data-not-content] *)::marker, summary:not([data-not-content] *)::-webkit-details-marker',
      'dialog[open][data-open]::backdrop',
      '> Anchor[data-copy-state="copied"]::after',
      'pre > code > Line:empty::before',
      // @own() cannot express these on a pseudo-element: Tasty drops them.
      '::part(label):first-child',
      '::part(label):not([open])',
      '::before:has(img)',
      // Malformed and incomplete selector text is outside this rule's scope.
      'img:not([width]',
      'img[',
    ].map(styles),
    `const metadata = { Media: { $: 'img:hover' } };`,
    `import { tasty } from 'unrelated'; tasty({ styles: { Media: { $: 'img:hover' } } });`,
    `import { tasty } from '@tenphi/tasty'; function render(tasty) { tasty({ styles: { Media: { $: 'img:hover' } } }); }`,
    `import { tastyStatic } from '@tenphi/tasty/static'; tastyStatic('img:hover', { color: '#text' });`,
    `import { useGlobalStyles } from '@tenphi/tasty'; useGlobalStyles('img[width]', { color: '#text' });`,
    `import { tasty } from '@tenphi/tasty'; tasty({ styles: { $: 'img:hover', Media: { $: dynamic }, Other: { $: \`img\${condition}\` } } });`,
    `import { tasty } from '@tenphi/tasty'; tasty({ styles: { Media: { [dynamic]: 'img:hover' } } });`,
    `import { tasty } from '@tenphi/tasty'; tasty({ styles: { Media: { $: 'img', inlineSize: { '_': false, '@own(![width])': 'max 100%' } } } });`,
    `import { tasty } from '@tenphi/tasty'; tasty({ styles: { Media: { $: 'img', color: { '': '#text', '@own(:hover)': '#active', ':hover': '#other' } } } });`,
    `import { tasty } from '@tenphi/tasty'; tasty({ variants: { Active: { $: 'img:hover', fill: '#active' } } });`,
    `const styles: CSSProperties = { Media: { $: 'img:hover' } };`,
    `const story = { args: { styles: { fill: { Media: { $: 'img:hover' } } } } };`,
    customImports +
      `defineComponent('Card', { props: { Media: { $: 'img:hover' } } });`,
  ],
  invalid: [
    ...[
      ['img:not([width])', ':not([width])'],
      ['video[height]', '[height]'],
      ['a[href^="https:"]', '[href^="https:"]'],
      ['button[disabled]', '[disabled]'],
      ['@ [data-active]', '[data-active]'],
      ['[data-element]', '[data-element]'],
      ['[data-element^="Media"]', '[data-element^="Media"]'],
      ['[other|data-element="Media"]', '[other|data-element="Media"]'],
      ['@ [data-state="[x]:hover"]', '[data-state="[x]:hover"]'],
      ['>@:hover', ':hover'],
      ['tbody tr:last-child > td', ':last-child'],
      ['@ :nth-child(2n + 1)', ':nth-child(2n + 1)'],
      [':not(.excluded)', ':not(.excluded)'],
      [':has(> img)', ':has(> img)'],
      [':where(img:not([width]), picture)', ':not([width])'],
      [':is(:where(picture), img[width])', '[width]'],
      [':is(img, :where(video:focus))', ':focus'],
      ['img::before:hover', ':hover'],
      // Without a pseudo-element, the same conditions belong in state maps.
      ['a[rel="next"]', '[rel="next"]'],
      ['li:last-child', ':last-child'],
      ['dialog[open]', '[open]'],
      ['a:hover::before > span', ':hover'],
      ['li:last-child > a::before', ':last-child'],
      ['details:not([open]) > summary::marker', ':not([open])'],
      // States after a pseudo-element are its own: @own(:hover) matches them.
      ['@::part(label):hover', ':hover'],
      ['::-webkit-scrollbar-thumb:hover', ':hover'],
      ['::slotted(img):focus-visible', ':focus-visible'],
      ['a[rel]:before:hover', ':hover'],
      ['a:hover::before:focus', ':focus'],
      ['::part(label):not(:hover)', ':not(:hover)'],
      ['::part(label):is(:hover, :focus)', ':hover'],
      // Each item of a selector list is judged on its own.
      ['summary::marker, li:last-child', ':last-child'],
      ['li:last-child::marker, a:hover', ':hover'],
      ['a[rel]::before, a[rel]', '[rel]'],
      ['picture, img:hover', ':hover'],
      [':HOVER', ':HOVER'],
      [String.raw`:w\68 ere(img:hover)`, ':hover'],
      [String.raw`.escaped\:hover:hover`, ':hover'],
      [String.raw`:h\6f ver`, String.raw`:h\6f ver`],
    ].map(([selector, condition]) => ({
      code: styles(selector),
      output: null,
      errors: [error(condition)],
    })),
    {
      name: 'both responsive selectors from Cookbook, one warning per selector',
      code: `import { tasty } from '@tenphi/tasty'; tasty({ styles: {
        ResponsiveWidth: {
          $: 'img:not([width]), :where(picture), video:not([width]), canvas:not([width]), svg:not([width]), iframe:not([width])',
          inlineSize: 'max 100%',
        },
        ResponsiveHeight: {
          $: 'img:not([height]), :where(picture), video:not([height]), canvas:not([height]), svg:not([height])',
          blockSize: 'auto',
        },
      } });`,
      errors: [error(':not([width])'), error(':not([height])')],
    },
    ...[
      `import { tasty as component } from '@tenphi/tasty'; component(Base, { styles: { Media: { $: 'img:hover' } } });`,
      `import { tasty } from '@tenphi/tasty'; tasty({ variants: { Active: { Media: { $: 'img:hover' } } } });`,
      `import { tastyStatic } from '@tenphi/tasty/static'; tastyStatic({ Media: { $: 'img:hover' } });`,
      `import { tastyStatic } from '@tenphi/tasty/static'; tastyStatic('main', { Media: { $: 'img:hover' } });`,
      `import { tastyStatic } from '@tenphi/tasty/static'; tastyStatic(base, { Media: { $: 'img:hover' } });`,
      `import { useGlobalStyles } from '@tenphi/tasty'; useGlobalStyles('main', { Media: { $: 'img:hover' } });`,
      `import { useStyles } from '@tenphi/tasty'; useStyles({ Media: { $: 'img:hover' } });`,
      `const mediaStyles = { Media: { $: 'img:hover' } };`,
      `const styles: Styles = { Media: { $: 'img:hover' } };`,
      `const styles = { Media: { $: 'img:hover' } } satisfies Styles;`,
      `const styles = { Outer: { Media: { $: 'img:hover' } as const } } as Styles;`,
      `const node = <Card styles={{ Media: { $: 'img:hover' } }} />;`,
      `const story = { args: { styles: { Media: { $: 'img:hover' } } } };`,
      `import { tasty } from '@tenphi/tasty'; tasty({ styles: { Media: { $: 'img:hover' as const } satisfies Styles } });`,
      `import { tasty } from '@tenphi/tasty'; tasty({ styles: { Outer: { Media: { $: 'img:hover' } } } });`,
      `import { tasty } from '@tenphi/tasty'; tasty({ styles: { Media: { ['$']: 'img:hover' } } });`,
      `import { tasty } from '@tenphi/tasty'; tasty({ styles: { Media: { [\`$\`]: \`img:hover\` } } });`,
      String.raw`import { tasty } from '@tenphi/tasty'; tasty({ styles: { Media: { $: 'img:ho\u0076er' } } });`,
      customImports +
        `defineComponent('Card', { styles: { Media: { $: 'img:hover' } } });`,
      customImports +
        `extendComponent(Base, { styles: { Media: { $: 'img:hover' } } });`,
      customImports +
        `resolveComponentStyles('Card', { Media: { $: 'img:hover' } });`,
      customImports + `mergeStyles(base, { Media: { $: 'img:hover' } });`,
    ].map((code) => ({ code, output: null, errors: [error(':hover')] })),
  ],
});
