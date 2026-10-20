import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Linter } from 'eslint';
import parser from '@typescript-eslint/parser';
import { RuleTester } from '@typescript-eslint/rule-tester';
import plugin from '../index.js';
import { BUILT_IN_COLOR_TOKENS } from '../constants.js';
import rule from './valid-color-token.js';

// A project outside this repo, so no installed `@tenphi/tasty` contributes the
// config it ships: the project's own `tokens` list is the only one that applies.
const root = mkdtempSync(join(tmpdir(), 'tasty-color-tokens-'));
writeFileSync(join(root, 'package.json'), '{}');
writeFileSync(
  join(root, 'tasty.config.json'),
  JSON.stringify({ tokens: ['#surface'] }),
);
const filename = join(root, 'component.ts');

afterAll(() => rmSync(root, { recursive: true, force: true }));

function style(value: string) {
  return {
    code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: '${value}' } });
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

tester.run('valid-color-token', rule, {
  valid: [
    style('#surface'),
    // Tasty provides these without configuration.
    ...[...BUILT_IN_COLOR_TOKENS].map(style),
    style('#white.5'),
    style('#black.05'),
    style('#clear.5'),
    style('#border.$fade'),
    style('#outline.150'),
    style('##white'),
    style('(#outline, #border)'),
  ],
  invalid: [
    {
      ...style('#whitee'),
      errors: [{ messageId: 'unknownToken' }],
    },
    {
      ...style('#outlines.5'),
      errors: [{ messageId: 'unknownToken' }],
    },
  ],
});

it('accepts the #clear token prefer-custom-property-syntax fixes transparent to', () => {
  const linter = new Linter({ cwd: root });
  const { output, messages } = linter.verifyAndFix(
    `import { tasty } from '@tenphi/tasty';
tasty({ styles: { fill: 'transparent', color: 'currentColor' } });`,
    [
      {
        files: ['**/*.ts'],
        languageOptions: { parser },
        plugins: { tasty: plugin },
        rules: {
          'tasty/prefer-custom-property-syntax': 'error',
          'tasty/valid-color-token': 'error',
        },
      },
    ],
    { filename },
  );

  expect(output).toContain(`fill: '#clear', color: '#current'`);
  expect(messages).toEqual([]);
});
