import { Linter } from 'eslint';
import { renderStyles } from '@tenphi/tasty';
import { describe, expect, it } from 'vitest';
import plugin from '../index.js';
import { recommended } from '../configs.js';

/**
 * This repo installs a Tasty with compound colors, so `prefer-fill-mix` fixes
 * two-color fills to compounds and `color-mix()`. Each fix has to render the
 * color the comma mix did, and survive the rest of the recommended set. The
 * colors are tokens the installed Tasty's own config declares.
 */
const linter = new Linter();
const config = [
  {
    files: ['**/*.js'],
    plugins: { tasty: plugin as never },
    rules: recommended as never,
  },
] as never;

function lintFixed(fill: string) {
  const code = `import { tasty } from '@tenphi/tasty';\ntasty({ styles: { fill: '${fill}' } });\n`;
  const { output } = linter.verifyAndFix(code, config, 'file.js');

  return {
    fixed: output.match(/fill: '([^']*)'/)?.[1],
    messages: linter.verify(output, config, 'file.js'),
  };
}

/** The declarations Tasty renders, with the spaces after commas restored. */
function render(fill: string): string {
  return renderStyles({ fill }).rules[0].declarations.replace(/,\s*/g, ', ');
}

describe('prefer-fill-mix fixes with compound colors', () => {
  it.each([
    ['#black 4%, #white', '#white+#black.04'],
    ['#black 4.5%, #white.5', '#white.5+#black.045'],
    ['#black 30%, #white', '#white+#black.3'],
    // What the rule wrote for `'#white #black.$hover'` before compound colors.
    ['#black ($hover * 100%), #white', '#white+#black.$hover'],
    [
      '#black $hover-weight, #white',
      'color-mix(in srgb, #black $hover-weight, #white)',
    ],
    ['#black, #white', 'color-mix(in srgb, #black, #white)'],
    ['#clear 10%, #white', 'color-mix(in srgb, #clear 10%, #white)'],
  ])('fixes %s to %s, the same color', (mix, expected) => {
    const { fixed, messages } = lintFixed(mix);

    expect(fixed).toBe(expected);
    expect(messages).toEqual([]);
    expect(render(expected)).toBe(render(mix));
  });

  it.each([
    ['#white #black.04', '#white+#black.04'],
    ['#white+#black.04 #black.1', '#white+#black.04+#black.1'],
    ['#white #clear', '#white'],
  ])('fixes the space-separated %s to %s', (layered, expected) => {
    const { fixed, messages } = lintFixed(layered);

    expect(fixed).toBe(expected);
    expect(messages).toEqual([]);
  });
});
