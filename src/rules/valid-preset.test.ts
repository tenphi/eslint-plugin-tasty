import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './valid-preset.js';

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
  },
});

tester.run('valid-preset', rule, {
  valid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { preset: 'h1' } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { preset: 'h1 / strong' } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { preset: 'h1 / strong italic' } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { preset: 'h1 / strong tight' } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { preset: 'h1 / italic tight' } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { preset: 'h1 / strong italic tight' } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { preset: 'bold' } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { preset: 'bold italic' } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { preset: 'inherit' } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { preset: { '': 'h1', ':hover': 'h1 / strong italic' } } });
      `,
    },
  ],
  invalid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { preset: 'h1 / wat' } });
      `,
      errors: [{ messageId: 'unknownModifier' }],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { preset: 'h1 / strong wat' } });
      `,
      errors: [{ messageId: 'unknownModifier' }],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { preset: 'h1 / wat oops' } });
      `,
      errors: [
        { messageId: 'unknownModifier' },
        { messageId: 'unknownModifier' },
      ],
    },
  ],
});
