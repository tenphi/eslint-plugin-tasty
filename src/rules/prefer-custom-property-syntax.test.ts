import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './prefer-custom-property-syntax.js';

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
  },
});

tester.run('prefer-custom-property-syntax', rule, {
  valid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: '#purple', gap: '$spacing' } });
      `,
    },
  ],
  invalid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { gap: 'var(--spacing)' } });
      `,
      errors: [{ messageId: 'preferCustomPropertySyntax' }],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: 'var(--accent-color, black)' } });
      `,
      errors: [{ messageId: 'preferCustomPropertySyntax' }],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { margin: 'var(--gap, 1x)' } });
      `,
      errors: [{ messageId: 'preferCustomPropertySyntax' }],
    },
  ],
});
