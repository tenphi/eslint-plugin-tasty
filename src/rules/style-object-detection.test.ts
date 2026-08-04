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
  ],
});
