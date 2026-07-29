import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';
import plugin from '../index.js';
import { recommended } from '../configs.js';

/**
 * The auto-fix output of `prefer-directional-shorthand` has to survive the rest
 * of the recommended set. A fix that emits a modifier the validation rules do
 * not know about turns a warning into an error — which is exactly what happened
 * when `dock` was added to the fixer but not to `inset`'s modifier allowlist.
 */
const linter = new Linter();

function lintFixed(styles: string) {
  const code = `import { tasty } from '@tenphi/tasty';\ntasty({ styles: { ${styles} } });\n`;
  const config = [
    {
      files: ['**/*.js'],
      plugins: { tasty: plugin as never },
      rules: recommended as never,
    },
  ] as never;

  // Apply fixes, then re-lint the fixed source with the full recommended set.
  const { output } = linter.verifyAndFix(code, config, 'file.js');

  return { output, messages: linter.verify(output, config, 'file.js') };
}

describe('prefer-directional-shorthand auto-fix output', () => {
  it.each([
    ["inset: 'auto 0 0 0'", "inset: '0 bottom dock'"],
    ["inset: '0 auto 0 0'", "inset: '0 left dock'"],
    ["radius: '0 1r 0 0'", "radius: '1r top-right'"],
    ["radius: '4px 0 0 0'", "radius: '4px top-left'"],
    ["margin: '0 0 1x 0'", "margin: '1x bottom'"],
    ["fade: '0 0 2x 0'", "fade: '2x bottom'"],
  ])('%s fixes to %s and stays clean', (input, expected) => {
    const { output, messages } = lintFixed(input);

    expect(output).toContain(expected);
    expect(messages).toEqual([]);
  });
});
