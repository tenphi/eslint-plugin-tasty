import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from './valid-directional-modifier.js';

/**
 * Which shapes count as a style object.
 *
 * Regression coverage for a gap found by running the plugin over
 * @cube-dev/ui-kit: a Storybook story's `args.styles` was silently unchecked, so
 * `inset: '2x bottom 4x left'` — syntax v3 removed — passed lint. The
 * call-site and variable-name heuristics both miss it, since the object sits
 * under `args`, and the enclosing variable is named after the story.
 */
const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2024,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

const BAD = "inset: '2x bottom 4x left'";

tester.run('valid-directional-modifier (detection)', rule, {
  valid: [
    // Not a styles object: no `styles` key, no tasty call, no styles-ish name.
    `export const cfg = { theme: { inset: '2x bottom 4x left' } };`,

    // A bare `styles` key is deliberately NOT enough. Plenty of unrelated
    // libraries take a `styles` option object, and the key alone carries no
    // evidence it is Tasty's — so provenance still comes from an import-tracked
    // call, a `styles`-ish variable name, a `styles` JSX prop, or `args.styles`.
    `export const cfg = { foo: 1, styles: { ${BAD} } };`,
    `export const cfg = { 'styles': { ${BAD} } };`,
    // A locally-defined `tasty` is not Tasty's.
    `const tasty = (x) => x;\ntasty({ styles: { ${BAD} } });`,

    // An explicit type annotation opts a `styles`-named variable OUT. This is a React
    // inline-style object handed to `style={…}`: the name heuristic matched it, so its
    // plain CSS longhands were reported as tasty violations — and worse, `--fix`
    // rewrote real `var(--x-color)` to `#x`, which nothing resolves outside tasty, so
    // the browser dropped the declaration. The rewrites these rules offer are only
    // valid *inside* tasty. Nested shapes are covered in
    // `prefer-custom-property-syntax.test.ts`, which is the rule that reaches them.
    `const styles: CSSProperties = { ${BAD} };`,
    `const wrapperStyles: CSSProperties = { ${BAD} };`,

    // Block-map coverage lives in `prefer-custom-property-syntax.test.ts`: this rule
    // does not traverse into nested objects out of a variable, so a case written here
    // would pass whether or not the heuristic works.
  ],
  invalid: [
    {
      name: 'storybook story args.styles',
      code: `export const InsetStory = {
        render: Template.bind({}),
        args: { styles: { ${BAD} } },
      };`,
      errors: [{ messageId: 'tooManyValues' }],
    },
    {
      name: 'quoted styles key inside args',
      code: `export const S = { args: { 'styles': { ${BAD} } } };`,
      errors: [{ messageId: 'tooManyValues' }],
    },
    {
      name: 'JSX styles prop',
      code: `const a = <Block styles={{ ${BAD} }} />;`,
      errors: [{ messageId: 'tooManyValues' }],
    },
    {
      // The annotation is authoritative in BOTH directions, so a `Styles`
      // annotation still opts in — including through a wrapper type, which is why
      // the check walks the annotation instead of matching only its outermost
      // reference.
      name: 'Styles annotation opts in',
      code: `const stuff: Styles = { ${BAD} };`,
      errors: [{ messageId: 'tooManyValues' }],
    },
    {
      // The violation sits at the top level because this rule does not traverse
      // sub-elements out of a variable-declared object — a separate, pre-existing
      // limitation. What is under test here is only that the annotation walk finds
      // `Styles` nested inside a wrapper type.
      name: 'Styles annotation opts in through a wrapper type',
      code: `const stuff: Record<string, Styles> = { ${BAD} };`,
      errors: [{ messageId: 'tooManyValues' }],
    },
    {
      name: 'Styles annotation opts in through a union',
      code: `const stuff: Styles | undefined = { ${BAD} };`,
      errors: [{ messageId: 'tooManyValues' }],
    },
    {
      // No annotation at all — the name heuristic is still the fallback.
      name: 'unannotated styles variable still detected by name',
      code: `const styles = { ${BAD} };`,
      errors: [{ messageId: 'tooManyValues' }],
    },
    {
      // One recognisable style key is enough to keep the object in scope, so a block
      // map is only skipped when nothing in it looks like tasty at all.
      name: 'block-map shape with a real style key is still linted',
      code: `const styles = { ${BAD}, td: { color: 'red' } };`,
      errors: [{ messageId: 'tooManyValues' }],
    },
  ],
});
