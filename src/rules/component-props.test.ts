import { Linter } from 'eslint';
import parser from '@typescript-eslint/parser';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import plugin, { recommended, strict } from '../index.js';

const linter = new Linter();
const filename = resolve('test/fixtures/style-values/component.tsx');
const imports = `import { tasty as component } from '@tenphi/tasty';\n`;
const local = imports + `const Box = component({});\n`;
const cases = [
  [
    'no-style-prop',
    'style',
    'noStyleProp',
    ['tokens', 'token references', 'third-party library'],
  ],
  [
    'no-classname-prop',
    'className',
    'noClassNameProp',
    ['data-element="Name"', "parent's styles", 'third-party library'],
  ],
  [
    'no-styles-prop',
    'styles',
    'noStylesProp',
    ['tokens', 'mods', 'tasty(Component, { styles: ... })', 'edge case'],
  ],
] as const;

function check(code: string, rule: string) {
  const config = [
    {
      files: ['**/*.tsx'],
      languageOptions: {
        parser,
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
      plugins: { tasty: plugin },
      rules: { [`tasty/${rule}`]: 'warn' },
    },
  ];
  return {
    messages: linter.verify(code, config, { filename }),
    fixed: linter.verifyAndFix(code, config, { filename }),
  };
}

for (const [rule, prop, messageId, guidance] of cases) {
  describe(rule, () => {
    const values = [
      '="value"',
      '={value}',
      '={{ value: 1 }}',
      '={(value as Props)!}',
      '={active ? first : second}',
      '={getValue()}',
      '={null}',
      '',
    ];
    for (const value of values) {
      it(`warns on explicit ${prop}${value} with actionable guidance`, () => {
        const source = local + `<Box ${prop}${value} />;`;
        const { messages, fixed } = check(source, rule);
        expect(messages.map((message) => message.messageId)).toEqual([
          messageId,
        ]);
        expect(messages[0].severity).toBe(1);
        for (const text of guidance)
          expect(messages[0].message).toContain(text);
        expect(messages[0].message).toContain(
          `explicitly disable tasty/${rule}`,
        );
        expect(messages[0].message).toContain(
          'with an ESLint comment and a reason',
        );
        expect(messages[0].fix).toBeUndefined();
        expect(messages[0].suggestions).toBeUndefined();
        expect(fixed.output).toBe(source);
      });
    }
    for (const [name, source] of Object.entries({
      'named import': `import { Box } from '@my/ds'; <Box ${prop}={value} />;`,
      'default import': `import Box from '@my/ds'; <Box ${prop}={value} />;`,
      'namespace import': `import * as ui from '@my/ds'; <ui.Box ${prop}={value} />;`,
      'local sub-element': local + `<Box.Label ${prop}={value} />;`,
      'wrapped factory':
        imports +
        `const Box = (component({}) as Component)!; <Box ${prop}={value} />;`,
      'custom factory': `import { component } from '@my/ds'; const Box = component({}); <Box ${prop}={value} />;`,
      'local alias':
        local +
        `const Alias = Box as Component; const Second = Alias; <Second ${prop}={value} />;`,
      'sub-element alias':
        local + `const Label = Box.Label; <Label ${prop}={value} />;`,
      'import alias': `import { Box } from '@my/ds'; const Alias = Box; <Alias ${prop}={value} />;`,
      'inline spread': local + `<Box {...{ ${prop}: value }} />;`,
      'wrapped nested spread':
        local +
        `<Box {...({ ...({ ${prop}: value } as Props) } satisfies Props)} />;`,
      'computed string spread': local + `<Box {...{ ['${prop}']: value }} />;`,
    })) {
      it(`detects ${name} exactly once`, () => {
        expect(
          check(source, rule).messages.map((message) => message.messageId),
        ).toEqual([messageId]);
      });
    }
    for (const [name, source] of Object.entries({
      'native element': local + `<div ${prop}={value} />;`,
      'unknown component': `<Box ${prop}={value} />;`,
      'unrelated local component': `const Box = (props) => null; <Box ${prop}={value} />;`,
      'unrelated factory': `import { tasty } from 'unrelated'; const Box = tasty({}); <Box ${prop}={value} />;`,
      'unlisted component import': `import { Box } from 'unrelated'; <Box ${prop}={value} />;`,
      'type-only import': `import type { Box } from '@my/ds'; <Box ${prop}={value} />;`,
      'specifier type import': `import { type Box } from '@my/ds'; <Box ${prop}={value} />;`,
      'shadowed component':
        local + `function render(Box) { return <Box ${prop}={value} />; }`,
      'shadowed factory':
        imports +
        `function render(component) { const Box = component({}); return <Box ${prop}={value} />; }`,
      'mutable component':
        imports + `let Box = component({}); <Box ${prop}={value} />;`,
      'destructured factory result':
        imports + `const { Box } = component({}); <Box ${prop}={value} />;`,
      'alias cycle': `const Box = Other; const Other = Box; <Box ${prop}={value} />;`,
      'alias to shadowed component':
        local +
        `function render(Box) { const Alias = Box; return <Alias ${prop}={value} />; }`,
      'alias through dynamic member':
        local + `const Alias = Box[key].Label; <Alias ${prop}={value} />;`,
      'shadowed namespace': `import * as ui from '@my/ds'; function render(ui) { return <ui.Box ${prop}={value} />; }`,
      'lowercase tag':
        imports + `const box = component({}); <box ${prop}={value} />;`,
      'opaque spread':
        local + `const props = { ${prop}: value }; <Box {...props} />;`,
      'computed dynamic key': local + `<Box {...{ [${prop}]: value }} />;`,
      'nested non-prop object':
        local + `<Box {...{ nested: { ${prop}: value } }} />;`,
    })) {
      it(`ignores ${name}`, () => {
        expect(check(source, rule).messages).toEqual([]);
      });
    }
    it('is a warning in both presets', () => {
      expect(recommended[`tasty/${rule}`]).toBe('warn');
      expect(strict[`tasty/${rule}`]).toBe('warn');
    });
    for (const [name, snippet] of Object.entries({
      'ordinary comment': `// eslint-disable-next-line tasty/${rule} -- required by the adapter\n<Box ${prop}={value} />;`,
      'JSX child comment': `<>{/* eslint-disable-next-line tasty/${rule} -- required by the adapter */}\n<Box ${prop}={value} /></>;`,
      'spread property comment': `<Box {...{\n// eslint-disable-next-line tasty/${rule} -- required by the adapter\n${prop}: value,\n}} />;`,
    })) {
      it(`honors a local ignore with a ${name} without hiding the next usage`, () => {
        const source = local + snippet + `\n<Box ${prop}={value} />;`;
        const { messages, fixed } = check(source, rule);
        expect(messages.map((message) => message.messageId)).toEqual([
          messageId,
        ]);
        expect(messages[0].line).toBe(source.split('\n').length);
        expect(fixed.output).toBe(source);
      });
    }
  });
}

it('a prop-specific ignore leaves the other prop warnings visible', () => {
  const messages = linter.verify(
    local +
      `// eslint-disable-next-line tasty/no-style-prop -- positioning library supplies inline styles\n<Box style={value} className="external" styles={overrides} />;`,
    [
      {
        files: ['**/*.tsx'],
        languageOptions: { parser },
        plugins: { tasty: plugin },
        rules: Object.fromEntries(
          cases.map(([rule]) => [`tasty/${rule}`, 'warn']),
        ),
      },
    ],
    { filename },
  );
  expect(messages.map((message) => message.messageId)).toEqual([
    'noClassNameProp',
    'noStylesProp',
  ]);
});

for (const [name, preset] of Object.entries({ recommended, strict })) {
  it(`${name} supports tokens, mods, data-element and factory styles`, () => {
    const source =
      imports +
      `const Box = component({ styles: { padding: '1x' } });
      <Box tokens={{ $size: size }} mods={{ compact }} data-element="Body" />;`;
    expect(
      linter.verify(
        source,
        [
          {
            files: ['**/*.tsx'],
            languageOptions: { parser },
            plugins: { tasty: plugin },
            rules: preset,
          },
        ],
        { filename },
      ),
    ).toEqual([]);
  });
}

describe('components imported from relative modules', () => {
  const project = mkdtempSync(join(tmpdir(), 'tasty-relative-components-'));
  const modules = {
    'package.json': '{}',
    'tasty.config.json': JSON.stringify({
      importSources: ['@my/ds'],
      styleFunctions: { component: { argument: 0, kind: 'options' } },
    }),
    'styled.ts': `
      import { tasty } from '@tenphi/tasty';
      import { component, Card } from '@my/ds';
      export const Panel = tasty({ styles: { width: '$panel-width' } });
      const Inner = tasty({});
      export { Inner as Renamed };
      export const Alias = (Panel as typeof Panel)!;
      export const Custom = component({});
      export const Reexported = Card;
      export const Plain = (props: object) => null;
      export default tasty({});
    `,
    'elements.ts': `export { Panel as Deep } from './styled.js';`,
    'ui/index.ts': `export * from '../styled';`,
    'other.ts': `import { tasty } from 'unrelated'; export const Fake = tasty({});`,
    'cycle-a.ts': `export { Loop } from './cycle-b';`,
    'cycle-b.ts': `export { Loop } from './cycle-a';`,
  };
  for (const [path, text] of Object.entries(modules)) {
    mkdirSync(dirname(join(project, path)), { recursive: true });
    writeFileSync(join(project, path), text);
  }
  const app = join(project, 'App.tsx');
  const projectLinter = new Linter({ cwd: project });
  afterAll(() => rmSync(project, { recursive: true, force: true }));

  function warnings(source: string) {
    return projectLinter
      .verify(
        source,
        [
          {
            files: ['**/*.tsx'],
            languageOptions: {
              parser,
              parserOptions: { ecmaFeatures: { jsx: true } },
            },
            plugins: { tasty: plugin },
            rules: { 'tasty/no-style-prop': 'warn' },
          },
        ],
        { filename: app },
      )
      .map((message) => message.messageId);
  }

  for (const [name, source] of Object.entries({
    'named export': `import { Panel } from './styled'; <Panel style={value} />;`,
    'emitted extension': `import { Panel } from './styled.js'; <Panel style={value} />;`,
    'renamed export': `import { Renamed } from './styled'; <Renamed style={value} />;`,
    'exported alias': `import { Alias } from './styled'; <Alias style={value} />;`,
    'custom factory': `import { Custom } from './styled'; <Custom style={value} />;`,
    'configured import': `import { Reexported } from './styled'; <Reexported style={value} />;`,
    'default export': `import Styled from './styled'; <Styled style={value} />;`,
    're-export': `import { Deep } from './elements'; <Deep style={value} />;`,
    'directory star re-export': `import { Panel } from './ui'; <Panel style={value} />;`,
    'local alias of import': `import { Panel } from './styled'; const Local = Panel; <Local style={value} />;`,
  })) {
    it(`detects a ${name}`, () => {
      expect(warnings(source)).toEqual(['noStyleProp']);
    });
  }

  for (const [name, source] of Object.entries({
    'plain component': `import { Plain } from './styled'; <Plain style={value} />;`,
    'unrelated factory': `import { Fake } from './other'; <Fake style={value} />;`,
    'missing export': `import { Missing } from './styled'; <Missing style={value} />;`,
    'missing module': `import { Panel } from './missing'; <Panel style={value} />;`,
    're-export cycle': `import { Loop } from './cycle-a'; <Loop style={value} />;`,
    'type-only import': `import type { Panel } from './styled'; <Panel style={value} />;`,
  })) {
    it(`ignores a ${name}`, () => {
      expect(warnings(source)).toEqual([]);
    });
  }
});

describe('no-style-prop elements option', () => {
  function lint(code: string, options?: object) {
    const config = [
      {
        files: ['**/*.tsx'],
        languageOptions: {
          parser,
          parserOptions: { ecmaFeatures: { jsx: true } },
        },
        plugins: { tasty: plugin },
        rules: {
          'tasty/no-style-prop': options ? ['warn', options] : 'warn',
          'tasty/no-classname-prop': 'warn',
        },
      },
    ] as never;
    return linter.verify(local + code, config, { filename });
  }

  function ids(code: string, options?: object) {
    return lint(code, options).map((message) => message.messageId);
  }

  const elements = {
    tasty: `<Box style={value} />;`,
    component: `<Other style={value} />;`,
    member: `<UI.Panel style={value} />;`,
    lowercaseMember: `<motion.div style={value} />;`,
    native: `<div style={value} />;`,
    custom: `<my-element style={value} />;`,
    namespaced: `<svg:rect style={value} />;`,
    spread: `<div {...{ style: value }} />;`,
  };

  it.each(
    Object.entries({
      tasty: ['tasty'],
      components: ['tasty', 'component', 'member', 'lowercaseMember'],
      all: Object.keys(elements),
    }),
  )('elements: %s reports style on %j', (option, reported) => {
    for (const [name, code] of Object.entries(elements)) {
      const expected = reported.includes(name)
        ? [name === 'tasty' ? 'noStyleProp' : 'noInlineStyle']
        : [];
      expect(ids(code, { elements: option }), name).toEqual(expected);
    }
  });

  it('defaults to Tasty components', () => {
    expect(ids(Object.values(elements).join('\n'))).toEqual(['noStyleProp']);
  });

  it('points other elements at Tasty and the exception path', () => {
    const [message] = lint(elements.native, { elements: 'all' });
    for (const text of [
      'tasty(Component, { styles })',
      "'tokens'",
      'explicitly disable tasty/no-style-prop',
      'with an ESLint comment and a reason',
    ])
      expect(message.message).toContain(text);
  });

  it('leaves opaque spreads and other props alone', () => {
    expect(
      ids(`<div {...props} className="x" />;\n<Other className="x" />;`, {
        elements: 'all',
      }),
    ).toEqual([]);
  });

  it('is suppressed by a directive naming only this rule', () => {
    expect(
      ids(
        `// eslint-disable-next-line tasty/no-style-prop -- positioning library\n<Other style={value} />;\n<div style={value} />;`,
        { elements: 'all' },
      ),
    ).toEqual(['noInlineStyle']);
  });

  it('rejects an unknown value', () => {
    expect(() => lint(elements.native, { elements: 'dom' })).toThrow();
  });
});
