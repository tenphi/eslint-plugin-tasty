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
    // Values fixed once the module has loaded generate CSS once, like literals.
    `
      import { mergeStyles, tasty } from '@tenphi/tasty';
      import { SIZES, placeholderAnimation } from './tokens';

      const RING = '0 0 0 1ow #primary';
      const BASE = { display: 'grid' };
      const THEMES = { special: { color: '#white' } };
      const WIDTH = 4;
      const KEY = 'special';
      const { GAP } = SIZES;
      enum Layer { Base = 1, Top = 2 }

      export const A = tasty({
        styles: {
          shadow: RING,
          color: { '': '#dark', special: THEMES.special.color, [KEY]: THEMES[KEY]?.color },
          width: \`\${WIDTH}px\`,
          height: \`\${SIZES.XS}px\`,
          gap: GAP * 2,
          zIndex: { '': undefined, hovered: Layer.Top },
          animation: \`\${placeholderAnimation} 1s infinite\`,
          opacity: WIDTH > 2 ? 1 : 0.5,
          Icon: mergeStyles(BASE, { gridArea: 'icon' }),
          Label: mergeStyles(...[BASE], THEMES.special),
        },
      });
    `,
  ],
  invalid: [
    {
      // Render-time scope is still reported: props, state, hook results,
      // parameters and local bindings.
      code: `
        import { mergeStyles, tasty } from '@tenphi/tasty';
        const BASE = { display: 'grid' };
        let mutable = '#white';
        function Component(props, undefined) {
          const [size] = useState(4);
          const local = '#black';
          return (
            <Box
              styles={{
                fill: mutable,
                color: local,
                width: \`\${size}px\`,
                opacity: props.isDisabled ? 0.5 : 1,
                zIndex: undefined,
                Icon: mergeStyles(BASE, props.styles),
                Label: mergeStyles(BASE, { color: local }),
                Hint: computeStyles(BASE),
              }}
            />
          );
        }
      `,
      errors: [
        { messageId: 'dynamicStyleValue', data: { property: 'fill' } },
        { messageId: 'dynamicStyleValue', data: { property: 'color' } },
        { messageId: 'dynamicStyleValue', data: { property: 'width' } },
        { messageId: 'dynamicStyleValue', data: { property: 'opacity' } },
        { messageId: 'dynamicStyleValue', data: { property: 'zIndex' } },
        { messageId: 'dynamicStyleValue', data: { property: 'Icon' } },
        { messageId: 'dynamicStyleValue', data: { property: 'color' } },
        { messageId: 'dynamicStyleValue', data: { property: 'Hint' } },
      ],
    },
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        function render(state) {
          return tasty({ styles: { fill: { [state]: '#primary' } } });
        }
      `,
      errors: [{ messageId: 'dynamicStyleKey' }],
    },
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
