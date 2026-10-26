import type { TSESLint } from '@typescript-eslint/utils';
import * as rules from './rules/index.js';
import { recommended, strict } from './configs.js';
import { version } from './version.js';

const ruleMap: Record<string, TSESLint.RuleModule<string, unknown[]>> = {
  'known-property': rules.knownProperty,
  'valid-value': rules.validValue,
  'valid-color-token': rules.validColorToken,
  'valid-custom-unit': rules.validCustomUnit,
  'valid-state-key': rules.validStateKey,
  'valid-styles-structure': rules.validStylesStructure,
  'no-nested-selector': rules.noNestedSelector,
  'no-state-in-selector': rules.noStateInSelector,
  'prefer-element-selector': rules.preferElementSelector,
  'valid-custom-property': rules.validCustomProperty,
  'valid-preset': rules.validPreset,
  'valid-recipe': rules.validRecipe,
  'valid-boolean-property': rules.validBooleanProperty,
  'valid-directional-modifier': rules.validDirectionalModifier,
  'valid-radius-shape': rules.validRadiusShape,
  'no-important': rules.noImportant,
  'valid-sub-element': rules.validSubElement,
  'no-nested-state-map': rules.noNestedStateMap,
  'static-no-dynamic-values': rules.staticNoDynamicValues,
  'static-valid-selector': rules.staticValidSelector,
  'prefer-shorthand-property': rules.preferShorthandProperty,
  'valid-transition': rules.validTransition,
  'require-default-state': rules.requireDefaultState,
  'no-unknown-state-alias': rules.noUnknownStateAlias,
  'no-raw-color-values': rules.noRawColorValues,
  'no-raw-transition-duration': rules.noRawTransitionDuration,
  'no-raw-motion-duration': rules.noRawMotionDuration,
  'no-styles-prop': rules.noStylesProp,
  'no-style-prop': rules.noStyleProp,
  'no-classname-prop': rules.noClassNameProp,
  'no-protected-restyle': rules.noProtectedRestyle,
  'consistent-token-usage': rules.consistentTokenUsage,
  'no-runtime-styles-mutation': rules.noRuntimeStylesMutation,
  'no-style-spread': rules.noStyleSpread,
  'valid-state-definition': rules.validStateDefinition,
  'no-own-at-root': rules.noOwnAtRoot,
  'no-ignored-pseudo-element-state': rules.noIgnoredPseudoElementState,
  'valid-default-state-order': rules.validDefaultStateOrder,
  'prefer-auto-calc': rules.preferAutoCalc,
  'prefer-state-negation': rules.preferStateNegation,
  'prefer-custom-property-syntax': rules.preferCustomPropertySyntax,
  'prefer-hide': rules.preferHide,
  'prefer-directional-shorthand': rules.preferDirectionalShorthand,
  'prefer-longhand-property': rules.preferLonghandProperty,
};

const plugin = {
  meta: {
    name: '@tenphi/eslint-plugin-tasty',
    version,
  },
  rules: ruleMap,
  configs: {
    recommended: {
      plugins: {
        get tasty() {
          return plugin;
        },
      },
      rules: recommended,
    },
    strict: {
      plugins: {
        get tasty() {
          return plugin;
        },
      },
      rules: strict,
    },
  },
} satisfies TSESLint.FlatConfig.Plugin & {
  configs: Record<string, TSESLint.FlatConfig.Config>;
};

export default plugin;

export { recommended, strict } from './configs.js';
export type { TypeAwareJSXOptions } from './type-aware-jsx.js';
export type {
  TastyValidationConfig,
  ResolvedConfig,
  StyleFunctionConfig,
  ProtectedComponentConfig,
} from './types.js';
