import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import { getKeyName, getStringValue, validateStateKey } from '../utils.js';

type MessageIds = 'invalidStateKey' | 'ownOutsideSubElement';

export default createRule<[], MessageIds>({
  name: 'valid-state-key',
  meta: {
    type: 'problem',
    docs: {
      description: 'Validate state key syntax in style mapping objects',
    },
    messages: {
      invalidStateKey: '{{reason}}',
      ownOutsideSubElement:
        '@own() can only be used inside sub-element styles.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    function isInsideSubElement(node: TSESTree.Node): boolean {
      let current: TSESTree.Node | undefined = node.parent;
      while (current) {
        if (
          current.type === 'Property' &&
          !current.computed &&
          current.key.type === 'Identifier' &&
          /^[A-Z]/.test(current.key.name)
        ) {
          return true;
        }
        current = current.parent;
      }
      return false;
    }

    function checkStateMapKeys(
      obj: TSESTree.ObjectExpression,
      insideSubElement: boolean,
    ): void {
      for (const prop of obj.properties) {
        if (prop.type !== 'Property') continue;

        const key = !prop.computed
          ? getKeyName(prop.key)
          : getStringValue(prop.key);
        if (key === null) continue;

        // Validate syntax
        const error = validateStateKey(key);
        if (error) {
          context.report({
            node: prop.key,
            messageId: 'invalidStateKey',
            data: { reason: error },
          });
          continue;
        }

        // Check @own() usage
        if (key.includes('@own(') && !insideSubElement) {
          context.report({
            node: prop.key,
            messageId: 'ownOutsideSubElement',
          });
        }
      }
    }

    return {
      ImportDeclaration(node) {
        ctx.trackImport(node);
      },

      'CallExpression ObjectExpression'(node: TSESTree.ObjectExpression) {
        if (!ctx.isStyleObject(node)) return;

        const insideSubElement = isInsideSubElement(node);

        for (const prop of node.properties) {
          if (prop.type !== 'Property' || prop.computed) continue;

          const key = getKeyName(prop.key);
          if (key === null) continue;

          // Skip non-style-property keys
          if (/^[A-Z]/.test(key) || key.startsWith('@') || key.startsWith('&'))
            continue;

          // If value is an object, check state map keys
          if (prop.value.type === 'ObjectExpression') {
            // Determine if this is actually a sub-element
            const isSubEl = /^[A-Z]/.test(key);
            if (!isSubEl) {
              checkStateMapKeys(prop.value, insideSubElement);
            }
          }
        }
      },
    };
  },
});
