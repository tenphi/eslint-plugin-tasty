import { RuleTester } from '@typescript-eslint/rule-tester';
import { fileURLToPath } from 'node:url';
import rule from './prefer-element-selector.js';

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

const styles = (selector: string, owner = 'Search') =>
  `import { tasty } from '@tenphi/tasty'; tasty({ styles: { ${owner}: { $: \`${selector}\`, display: 'block' } } });`;
const error = { messageId: 'preferElementSelector' as const };

tester.run('prefer-element-selector', rule, {
  valid: [
    ...[
      'Primary > Search',
      '[data-element="Other"]',
      '[data-element="search"]',
      '[data-element="Search-Icon"]',
      '[data-element="Search_Icon"]',
      '[data-element="Search" i]',
      '[data-element="Search" s]',
      '[data-element~="Search"]',
      '[data-element|="Search"]',
      '[data-element^="Search"]',
      '[ns|data-element="Search"]',
      '[|data-element="Search"]',
      '[DATA-ELEMENT="Search"]',
      '[data-label="[data-element=Search]"]',
      'Primary[data-element="Search"]',
      '.primary[data-element="Search"]',
      'Primary [data-element="Search"]',
      ':is([data-element="Search"])',
      '[data-element="Search"]:hover',
      '/* comment */ [data-element="Search"]',
      '[data-element="Search"',
      '[data-element="Search"]#id',
      '[data-element="Search"]Primary',
      '[data-element="Search"]span',
      '[data-label="x,y"] > [data-element="Search"]',
      String.raw`[data-element="S\\65 arch"]`,
    ].map((selector) => styles(selector)),
    `const object = { Search: { $: '[data-element="Search"]' } };`,
    `import { tasty } from 'unrelated'; tasty({ styles: { Search: { $: '[data-element="Search"]' } } });`,
    `import { tasty } from '@tenphi/tasty'; tasty({ styles: { $: '[data-element="Search"]', content: '[data-element="Search"]' } });`,
    `import { tastyStatic } from '@tenphi/tasty/static'; tastyStatic('[data-element="Search"]', { display: 'block' });`,
    `import { useGlobalStyles } from '@tenphi/tasty'; useGlobalStyles('[data-element="Search"]', { display: 'block' });`,
    `import { tasty } from '@tenphi/tasty'; tasty({ styles: { Search: { $: dynamic }, Other: { $: \`[data-element="\${element}"]\` } } });`,
    `import { tasty } from '@tenphi/tasty'; tasty({ styles: { display: { Search: { $: '[data-element="Search"]' } }, '@font-face': { Search: { $: '[data-element="Search"]' } } } });`,
    `import { tasty } from '@tenphi/tasty'; function render(tasty) { tasty({ styles: { Search: { $: '[data-element="Search"]' } } }); }`,
    `import { tasty } from '@tenphi/tasty'; tasty({ props: { Search: { $: '[data-element="Search"]' } } });`,
  ],
  invalid: [
    ...[
      [
        '[data-element="Primary"] > [data-element="Search"]',
        'Primary > Search',
      ],
      ['[data-element="Primary"]+[data-element="Search"]', 'Primary+Search'],
      [
        '[data-element="Primary"] ~ [data-element="Search"]',
        'Primary ~ Search',
      ],
      ['[data-element="Search"]', 'Search'],
      ["[data-element='Search']", 'Search'],
      ['[ data-element = Search ]', 'Search'],
      [' > [data-element="Search"]  ', ' > Search  '],
      ['&[data-element="Search"]', '&Search'],
      ['& > [data-element="Search"]', '& > Search'],
      [
        '[data-element="Primary"] > [data-element="Other"]',
        'Primary > [data-element="Other"]',
      ],
      [
        '[data-element="Primary"][data-element="Search"]',
        'Primary[data-element="Search"]',
      ],
      [
        '[data-element="Primary"] [data-element="Search"]',
        'Primary [data-element="Search"]',
      ],
      [
        '[data-element="Primary"].active > [data-element="Search"]',
        'Primary.active > Search',
      ],
      ['[data-element="Primary"] > span', 'Primary > span'],
      ['[data-element="Primary"] >', 'Primary >'],
      [
        '[data-element="Search"], [data-element="Primary"] > [data-element="Search"]',
        'Search, Primary > Search',
      ],
      [
        ':is([data-element="Search"]), [data-element="Search"]',
        ':is([data-element="Search"]), Search',
      ],
    ].map(([input, output]) => ({
      code: styles(input),
      output: styles(output),
      errors: [error],
    })),
    ...[
      `import { tasty as component } from '@tenphi/tasty'; component(Base, { styles: { Search: { $: '[data-element="Search"]' } } });`,
      `import { tasty } from '@tenphi/tasty'; tasty({ variants: { Active: { Search: { $: '[data-element="Search"]' } } } });`,
      `import { tastyStatic } from '@tenphi/tasty/static'; tastyStatic({ Search: { $: '[data-element="Search"]' } });`,
      `import { useStyles } from '@tenphi/tasty'; useStyles({ Search: { $: '[data-element="Search"]' } });`,
      `import { useGlobalStyles } from '@tenphi/tasty'; useGlobalStyles('main', { Search: { $: '[data-element="Search"]' } });`,
      `const searchStyles = { Search: { $: '[data-element="Search"]' } };`,
      `const styles: Styles = { Search: { $: '[data-element="Search"]' } };`,
      `const styles = { Search: { $: '[data-element="Search"]' as const } } satisfies Styles;`,
      `const styles = { Outer: { Search: { $: '[data-element="Search"]' } as const } } as Styles;`,
      `const node = <Card styles={{ Search: { $: '[data-element="Search"]' } }} />;`,
      `const story = { args: { styles: { Search: { $: '[data-element="Search"]' } } } };`,
      `import { tasty } from '@tenphi/tasty'; tasty({ styles: { Search: { ['$']: '[data-element="Search"]' } } });`,
      `import { tasty } from '@tenphi/tasty'; tasty({ styles: { ['Search']: { $: '[data-element="Search"]' } } });`,
      `import { defineComponent } from '@my-org/styling'; defineComponent('Card', { styles: { Search: { $: '[data-element="Search"]' } } });`,
      `import { mergeStyles } from '@my-org/styling'; mergeStyles(base, { Search: { $: '[data-element="Search"]' } });`,
    ].map((code) => ({
      code,
      output: code.replace('[data-element="Search"]', 'Search'),
      errors: [error],
    })),
    {
      code: String.raw`import { tasty } from '@tenphi/tasty'; tasty({ styles: { Search: { $: "[data-element=\"Search\"]" } } });`,
      output: null,
      errors: [error],
    },
  ],
});
