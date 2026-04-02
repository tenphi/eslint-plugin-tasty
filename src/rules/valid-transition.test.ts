import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './valid-transition.js';

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
  },
});

tester.run('valid-transition', rule, {
  valid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { transition: 'fill 0.3s' } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { transition: '$$gradient-angle 0.3s' } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { transition: '##theme 0.3s' } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { transition: '$$rotation 0.2s ease-out, ##accent 0.3s' } });
      `,
    },
  ],
  invalid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { transition: 'foobar 0.3s' } });
      `,
      errors: [{ messageId: 'unknownTransition' }],
    },
  ],
});
