import { RuleTester } from '@typescript-eslint/rule-tester';
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
    // tastyStatic rejects spreads at build time through its own error rule.
    `
      import { tastyStatic } from '@tenphi/tasty/static';
      tastyStatic({ ...baseStyles });
    `,
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
