import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './known-property.js';

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
  },
});

tester.run('known-property', rule, {
  valid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: '#purple', padding: '2x' } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { display: 'flex', gap: '2x', flow: 'column' } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { Title: { preset: 'h3' } } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { '$spacing': '2x' } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { '#accent': 'purple' } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { '@keyframes': { pulse: {} } } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { recipe: 'card' } });
      `,
    },
    // Not a tasty call — should be ignored
    {
      code: `
        const tasty = (x) => x;
        tasty({ styles: { colour: '#purple' } });
      `,
    },
  ],
  invalid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { colour: '#purple' } });
      `,
      errors: [{ messageId: 'unknownProperty', data: { name: 'colour' } }],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { boarder: true } });
      `,
      errors: [{ messageId: 'unknownProperty', data: { name: 'boarder' } }],
    },
  ],
});
