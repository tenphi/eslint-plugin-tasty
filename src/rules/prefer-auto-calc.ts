import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import { stringStyleValueListeners } from '../style-values.js';
import { parseValue } from '../parsers/value-parser.js';
import { replaceInStringValue } from '../fix-utils.js';

type MessageIds = 'preferAutoCalc';

export default createRule<[], MessageIds>({
  name: 'prefer-auto-calc',
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description:
        'Suggest Tasty auto-calc parentheses instead of explicit calc()',
    },
    messages: {
      preferAutoCalc:
        "Replace 'calc({{inner}})' with Tasty auto-calc '({{inner}})' (calc() is added automatically).",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    function checkValue(value: string, node: TSESTree.Node): void {
      const result = parseValue(value, { skipUnitValidation: true });

      let cursor = 0;
      for (const group of result.groups) {
        for (const part of group.parts) {
          for (const token of part.tokens) {
            if (token.type !== 'css-function' || token.name !== 'calc') {
              continue;
            }

            const start = value.indexOf(token.raw, cursor);
            if (start === -1) {
              context.report({
                node,
                messageId: 'preferAutoCalc',
                data: { inner: token.args },
              });
              continue;
            }
            cursor = start + token.raw.length;
            const end = cursor;
            const replacement = `(${token.args})`;

            context.report({
              node,
              messageId: 'preferAutoCalc',
              data: { inner: token.args },
              fix(fixer) {
                return replaceInStringValue(
                  fixer,
                  node,
                  [{ start, end, replacement }],
                  context.sourceCode,
                );
              },
            });
          }
        }
      }
    }

    return stringStyleValueListeners(
      ctx,
      (value, node, property) => {
        if (!/^[#$]/.test(property)) checkValue(value, node);
      },
      { requireTastyJSX: true },
    );
  },
});
