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

const current = project('3.15.0');
const older = project('3.14.0');
const missing = project(null);

function style(value: string, property = 'fill', filename = current) {
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

tester.run('prefer-fill-mix', rule, {
  valid: [
    style('#surface'),
    style('#dark 4%, #surface'),
    style('#dark ($hover * 100%), #surface'),
    // An intentional mix of two opaque colors.
    style('#dark, #surface'),
    // An explicit weight on a faded color is taken as written.
    style('#dark.5 20%, #surface'),
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
      filename: current,
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
      filename: current,
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
      filename: current.replace(/\.ts$/, '.tsx'),
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
      errors: [{ messageId: 'twoColorFillManual', data: { property: 'fill' } }],
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
