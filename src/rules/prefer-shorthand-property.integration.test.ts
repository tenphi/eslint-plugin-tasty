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
    ['minHeight', 'height', '$min-height', '$min-height auto initial'],
    ['maxHeight', 'height', '$max-height', 'initial auto $max-height'],
    ['minWidth', 'width', '$min-width', '$min-width auto initial'],
    ['maxWidth', 'width', '$max-width', 'initial auto $max-width'],
    [
      'minBlockSize',
      'blockSize',
      '$min-block-size',
      '$min-block-size auto initial',
    ],
    [
      'maxBlockSize',
      'blockSize',
      '$max-block-size',
      'initial auto $max-block-size',
    ],
    [
      'minInlineSize',
      'inlineSize',
      '$min-inline-size',
      '$min-inline-size auto initial',
    ],
    [
      'maxInlineSize',
      'inlineSize',
      '$max-inline-size',
      'initial auto $max-inline-size',
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
      expect(
        renderStyles({ [property]: value.replace(token, '20x') }).rules[0]
          .declarations,
      ).toBe(renderStyles({ [native]: '20x' }).rules[0].declarations);
    },
  );

  it.each(['inherit', 'initial', 'unset', 'revert', 'revert-layer'])(
    'keeps the property advice consistent for fontFamily: %s',
    (keyword) => {
      for (const args of ['', 'Base, ']) {
        const code = `import { tasty } from '@tenphi/tasty'; tasty(${args}{ styles: { fontFamily: '${keyword}' } });`;
        const messages = linter.verify(code, ruleConfig);

        expect(messages).toHaveLength(1);
        expect(messages[0].message).toContain(`preset: '${keyword}'`);
        expect(messages[0].message).toContain("'preset'");
        expect(messages[0].message).not.toContain("'font'");
      }
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
    [`tasty({ styles: { minHeight: { '': '100vh', compact: '20x' } } })`, true],
    [`tasty({ styles: { Body: { minHeight: '100vh' } } })`, true],
    [`tastyStatic({ minHeight: '100vh' })`, false],
    [`tastyStatic('.card', { minHeight: '100vh' })`, false],
    [`tastyStatic(Base, { minHeight: '100vh' })`, false],
    [`useStyles({ minHeight: '100vh' })`, false],
    [`useGlobalStyles('body', { minHeight: '100vh' })`, false],
    [
      `const Card = tasty({}); const view = <Card styles={{ minHeight: '100vh' }} />`,
      true,
    ],
  ])('includes applicable token guidance in %s', (call, usesTokensProp) => {
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
    if (usesTokensProp) {
      expect(result.messages[0].message).toContain(
        "tokens={{ '$min-height': '20x' }}",
      );
    } else {
      expect(result.messages[0].message).toContain(
        "set the '--min-height' CSS custom property on the target element",
      );
      expect(result.messages[0].message).toContain("'160px'");
      expect(result.messages[0].message).not.toContain('tokens={{');
      expect(result.messages[0].message).not.toContain('base component');
    }
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

  it('keeps sub-element token defaults on the component root', () => {
    const code = `import { tasty } from '@tenphi/tasty';
      tasty({ styles: { Body: { minHeight: '100vh' } } });`;
    const messages = linter.verify(code, ruleConfig);
    expect(messages[0].message).toContain(
      'Declare the default on the component root so this sub-element inherits the token.',
    );

    const { rules } = renderStyles({
      '$body-min-height': '100vh',
      Body: { height: '$body-min-height auto 100vw' },
    });
    expect(rules.find((rule) => !rule.selector)?.declarations).toContain(
      '--body-min-height: 100vh;',
    );
    const body = rules.find((rule) => rule.selector.includes('Body'))!;
    expect(body.declarations).toContain('min-height: var(--body-min-height);');
    expect(body.declarations).not.toContain('--body-min-height:');
  });

  it.each(['fontSize', 'fontWeight', 'lineHeight', 'fontStyle'])(
    'keeps preset names and modifiers static when overriding %s',
    (native) => {
      const code = `import { tasty } from '@tenphi/tasty';
        tasty(Base, { styles: { ${native}: 'inherit' } });`;
      const messages = linter.verify(code, ruleConfig);
      expect(messages[0].message).toContain(
        'use the CSS value tokens referenced by a named preset',
      );
      expect(messages[0].message).toContain(
        'Keep preset names and modifiers static.',
      );
    },
  );

  it.each(['scrollbarWidth', 'scrollbarGutter'])(
    'uses a token in the %s longhand rather than a static modifier',
    (native) => {
      const code = `import { tasty } from '@tenphi/tasty';
        tasty(Base, { styles: { ${native}: 'auto' } });`;
      const messages = linter.verify(code, ruleConfig);
      expect(messages[0].message).toContain(`'${native}' longhand`);
      expect(messages[0].message).toContain(
        'width and gutter modifiers are static.',
      );
      const token =
        native === 'scrollbarWidth' ? '$scrollbar-width' : '$scrollbar-gutter';
      expect(renderStyles({ [native]: token }).rules[0].declarations).toContain(
        `${token.slice(1)}: var(--${token.slice(1)});`,
      );
    },
  );
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

  it.each(['styles', 'tokens'])(
    'overrides only the token with defaults in %s',
    (defaults) => {
      // The Node entry renders an RSC-compatible element without a DOM. Render
      // the forwardRef component to inspect the actual tokens prop processing.
      const Card = tasty({
        ...(defaults === 'tokens'
          ? { tokens: { '$min-height': '100vh' } }
          : {}),
        styles: {
          ...(defaults === 'styles' ? { '$min-height': '100vh' } : {}),
          height: '$min-height auto 100vw',
        },
      }) as any;
      const initial = Card.render({}, null).props.children;
      const overridden = Card.render({ tokens: { '$min-height': '20x' } }, null)
        .props.children;

      if (defaults === 'tokens') {
        expect(initial[1].props.style).toEqual({ '--min-height': '100vh' });
      } else {
        expect(initial[0].props.dangerouslySetInnerHTML.__html).toContain(
          '--min-height: 100vh;',
        );
        expect(initial[1].props.style).toBeUndefined();
      }
      expect(overridden[1].props.style).toEqual({ '--min-height': '160px' });
      expect(overridden[0].props.dangerouslySetInnerHTML).toEqual(
        initial[0].props.dangerouslySetInnerHTML,
      );
      expect(overridden[0].props.dangerouslySetInnerHTML.__html).toContain(
        'height: auto; min-height: var(--min-height); max-height: 100vw;',
      );
    },
  );
});

describe('preset token guidance against Tasty', () => {
  it('references the preset CSS value token without changing its name', () => {
    const Card = tasty({
      styles: { '$body-font-size': '2x', preset: 'body' },
    }) as any;
    const initial = Card.render({}, null).props.children;
    const overridden = Card.render(
      { tokens: { '$body-font-size': '20x' } },
      null,
    ).props.children;

    expect(initial[0].props.dangerouslySetInnerHTML.__html).toContain(
      'font-size: var(--body-font-size,',
    );
    expect(overridden[1].props.style).toEqual({ '--body-font-size': '160px' });
    expect(overridden[0].props.dangerouslySetInnerHTML).toEqual(
      initial[0].props.dangerouslySetInnerHTML,
    );
  });
});
