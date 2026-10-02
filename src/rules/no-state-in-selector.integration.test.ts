import { renderStyles } from '@tenphi/tasty';
import { Linter } from 'eslint';
import plugin from '../index.js';

describe('no-state-in-selector integration', () => {
  const linter = new Linter();
  const bad = `import { tasty } from '@tenphi/tasty'; tasty({ styles: {
    ResponsiveWidth: {
      $: 'img:not([width]), :where(picture), video:not([width]), canvas:not([width]), svg:not([width]), iframe:not([width])',
      inlineSize: 'max 100%',
    },
    ResponsiveHeight: {
      $: 'img:not([height]), :where(picture), video:not([height]), canvas:not([height]), svg:not([height])',
      blockSize: 'auto',
    },
  } });`;

  it.each(['recommended', 'strict'] as const)(
    'reports the Cookbook examples as warnings in %s',
    (preset) => {
      const config = [plugin.configs[preset]] as never;
      expect(linter.verify(bad, config)).toEqual([
        expect.objectContaining({
          ruleId: 'tasty/no-state-in-selector',
          severity: 1,
          line: 3,
        }),
        expect.objectContaining({
          ruleId: 'tasty/no-state-in-selector',
          severity: 1,
          line: 7,
        }),
      ]);
      const result = linter.verifyAndFix(bad, config);
      expect(result.fixed).toBe(false);
      expect(result.output).toBe(bad);
      expect(result.messages).toHaveLength(2);
    },
  );

  it('accepts own and root states without confusing them with structure', () => {
    const config = [plugin.configs.recommended] as never;
    const code = `import { tasty } from '@tenphi/tasty'; tasty({ styles: {
      Link: {
        $: 'a',
        color: {
          '': '#white',
          '@own(:hover)': '#black',
          ':focus-within': '#clear',
        },
      },
      Picture: { $: ':where(picture)', inlineSize: 'max 100%' },
      Before: { $: '&::before', content: '""' },
    } });`;
    expect(linter.verify(code, config)).toEqual([]);
    // Check the documented state-map form against Tasty itself: @own applies
    // the condition to the link, whereas an ordinary state refers to the root.
    const { rules } = renderStyles({
      Link: {
        $: 'a',
        color: { '': '#text', '@own(:hover)': '#active' },
      },
    });
    expect(
      rules.some((rule) => rule.selector.includes('a:where(:hover)')),
    ).toBe(true);
  });
});
