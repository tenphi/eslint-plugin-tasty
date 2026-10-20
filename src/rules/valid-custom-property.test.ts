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
  ],
  invalid: [
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
