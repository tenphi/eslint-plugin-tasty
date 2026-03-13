import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './valid-state-definition.js';

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
  },
});

tester.run('valid-state-definition', rule, {
  valid: [
    // Valid media query definition
    {
      code: `
        import { configure } from '@tenphi/tasty';
        configure({
          states: {
            '@mobile': '@media(w < 768px)',
            '@tablet': '@media(768px <= w < 1024px)',
          },
        });
      `,
    },
    // Valid root state definition
    {
      code: `
        import { configure } from '@tenphi/tasty';
        configure({
          states: {
            '@dark': '@root(theme=dark)',
          },
        });
      `,
    },
    // Non-configure calls are ignored
    {
      code: `
        const configure = () => {};
        configure({
          states: {
            'invalid': 'whatever',
          },
        });
      `,
    },
    // Non-tasty imports are ignored
    {
      code: `
        import { configure } from 'other-lib';
        configure({
          states: {
            'invalid': 'whatever',
          },
        });
      `,
    },
  ],
  invalid: [
    // State alias without @ prefix
    {
      code: `
        import { configure } from '@tenphi/tasty';
        configure({
          states: {
            'mobile': '@media(w < 768px)',
          },
        });
      `,
      errors: [{ messageId: 'invalidKeyPrefix' }],
    },
    // Empty media query
    {
      code: `
        import { configure } from '@tenphi/tasty';
        configure({
          states: {
            '@empty': '@media()',
          },
        });
      `,
      errors: [{ messageId: 'invalidDefinition' }],
    },
  ],
});
