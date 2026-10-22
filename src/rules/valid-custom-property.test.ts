import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { BUILT_IN_CUSTOM_PROPERTIES } from '../constants.js';
import rule from './valid-custom-property.js';

// A project outside this repo, so no installed `@tenphi/tasty` contributes the
// config it ships: the project's own `tokens` list is the only one that applies.
const root = mkdtempSync(join(tmpdir(), 'tasty-custom-properties-'));
writeFileSync(join(root, 'package.json'), '{}');
writeFileSync(
  join(root, 'tasty.config.json'),
  JSON.stringify({ tokens: ['$space'] }),
);
const filename = join(root, 'component.ts');
const tsxFilename = join(root, 'component.tsx');

/** A reference to `$progress` with a declaration elsewhere in the file. */
function declared(declaration: string) {
  return {
    code: `
        import { tasty } from '@tenphi/tasty';
        const Progress = tasty({ styles: { width: '$progress' } });
        ${declaration}
      `,
    filename: tsxFilename,
  };
}

afterAll(() => rmSync(root, { recursive: true, force: true }));

function style(property: string, value: string) {
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
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

tester.run('valid-custom-property', rule, {
  valid: [
    style('padding', '$space'),
    // Tasty registers these without configuration.
    ...[...BUILT_IN_CUSTOM_PROPERTIES].map((name) => style('gap', name)),
    style('transition', '$$radius 0.2s'),
    style('width', 'calc($gap * 2 + $border-width)'),
    style('fontFamily', '"Inter", $font-sans-fallback'),
    // `tokens` props and options declare custom properties, as does a raw
    // custom property in an inline `style`.
    declared('<Progress tokens={{ $progress: `${percent}%` }} />;'),
    declared(`<Progress tokens={{ ['$progress']: value } as Tokens} />;`),
    declared(`<div style={{ '--progress': value }} />;`),
    declared(
      `tasty({ tokens: { $progress: '0%' }, styles: { fill: '#purple' } });`,
    ),
    {
      code: `
        import type { Styles } from '@tenphi/tasty';
        export const CARD_STYLES: Styles = { $gap: '1x', padding: '$gap' };
      `,
      filename,
    },
  ],
  invalid: [
    ...[
      // Only `$` keys of `tokens` and `--` keys of `style` declare anything.
      `<Progress tokens={{ progress: value }} />;`,
      `<Progress style={{ progress: value, $progress: value }} />;`,
      `<Progress data={{ $progress: value }} />;`,
      `notTasty({ tokens: { $progress: '0%' } });`,
    ].map((declaration) => ({
      ...declared(declaration),
      errors: [
        {
          messageId: 'unknownProperty' as const,
          data: { token: '$progress' },
        },
      ],
    })),
    {
      ...style('gap', '$gapp'),
      errors: [{ messageId: 'unknownProperty' }],
    },
    {
      ...style('transition', '$$radiuss 0.2s'),
      errors: [{ messageId: 'unknownProperty' }],
    },
    {
      ...style('fill', '#white.$fade'),
      errors: [{ messageId: 'unknownProperty' }],
    },
  ],
});
