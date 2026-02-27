import { ESLintUtils } from '@typescript-eslint/utils';

export const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/tenphi/tasty-eslint-plugin/blob/main/docs/rules/${name}.md`,
);
