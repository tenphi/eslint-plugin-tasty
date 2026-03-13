import type { TSESLint } from '@typescript-eslint/utils';

export const recommended: TSESLint.SharedConfig.RulesRecord = {
  'tasty/known-property': 'warn',
  'tasty/valid-value': 'error',
  'tasty/valid-color-token': 'error',
  'tasty/valid-custom-unit': 'error',
  'tasty/valid-boolean-property': 'error',
  'tasty/valid-state-key': 'error',
  'tasty/valid-styles-structure': 'error',
  'tasty/no-nested-state-map': 'error',
  'tasty/no-important': 'error',
  'tasty/valid-sub-element': 'error',
  'tasty/valid-directional-modifier': 'error',
  'tasty/valid-radius-shape': 'error',
  'tasty/no-nested-selector': 'warn',
  'tasty/static-no-dynamic-values': 'error',
  'tasty/static-valid-selector': 'error',
  'tasty/valid-preset': 'error',
  'tasty/valid-recipe': 'error',
  'tasty/valid-transition': 'warn',
};

export const strict: TSESLint.SharedConfig.RulesRecord = {
  ...recommended,
  'tasty/prefer-shorthand-property': 'warn',
  'tasty/valid-custom-property': 'warn',
  'tasty/no-unknown-state-alias': 'warn',
  'tasty/no-styles-prop': 'warn',
  'tasty/no-raw-color-values': 'warn',
  'tasty/consistent-token-usage': 'warn',
  'tasty/no-runtime-styles-mutation': 'warn',
  'tasty/valid-state-definition': 'warn',
};
