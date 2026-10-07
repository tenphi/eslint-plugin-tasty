import { Linter } from 'eslint';
import parser from '@typescript-eslint/parser';
import { resolve } from 'node:path';
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
