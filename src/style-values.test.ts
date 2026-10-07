import { Linter } from 'eslint';
import parser from '@typescript-eslint/parser';
import { resolve } from 'node:path';
import { renderStyles } from '@tenphi/tasty';
import plugin from './index.js';

const filename = resolve('test/fixtures/style-values/component.tsx');
const factory = `import { tasty } from '@tenphi/tasty';\n`;
const linter = new Linter();

function lint(code: string, rule: string) {
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
        rules: { [`tasty/${rule}`]: 'error' },
      },
    ],
    { filename },
  );
}

const cases = [
  ['no-raw-color-values', 'fill', 'red', 'rawNamedColor'],
  ['valid-color-token', 'fill', '#missing-color', 'unknownToken'],
  ['valid-custom-property', 'gap', '$missing-gap', 'unknownProperty'],
  ['valid-custom-unit', 'gap', '2unknownunit', 'unknownUnit'],
  ['valid-value', 'padding', '1x sideways', 'invalidMod'],
  ['valid-directional-modifier', 'padding', '1x 2x top', 'tooManyValues'],
  ['valid-radius-shape', 'radius', 'square', 'unknownShape'],
  ['valid-preset', 'preset', 'missing-preset', 'unknownPreset'],
  ['valid-recipe', 'recipe', 'missing-recipe', 'unknownRecipe'],
  ['consistent-token-usage', 'gap', '17px', 'rawPixelValue'],
  ['no-raw-motion-duration', 'animationDuration', '200ms', 'rawMotionDuration'],
  [
    'no-raw-transition-duration',
    'transition',
    'fill 200ms',
    'rawTransitionDuration',
  ],
  ['valid-transition', 'transition', 'missing-property', 'unknownTransition'],
  ['no-important', 'fill', '#surface !important', 'noImportant'],
  ['prefer-auto-calc', 'width', 'calc(100% - 1x)', 'preferAutoCalc'],
  [
    'prefer-custom-property-syntax',
    'gap',
    'var(--gap)',
    'preferCustomPropertySyntax',
  ],
] as const;

for (const [rule, property, value, messageId] of cases) {
  describe(rule, () => {
    const definition = `${property}: '${value}'`;
    const forms = {
      'factory style': factory + `tasty({ styles: { ${definition} } });`,
      'typed sub-element': `const s: Styles = { Outer: { Inner: { ${definition} } } };`,
      'JSX styles sub-element': `<Box styles={{ Outer: { Inner: { ${definition} } } }} />;`,
      'wrapped custom Styles prop': `<Box innerStyles={({ Outer: { ${definition} } } as Styles)!} />;`,
      'JSX literal':
        factory + `const Box = tasty({}); <Box ${property}="${value}" />;`,
      'JSX expression':
        factory +
        `const Box = tasty({}); <Box ${property}={'${value}' as const} />;`,
      'JSX template':
        factory + `const Box = tasty({}); <Box ${property}={\`${value}\`} />;`,
      'JSX state map':
        factory +
        `const Box = tasty({}); <Box ${property}={{ '': '${value}' }} />;`,
      'JSX conditional':
        factory +
        `const Box = tasty({}); <Box ${property}={active ? '${value}' : undefined} />;`,
      'JSX logical':
        factory +
        `const Box = tasty({}); <Box ${property}={active && '${value}'} />;`,
      'imported component': `import { Box } from '@my/ds'; <Box ${property}="${value}" />;`,
      'namespace component': `import * as UI from '@my/ds'; <UI.Box ${property}="${value}" />;`,
      'custom factory': `import { component } from '@my/ds'; const Box = component({}); <Box ${property}="${value}" />;`,
    };
    for (const [name, code] of Object.entries(forms)) {
      it(`checks ${name} exactly once`, () => {
        expect(lint(code, rule).map((message) => message.messageId)).toEqual([
          messageId,
        ]);
      });
    }
    it('ignores DOM, inline CSS, unrelated attributes and opaque expressions', () => {
      expect(
        lint(
          `
        <svg ${property}="${value}" />;
        <div ${property}="${value}" />;
        <Box style={{ ${definition} }} unrelated="${value}" />;
        <Box ${property}={dynamicValue} />;
        <Box ${property}={getValue('${value}')} />;
        <Box ${property}={\`prefix \${dynamicValue}\`} />;
        const unrelated = { ${definition} };
        const styles: CSSProperties = { ${definition} };
      `,
          rule,
        ),
      ).toEqual([]);
    });
  });
}

it('validates bare, wrapped and state-map booleans', () => {
  expect(
    lint(
      `<Box fill />; <Box fill={true as const} />;
    <Box fill={{ hovered: true }} />;`,
      'valid-boolean-property',
    ).map((message) => message.messageId),
  ).toEqual(Array(3).fill('invalidBooleanTrue'));
  expect(
    lint(
      `<Box padding />; <Box fill={false} />; <svg fill />;`,
      'valid-boolean-property',
    ),
  ).toEqual([]);
});

it('checks heuristic consumer props without requiring a factory in the file', () => {
  expect(
    lint(`<Box fill="red" />; <UI.Box fill="red" />;`, 'no-raw-color-values'),
  ).toHaveLength(2);
  expect(
    lint(`<Box glaze="#missing-color" />;`, 'valid-color-token'),
  ).toHaveLength(1);
});

it('keeps semantic rewrites off unrelated or shadowed components', () => {
  const code =
    factory +
    `const Box = tasty({});
    function render(Box) { return <Box gap="var(--gap)" width="calc(100% - 1x)" transition="fill 200ms" />; }
    const Button = (props) => null;
    <Button gap="var(--gap)" width="calc(100% - 1x)" transition="fill 200ms" />;`;
  for (const rule of [
    'prefer-auto-calc',
    'prefer-custom-property-syntax',
    'no-raw-transition-duration',
  ]) {
    expect(lint(code, rule)).toEqual([]);
  }
});

it('collects local token declarations once, including nested shared styles', () => {
  const code = `<Box fill="#local" gap="$local" />;
    const s: Styles = { Outer: { Inner: { '#local': '#fff', '$local': '17px' } } };`;
  expect(lint(code, 'valid-color-token')).toEqual([]);
  expect(lint(code, 'valid-custom-property')).toEqual([]);
});

it('reports raw pixels in compounds, groups, fallbacks and expressions', () => {
  for (const value of [
    '17px 19px',
    '17px top, 19px bottom',
    'calc(100% - 17px + 19px)',
    '($gap + 17px + 19px)',
    'var(--gap, 17px) 19px',
  ]) {
    expect(
      lint(`<Box padding="${value}" />;`, 'consistent-token-usage').map(
        (message) => message.messageId,
      ),
    ).toEqual(['rawPixelValue', 'rawPixelValue']);
  }
  for (const value of ['-17px', '.5px', '17.5PX', '1e2px']) {
    expect(
      lint(`<Box gap="${value}" />;`, 'consistent-token-usage'),
    ).toHaveLength(1);
  }
});

it('leaves zero, token definitions, quoted content, URLs and identifiers alone', () => {
  const code = `<Box gap="0px -0px 0.0px $size17px var(--size17px)" />;
    const s: Styles = { '$gap': '17px', '$size17px': '1x', '$red': '#surface', '#brand-red': '#fff', '#surface': '#ffffff', content: '"17px rgb(1, 2, 3) #missing $missing !important"',
      fill: 'url(17px-red-#fff-$missing.svg) #brand-red $red var(--red)' };`;
  for (const rule of [
    'consistent-token-usage',
    'no-raw-color-values',
    'valid-color-token',
    'valid-custom-property',
    'valid-custom-unit',
    'no-important',
  ]) {
    expect(lint(code, rule)).toEqual([]);
  }
});

it('skips CSS function names while validating their token arguments', () => {
  expect(lint(`<Box fill="##tint(#surface)" />;`, 'valid-color-token')).toEqual(
    [],
  );
  expect(
    lint(`<Box gap="$$double($gap)" />;`, 'valid-custom-property'),
  ).toEqual([]);
  expect(
    lint(`<Box fill="##tint(#missing-color)" />;`, 'valid-color-token'),
  ).toHaveLength(1);
  expect(
    lint(`<Box gap="$$double($missing-gap)" />;`, 'valid-custom-property'),
  ).toHaveLength(1);
  expect(
    lint(`<Box fill="#surface.$missing-opacity" />;`, 'valid-custom-property'),
  ).toHaveLength(1);
});

it('validates units inside expressions and comma-separated groups', () => {
  expect(
    lint(
      `<Box padding="min(2unknownunit, 3cols), 4unknownunit top" />;`,
      'valid-custom-unit',
    ),
  ).toHaveLength(2);
  expect(
    lint(`<Box gap="2custom2" />;`, 'valid-custom-unit')[0].message,
  ).toContain("'custom2'");
});

it('validates complete color opacity suffixes', () => {
  for (const value of [
    '#surface.',
    '#surface.200',
    '#surface.-1',
    '#surface.invalid',
  ]) {
    expect(
      lint(`<Box fill="${value}" />;`, 'valid-color-token')[0].messageId,
    ).toBe('invalidSyntax');
  }
});

it('checks only values a logical expression can return', () => {
  expect(
    lint(`<Box fill={true && '#surface'} />;`, 'valid-boolean-property'),
  ).toEqual([]);
  expect(
    lint(`<Box fill={'red' && '#surface'} />;`, 'no-raw-color-values'),
  ).toEqual([]);
  expect(
    lint(`<Box fill={'#surface' || 'red'} />;`, 'no-raw-color-values'),
  ).toEqual([]);
  expect(
    lint(`<Box fill={'#surface' ?? 'red'} />;`, 'no-raw-color-values'),
  ).toEqual([]);
  expect(
    lint(`<Box fill={undefined ?? 'red'} />;`, 'no-raw-color-values'),
  ).toHaveLength(1);
});

it('preserves JSX quotes, surrounding syntax and other values in suggestions', () => {
  const code = `<Box padding="8px top, 17px bottom, 8px left" />;`;
  const [message] = lint(code, 'consistent-token-usage');
  const fix = message.suggestions![0].fix;
  const output =
    code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
  expect(output).toBe(`<Box padding="1x top, 17px bottom, 1x left" />;`);
  expect(
    lint(output, 'consistent-token-usage').map((message) => message.messageId),
  ).toEqual(['rawPixelValue']);
});

it('withholds suggestions when escapes or JSX entities change source offsets', () => {
  expect(
    lint(`<Box padding="8px&#32;top" />;`, 'consistent-token-usage')[0]
      .suggestions,
  ).toBeUndefined();
  expect(
    lint(
      String.raw`<Box padding={'8px\u0020top'} />;`,
      'consistent-token-usage',
    )[0].suggestions,
  ).toBeUndefined();
});

it('does not rewrite token-like text or quoted CSS-variable fallbacks', () => {
  const code =
    factory +
    `const Box = tasty({});
    <Box content={'"var(--gap) !important transparent"'} />;
    <Box fill="#brand-transparent $currentColor var(--gap, 'var(--other)')" />;`;
  expect(lint(code, 'prefer-custom-property-syntax')).toEqual([]);
  expect(lint(code, 'no-important')).toEqual([]);
});

it('removes a real important suffix while preserving quoted text', () => {
  const code = `<Box content={'"!important" !IMPORTANT'} />;`;
  const [message] = lint(code, 'no-important');
  const fix = message.fix!;
  expect(
    code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]),
  ).toBe(`<Box content={'"!important"'} />;`);
});

it('checks numeric inputs that enhanced handlers convert to pixels', () => {
  const code = `<Box gap={17} padding={{ hovered: -17 }} inlineSize={17} />;`;
  expect(
    lint(code, 'consistent-token-usage').map((message) => message.messageId),
  ).toEqual(Array(3).fill('rawPixelValue'));
  expect(
    lint(
      `<Box opacity={0.5} zIndex={17} order={17} flexGrow={17} gap={0} />;`,
      'consistent-token-usage',
    ),
  ).toEqual([]);
  const numeric = `<Box gap={8 as const} />;`;
  const fix = lint(numeric, 'consistent-token-usage')[0].suggestions![0].fix;
  expect(
    numeric.slice(0, fix.range[0]) + fix.text + numeric.slice(fix.range[1]),
  ).toBe(`<Box gap={'1x' as const} />;`);
});

it('uses the same shared-style detection for property and structure rules', () => {
  for (const code of [
    `const s: Styles = { Outer: { Inner: { paddding: '1x' } } };`,
    `<Box innerStyles={({ Outer: { paddding: '1x' } } as Styles)!} />;`,
  ]) {
    expect(lint(code, 'known-property')).toHaveLength(1);
  }
  expect(
    lint(
      `<Box innerStyles={{ Outer: { fill: { 'bad |': '#surface' } } }} />;`,
      'valid-state-key',
    ),
  ).toHaveLength(1);
});

it('preserves ownership through wrapped JSX styles', () => {
  expect(
    lint(
      `import { Box } from 'unrelated';
    <Box styles={({ backgroundColor: '#surface' } as Styles)!} />;`,
      'prefer-shorthand-property',
    ),
  ).toEqual([]);
});

it('checks numeric inputs whose runtime CSS is actually measured in pixels', () => {
  for (const property of [
    'gap',
    'padding',
    'inlineSize',
    'blockBorder',
    'radius',
    'width',
    'scrollMargin',
    'outlineOffset',
  ]) {
    const css = renderStyles({ [property]: 17 })
      .rules.map((rule) => rule.declarations)
      .join('');
    expect(css, property).toContain('17px');
    expect(
      lint(`<Box ${property}={17} />;`, 'consistent-token-usage'),
    ).toHaveLength(1);
  }
});

it('does not mistake a reference before an expression for a function call', () => {
  expect(
    lint(`<Box fill="#missing-color (1x + 2x)" />;`, 'valid-color-token'),
  ).toHaveLength(1);
  expect(
    lint(
      `<Box transition="##missing-color (200ms * 2)" />;`,
      'valid-color-token',
    ),
  ).toHaveLength(1);
  expect(
    lint(`<Box gap="$missing-gap (1x + 2x)" />;`, 'valid-custom-property'),
  ).toHaveLength(1);
  expect(
    lint(
      `<Box transition="$$missing-gap (200ms * 2)" />;`,
      'valid-custom-property',
    ),
  ).toHaveLength(1);
});
