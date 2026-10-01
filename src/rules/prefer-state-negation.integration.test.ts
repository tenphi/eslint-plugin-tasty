import { renderStyles } from '@tenphi/tasty';
import { Linter } from 'eslint';
import plugin from '../index.js';

describe('prefer-state-negation integration', () => {
  const config = [plugin.configs.recommended] as never;
  const linter = new Linter();

  it('reports the drop-indicator selector as a warning and fixes it cleanly', () => {
    const code = `import { tasty } from '@tenphi/tasty'; tasty({ styles: { display: { '': 'block', ':not(:has(~ :not([data-drop-indicator])))': 'flex' } } });`;
    const messages = linter.verify(code, config);
    expect(messages).toEqual([
      expect.objectContaining({
        ruleId: 'tasty/prefer-state-negation',
        severity: 1,
      }),
    ]);

    const fixed = linter.verifyAndFix(code, config);
    expect(fixed.fixed).toBe(true);
    expect(fixed.output).toContain("'!:has(~ :not([data-drop-indicator]))'");
    expect(fixed.messages).toEqual([]);
    expect(linter.verifyAndFix(fixed.output, config).fixed).toBe(false);
  });

  it.each([
    [
      ':not(:has(~ :not([data-drop-indicator])))',
      '!:has(~ :not([data-drop-indicator]))',
    ],
    [':not(:hover)', '!:hover'],
    [':not(:nth-child(2n + 1))', '!:nth-child(2n + 1)'],
    [':not(Panel)', '!:is(Panel)'],
    [':not([data-drop-indicator])', '!:is([data-drop-indicator])'],
    [':not(:hover, :focus)', '!:is(:hover, :focus)'],
    [':not(:hover:focus)', '!:is(:hover:focus)'],
    [':not(Panel > Button)', '!:is(Panel > Button)'],
    [':not(:not(:hover))', '!:is(:not(:hover))'],
    [':not(:where(:hover))', '!:is(:where(:hover))'],
    [
      ':not(:is(:hover, :unknown-pseudo))',
      '!:is(:is(:hover, :unknown-pseudo))',
    ],
    [':not(:is(> Icon))', '!:is(:is(> Icon))'],
    [':not(:is())', '!:is(:is())'],
    [':not(:has(Icon >))', '!:is(:has(Icon >))'],
    [':not(:has(~))', '!:is(:has(~))'],
    ['!:not(:hover)', '!!:hover'],
  ])('preserves rendered CSS for %s', (input, output) => {
    const code = `import { tasty } from '@tenphi/tasty'; tasty({ styles: { display: { '': 'block', ${JSON.stringify(input)}: 'flex' } } });`;
    const fixed = linter.verifyAndFix(code, config);
    expect(fixed.fixed).toBe(true);
    expect(fixed.output).toContain(`${JSON.stringify(output)}: 'flex'`);
    expect(fixed.messages).toEqual([]);
    const render = (key: string) =>
      renderStyles({
        fill: { [key]: '#blue' },
      }).rules;
    expect(render(output)).toEqual(render(input));
  });

  it('enables the warning in the strict preset too', () => {
    expect(plugin.configs.strict.rules?.['tasty/prefer-state-negation']).toBe(
      'warn',
    );
  });
});
