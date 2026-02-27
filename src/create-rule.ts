import { ESLintUtils } from '@typescript-eslint/utils';

export const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/tenphi/eslint-plugin-tasty/blob/main/docs/rules/${name}.md`,
);
