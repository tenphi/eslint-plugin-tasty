import { RuleTester } from '@typescript-eslint/rule-tester';
import { fileURLToPath } from 'node:url';
import rule from './valid-sub-element.js';

const tester = new RuleTester({
  defaultFilenames: {
    ts: fileURLToPath(
      new URL(
        '../../test/fixtures/style-functions/component.ts',
        import.meta.url,
      ),
    ),
    tsx: fileURLToPath(
      new URL(
        '../../test/fixtures/style-functions/component.tsx',
        import.meta.url,
      ),
    ),
  },
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const styles = (selector: string) =>
  `import { tasty } from '@tenphi/tasty'; tasty({ styles: { Heading: { $: ${JSON.stringify(selector)}, preset: 'h1' } } });`;
const rootError = (name = 'Heading', selector = '&:is(h1)') => ({
  messageId: 'subElementTargetsRoot' as const,
  data: { name, selector },
});

tester.run('valid-sub-element', rule, {
  valid: [
    ...[
      'h1',
      '>h1',
      ':is(h1, h2)',
      ':where(h1)',
      '@',
      '>@',
      '>Body>Heading',
      'h1 >',
      'h1 *',
      '.heading',
      '[data-element="Heading"]',
      '&::before',
      '&::after',
      '&::marker',
      '&::part(label)',
      '&:before',
      '&:after',
      '&:first-line',
      '&:first-letter',
      '&::BEFORE',
      '&:is(h1)::before',
      '&:hover::before',
      '&::before, &::after',
      '&>h1',
      '&:is(h1)>span',
      '&@',
      '&@.heading',
      '&@::before',
      '&Body',
      '&:is(h1)span',
      '&:is(h1) .heading',
      '&h1 h2',
      '&',
      '',
      '/* &:is(h1) */ h1',
      '[data-label="&:is(h1)"]',
      String.raw`\&:is(h1)`,
      String.raw`&:b\65 fore`,
      '&:is(h1',
    ].map(styles),
    `const metadata = { Heading: { $: '&:is(h1)' } };`,
    `import { tasty } from 'unrelated'; tasty({ styles: { Heading: { $: '&:is(h1)' } } });`,
    `const styles: CSSProperties = { Heading: { $: '&:is(h1)' } };`,
    `import { tasty } from '@tenphi/tasty'; tasty({ styles: { $: '&:is(h1)' }, variants: { Level1: { $: '&:is(h1)', preset: 'h1' } } });`,
    `import { tastyStatic } from '@tenphi/tasty/static'; tastyStatic('&:is(h1)', { preset: 'h1' });`,
    `import { tasty } from '@tenphi/tasty'; tasty({ styles: { Heading: { $: dynamic }, Other: { $: \`&:is(\${tag})\` } } });`,
    `const story = { args: { styles: { fill: { Heading: { $: '&:is(h1)' } } } } };`,
    `import { tasty } from '@tenphi/tasty'; function render(tasty) { tasty({ styles: { Heading: { $: '&:is(h1)' } } }); }`,
    `import { tasty } from '@tenphi/tasty'; tasty({ styles: { '@font-face': { Heading: { $: '&:is(h1)' } } } });`,
    `import { tasty } from '@tenphi/tasty'; tasty({ styles: { Heading: { [dynamic]: '&:is(h1)' }, [elementName]: { $: '&:is(h1)' } } });`,
    `import { defineComponent } from '@my-org/styling'; defineComponent('Card', { props: { Heading: { $: '&:is(h1)' } } });`,
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          Title: { preset: 'h3' },
          Content: { color: '#text' },
        }});
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          Fill: false,
        }});
      `,
    },
  ],
  invalid: [
    ...[
      '&:is(h1)',
      '&:where(h1)',
      '&:is(h1,h2)',
      '&:is(:where(h1))',
      '& :is(h1)',
      '&:is(h1) :is(h2)',
      '&.heading .active',
      '&Heading',
      '&:is(::before)',
      '&.heading',
      '&[data-level="1"]',
      '&::before, &:is(h1)',
      '&:is(h1), &::before',
    ].map((selector) => ({
      code: styles(selector),
      output: null,
      errors: [
        rootError(
          'Heading',
          selector.includes(', &') || selector.startsWith('&::before,')
            ? '&:is(h1)'
            : selector,
        ),
      ],
    })),
    {
      name: 'six root heading selectors from the reported example',
      code: `import { tasty } from '@tenphi/tasty'; tasty({ styles: {
        Level1: { $: "&:is(h1)", preset: "h1" },
        Level2: { $: "&:is(h2)", preset: "h2" },
        Level3: { $: "&:is(h3)", preset: "h3" },
        Level4: { $: "&:is(h4)", preset: "h4" },
        Level5: { $: "&:is(h5)", preset: "h5" },
        Level6: { $: "&:is(h6)", preset: "h6" },
      } });`,
      output: null,
      errors: Array.from({ length: 6 }, (_, index) =>
        rootError(`Level${index + 1}`, `&:is(h${index + 1})`),
      ),
    },
    ...[
      `import { tasty as component } from '@tenphi/tasty'; component(Base, { styles: { Heading: { $: '&:is(h1)' } } });`,
      `import { tasty } from '@tenphi/tasty'; tasty({ variants: { Active: { Heading: { $: '&:is(h1)' } } } });`,
      `import { tastyStatic } from '@tenphi/tasty/static'; tastyStatic({ Heading: { $: '&:is(h1)' } });`,
      `import { useStyles } from '@tenphi/tasty'; useStyles({ Heading: { $: '&:is(h1)' } });`,
      `import { useGlobalStyles } from '@tenphi/tasty'; useGlobalStyles('main', { Heading: { $: '&:is(h1)' } });`,
      `const headingStyles = { Heading: { $: '&:is(h1)' } };`,
      `const styles: Styles = { Heading: { $: '&:is(h1)' } };`,
      `const styles = { Heading: { $: '&:is(h1)' as const } satisfies Styles } satisfies Styles;`,
      `const styles = { Outer: { Heading: { $: '&:is(h1)' } as const } } as Styles;`,
      `const node = <Card styles={{ Heading: { $: '&:is(h1)' } }} />;`,
      `const story = { args: { styles: { Heading: { $: '&:is(h1)' } } } };`,
      `import { tasty } from '@tenphi/tasty'; tasty({ styles: { Heading: { ['$']: '&:is(h1)' } } });`,
      `import { tasty } from '@tenphi/tasty'; tasty({ styles: { Heading: { [\`$\`]: \`&:is(h1)\` } } });`,
      `import { tasty } from '@tenphi/tasty'; tasty({ styles: { ['Heading']: { $: '&:is(h1)' } } });`,
      `import { defineComponent } from '@my-org/styling'; defineComponent('Card', { styles: { Heading: { $: '&:is(h1)' } } });`,
      `import { mergeStyles } from '@my-org/styling'; mergeStyles(base, { Heading: { $: '&:is(h1)' } });`,
    ].map((code) => ({ code, output: null, errors: [rootError()] })),
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { Title: '#purple' } });
      `,
      errors: [{ messageId: 'subElementNotObject' }],
    },
  ],
});
