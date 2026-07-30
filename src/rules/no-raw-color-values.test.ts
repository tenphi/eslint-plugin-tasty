import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './no-raw-color-values.js';

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
  },
});

tester.run('no-raw-color-values', rule, {
  valid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: '#purple', color: '#accent' } });
      `,
    },
    {
      // `#purple` is a token — the `purple` substring must not be flagged as a
      // named color.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: '#purple' } });
      `,
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { gap: '$spacing' } });
      `,
    },
    {
      // Named color on a non-color-bearing property is not flagged.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { content: 'red dot' } });
      `,
    },
    {
      // $red is a custom property reference, not a raw named color.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: '$red' } });
      `,
    },
    {
      // Token definitions (tastyStatic(':root', …)) are skipped.
      code: `
        import { tastyStatic } from '@tenphi/tasty/static';
        tastyStatic(':root', { '#surface': '#ffffff' });
      `,
    },
    {
      // Non-tasty import — rule should not fire.
      code: `
        import { tasty } from 'somewhere-else';
        tasty({ styles: { fill: '#ffffff' } });
      `,
    },
  ],
  invalid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: '#fff' } });
      `,
      errors: [{ messageId: 'rawHexColor' }],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { color: 'rgb(0 0 0)' } });
      `,
      errors: [{ messageId: 'rawColorFunction', data: { func: 'rgb' } }],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: 'okhsl(280 80% 50%)' } });
      `,
      errors: [{ messageId: 'rawColorFunction', data: { func: 'okhsl' } }],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: 'okhst(280 0 50%)' } });
      `,
      errors: [{ messageId: 'rawColorFunction', data: { func: 'okhst' } }],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { color: 'oklch(0.5 0.1 280)' } });
      `,
      errors: [{ messageId: 'rawColorFunction', data: { func: 'oklch' } }],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: 'red' } });
      `,
      errors: [{ messageId: 'rawNamedColor', data: { name: 'red' } }],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { border: '1bw solid red' } });
      `,
      errors: [{ messageId: 'rawNamedColor', data: { name: 'red' } }],
    },
    {
      // Named color inside a state map is scoped by the parent property.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: { '': 'red' } } });
      `,
      errors: [{ messageId: 'rawNamedColor', data: { name: 'red' } }],
    },
    {
      // A sub-element's styles are visited separately, so this must be reported
      // exactly once. Recursing into `Icon` as if it were a state map also
      // passed 'Icon' as the property name, breaking the color-property scoping.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { Icon: { fill: 'red' } } });
      `,
      errors: [{ messageId: 'rawNamedColor', data: { name: 'red' } }],
    },
    {
      // A genuine state map inside a sub-element is still reported.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { Icon: { fill: { '': 'red' } } } });
      `,
      errors: [{ messageId: 'rawNamedColor', data: { name: 'red' } }],
    },
  ],
});
