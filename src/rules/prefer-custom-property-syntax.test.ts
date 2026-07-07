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
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: '#clear', color: '#current' } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { border: '1bw solid #accent' } });
      `,
    },
    {
      // Custom property without a -color suffix is fine.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { gap: '$card-padding' } });
      `,
    },
    {
      // Non-tasty import — rule should not fire.
      code: `
        import { tasty } from 'somewhere-else';
        tasty({ styles: { fill: 'var(--accent-color)' } });
      `,
    },
  ],
  invalid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { gap: 'var(--spacing)' } });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { gap: '$spacing' } });
      `,
      errors: [{ messageId: 'preferCustomPropertySyntax' }],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: 'var(--accent-color, black)' } });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: '(#accent, black)' } });
      `,
      errors: [{ messageId: 'preferCustomPropertySyntax' }],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { margin: 'var(--gap, 1x)' } });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { margin: '($gap, 1x)' } });
      `,
      errors: [{ messageId: 'preferCustomPropertySyntax' }],
    },
    {
      // var() with a transparent fallback is normalized to #clear (one report,
      // the standalone keyword inside var() is not double-reported).
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: 'var(--accent-color, transparent)' } });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: '(#accent, #clear)' } });
      `,
      errors: [{ messageId: 'preferCustomPropertySyntax' }],
    },
    {
      // Multiple var() in one value — both fixed in one --fix pass.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { gap: 'var(--spacing) var(--accent-color)' } });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { gap: '$spacing #accent' } });
      `,
      errors: [
        { messageId: 'preferCustomPropertySyntax' },
        { messageId: 'preferCustomPropertySyntax' },
      ],
    },
    {
      // $x-color → #x
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: '$text-color' } });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: '#text' } });
      `,
      errors: [{ messageId: 'preferColorToken' }],
    },
    {
      // $x-color with opacity suffix → #x.N
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { border: '$border-color.5' } });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { border: '#border.5' } });
      `,
      errors: [{ messageId: 'preferColorToken' }],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: 'transparent' } });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: '#clear' } });
      `,
      errors: [{ messageId: 'preferClearToken' }],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { color: 'currentColor' } });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { color: '#current' } });
      `,
      errors: [{ messageId: 'preferCurrentToken' }],
    },
    {
      // transparent as a fallback tuple member (not inside var()) is still flagged.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: '(#surface, transparent)' } });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: '(#surface, #clear)' } });
      `,
      errors: [{ messageId: 'preferClearToken' }],
    },
    {
      // Multiple issues in one value: $text-color + currentColor.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { color: '$text-color currentColor' } });
      `,
      output: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { color: '#text #current' } });
      `,
      errors: [
        { messageId: 'preferColorToken' },
        { messageId: 'preferCurrentToken' },
      ],
    },
  ],
});
