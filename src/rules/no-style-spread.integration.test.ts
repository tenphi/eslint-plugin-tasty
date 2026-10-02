import { Linter } from 'eslint';
import * as parser from '@typescript-eslint/parser';
import { mergeStyles, type Styles } from '@tenphi/tasty';
import plugin from '../index.js';

describe('no-style-spread composition guidance', () => {
  const linter = new Linter();
  const code = `import type { Styles } from '@tenphi/tasty';
const finalStyles: Styles = { ...outerStyles, ...styles };`;

  it.each(['recommended', 'strict'] as const)(
    'reports one actionable warning in %s without changing behavior',
    (preset) => {
      const config = [
        { ...plugin.configs[preset], languageOptions: { parser } },
      ] as never;
      expect(linter.verify(code, config)).toEqual([
        expect.objectContaining({
          ruleId: 'tasty/no-style-spread',
          messageId: 'preferMergeStyles',
          severity: 1,
          line: 2,
          column: 31,
          message: expect.stringContaining('mergeStyles(...)'),
        }),
      ]);
      const result = linter.verifyAndFix(code, config);
      expect(result.fixed).toBe(false);
      expect(result.output).toBe(code);
      expect(
        linter.verify(
          code.replace(
            '{ ...outerStyles, ...styles }',
            'mergeStyles(outerStyles, styles)',
          ),
          config,
        ),
      ).toEqual([]);
    },
  );

  it('shows why shallow composition can lose styles', () => {
    const outerStyles: Styles = {
      Label: { padding: '2x', fill: '#surface' },
      fill: { '': '#surface', hovered: '#active' },
    };
    const styles: Styles = {
      Label: { fill: '#accent' },
      fill: { pressed: '#pressed' },
    };
    const shallow = { ...outerStyles, ...styles };
    const merged = mergeStyles(outerStyles, styles);
    expect(shallow).toEqual({
      Label: { fill: '#accent' },
      fill: { pressed: '#pressed' },
    });
    expect(merged).toEqual({
      Label: { padding: '2x', fill: '#accent' },
      fill: { '': '#surface', hovered: '#active', pressed: '#pressed' },
    });
  });

  it('keeps replacement state maps as intentional replacements', () => {
    const base: Styles = { fill: { '': '#surface', hovered: '#active' } };
    const overrides: Styles = { fill: { '': '#accent' } };
    expect(mergeStyles(base, overrides)).toEqual({ fill: { '': '#accent' } });
  });
});
