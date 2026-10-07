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

it('resolves relative Linter API filenames against the configured cwd', () => {
  filename = 'consumer.tsx';
  const code = `import { TabDropIndicator, Box } from './components';
    <TabDropIndicator position="after" />; <Box gap="17px" />;`;
  expect(rules(code)).toEqual(['tasty/consistent-token-usage']);
  expect(rules(code, { project: './tsconfig.json' })).toEqual([
    'tasty/consistent-token-usage',
  ]);
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

it('classifies the selected property of an indexed mixed-prop type', () => {
  const components = join(dir, 'components.tsx');
  writeFileSync(
    components,
    readFileSync(components, 'utf8') +
      `
    type MixedProps = BaseStyleProps & { prefix?: Content };
    type CopiedContent = MixedProps['prefix'];
    export const ProxyItem = (props: { prefix?: CopiedContent }) => null;
    export const DirectItem = (props: { prefix?: MixedProps['prefix'] }) => null;
    export const ProxyBox = (props: { gap?: MixedProps['gap'] }) => null;`,
  );
  expect(
    rules(`import { ProxyItem, DirectItem, ProxyBox } from './components';
    <ProxyItem prefix="17px" />; <DirectItem prefix="17px" />;
    <ProxyBox gap="17px" />;`),
  ).toEqual(['tasty/consistent-token-usage']);
});

it.each(['tsconfig.json', 'tsconfig.base.json'])(
  'refreshes referenced project declarations after changing %s',
  (changedConfig) => {
    for (const path of ['child/src', 'child/d1', 'child/d2'])
      mkdirSync(join(dir, path), { recursive: true });
    const config = JSON.parse(readFileSync(join(dir, 'tsconfig.json'), 'utf8'));
    config.references = [{ path: './child' }];
    writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify(config));
    const child = {
      compilerOptions: {
        composite: true,
        declaration: true,
        rootDir: './src',
        outDir: './d1',
        module: 'ESNext',
      },
      include: ['src/*.tsx'],
    };
    writeFileSync(join(dir, 'child/tsconfig.base.json'), JSON.stringify(child));
    writeFileSync(
      join(dir, 'child/tsconfig.json'),
      JSON.stringify({ extends: './tsconfig.base.json' }),
    );
    writeFileSync(
      join(dir, 'child/src/component.tsx'),
      `export const Indicator = (props: { position: 'before' | 'after' }) => null;`,
    );
    writeFileSync(
      join(dir, 'child/d1/component.d.ts'),
      `export declare const Indicator: (props: { position: 'before' | 'after' }) => null;`,
    );
    writeFileSync(
      join(dir, 'child/d2/component.d.ts'),
      `import type { Styles } from '../../tasty'; export declare const Indicator: (props: { position: Styles['position'] }) => null;`,
    );
    const code = `import { Indicator } from './child/src/component'; <Indicator position="after" />;`;
    expect(rules(code)).toEqual([]);
    child.compilerOptions.outDir = './d2';
    writeFileSync(join(dir, 'child', changedConfig), JSON.stringify(child));
    expect(rules(code)).toEqual(['tasty/valid-value']);
  },
);

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

it('preserves style checks when generic props are inferred as literal types', () => {
  const components = join(dir, 'components.tsx');
  writeFileSync(
    components,
    readFileSync(components, 'utf8') +
      `
    export const GenericGap = <T extends Styles['gap'],>(props: { gap: T }) => null;
    export const UnconstrainedGap = <T,>(props: { gap: T }) => null;
    export const GenericWidth = <T,>(props: { width: T | 'auto' }) => null;`,
  );
  expect(
    rules(`import { GenericGap, UnconstrainedGap, GenericWidth } from './components';
    <GenericGap gap="17px" />; <UnconstrainedGap gap="17px" />;
    <GenericWidth width={17} />;`),
  ).toEqual(Array(3).fill('tasty/consistent-token-usage'));
});

it('keeps pixel checks on broad primitive intersections and literal unions', () => {
  const components = join(dir, 'components.tsx');
  writeFileSync(
    components,
    readFileSync(components, 'utf8') +
      `
    export const IntersectionGap = (props: { gap?: string & {} }) => null;
    export const IntersectionWidth = (props: { width?: number & {} }) => null;
    export const LiteralUnionGap = (props: { gap?: 'auto' | (string & {}) }) => null;`,
  );
  expect(
    rules(`import { IntersectionGap, IntersectionWidth, LiteralUnionGap } from './components';
    <IntersectionGap gap="17px" />; <IntersectionWidth width={17} />;
    <LiteralUnionGap gap="17px" />;`),
  ).toEqual(Array(3).fill('tasty/consistent-token-usage'));
});

it('excludes semantic aliases containing nested style types and conditional constraints', () => {
  const components = join(dir, 'components.tsx');
  writeFileSync(
    components,
    readFileSync(components, 'utf8') +
      `
    type SemanticEnvelope = { text: string; decoration?: Styles };
    export const SemanticNested = (props: { prefix?: SemanticEnvelope }) => null;
    type ConditionalPosition = Styles extends object ? 'before' | 'after' : never;
    export const ConditionalComponent = (props: { position?: ConditionalPosition }) => null;
    type GenericPayload<T> = string | number | { contents: T };
    export const GenericSemantic = (props: { prefix?: GenericPayload<Styles> }) => null;
    type DefaultPayload<T = Styles> = string | { contents: T };
    export const DefaultSemantic = (props: { prefix?: DefaultPayload }) => null;`,
  );
  expect(
    rules(`import { SemanticNested, ConditionalComponent, GenericSemantic, DefaultSemantic } from './components';
    <SemanticNested prefix={{ text: '17px' }} />;
    <ConditionalComponent position="after" />;
    <GenericSemantic prefix="17px" />; <DefaultSemantic prefix="17px" />;`),
  ).toEqual([]);
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

it('discovers a first-linted unsaved file after its first save', () => {
  const code = `import { TabDropIndicator } from './components'; <TabDropIndicator position="after" />;`;
  expect(rules(code)).toEqual([]);
  filename = join(dir, 'unsaved.tsx');
  expect(rules(code)).toEqual(['tasty/valid-value']);
  writeFileSync(
    filename,
    `import { Box } from './components'; <Box position="after" />;`,
  );
  // Saving discovers the root; the current editor buffer still wins over disk.
  expect(rules(code)).toEqual([]);
  expect(rules(readFileSync(filename, 'utf8'))).toEqual(['tasty/valid-value']);
});

it('uses the current buffer when an excluded file becomes an imported dependency', () => {
  const config = JSON.parse(readFileSync(join(dir, 'tsconfig.json'), 'utf8'));
  config.include = ['components.tsx'];
  writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify(config));
  writeFileSync(
    filename,
    `import { Box } from './components'; <Box position="after" />;`,
  );
  const code = `import { TabDropIndicator } from './components'; <TabDropIndicator position="after" />;`;
  expect(rules(code)).toEqual(['tasty/valid-value']);
  expect(rules(code)).toEqual(['tasty/valid-value']);
  const components = join(dir, 'components.tsx');
  writeFileSync(
    components,
    readFileSync(components, 'utf8') + "\nimport './consumer';",
  );
  expect(rules(code)).toEqual([]);
  expect(rules(readFileSync(filename, 'utf8'))).toEqual(['tasty/valid-value']);
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
