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
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: '#purple' } });
      `,
      errors: [{ messageId: 'preferShorthand' }],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { borderRadius: '6px' } });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { radius: '6px' } });
      `,
      errors: [{ messageId: 'preferShorthand' }],
    },
    {
      // No safeFix for directional/min-max/image mappings → report-only.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { backgroundImage: 'url(/img.png)' } });
      `,
      errors: [{ messageId: 'preferShorthand' }],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { gridTemplateColumns: '1fr 2fr' } });
      `,
      errors: [{ messageId: 'preferShorthand' }],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { lineClamp: 3 } });
      `,
      errors: [{ messageId: 'preferShorthand' }],
    },
  ],
});
