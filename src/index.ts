import type { TSESLint } from '@typescript-eslint/utils';
import * as rules from './rules/index.js';
import { recommended, strict } from './configs.js';

const ruleMap: Record<string, TSESLint.RuleModule<string, unknown[]>> = {
  'known-property': rules.knownProperty,
  'valid-value': rules.validValue,
  'valid-color-token': rules.validColorToken,
  'valid-custom-unit': rules.validCustomUnit,
  'valid-state-key': rules.validStateKey,
  'valid-styles-structure': rules.validStylesStructure,
  'no-nested-selector': rules.noNestedSelector,
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
  'no-duplicate-state': rules.noDuplicateState,
  'no-unknown-state-alias': rules.noUnknownStateAlias,
  'no-raw-color-values': rules.noRawColorValues,
  'no-styles-prop': rules.noStylesProp,
  'consistent-token-usage': rules.consistentTokenUsage,
  'no-runtime-styles-mutation': rules.noRuntimeStylesMutation,
};

const plugin = {
  meta: {
    name: '@tenphi/eslint-plugin-tasty',
    version: '0.1.0',
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
export type { TastyValidationConfig, ResolvedConfig } from './types.js';
