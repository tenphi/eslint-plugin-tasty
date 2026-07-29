import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './prefer-longhand-property.js';

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
  },
});

tester.run('prefer-longhand-property', rule, {
  valid: [
    // The longhands are the preferred form.
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { flexGrow: 1, flexShrink: 0, flexBasis: 'auto' } });
      `,
    },
    // `flexShrink: 0` has no `flex` equivalent — this is exactly why the
    // longhands win.
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { flexShrink: 0 } });
      `,
    },
    // Each longhand can carry its own state map.
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { flexGrow: { '': 1, 'has-height': 0 } } });
      `,
    },
    // Unrelated properties are untouched.
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { flow: 'column', gap: '1x' } });
      `,
    },
  ],
  invalid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { flex: '1 1 0' } });
      `,
      errors: [{ messageId: 'preferLonghand' }],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { flex: 0 } });
      `,
      errors: [{ messageId: 'preferLonghand' }],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { flex: { '': '1', collapsed: '0' } } });
      `,
      errors: [{ messageId: 'preferLonghand' }],
    },
  ],
});
