import { Linter } from 'eslint';
import { renderStyles } from '@tenphi/tasty';
import selectorParser from 'postcss-selector-parser';
import plugin from '../index.js';

const linter = new Linter();
const source = (selector: string, owner = 'Search') =>
  `import { tasty } from '@tenphi/tasty'; tasty({ styles: { ${owner}: { $: \`${selector}\`, display: 'block' } } });`;
function selectorMeaning(node: selectorParser.Node): unknown {
  if (node.type === 'attribute') {
    return [
      node.type,
      node.namespace,
      node.attribute,
      node.operator,
      node.value,
      node.insensitive,
    ];
  }
  if ('nodes' in node)
    return [node.type, node.value, node.nodes?.map(selectorMeaning)];
  return [node.type, node.value];
}
const rendered = (selector: string, owner: string) =>
  renderStyles({ [owner]: { $: selector, display: 'block' } }).rules.map(
    (rule) => ({
      ...rule,
      // Include the containing class so root attachment cannot be normalized
      // away. Ignore only CSS-equivalent quotes and attribute formatting.
      selector: selectorMeaning(
        selectorParser().astSync(`.root${rule.selector}`),
      ),
    }),
  );

describe('prefer-element-selector autofix', () => {
  it.each(['recommended', 'strict'] as const)(
    'warns and fixes the example in %s',
    (preset) => {
      const config = [plugin.configs[preset]] as never;
      const before = source(
        '[data-element="Primary"] > [data-element="Search"]',
      );
      expect(linter.verify(before, config)).toEqual([
        expect.objectContaining({
          ruleId: 'tasty/prefer-element-selector',
          severity: 1,
        }),
      ]);
      const result = linter.verifyAndFix(before, config);
      expect(result.fixed).toBe(true);
      expect(result.output).toBe(source('Primary > Search'));
      expect(result.messages).toEqual([]);
    },
  );

  // Exercise authored spacing, compound attachment, key injection and lists
  // through the real renderer. Every offered fix must preserve generated CSS.
  const selectors = [
    '[data-element="Search"]',
    '[data-element=Search]',
    "[data-element='Search']",
    '[ data-element = "Search" ]',
    '[data-element="Primary"] > [data-element="Search"]',
    '[data-element="Primary"]+[data-element="Search"]',
    '[data-element="Primary"]~[data-element="Search"]',
    '[data-element="Primary"] [data-element="Search"]',
    '[data-element="Primary"][data-element="Search"]',
    '[data-element="Primary"].active > [data-element="Search"]',
    '[data-element="Primary"] > [data-element="Other"]',
    '[data-element="Primary"] > span',
    '[data-element="Primary"] >',
    '[data-element="Search"], [data-element="Primary"] > [data-element="Search"]',
    'Primary > [data-element="Search"]',
    '* > [data-element="Search"]',
    'div > [data-element="Search"]',
    '[data-element="Search"] .active',
    '[data-element="Search"] [disabled]',
    '[data-element="Primary"]Search',
    '[data-element="Primary"]span',
    ':is([data-element="Search"]), [data-element="Search"]',
  ];
  const cases = selectors.flatMap((selector) =>
    ['Search', 'Other'].flatMap((owner) =>
      ['', '&', '  &  ', '> ', '+ ', '~ '].map((prefix) => ({
        selector: prefix + selector + '  ',
        owner,
      })),
    ),
  );
  it.each(cases)('preserves $selector under $owner', ({ selector, owner }) => {
    const code = source(selector, owner);
    const config = [
      {
        plugins: { tasty: plugin },
        rules: { 'tasty/prefer-element-selector': 'warn' },
      },
    ] as never;
    const result = linter.verifyAndFix(code, config);
    const after = result.output.match(/\$: `([^`]*)`/)![1];
    expect(rendered(after, owner)).toEqual(rendered(selector, owner));
    expect(result.messages).toEqual([]);
    expect(linter.verifyAndFix(result.output, config).fixed).toBe(false);
  });
});
