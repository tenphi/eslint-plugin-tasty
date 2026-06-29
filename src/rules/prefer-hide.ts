import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { getKeyName, getStringValue } from '../utils.js';

type MessageIds = 'preferHide';

export default createRule<[], MessageIds>({
  name: 'prefer-hide',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        "Suggest hide: true instead of display: 'none' for Tasty's display/hide priority handling",
    },
    messages: {
      preferHide:
        "Use 'hide: true' instead of \"display: 'none'\" so it composes with Tasty's display/hide priority handling.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    function checkDisplayValue(value: string, node: TSESTree.Node): void {
      if (value.trim().toLowerCase() !== 'none') return;

      context.report({
        node,
        messageId: 'preferHide',
      });
    }

    function handleStyleObject(node: TSESTree.ObjectExpression) {
      if (!ctx.isStyleObject(node)) return;

      for (const prop of node.properties) {
        if (prop.type !== 'Property' || prop.computed) continue;

        const key = getKeyName(prop.key);
        if (key !== 'display') continue;

        const str = getStringValue(prop.value);
        if (str) {
          checkDisplayValue(str, prop.value);
          continue;
        }

        if (prop.value.type === 'ObjectExpression') {
          for (const stateProp of prop.value.properties) {
            if (stateProp.type !== 'Property') continue;
            const stateStr = getStringValue(stateProp.value);
            if (stateStr) {
              checkDisplayValue(stateStr, stateProp.value);
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
