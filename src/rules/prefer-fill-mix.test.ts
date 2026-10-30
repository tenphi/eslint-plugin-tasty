import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './prefer-fill-mix.js';

/**
 * A project outside this repo with `@tenphi/tasty` at `version` installed, so
 * the rule sees that version rather than the one this repo develops against.
 * `null` installs no Tasty at all.
 */
function project(version: string | null): string {
  const root = mkdtempSync(join(tmpdir(), 'tasty-fill-mix-'));
  writeFileSync(join(root, 'package.json'), '{}');
  if (version !== null) {
    const pkgDir = join(root, 'node_modules', '@tenphi', 'tasty');
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(join(pkgDir, 'package.json'), JSON.stringify({ version }));
  }
  roots.push(root);
  return join(root, 'component.ts');
}

const roots: string[] = [];
afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

const fillMix = project('3.15.0');
const compound = project('3.16.0');
const older = project('3.14.0');
const missing = project(null);

function style(value: string, property = 'fill', filename = fillMix) {
  return {
    code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { ${property}: '${value}' } });
      `,
    filename,
  };
}

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
  },
});

tester.run('prefer-fill-mix with Tasty 3.15', rule, {
  valid: [
    style('#surface'),
    style('#dark 4%, #surface'),
    style('#dark ($hover * 100%), #surface'),
    // An intentional mix of two opaque colors.
    style('#dark, #surface'),
    // An explicit weight on a faded color is taken as written.
    style('#dark.5 20%, #surface'),
    // Opposite a weighted color, a faded one is the base it is painted over.
    style('#dark 4%, #surface.5'),
    // Other properties keep their own meaning for two colors.
    style('#surface #dark.04', 'color'),
    style('1bw #border #dark', 'border'),
    // Without Tasty's comma mix, the rewrite would break the fill.
    style('#surface #dark.04', 'fill', older),
    style('#surface #dark.04', 'fill', missing),
  ],
  invalid: [
    {
      ...style('#surface #dark.04'),
      output: style('#dark 4%, #surface').code,
      errors: [
        {
          messageId: 'twoColorFill',
          data: { property: 'fill', suggestion: '#dark 4%, #surface' },
        },
      ],
    },
    {
      ...style('#surface #dark.5'),
      output: style('#dark 50%, #surface').code,
      errors: [{ messageId: 'twoColorFill' }],
    },
    {
      // `.100` is a decimal fraction, as everywhere in Tasty: 10%.
      ...style('#surface #dark.100'),
      output: style('#dark 10%, #surface').code,
      errors: [{ messageId: 'twoColorFill' }],
    },
    {
      ...style('#surface #dark.$hover'),
      output: style('#dark ($hover * 100%), #surface').code,
      errors: [{ messageId: 'twoColorFill' }],
    },
    {
      ...style('#surface.5 #dark.04'),
      output: style('#dark 4%, #surface.5').code,
      errors: [{ messageId: 'twoColorFill' }],
    },
    {
      ...style('#surface #clear'),
      output: style('#surface').code,
      errors: [{ messageId: 'twoColorFill' }],
    },
    {
      ...style('#surface #dark.0'),
      output: style('#surface').code,
      errors: [{ messageId: 'twoColorFill' }],
    },
    {
      ...style('#surface #dark.04', 'backgroundColor'),
      output: style('#dark 4%, #surface', 'backgroundColor').code,
      errors: [
        {
          messageId: 'twoColorFill',
          data: {
            property: 'backgroundColor',
            suggestion: '#dark 4%, #surface',
          },
        },
      ],
    },
    {
      // Every state of a map.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({
          styles: {
            fill: { '': '#surface #clear', hovered: '#surface #dark.04' },
          },
        });
      `,
      filename: fillMix,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({
          styles: {
            fill: { '': '#surface', hovered: '#dark 4%, #surface' },
          },
        });
      `,
      errors: [{ messageId: 'twoColorFill' }, { messageId: 'twoColorFill' }],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: \`#surface #dark.04\` } });
      `,
      filename: fillMix,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: \`#dark 4%, #surface\` } });
      `,
      errors: [{ messageId: 'twoColorFill' }],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        const Card = tasty({ styles: { fill: '#surface' } });
        const card = <Card fill="#surface #dark.04" />;
      `,
      filename: fillMix.replace(/\.ts$/, '.tsx'),
      languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
      output: `
        import { tasty } from '@tenphi/tasty';
        const Card = tasty({ styles: { fill: '#surface' } });
        const card = <Card fill="#dark 4%, #surface" />;
      `,
      errors: [{ messageId: 'twoColorFill' }],
    },
    // Whether these overlays are opaque is not written on them: report only.
    {
      ...style('#surface #primary-accent-surface'),
      errors: [
        {
          messageId: 'twoColorFillManual',
          data: {
            property: 'fill',
            advice:
              "Mix an opaque overlay color in by weight ('#overlay 4%, #base'), or use an opaque overlay alone.",
          },
        },
      ],
    },
    {
      ...style('#surface rgb(0 0 0 / .1)'),
      errors: [{ messageId: 'twoColorFillManual' }],
    },
    {
      ...style('#surface #dark.04 #accent.1'),
      errors: [{ messageId: 'twoColorFillManual' }],
    },
    // A faded mix part without a weight: suggested, never fixed, because the
    // rewrite changes what renders.
    {
      ...style('#dark.04, #surface'),
      errors: [
        {
          messageId: 'translucentMixPart',
          data: { part: '#dark.04', suggestion: '#dark 4%, #surface' },
          suggestions: [
            {
              messageId: 'useWeight',
              data: { suggestion: '#dark 4%, #surface' },
              output: style('#dark 4%, #surface').code,
            },
          ],
        },
      ],
    },
    {
      ...style('#surface, #dark.$hover'),
      errors: [
        {
          messageId: 'translucentMixPart',
          suggestions: [
            {
              messageId: 'useWeight',
              output: style('#surface, #dark ($hover * 100%)').code,
            },
          ],
        },
      ],
    },
    {
      ...style('#surface, #clear'),
      errors: [
        {
          messageId: 'translucentMixPart',
          data: { part: '#clear', suggestion: '#surface' },
          suggestions: [
            { messageId: 'useWeight', output: style('#surface').code },
          ],
        },
      ],
    },
  ],
});

/** A `fill` value in a project with compound colors. */
function layered(value: string, property = 'fill') {
  return style(value, property, compound);
}

/** A comma mix fixed to `fixed`, the same color. */
function commaMix(value: string, fixed: string, property = 'fill') {
  return {
    ...layered(value, property),
    output: layered(fixed, property).code,
    errors: [
      { messageId: 'commaMix' as const, data: { property, suggestion: fixed } },
    ],
  };
}

tester.run('prefer-fill-mix with compound colors', rule, {
  valid: [
    layered('#surface'),
    layered('#surface+#dark.04'),
    layered('#surface.5+#accent.1+#dark.$hover'),
    layered('color-mix(in srgb, #dark 4%, #surface)'),
    // Other properties keep their own meaning for two colors.
    layered('#surface #dark.04', 'color'),
    layered('#surface, #dark 4%', 'color'),
  ],
  invalid: [
    // Two space-separated colors: a `+` where the space was.
    {
      ...layered('#surface #dark.04'),
      output: layered('#surface+#dark.04').code,
      errors: [
        {
          messageId: 'twoColorFill',
          data: { property: 'fill', suggestion: '#surface+#dark.04' },
        },
      ],
    },
    {
      ...layered('#surface #dark.100'),
      output: layered('#surface+#dark.100').code,
      errors: [{ messageId: 'twoColorFill' }],
    },
    {
      ...layered('#surface #dark.$hover'),
      output: layered('#surface+#dark.$hover').code,
      errors: [{ messageId: 'twoColorFill' }],
    },
    {
      ...layered('#surface.5 #dark.04'),
      output: layered('#surface.5+#dark.04').code,
      errors: [{ messageId: 'twoColorFill' }],
    },
    {
      ...layered('#surface+#accent.1 #dark.04'),
      output: layered('#surface+#accent.1+#dark.04').code,
      errors: [{ messageId: 'twoColorFill' }],
    },
    {
      ...layered('#surface #clear'),
      output: layered('#surface').code,
      errors: [{ messageId: 'twoColorFill' }],
    },
    {
      ...layered('#surface #dark.0'),
      output: layered('#surface').code,
      errors: [{ messageId: 'twoColorFill' }],
    },
    {
      // A base a compound cannot take is mixed in `color-mix()` itself.
      ...layered('rgb(250 250 250) #dark.04'),
      output: layered('color-mix(in srgb, #dark 4%, rgb(250 250 250))').code,
      errors: [{ messageId: 'twoColorFill' }],
    },
    {
      ...layered('#surface #primary-accent-surface'),
      errors: [
        {
          messageId: 'twoColorFillManual',
          data: {
            property: 'fill',
            advice:
              "Layer an opaque overlay color with its opacity ('#base+#overlay.04'), or use an opaque overlay alone.",
          },
        },
      ],
    },
    {
      // Every state of a map.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({
          styles: {
            fill: { '': '#surface #clear', hovered: '#surface #dark.04' },
          },
        });
      `,
      filename: compound,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({
          styles: {
            fill: { '': '#surface', hovered: '#surface+#dark.04' },
          },
        });
      `,
      errors: [{ messageId: 'twoColorFill' }, { messageId: 'twoColorFill' }],
    },

    // A comma mix of a token weighted by a percentage: a compound.
    commaMix('#dark 4%, #surface', '#surface+#dark.04'),
    commaMix('#surface, #dark 4%', '#surface+#dark.04'),
    commaMix('#dark 30%, #surface', '#surface+#dark.3'),
    commaMix('#dark 4.5%, #surface.5', '#surface.5+#dark.045'),
    commaMix('#accent 10%, #surface+#dark.04', '#surface+#dark.04+#accent.1'),
    commaMix('#dark 4%, #surface', '#surface+#dark.04', 'backgroundColor'),
    // What the rule wrote for `'#surface #dark.$hover'` before compounds.
    commaMix('#dark ($hover * 100%), #surface', '#surface+#dark.$hover'),
    // A weight of nothing or everything leaves one color.
    commaMix('#dark 0%, #surface', '#surface'),
    commaMix('#dark 100%, #surface', '#dark'),

    // Any other mix: the same parts in `color-mix()` itself.
    commaMix(
      '#dark $hover-weight, #surface',
      'color-mix(in srgb, #dark $hover-weight, #surface)',
    ),
    commaMix('#dark, #surface', 'color-mix(in srgb, #dark, #surface)'),
    commaMix(
      '#dark.5 20%, #surface',
      'color-mix(in srgb, #dark.5 20%, #surface)',
    ),
    commaMix(
      '#dark 30%, #surface 70%',
      'color-mix(in srgb, #dark 30%, #surface 70%)',
    ),
    commaMix(
      'rgb(0 0 0) 4%, #surface',
      'color-mix(in srgb, rgb(0 0 0) 4%, #surface)',
    ),
    // A compound would leave the transparent layer out; the mix doesn't.
    commaMix(
      '#clear 10%, #surface',
      'color-mix(in srgb, #clear 10%, #surface)',
    ),
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        const Card = tasty({ styles: { fill: '#surface' } });
        const card = <Card fill="#dark 4%, #surface" />;
      `,
      filename: compound.replace(/\.ts$/, '.tsx'),
      languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
      output: `
        import { tasty } from '@tenphi/tasty';
        const Card = tasty({ styles: { fill: '#surface' } });
        const card = <Card fill="#surface+#dark.04" />;
      `,
      errors: [{ messageId: 'commaMix' }],
    },
    {
      // Tasty mixes only the first two colors, so there is nothing exact to fix.
      ...layered('#a 10%, #b, #c'),
      errors: [{ messageId: 'commaMixManual', data: { property: 'fill' } }],
    },

    // A faded part without a weight: suggested, never fixed, because the
    // rewrite changes what renders.
    {
      ...layered('#dark.04, #surface'),
      errors: [
        {
          messageId: 'translucentCommaMix',
          data: {
            property: 'fill',
            part: '#dark.04',
            suggestion: '#surface+#dark.04',
          },
          suggestions: [
            {
              messageId: 'useCompound',
              data: { suggestion: '#surface+#dark.04' },
              output: layered('#surface+#dark.04').code,
            },
          ],
        },
      ],
    },
    {
      ...layered('#surface, #dark.$hover'),
      errors: [
        {
          messageId: 'translucentCommaMix',
          suggestions: [
            {
              messageId: 'useCompound',
              output: layered('#surface+#dark.$hover').code,
            },
          ],
        },
      ],
    },
    {
      ...layered('#dark.04, rgb(250 250 250)'),
      errors: [
        {
          messageId: 'translucentCommaMix',
          suggestions: [
            {
              messageId: 'useCompound',
              output: layered('color-mix(in srgb, #dark 4%, rgb(250 250 250))')
                .code,
            },
          ],
        },
      ],
    },
    {
      ...layered('#surface, #clear'),
      errors: [
        {
          messageId: 'translucentCommaMix',
          data: { property: 'fill', part: '#clear', suggestion: '#surface' },
          suggestions: [
            { messageId: 'useCompound', output: layered('#surface').code },
          ],
        },
      ],
    },
  ],
});
