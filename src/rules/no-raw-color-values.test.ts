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
      // System colors are what forced-colors styles are written in; there is
      // no token to suggest instead.
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { fill: 'Canvas', border: '1bw Highlight' } });
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
        tasty({ styles: { svgFill: 'red' } });
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

const jsxTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const attributeError = (value: string, attribute: string) => ({
  messageId: 'rawAttributeColor' as const,
  data: { value, attribute },
});

jsxTester.run('no-raw-color-values (SVG attributes)', rule, {
  valid: [
    {
      // Values that follow the theme or carry no color.
      code: `
        <svg fill="none" stroke="currentColor">
          <path fill="CURRENTCOLOR" stroke="inherit" />
          <rect fill="transparent" stroke="var(--success-icon-color)" />
          <rect fill="url(#gradient)" stroke="context-stroke" />
          <rect fill="context-fill" stopColor="currentcolor" />
        </svg>
      `,
    },
    {
      // Dynamic values are left alone.
      code: `
        <svg fill={color} stroke={\`\${tone}\`}>
          <stop stopColor={isDark ? '#000' : '#fff'} />
        </svg>
      `,
    },
    {
      // Inside <clipPath> a fill is geometry, inside <mask> it is luminance.
      code: `
        <svg>
          <clipPath id="clip"><path fill="#fff" d="M0 0h24v24H0z" /></clipPath>
          <mask id="mask"><g><rect fill="white" /></g></mask>
        </svg>
      `,
    },
    {
      // Other attributes are not colors.
      code: `<svg><path id="#fff" d="M0 0" opacity="0.5" /></svg>`,
    },
    {
      // Third-party components keep today's handling: their props are not
      // style props.
      code: `
        import { CartesianGrid } from 'recharts';
        <CartesianGrid stroke="#ccc" />
      `,
    },
  ],
  invalid: [
    {
      // The ring around a dot: the case that went unnoticed in dark mode.
      code: `<svg><circle cx="12" r="11" stroke="#fff" strokeWidth="2" /></svg>`,
      errors: [attributeError('#fff', 'stroke')],
    },
    {
      code: `<svg viewBox="0 0 24 24" fill="rgb(255 0 0)" />`,
      errors: [attributeError('rgb()', 'fill')],
    },
    {
      // Expression containers and template literals without substitutions.
      code: `<svg><stop stopColor={'#00ff00'} /><stop stop-color={\`red\`} /></svg>`,
      errors: [
        attributeError('#00ff00', 'stopColor'),
        attributeError('red', 'stop-color'),
      ],
    },
    {
      code: `<filter><feFlood flood-color="white" /><feDiffuseLighting lightingColor="hsl(0 0% 0%)" /></filter>`,
      errors: [
        attributeError('white', 'flood-color'),
        attributeError('hsl()', 'lightingColor'),
      ],
    },
    {
      code: `<span color="#123" />`,
      errors: [attributeError('#123', 'color')],
    },
    {
      // A sibling of a <clipPath> is still themed artwork.
      code: `
        <svg>
          <clipPath id="clip"><path fill="#fff" d="M0 0" /></clipPath>
          <path fill="#FBBC05" d="M0 0" />
        </svg>
      `,
      errors: [attributeError('#FBBC05', 'fill')],
    },
    {
      // Tasty components keep the style-value message.
      code: `
        import { tasty } from '@tenphi/tasty';
        const Block = tasty({});
        <Block fill="#fff" />
      `,
      errors: [{ messageId: 'rawHexColor' }],
    },
  ],
});
