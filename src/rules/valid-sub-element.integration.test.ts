import { Linter } from 'eslint';
import { renderStyles } from '@tenphi/tasty';
import plugin from '../index.js';

describe('valid-sub-element selector scope', () => {
  const linter = new Linter();
  const bad = `import { tasty } from '@tenphi/tasty'; tasty({ styles: {
    Level1: { $: "&:is(h1)", preset: "h1" },
    Level2: { $: "&:is(h2)", preset: "h2" },
    Level3: { $: "&:is(h3)", preset: "h3" },
    Level4: { $: "&:is(h4)", preset: "h4" },
    Level5: { $: "&:is(h5)", preset: "h5" },
    Level6: { $: "&:is(h6)", preset: "h6" },
  } });`;

  it.each(['recommended', 'strict'] as const)(
    'reports six errors in %s',
    (preset) => {
      const config = [plugin.configs[preset]] as never;
      expect(linter.verify(bad, config)).toEqual(
        Array.from({ length: 6 }, (_, index) =>
          expect.objectContaining({
            ruleId: 'tasty/valid-sub-element',
            messageId: 'subElementTargetsRoot',
            severity: 2,
            line: index + 2,
          }),
        ),
      );
      const result = linter.verifyAndFix(bad, config);
      expect(result.fixed).toBe(false);
      expect(result.output).toBe(bad);
    },
  );

  it('accepts root state maps, descendant headings and root pseudo-elements', () => {
    const code = `import { tasty } from '@tenphi/tasty'; tasty({ styles: {
      preset: { '': 'body', ':is(h1)': 'h1', ':is(h2)': 'h2' },
      Level1: { $: 'h1', preset: 'h1' },
      Level2: { $: 'h2', preset: 'h2' },
      Before: { $: '&::before', content: '""' },
    } });`;
    expect(linter.verify(code, [plugin.configs.recommended] as never)).toEqual(
      [],
    );
  });

  it('confirms the root-versus-descendant distinction against Tasty', () => {
    const root = renderStyles({
      Level1: { $: '&:is(h1)', display: 'block' },
    }).rules;
    const descendant = renderStyles({
      Level1: { $: 'h1', display: 'block' },
    }).rules;
    expect(root[0].selector).toBe(':is(h1)');
    expect(descendant[0].selector).toBe(' h1');
  });

  it('treats a nested ampersand as the containing sub-element scope', () => {
    const code = `import { tasty } from '@tenphi/tasty'; tasty({ styles: { Outer: { Heading: { $: '&:is(h1)', display: 'block' } } } });`;
    const config = [plugin.configs.recommended] as never;
    expect(linter.verify(code, config)).toEqual([
      expect.objectContaining({
        ruleId: 'tasty/valid-sub-element',
        severity: 2,
      }),
    ]);
    const { rules } = renderStyles({
      Outer: { Heading: { $: '&:is(h1)', display: 'block' } },
    });
    expect(rules[0].selector).toBe(' [data-element="Outer"]:is(h1)');
    const correct = `import { tasty } from '@tenphi/tasty'; tasty({ styles: { Outer: { display: { '': 'flex', '@own(:is(h1))': 'block' } } } });`;
    expect(linter.verify(correct, config)).toEqual([]);
  });

  it.each(['&@', '&@.heading', '&@::before', '&Body'])(
    'preserves descendant key injection for %s',
    (affix) => {
      const code = `import { tasty } from '@tenphi/tasty'; tasty({ styles: { Heading: { $: ${JSON.stringify(affix)}, display: 'block' } } });`;
      expect(
        linter.verify(code, [plugin.configs.recommended] as never),
      ).toEqual([]);
      const { rules } = renderStyles({
        Heading: { $: affix, display: 'block' },
      });
      expect(rules[0].selector).toContain(' [data-element="Heading"]');
    },
  );

  it.each(['& :is(h1)', '&:is(h1) :is(h2)', '&.heading .x'])(
    'detects root selection after affix normalization for %s',
    (affix) => {
      const code = `import { tasty } from '@tenphi/tasty'; tasty({ styles: { Heading: { $: ${JSON.stringify(affix)}, display: 'block' } } });`;
      expect(
        linter.verify(code, [plugin.configs.recommended] as never),
      ).toEqual([
        expect.objectContaining({
          ruleId: 'tasty/valid-sub-element',
          severity: 2,
        }),
      ]);
      const { rules } = renderStyles({
        Heading: { $: affix, display: 'block' },
      });
      expect(rules[0].selector).not.toContain(' ');
    },
  );
});
