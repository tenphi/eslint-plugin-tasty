import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './prefer-shorthand-property.js';

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
  },
});

tester.run('prefer-shorthand-property', rule, {
  valid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: '#purple', radius: '1r' } });
      `,
    },
  ],
  invalid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { backgroundColor: '#purple' } });
      `,
      errors: [{ messageId: 'preferShorthand' }],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { borderRadius: '6px' } });
      `,
      errors: [{ messageId: 'preferShorthand' }],
    },
  ],
});
