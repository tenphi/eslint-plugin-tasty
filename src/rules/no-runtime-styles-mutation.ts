import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { isStaticValue } from '../utils.js';

type MessageIds = 'dynamicStyleValue';

export default createRule<[], MessageIds>({
  name: 'no-runtime-styles-mutation',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Warn when style objects contain runtime-computed values',
    },
    messages: {
      dynamicStyleValue:
        'Style values should be static. Use modifiers (mods prop), tokens, or CSS custom properties for dynamic behavior.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    function checkProperties(node: TSESTree.ObjectExpression): void {
      for (const prop of node.properties) {
        if (prop.type === 'SpreadElement') {
          context.report({ node: prop, messageId: 'dynamicStyleValue' });
          continue;
        }

        if (prop.type !== 'Property') continue;

        // Skip sub-elements (they contain nested style objects)
        if (
          !prop.computed &&
          prop.key.type === 'Identifier' &&
          /^[A-Z]/.test(prop.key.name)
        ) {
          if (prop.value.type === 'ObjectExpression') {
            checkProperties(prop.value);
          }
          continue;
        }

        // Skip @keyframes and @properties
        if (
          !prop.computed &&
          prop.key.type === 'Identifier' &&
          prop.key.name.startsWith('@')
        ) {
          continue;
        }

        if (!isStaticValue(prop.value)) {
          context.report({
            node: prop.value,
            messageId: 'dynamicStyleValue',
          });
        }
      }
    }

    function handleStyleObject(node: TSESTree.ObjectExpression) {
      if (!ctx.isStyleObject(node)) return;
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
