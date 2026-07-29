import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './rules/prefer-shorthand-property.js';

/**
 * Style-object detection, exercised through `prefer-shorthand-property`.
 *
 * That rule is the right probe because it is the one that actually misfired:
 * it reports native CSS keys like `top` and `maxWidth`, which are exactly what
 * a DOM inline-style object is full of. `known-property` cannot catch this
 * regression — `top` and `maxWidth` are perfectly *known*, so it stays silent
 * either way.
 */
const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
  },
});

// Under the old `/styles?$/i` name test, every one of these reported its CSS
// longhands as tasty violations.
const NOT_STYLE_OBJECTS = [
  // DOM inline style passed to a helper — the exact ResizeSensor shape.
  `
    import { tasty } from '@tenphi/tasty';
    const style = { position: 'absolute', top: '0px', maxWidth: '100%' };
    setStyle(element, style);
  `,
  // Singular name holding CSSProperties.
  `
    import { tasty } from '@tenphi/tasty';
    const hostStyle = { top: 0, left: 0, maxWidth: '100%' };
  `,
  // Singular with a suffix.
  `
    import { tasty } from '@tenphi/tasty';
    const styleChild = { top: '0px', left: '0px' };
  `,
  // Mixed case, still singular.
  `
    import { tasty } from '@tenphi/tasty';
    const baseSTYLE = { top: '0px' };
  `,
  // All-caps names were already excluded.
  `
    import { tasty } from '@tenphi/tasty';
    const BASE_STYLES = { top: '0px' };
  `,
];

tester.run('style-object detection', rule, {
  valid: NOT_STYLE_OBJECTS.map((code) => ({ code })),
  invalid: [
    // Exact `styles`.
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        const styles = { top: '0px' };
      `,
      errors: [{ messageId: 'preferShorthand' }],
    },
    // `*Styles` suffix.
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        const buttonStyles = { top: '0px' };
      `,
      errors: [{ messageId: 'preferShorthand' }],
    },
    // A `Styles` type annotation opts in regardless of the variable name.
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        import type { Styles } from '@tenphi/tasty';
        const hostStyle: Styles = { top: '0px' };
      `,
      errors: [{ messageId: 'preferShorthand' }],
    },
    // Still reported inside a real tasty call.
    {
      code: `
        import { tasty } from '@tenphi/tasty';
        tasty({ styles: { top: '0px' } });
      `,
      errors: [{ messageId: 'preferShorthand' }],
    },
  ],
});
