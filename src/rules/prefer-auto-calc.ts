import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { getKeyName, getStringValue } from '../utils.js';
import { parseValue } from '../parsers/value-parser.js';

type MessageIds = 'preferAutoCalc';

export default createRule<[], MessageIds>({
  name: 'prefer-auto-calc',
  meta: {
    type: 'suggestion',
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

      for (const group of result.groups) {
        for (const part of group.parts) {
          for (const token of part.tokens) {
            if (token.type !== 'css-function' || token.name !== 'calc') {
              continue;
            }

            context.report({
              node,
              messageId: 'preferAutoCalc',
              data: { inner: token.args },
            });
          }
        }
      }
    }

    function handleStyleObject(node: TSESTree.ObjectExpression) {
      if (!ctx.isStyleObject(node)) return;

      for (const prop of node.properties) {
        if (prop.type !== 'Property' || prop.computed) continue;

        const key = getKeyName(prop.key);
        if (key === null) continue;
        if (/^[A-Z@&$#]/.test(key)) continue;

        const str = getStringValue(prop.value);
        if (str) {
          checkValue(str, prop.value);
          continue;
        }

        if (prop.value.type === 'ObjectExpression') {
          for (const stateProp of prop.value.properties) {
            if (stateProp.type !== 'Property') continue;
            const stateStr = getStringValue(stateProp.value);
            if (stateStr) {
              checkValue(stateStr, stateProp.value);
            }
          }
        }
      }
    }

    return {
      ImportDeclaration(node) {
        ctx.trackImport(node);
      },
      ...styleObjectListeners(handleStyleObject),
    };
  },
});
