import { RuleTester } from '@typescript-eslint/rule-tester';
import { fileURLToPath } from 'node:url';
import rule from './no-style-spread.js';

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

tester.run('no-style-spread', rule, {
  valid: [
    `
      import { tasty } from '@tenphi/tasty';
      tasty({ styles: { fill: '#surface', padding: '2x' } });
    `,
    `const ordinaryConfig = { ...defaults };`,
    `const styles: CSSProperties = { ...inlineStyles };`,
    `const finalStyles: CSSProperties = { ...outerStyles, ...styles };`,
    `const finalStyles: Record<string, CSSProperties> = { ...outerStyles, ...styles };`,
    `const finalStyles: CSSProperties = ({ ...outerStyles, ...styles } as CSSProperties)!;`,
    `const config = { ...outerStyles, ...styles };`,
    `import { tasty } from 'unrelated'; tasty({ styles: { ...outerStyles, ...styles } });`,
    `import { tasty } from '@tenphi/tasty'; tasty({ props: { ...outerStyles, ...styles } });`,
    `import { tasty } from '@tenphi/tasty'; function render(tasty) { tasty({ styles: { ...outerStyles, ...styles } }); }`,
    `import { mergeStyles, type Styles } from '@tenphi/tasty'; const finalStyles: Styles = mergeStyles(outerStyles, styles);`,
    // tastyStatic rejects spreads at build time through its own error rule.
    `
      import { tastyStatic } from '@tenphi/tasty/static';
      tastyStatic({ ...baseStyles });
    `,
    `import { tastyStatic } from '@tenphi/tasty/static'; tastyStatic({ ...outerStyles, ...styles });`,
    {
      code: `const finalStyles: Styles = {
        // eslint-disable-next-line @rule-tester/no-style-spread -- intentionally replace complete state maps
        ...outerStyles,
        ...styles,
      };`,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          // eslint-disable-next-line @rule-tester/no-style-spread -- shared static defaults
          ...baseStyles,
        } });
      `,
    },
  ],
  invalid: [
    {
      code: `const styles: Styles = {
        // eslint-disable-next-line @rule-tester/no-style-spread -- intentionally replace complete state maps
        ...outerStyles,
        ...overrides,
        fill: { '': '#surface', ...states },
      };`,
      output: null,
      errors: [{ messageId: 'styleSpread' }],
    },
    ...[
      `const finalStyles: Styles = { ...outerStyles, ...styles };`,
      `const value: Styles = { ...outerStyles, ...styles };`,
      `const finalStyles = { ...outerStyles, ...styles };`,
      `const finalStyles = ({ ...outerStyles, ...styles } as Styles)!;`,
      `const finalStyles = { ...outerStyles, ...styles } satisfies Styles;`,
      `const finalStyles = ({ ...outerStyles, ...styles } as Styles) satisfies Styles;`,
      `const finalStyles: Styles | undefined = { ...outerStyles, ...styles };`,
      `import { tasty } from '@tenphi/tasty'; tasty({ styles: { ...outerStyles, ...styles } });`,
      `import { tasty as component } from '@tenphi/tasty'; component(Base, { styles: { ...outerStyles, ...styles } });`,
      `import { tasty } from '@tenphi/tasty'; tasty({ variants: { compact: { ...outerStyles, ...styles } } });`,
      `import { useStyles } from '@tenphi/tasty'; useStyles({ ...outerStyles, ...styles });`,
      `import { useGlobalStyles } from '@tenphi/tasty'; useGlobalStyles('main', { ...outerStyles, ...styles });`,
      `const view = <Box styles={{ ...outerStyles, ...styles }} />;`,
      `const story = { args: { styles: { ...outerStyles, ...styles } } };`,
      `const styles: Styles = { ...first, ...second, ...third, padding: '2x' };`,
    ].map((code) => ({
      code,
      output: null,
      errors: [{ messageId: 'preferMergeStyles' as const }],
    })),
    {
      filename: fileURLToPath(
        new URL(
          '../../test/fixtures/style-functions/component.ts',
          import.meta.url,
        ),
      ),
      code: `import { defineComponent } from '@my-org/styling'; defineComponent('Card', { styles: { ...outerStyles, ...styles } });`,
      output: null,
      errors: [{ messageId: 'preferMergeStyles' }],
    },
    {
      code: `const styles: Styles = {
        ...outerStyles, ...overrides,
        fill: { '': '#surface', ...firstStates, ...secondStates },
        Label: { ...firstLabel, ...secondLabel },
        animation: ['pulse 1s', ...extraAnimations],
      };`,
      output: null,
      errors: [
        { messageId: 'preferMergeStyles' },
        ...Array.from({ length: 5 }, () => ({
          messageId: 'styleSpread' as const,
        })),
      ],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { ...baseStyles } });
      `,
      errors: [{ messageId: 'styleSpread' }],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: {
          fill: { '': '#surface', ...activeStyles },
          Label: { ...labelStyles },
        } });
      `,
      errors: [{ messageId: 'styleSpread' }, { messageId: 'styleSpread' }],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { animation: ['pulse 1s', ...extraAnimations] } });
      `,
      errors: [{ messageId: 'styleSpread' }],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ variants: { compact: { ...compactStyles } } });
      `,
      errors: [{ messageId: 'styleSpread' }],
    },
    {
      code: `
        const styles = { ...sharedStyles };
      `,
      errors: [{ messageId: 'styleSpread' }],
    },
    {
      code: `const view = <Box styles={{ ...sharedStyles }} />;`,
      errors: [{ messageId: 'styleSpread' }],
    },
  ],
});
