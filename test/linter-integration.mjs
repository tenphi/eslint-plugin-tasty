import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { recommended, strict } from '../dist/index.js';

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

const presetValid =
  imports +
  `
component('Card', {
  styles: { Label: { fill: '#clear' } satisfies Styles },
  variants: {
    Active: {
      '@active': ':hover',
      fill: { '': '#clear', '@active': '#white' },
      'Label': ({ fill: { '': '#clear', '@active': '#white', '@own(:focus)': '#black' } } as Styles),
    },
  },
});
`;

const linters = [
  {
    name: 'ESLint',
    bin: join(dirname(require.resolve('eslint/package.json')), 'bin/eslint.js'),
    configName: 'eslint.config.mjs',
    config: (
      rules,
      settings = {},
    ) => `import tasty from ${JSON.stringify(pathToFileURL(pluginPath).href)};
import parser from ${JSON.stringify(pathToFileURL(require.resolve('@typescript-eslint/parser')).href)};
export default [{ files: ['**/*.{ts,tsx}'], languageOptions: { parser, parserOptions: { ecmaFeatures: { jsx: true } } }, plugins: { tasty }, settings: ${JSON.stringify(settings)}, rules: ${JSON.stringify(rules)} }];`,
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
    config: (rules, settings = {}) =>
      JSON.stringify({
        categories: { correctness: 'off' },
        jsPlugins: [{ name: 'tasty', specifier: pluginPath }],
        rules,
        settings,
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
    writeFileSync(join(dir, linter.configName), linter.config(rules));
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

    writeFileSync(join(dir, 'presets-valid.ts'), presetValid);
    writeFileSync(
      join(dir, 'presets-invalid.ts'),
      presetValid.replace("fill: '#clear'", "paddding: '1x'"),
    );
    for (const [name, preset] of Object.entries({ recommended, strict })) {
      writeFileSync(join(dir, linter.configName), linter.config(preset));
      const composition = `import { mergeStyles, type Styles } from '@tenphi/tasty';
const finalStyles: Styles = { ...outerStyles, ...styles };
const wrappedStyles = ({ ...outerStyles, ...styles } as Styles)!;
const inlineStyles: CSSProperties = { ...outerStyles, ...styles };
const mergedStyles: Styles = mergeStyles(outerStyles, styles);
`;
      writeFileSync(join(dir, 'composition.ts'), composition);
      assert.deepEqual(
        run('composition.ts'),
        { status: 0, rules: ['no-style-spread', 'no-style-spread'] },
        `${linter.name}: ${name} reports style composition once per object`,
      );
      assert.deepEqual(
        run('composition.ts', [linter.fix]),
        { status: 0, rules: ['no-style-spread', 'no-style-spread'] },
        `${linter.name}: ${name} keeps composition guidance report-only`,
      );
      assert.equal(
        readFileSync(join(dir, 'composition.ts'), 'utf8'),
        composition,
      );
      assert.deepEqual(
        run('presets-valid.ts'),
        { status: 0, rules: [] },
        `${linter.name}: ${name} accepts wrapped sub-elements and variant aliases`,
      );
      assert.deepEqual(
        run('presets-invalid.ts'),
        { status: 0, rules: ['known-property'] },
        `${linter.name}: ${name} still validates wrapped sub-elements`,
      );
      const selectors =
        imports +
        `
component('Content', { styles: {
  ResponsiveWidth: {
    $: 'img:not([width]), :where(picture), video:not([width]), canvas:not([width]), svg:not([width]), iframe:not([width])',
    inlineSize: 'max 100%',
  },
  ResponsiveHeight: {
    $: 'img:not([height]), :where(picture), video:not([height]), canvas:not([height]), svg:not([height])',
    blockSize: 'auto',
  },
} });
`;
      writeFileSync(join(dir, 'selector-states.ts'), selectors);
      assert.deepEqual(
        run('selector-states.ts'),
        { status: 0, rules: ['no-state-in-selector', 'no-state-in-selector'] },
        `${linter.name}: ${name} reports stateful selectors as warnings`,
      );
      assert.deepEqual(
        run('selector-states.ts', [linter.fix]),
        { status: 0, rules: ['no-state-in-selector', 'no-state-in-selector'] },
        `${linter.name}: ${name} keeps stateful selectors report-only`,
      );
      assert.equal(
        readFileSync(join(dir, 'selector-states.ts'), 'utf8'),
        selectors,
      );
      assert.equal(
        run('selector-states.ts', ['--max-warnings', '0']).status,
        1,
        `${linter.name}: ${name} can fail CI on selector warnings`,
      );
      writeFileSync(
        join(dir, 'structural-selectors.ts'),
        imports +
          `
component('Content', { styles: {
  Media: { $: ':is(img, :where(picture))', inlineSize: 'max 100%' },
  Link: { $: 'a', color: { '': '#white', '@own(:hover)': '#black' } },
  Before: { $: '&::before', content: '""' },
} });
`,
      );
      assert.deepEqual(
        run('structural-selectors.ts'),
        { status: 0, rules: [] },
        `${linter.name}: ${name} accepts structural groups, pseudo-elements, and own states`,
      );
    }
    // Consumer values must have the same diagnostics through both AST adapters.
    writeFileSync(
      join(dir, 'tasty.config.json'),
      readFileSync(
        new URL('./fixtures/style-values/tasty.config.json', import.meta.url),
        'utf8',
      ),
    );
    const valueRules = Object.fromEntries(
      [
        'no-raw-color-values',
        'valid-color-token',
        'valid-custom-property',
        'valid-custom-unit',
        'consistent-token-usage',
        'no-raw-motion-duration',
      ].map((name) => [`tasty/${name}`, 'error']),
    );
    writeFileSync(join(dir, linter.configName), linter.config(valueRules));
    writeFileSync(
      join(dir, 'values-valid.tsx'),
      `
import { Box } from '@my/ds';
<Box fill="#surface" gap="1x" animationDuration="$duration" />;
<svg fill="red" gap="17px" />;
<Box content={'"17px #missing $missing red"'} />;
`,
    );
    writeFileSync(
      join(dir, 'values-invalid.tsx'),
      `
import { Box } from '@my/ds';
<Box fill="red" gap="17px" />;
<Box fill="#missing" gap="$missing" />;
<Box padding="min(2unknownunit, 1x)" />;
<Box gap={17} animationDuration="200ms" />;
<Box styles={{ Deep: { Deeper: { fill: 'red', padding: '17px' } } }} />;
`,
    );
    assert.deepEqual(run('values-valid.tsx'), { status: 0, rules: [] });
    assert.deepEqual(
      run('values-invalid.tsx'),
      {
        status: 1,
        rules: [
          'no-raw-color-values',
          'no-raw-color-values',
          'consistent-token-usage',
          'consistent-token-usage',
          'consistent-token-usage',
          'valid-color-token',
          'valid-custom-property',
          'valid-custom-unit',
          'no-raw-motion-duration',
        ].sort(),
      },
      `${linter.name}: JSX literals, numeric pixels, expressions and nested styles`,
    );

    const rewriteRules = Object.fromEntries(
      ['no-important', 'prefer-auto-calc', 'prefer-custom-property-syntax'].map(
        (name) => [`tasty/${name}`, 'error'],
      ),
    );
    writeFileSync(join(dir, linter.configName), linter.config(rewriteRules));
    const rewrites = `import { Box } from '@my/ds';
<Box gap={'var(--gap)'} width={'calc(100% - 1x)'} fill="#surface !important" />;
<Box content={'"var(--gap) !important transparent"'} />;
`;
    writeFileSync(join(dir, 'rewrites.tsx'), rewrites);
    assert.deepEqual(run('rewrites.tsx', [linter.fix]), {
      status: 0,
      rules: [],
    });
    assert.equal(
      readFileSync(join(dir, 'rewrites.tsx'), 'utf8'),
      rewrites
        .replace("{'var(--gap)'}", "{'$gap'}")
        .replace("{'calc(100% - 1x)'}", "{'(100% - 1x)'}")
        .replace('#surface !important', '#surface'),
      `${linter.name}: JSX rewrites preserve syntax and quoted content`,
    );
    const propUsage = `import { tasty } from '@tenphi/tasty';
import { Box } from '@my/ds';
const Local = tasty({ styles: { fill: '#surface' } });
const Alias = Local;
<Local style={inlineStyle} className="external" styles={overrides} />;
<Alias {...({ style: inlineStyle, className: 'external', styles: overrides } as Props)} />;
<Box tokens={{ $size: size }} mods={{ compact }} data-element="Body" />;
<div style={inlineStyle} className="external" />;
`;
    for (const [name, preset] of Object.entries({ recommended, strict })) {
      writeFileSync(join(dir, linter.configName), linter.config(preset));
      writeFileSync(join(dir, 'prop-usage.tsx'), propUsage);
      const expectedProps = {
        status: 0,
        rules: [
          'no-style-prop',
          'no-style-prop',
          'no-classname-prop',
          'no-classname-prop',
          'no-styles-prop',
          'no-styles-prop',
        ].sort(),
      };
      assert.deepEqual(
        run('prop-usage.tsx'),
        expectedProps,
        `${linter.name}: ${name} warns about all three props and inline spreads`,
      );
      assert.deepEqual(
        run('prop-usage.tsx', [linter.fix]),
        expectedProps,
        `${linter.name}: ${name} keeps prop migrations report-only`,
      );
      assert.equal(
        readFileSync(join(dir, 'prop-usage.tsx'), 'utf8'),
        propUsage,
      );
      assert.equal(
        run('prop-usage.tsx', ['--max-warnings', '0']).status,
        1,
        `${linter.name}: ${name} can enforce prop warnings in CI`,
      );
      const propExceptions = `import { tasty } from '@tenphi/tasty';
const Local = tasty({});
const positioned = (
  // eslint-disable-next-line tasty/no-style-prop -- positioning library owns inline styles
  <Local style={positioningStyles} />
);
const libraryElement = <>
  {/* eslint-disable-next-line tasty/no-classname-prop -- library stylesheet requires this class */}
  <Local className={libraryClassName} />
</>;
const adapted = (
  // eslint-disable-next-line tasty/no-styles-prop -- adapter needs instance overrides
  <Local styles={adapterOverrides} />
);
<Local {...{
  // eslint-disable-next-line tasty/no-style-prop -- library styles in a spread
  style: positioningStyles,
  // eslint-disable-next-line tasty/no-classname-prop -- library classes in a spread
  className: libraryClassName,
  // eslint-disable-next-line tasty/no-styles-prop -- adapter overrides in a spread
  styles: adapterOverrides,
}} />;
<Local style={inlineStyle} className="external" styles={overrides} />;
`;
      writeFileSync(join(dir, 'prop-exceptions.tsx'), propExceptions);
      const expectedExceptions = {
        status: 0,
        rules: ['no-style-prop', 'no-classname-prop', 'no-styles-prop'].sort(),
      };
      assert.deepEqual(
        run('prop-exceptions.tsx'),
        expectedExceptions,
        `${linter.name}: ${name} local exceptions leave subsequent warnings visible`,
      );
      assert.deepEqual(
        run('prop-exceptions.tsx', [linter.fix]),
        expectedExceptions,
        `${linter.name}: ${name} keeps acknowledged exceptions intact`,
      );
      assert.equal(
        readFileSync(join(dir, 'prop-exceptions.tsx'), 'utf8'),
        propExceptions,
      );
    }
    cpSync(new URL('./fixtures/type-aware/', import.meta.url), dir, {
      recursive: true,
    });
    const typedRules = {
      'tasty/valid-value': 'error',
      'tasty/consistent-token-usage': 'error',
      'tasty/no-raw-color-values': 'error',
    };
    writeFileSync(
      join(dir, 'typed.tsx'),
      `import { TabDropIndicator, Box, Item, RetypedBox } from './components';
import * as UI from './components';
<TabDropIndicator position="after" prefix="17px" />;
<Item prefix="17px" gap="17px" />;
<UI.TabDropIndicator position="before" />;
<Box position="after" fill="red" />;
<RetypedBox gap="17px" />;
<Unknown position="after" />;
const styles: Styles = { position: 'after' };
`,
    );
    writeFileSync(join(dir, linter.configName), linter.config(typedRules));
    assert.deepEqual(
      run('typed.tsx'),
      {
        status: 1,
        rules: [
          ...Array(6).fill('valid-value'),
          ...Array(4).fill('consistent-token-usage'),
          'no-raw-color-values',
        ].sort(),
      },
      `${linter.name}: type analysis is disabled by default`,
    );
    for (const typeAwareJSX of [true, { project: './tsconfig.json' }]) {
      writeFileSync(
        join(dir, linter.configName),
        linter.config(typedRules, { tasty: { typeAwareJSX } }),
      );
      assert.deepEqual(
        run('typed.tsx'),
        {
          status: 1,
          rules: [
            ...Array(4).fill('valid-value'),
            ...Array(2).fill('consistent-token-usage'),
            'no-raw-color-values',
          ].sort(),
        },
        `${linter.name}: own TypeScript program excludes collisions and keeps style errors`,
      );
      writeFileSync(
        join(dir, 'typed-second.tsx'),
        `import { TabDropIndicator, Box } from './components';
<TabDropIndicator position="before" />; <Box gap="17px" />;`,
      );
      assert.deepEqual(
        run('typed.tsx', ['typed-second.tsx']),
        {
          status: 1,
          rules: [
            ...Array(4).fill('valid-value'),
            ...Array(3).fill('consistent-token-usage'),
            'no-raw-color-values',
          ].sort(),
        },
        `${linter.name}: multiple files share the project without sharing attribute offsets`,
      );
    }
    console.log(
      `${linter.name}: custom calls, import boundaries, diagnostics, fixes, full presets, JSX value policies, and component prop guidance passed`,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
