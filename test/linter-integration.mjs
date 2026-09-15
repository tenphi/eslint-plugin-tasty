import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));
const pluginPath = join(root, 'dist/index.js');
const rules = Object.fromEntries(
  [
    'known-property',
    'no-important',
    'require-default-state',
    'prefer-shorthand-property',
  ].map((name) => [`tasty/${name}`, 'error']),
);
const config = readFileSync(
  new URL('./fixtures/style-functions/tasty.config.json', import.meta.url),
  'utf8',
);
const imports = `import { defineComponent as component, resolveComponentStyles, mergeStyles } from '@my-org/styling';\n`;
const valid =
  imports +
  `
component('Card', { as: 'section', styles: { fill: '#surface' } });
resolveComponentStyles('Card', { fill: { '': '#surface', hovered: '#active' } });
mergeStyles(base, { fill: { hovered: '#active' } });
function render(component) {
  component('Card', { styles: { paddding: '1x', color: 'red !important' } });
}
import { defineComponent } from 'unrelated';
defineComponent('Card', { styles: { paddding: '1x', color: 'red !important' } });
`;
const invalid =
  imports +
  `
component('Card', {
  styles: {
    paddding: '1x',
    color: '#text !important',
    backgroundColor: '#surface',
    Label: { paddding: '2x' },
  } satisfies Styles,
  variants: { Active: { paddding: '3x' } },
});
resolveComponentStyles('Card', { fill: { hovered: '#active' } });
mergeStyles(base, { backgroundColor: '#active', fill: { hovered: '#active' } });
`;
const expected = [
  'known-property',
  'known-property',
  'known-property',
  'no-important',
  'prefer-shorthand-property',
  'prefer-shorthand-property',
  'require-default-state',
].sort();
const expectedFixed = invalid
  .replace(' !important', '')
  .replace("backgroundColor: '#surface'", "fill: '#surface'");

const linters = [
  {
    name: 'ESLint',
    bin: join(dirname(require.resolve('eslint/package.json')), 'bin/eslint.js'),
    configName: 'eslint.config.mjs',
    config: `import tasty from ${JSON.stringify(pathToFileURL(pluginPath).href)};
import parser from ${JSON.stringify(pathToFileURL(require.resolve('@typescript-eslint/parser')).href)};
export default [{ files: ['**/*.ts'], languageOptions: { parser }, plugins: { tasty }, rules: ${JSON.stringify(rules)} }];`,
    diagnostics: (result) =>
      result.flatMap((file) =>
        file.messages.map((message) => message.ruleId?.replace('tasty/', '')),
      ),
    fix: '--fix',
  },
  {
    name: 'oxlint',
    bin: join(dirname(require.resolve('oxlint/package.json')), 'bin/oxlint'),
    configName: '.oxlintrc.json',
    config: JSON.stringify({
      categories: { correctness: 'off' },
      jsPlugins: [{ name: 'tasty', specifier: pluginPath }],
      rules,
    }),
    diagnostics: (result) =>
      result.diagnostics.map((diagnostic) =>
        diagnostic.code.replace(/^tasty[(/]/, '').replace(/\)$/, ''),
      ),
    fix: '--fix-suggestions',
  },
];

for (const linter of linters) {
  const dir = mkdtempSync(join(tmpdir(), 'tasty-linter-integration-'));
  try {
    writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
    writeFileSync(join(dir, 'tasty.config.json'), config);
    writeFileSync(join(dir, linter.configName), linter.config);
    writeFileSync(join(dir, 'valid.ts'), valid);
    writeFileSync(join(dir, 'invalid.ts'), invalid);

    function run(file, extra = []) {
      const result = spawnSync(
        process.execPath,
        [
          linter.bin,
          '--config',
          join(dir, linter.configName),
          '--format',
          'json',
          ...extra,
          file,
        ],
        { cwd: dir, encoding: 'utf8', timeout: 30_000 },
      );
      assert.ifError(result.error);
      assert.ok(
        result.status === 0 || result.status === 1,
        result.stderr || result.stdout,
      );
      return {
        status: result.status,
        rules: linter.diagnostics(JSON.parse(result.stdout)).sort(),
      };
    }

    assert.deepEqual(
      run('valid.ts'),
      { status: 0, rules: [] },
      `${linter.name}: valid styles and unrelated calls`,
    );
    assert.deepEqual(
      run('invalid.ts'),
      { status: 1, rules: expected },
      `${linter.name}: custom call diagnostics`,
    );
    const fixed = run('invalid.ts', [linter.fix]);
    assert.equal(
      readFileSync(join(dir, 'invalid.ts'), 'utf8'),
      expectedFixed,
      `${linter.name}: fixes preserve partial overrides`,
    );
    assert.deepEqual(fixed, {
      status: 1,
      rules: [
        'known-property',
        'known-property',
        'known-property',
        'prefer-shorthand-property',
        'require-default-state',
      ].sort(),
    });
    console.log(
      `${linter.name}: custom calls, import boundaries, diagnostics, and fixes passed`,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
