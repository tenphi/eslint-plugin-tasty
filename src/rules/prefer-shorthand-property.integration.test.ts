import { Linter } from 'eslint';
import { renderStyles, tasty } from '@tenphi/tasty';
import plugin from '../index.js';
import { SHORTHAND_MAPPING } from '../constants.js';

const linter = new Linter();
const ruleConfig = [
  {
    plugins: { tasty: plugin as never },
    rules: { 'tasty/prefer-shorthand-property': 'warn' },
  },
] as never;

describe('prefer-shorthand-property token guidance', () => {
  it.each([
    ['minHeight', 'height', '$min-height', '$min-height auto 100%'],
    ['maxHeight', 'height', '$max-height', '0 auto $max-height'],
    ['minWidth', 'width', '$min-width', '$min-width auto 100%'],
    ['maxWidth', 'width', '$max-width', '0 auto $max-width'],
    [
      'minBlockSize',
      'blockSize',
      '$min-block-size',
      '$min-block-size auto 100%',
    ],
    ['maxBlockSize', 'blockSize', '$max-block-size', '0 auto $max-block-size'],
    [
      'minInlineSize',
      'inlineSize',
      '$min-inline-size',
      '$min-inline-size auto 100%',
    ],
    [
      'maxInlineSize',
      'inlineSize',
      '$max-inline-size',
      '0 auto $max-inline-size',
    ],
  ])(
    'offers a token for %s in definitions and extensions',
    (native, property, token, value) => {
      for (const args of ['', 'Base, ']) {
        const code = `import { tasty } from '@tenphi/tasty'; tasty(${args}{ styles: { ${native}: '100vh' } });`;
        const result = linter.verifyAndFix(code, ruleConfig);

        expect(result.fixed).toBe(false);
        expect(result.output).toBe(code);
        expect(result.messages).toHaveLength(1);
        const message = result.messages[0].message;
        expect(message).toContain(`To override only '${native}'`);
        expect(message).toContain(`${property}: '${value}'`);
        expect(message).toContain(`tokens={{ '${token}': '20x' }}`);
        expect(message).toContain('with a default');
        expect(message).toContain('keep its other values');
        expect(message).not.toContain("padding: '$v-padding");
      }

      expect(
        renderStyles({ [property]: value }).rules[0].declarations,
      ).toContain(`${token.slice(1)}: var(--${token.slice(1)});`);
    },
  );

  it.each(Object.entries(SHORTHAND_MAPPING))(
    'explains independent overrides for report-only %s diagnostics',
    (native, mapping) => {
      for (const args of ['', 'Base, ']) {
        const code = `import { tasty } from '@tenphi/tasty'; tasty(${args}{ styles: { ${native}: '1x' } });`;
        const result = linter.verifyAndFix(code, ruleConfig);

        if (mapping.safeFix && !args) {
          expect(result.fixed).toBe(true);
          expect(result.messages).toEqual([]);
        } else {
          expect(result.fixed).toBe(false);
          expect(result.output).toBe(code);
          expect(result.messages).toHaveLength(1);
          expect(result.messages[0].message).toContain('token');
          expect(result.messages[0].message).toContain('keep its other values');
        }
      }
    },
  );

  it.each([
    `tasty({ styles: { minHeight: { '': '100vh', compact: '20x' } } })`,
    `tasty({ styles: { Body: { minHeight: '100vh' } } })`,
    `tastyStatic({ minHeight: '100vh' })`,
    `tastyStatic('.card', { minHeight: '100vh' })`,
    `tastyStatic(Base, { minHeight: '100vh' })`,
    `useStyles({ minHeight: '100vh' })`,
    `useGlobalStyles('body', { minHeight: '100vh' })`,
    `const Card = tasty({}); const view = <Card styles={{ minHeight: '100vh' }} />`,
  ])('includes token guidance in %s', (call) => {
    const code = `import { tasty, tastyStatic, useStyles, useGlobalStyles } from '@tenphi/tasty'; ${call};`;
    const config = [
      {
        ...ruleConfig[0],
        languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
      },
    ] as never;
    const result = linter.verifyAndFix(code, config);

    expect(result.fixed).toBe(false);
    expect(result.output).toBe(code);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].message).toContain(
      "tokens={{ '$min-height': '20x' }}",
    );
  });

  it('accepts the token pattern under recommended and strict presets', () => {
    const code = `import { tasty } from '@tenphi/tasty';
      const Card = tasty({
        styles: {
          '$min-height': '100vh',
          height: '$min-height auto 100vw',
        },
      });
      const view = <Card tokens={{ '$min-height': '20x' }} />;
    `;

    for (const preset of ['recommended', 'strict'] as const) {
      const config = [
        {
          ...plugin.configs[preset],
          languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
        },
      ] as never;
      expect(linter.verify(code, config)).toEqual([]);
    }
  });
});

describe('dimension token guidance against Tasty', () => {
  it('uses min / max for two values and min / height / max for three', () => {
    expect(renderStyles({ height: '20x 100vw' }).rules[0].declarations).toBe(
      'height: auto; min-height: 160px; max-height: 100vw;',
    );
    expect(
      renderStyles({ height: '20x 100vh 100vw' }).rules[0].declarations,
    ).toBe(
      renderStyles({ height: '100vh', minHeight: '20x', maxHeight: '100vw' })
        .rules[0].declarations,
    );
    expect(renderStyles({ height: 'min 20x' }).rules[0].declarations).toBe(
      'height: auto; min-height: 160px; max-height: initial;',
    );
  });

  it('overrides only the token while preserving height and max-height', () => {
    // The Node entry renders an RSC-compatible element without a DOM. Render
    // the forwardRef component to inspect the actual tokens prop processing.
    const Card = tasty({
      tokens: { '$min-height': '100vh' },
      styles: { height: '$min-height auto 100vw' },
    }) as any;
    const initial = Card.render({}, null).props.children;
    const overridden = Card.render({ tokens: { '$min-height': '20x' } }, null)
      .props.children;

    expect(initial[1].props.style).toEqual({ '--min-height': '100vh' });
    expect(overridden[1].props.style).toEqual({ '--min-height': '160px' });
    expect(overridden[0].props.dangerouslySetInnerHTML).toEqual(
      initial[0].props.dangerouslySetInnerHTML,
    );
    expect(overridden[0].props.dangerouslySetInnerHTML.__html).toContain(
      'height: auto; min-height: var(--min-height); max-height: 100vw;',
    );
  });
});
