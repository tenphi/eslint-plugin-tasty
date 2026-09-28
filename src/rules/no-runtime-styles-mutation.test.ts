import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './no-runtime-styles-mutation.js';

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

tester.run('no-runtime-styles-mutation', rule, {
  valid: [
    [
      "import { tasty } from '@tenphi/tasty';",
      "tasty({ styles: { fill: { '': '#surface', active: '#primary' },",
      "  padding: '2x', animation: `pulse $duration infinite` } });",
    ].join('\n'),
    // Spreads have a dedicated warning, so this rule does not report them.
    `
      import { tasty } from '@tenphi/tasty';
      tasty({ styles: { ...baseStyles, fill: '#surface' } });
    `,
    // Build-time values have a stricter rule and should not be double-reported.
    `
      import { tastyStatic } from '@tenphi/tasty/static';
      tastyStatic({ fill: dynamicFill });
    `,
    `const ordinaryConfig = { fill: selectedFill };`,
    `const styles: CSSProperties = { color: selectedColor };`,
    // Local at-rule definitions can be reused as JavaScript objects.
    `
      import { tasty } from '@tenphi/tasty';
      tasty({ styles: { '@keyframes': sharedKeyframes, '@font-face': fonts } });
    `,
  ],
  invalid: [
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: selectedFill } });
      `,
      errors: [
        {
          messageId: 'dynamicStyleValue',
          data: { property: 'fill' },
        },
      ],
    },
    {
      code: [
        "import { tasty } from '@tenphi/tasty';",
        "tasty({ styles: { fill: isActive ? '#primary' : '#surface',",
        '  padding: `${space}x`, opacity: getOpacity() } });',
      ].join('\n'),
      errors: [
        { messageId: 'dynamicStyleValue', data: { property: 'fill' } },
        { messageId: 'dynamicStyleValue', data: { property: 'padding' } },
        { messageId: 'dynamicStyleValue', data: { property: 'opacity' } },
      ],
    },
    {
      // Report the specific value inside a state map, not the entire map.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: { '': '#surface', active: selectedFill } } });
      `,
      errors: [
        {
          messageId: 'dynamicStyleValue',
          data: { property: 'fill' },
        },
      ],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: { [activeState]: '#primary' } } });
      `,
      errors: [{ messageId: 'dynamicStyleKey' }],
    },
    {
      // Nested sub-elements also match style selectors; only one report is due.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { Label: { color: selectedColor } } });
      `,
      errors: [
        {
          messageId: 'dynamicStyleValue',
          data: { property: 'color' },
        },
      ],
    },
    {
      code: `
        import { useStyles } from '@tenphi/tasty';
        useStyles({ opacity: [1, opacity] });
      `,
      errors: [
        {
          messageId: 'dynamicStyleValue',
          data: { property: 'opacity' },
        },
      ],
    },
    {
      code: `
        const styles = { fill: selectedFill };
      `,
      errors: [
        {
          messageId: 'dynamicStyleValue',
          data: { property: 'fill' },
        },
      ],
    },
    {
      code: `const view = <Box styles={{ fill: selectedFill }} />;`,
      errors: [
        {
          messageId: 'dynamicStyleValue',
          data: { property: 'fill' },
        },
      ],
    },
  ],
});
