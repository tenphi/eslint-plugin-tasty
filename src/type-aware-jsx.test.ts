import { Linter } from 'eslint';
import type { SourceCode } from 'eslint';
import ts from 'typescript';
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

function lint(
  code: string | SourceCode,
  typeAwareJSX: unknown = true,
  activeRules: Linter.RulesRecord = {
    'tasty/valid-value': 'error',
    'tasty/consistent-token-usage': 'error',
    'tasty/no-raw-color-values': 'error',
  },
) {
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
        rules: activeRules,
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

it('refreshes declarations when ESLint reuses an existing SourceCode object', () => {
  const code = `import { TabDropIndicator } from './components'; <TabDropIndicator position="after" />;`;
  expect(rules(code)).toEqual([]);
  const source = linter.getSourceCode();
  const components = join(dir, 'components.tsx');
  writeFileSync(
    components,
    readFileSync(components, 'utf8').replace(
      "position: 'before' | 'after'",
      "position: BaseStyleProps['position']",
    ),
  );
  expect(lint(source).map((message) => message.ruleId)).toEqual([
    'tasty/valid-value',
  ]);
});

it('refreshes compiler configuration when ESLint reuses a SourceCode object', () => {
  const code = `import { TabDropIndicator } from './components'; <TabDropIndicator position="after" />;`;
  expect(rules(code)).toEqual([]);
  const source = linter.getSourceCode();
  const config = JSON.parse(readFileSync(join(dir, 'tsconfig.json'), 'utf8'));
  config.include = ['components.tsx'];
  writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify(config));
  expect(lint(source).map((message) => message.ruleId)).toEqual([
    'tasty/valid-value',
  ]);
});

it.each(['valid-color-token', 'valid-custom-property'])(
  'refreshes reused sources when only %s performs deferred checks',
  (rule) => {
    writeFileSync(
      join(dir, 'tasty.config.json'),
      JSON.stringify({ tokens: ['#known', '$known'] }),
    );
    const token = rule === 'valid-color-token' ? '#missing' : '$missing';
    const code = `import { Item } from './components'; <Item prefix="${token}" />;`;
    const activeRules: Linter.RulesRecord = { [`tasty/${rule}`]: 'error' };
    expect(lint(code, true, activeRules)).toEqual([]);
    const source = linter.getSourceCode();
    const components = join(dir, 'components.tsx');
    writeFileSync(
      components,
      readFileSync(components, 'utf8').replaceAll(
        'prefix?: Content',
        "prefix?: Styles['fill']",
      ),
    );
    expect(
      lint(source, true, activeRules).map((message) => message.ruleId),
    ).toEqual([`tasty/${rule}`]);
  },
);

it('keeps pixel checks on broad primitive unions while excluding content unions', () => {
  const components = join(dir, 'components.tsx');
  writeFileSync(
    components,
    readFileSync(components, 'utf8') +
      `
    export const CustomGap = (props: { gap?: string | 0 }) => null;
    export const CustomWidth = (props: { width?: number | 'auto' }) => null;`,
  );
  expect(
    rules(`import { CustomGap, CustomWidth, Item } from './components';
    <CustomGap gap="17px" />; <CustomWidth width={17} />; <Item prefix="17px" />;`),
  ).toEqual(['tasty/consistent-token-usage', 'tasty/consistent-token-usage']);
});

it('reuses unchanged imported source files while rebuilding for changed buffers', () => {
  const code = `import { TabDropIndicator } from './components'; <TabDropIndicator position="after" />;`;
  expect(rules(code)).toEqual([]);
  const readFile = vi.spyOn(ts.sys, 'readFile');
  try {
    expect(rules('\n' + code)).toEqual([]);
    expect(
      readFile.mock.calls.some(
        ([file]) => file === join(dir, 'components.tsx'),
      ),
    ).toBe(false);
  } finally {
    readFile.mockRestore();
  }
});

it('keeps the cached compiler graph for repeatedly excluded files', () => {
  const config = JSON.parse(readFileSync(join(dir, 'tsconfig.json'), 'utf8'));
  config.include = ['components.tsx'];
  writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify(config));
  const code = `import { TabDropIndicator } from './components'; <TabDropIndicator position="after" />;`;
  writeFileSync(filename, code);
  expect(rules(code)).toEqual(['tasty/valid-value']);
  const readFile = vi.spyOn(ts.sys, 'readFile');
  try {
    expect(rules(code)).toEqual(['tasty/valid-value']);
    expect(rules(code)).toEqual(['tasty/valid-value']);
    expect(
      readFile.mock.calls.some(
        ([file]) => file === join(dir, 'components.tsx'),
      ),
    ).toBe(false);
  } finally {
    readFile.mockRestore();
  }
});

it('avoids TypeScript project analysis for opaque JSX values', () => {
  rmSync(join(dir, 'tsconfig.json'));
  expect(
    rules(
      '<Box gap={value} position={getPosition()} fill={`rgb(${r}, 0, 0)`} />;',
    ),
  ).toEqual([]);
});
