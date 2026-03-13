import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { isStaticValue } from '../utils.js';

type MessageIds = 'dynamicValue';

export default createRule<[], MessageIds>({
  name: 'static-no-dynamic-values',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Ensure all values in tastyStatic() calls are static literals',
    },
    messages: {
      dynamicValue:
        'tastyStatic() values must be static (string, number, boolean, null, or objects/arrays of those). Dynamic expressions are not supported.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    function checkProperties(node: TSESTree.ObjectExpression): void {
      for (const prop of node.properties) {
        if (prop.type === 'SpreadElement') {
          context.report({ node: prop, messageId: 'dynamicValue' });
          continue;
        }

        if (prop.computed) {
          context.report({ node: prop.key, messageId: 'dynamicValue' });
          continue;
        }

        if (!isStaticValue(prop.value)) {
          context.report({ node: prop.value, messageId: 'dynamicValue' });
        }
      }
    }

    function handleStyleObject(node: TSESTree.ObjectExpression) {
      const styleCtx = ctx.getStyleContext(node);
      if (!styleCtx || !styleCtx.isStaticCall) return;

      checkProperties(node);
    }

    return {
      ImportDeclaration(node) {
        ctx.trackImport(node);
      },
      ...styleObjectListeners(handleStyleObject),
    };
  },
});
