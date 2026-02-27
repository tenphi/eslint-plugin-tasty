import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './static-no-dynamic-values.js';

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
  },
});

tester.run('static-no-dynamic-values', rule, {
  valid: [
    {
      code: `
        import { tastyStatic } from '@tenphi/tasty/static';
        tastyStatic({ padding: '2x' });
      `,
    },
    {
      code: `
        import { tastyStatic } from '@tenphi/tasty/static';
        tastyStatic({ padding: { '': '2x', '@mobile': '1x' } });
      `,
    },
  ],
  invalid: [
    {
      code: `
        import { tastyStatic } from '@tenphi/tasty/static';
        const size = '2x';
        tastyStatic({ padding: size });
      `,
      errors: [{ messageId: 'dynamicValue' }],
    },
  ],
});
