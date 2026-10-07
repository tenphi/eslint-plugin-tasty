import { Linter } from 'eslint';
import parser from '@typescript-eslint/parser';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import plugin from './index.js';

let linter: Linter;
let dir: string;
let filename: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tasty-types-'));
  linter = new Linter({ cwd: dir });
  cpSync(resolve('test/fixtures/type-aware'), dir, { recursive: true });
  writeFileSync(join(dir, 'package.json'), '{"name":"type-aware-fixture"}');
  filename = join(dir, 'consumer.tsx');
  writeFileSync(filename, '');
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function lint(code: string, typeAwareJSX: unknown = true) {
  return linter.verify(
    code,
    [
      {
        files: ['**/*.tsx'],
        languageOptions: {
          parser,
          parserOptions: { ecmaFeatures: { jsx: true } },
        },
        plugins: { tasty: plugin },
        settings: { tasty: { typeAwareJSX } },
        rules: {
          'tasty/valid-value': 'error',
          'tasty/consistent-token-usage': 'error',
          'tasty/no-raw-color-values': 'error',
        },
      },
    ],
    { filename },
  );
}

function rules(code: string, option: unknown = true) {
  return lint(code, option).map((message) => message.ruleId);
}

it('removes semantic collisions and preserves style diagnostics with either setting form', () => {
  const code = `import { TabDropIndicator, Box, Item } from './components';
    <TabDropIndicator position="after" prefix="17px red" />;
    <Item prefix="17px" gap="17px" />;
    <Box position="after" fill="red" />;`;
  const expected = [
    'tasty/consistent-token-usage',
    'tasty/valid-value',
    'tasty/valid-value',
    'tasty/no-raw-color-values',
  ];
  expect(rules(code)).toEqual(expected);
  expect(rules(code, { project: join(dir, 'tsconfig.json') })).toEqual(
    expected,
  );
  expect(rules(code, false)).toHaveLength(7);
});

it('follows aliases, reexports, member tags, mapped props and indexed style aliases', () => {
  writeFileSync(
    join(dir, 'barrel.ts'),
    `export { TabDropIndicator as Indicator, PartialBox, RetypedBox, StyleValueBox } from './components';`,
  );
  const code = `import * as UI from './barrel';
    import { Indicator as Alias } from './barrel';
    <UI.Indicator position="before" />; <Alias position="after" />;
    <UI.PartialBox position="before" gap="17px" />;
    <UI.RetypedBox gap="17px" />; <UI.StyleValueBox gap="17px" />;`;
  expect(rules(code)).toEqual([
    'tasty/valid-value',
    'tasty/consistent-token-usage',
    'tasty/consistent-token-usage',
    'tasty/consistent-token-usage',
  ]);
});

it('falls back for unresolved, untyped, primitive and ambiguous style props', () => {
  const code = `import { PrimitiveBox, UnknownBox, BrokenBox, MixedBox } from './components';
    <PrimitiveBox position="after" gap={17} />;
    <UnknownBox position="after" />; <Missing position="after" />;
    <BrokenBox position="after" />; <MixedBox position="after" />;`;
  expect(rules(code)).toEqual([
    'tasty/valid-value',
    'tasty/consistent-token-usage',
    'tasty/valid-value',
    'tasty/valid-value',
    'tasty/valid-value',
    'tasty/valid-value',
  ]);
});

it('keeps style-object checks while excluding semantic JSX props', () => {
  expect(
    rules(`import { TabDropIndicator } from './components';
    <TabDropIndicator position="after" styles={{ position: 'after' }} />;
    const s: Styles = { position: 'after', gap: '17px' };`),
  ).toEqual([
    'tasty/valid-value',
    'tasty/valid-value',
    'tasty/consistent-token-usage',
  ]);
});

it('uses current in-memory source rather than the stale file on disk', () => {
  writeFileSync(
    filename,
    `import { Box } from './components'; <Box position="after" />;`,
  );
  expect(
    rules(
      `import { TabDropIndicator } from './components'; <TabDropIndicator position="after" />;`,
    ),
  ).toEqual([]);
  expect(rules(readFileSync(filename, 'utf8'))).toEqual(['tasty/valid-value']);
});

it('refreshes a cached project when an imported prop declaration changes', () => {
  const code = `import { TabDropIndicator } from './components'; <TabDropIndicator position="after" />;`;
  expect(rules(code)).toEqual([]);
  const components = join(dir, 'components.tsx');
  writeFileSync(
    components,
    readFileSync(components, 'utf8').replace(
      "position: 'before' | 'after'",
      "position: BaseStyleProps['position']",
    ),
  );
  expect(rules(code)).toEqual(['tasty/valid-value']);
});

it('refreshes inherited compiler config and keeps excluded files on the heuristic', () => {
  writeFileSync(
    join(dir, 'tsconfig.json'),
    JSON.stringify({
      extends: './tsconfig.base.json',
      include: ['*.ts', '*.tsx'],
    }),
  );
  writeFileSync(
    join(dir, 'tsconfig.base.json'),
    readFileSync(resolve('test/fixtures/type-aware/tsconfig.json'), 'utf8'),
  );
  const code = `import { TabDropIndicator } from './components'; <TabDropIndicator position="after" />;`;
  expect(rules(code)).toEqual([]);
  writeFileSync(
    join(dir, 'tsconfig.json'),
    JSON.stringify({
      extends: './tsconfig.base.json',
      include: ['components.tsx'],
    }),
  );
  expect(rules(code)).toEqual(['tasty/valid-value']);
});

it('reports invalid opt-in settings and missing projects instead of silently ignoring them', () => {
  const code = '<Box position="after" />;';
  expect(() => lint(code, 'yes')).toThrow('typeAwareJSX must be');
  expect(() => lint(code, { project: join(dir, 'missing.json') })).toThrow();
  rmSync(join(dir, 'tsconfig.json'));
  expect(() => lint(code)).toThrow('could not find a tsconfig');
});

it('discovers new files included by the existing project', () => {
  const code = `import { TabDropIndicator } from './components'; <TabDropIndicator position="after" />;`;
  expect(rules(code)).toEqual([]);
  filename = join(dir, 'new-consumer.tsx');
  writeFileSync(filename, code);
  expect(rules(code)).toEqual([]);
});

it('preserves style checks when a dependency uses a separate Tasty copy', () => {
  const nested = join(dir, 'node_modules/other/node_modules/@tenphi/tasty');
  mkdirSync(nested, { recursive: true });
  writeFileSync(
    join(nested, 'index.d.ts'),
    readFileSync(join(dir, 'tasty.d.ts'), 'utf8').replace(
      'position?: string;',
      "position?: 'static' | 'relative';",
    ),
  );
  writeFileSync(
    join(dir, 'nested.tsx'),
    `import type { BaseStyleProps } from './node_modules/other/node_modules/@tenphi/tasty';
    export const NestedBox = (props: BaseStyleProps) => null;`,
  );
  expect(
    rules(`import { NestedBox } from './nested';
    <NestedBox position="after" gap="17px" />;`),
  ).toEqual(['tasty/valid-value', 'tasty/consistent-token-usage']);
});
