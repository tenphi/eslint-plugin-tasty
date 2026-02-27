import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import { getKeyName, getStringValue } from '../utils.js';

type MessageIds =
  | 'stateKeyAtTopLevel'
  | 'invalidKeyframesStructure'
  | 'invalidPropertiesStructure'
  | 'recipeNotString';

export default createRule<[], MessageIds>({
  name: 'valid-styles-structure',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Validate overall structure of styles object passed to tasty APIs',
    },
    messages: {
      stateKeyAtTopLevel:
        "State key '{{key}}' at top level is not valid. State maps belong inside property values, not at the root of the styles object.",
      invalidKeyframesStructure:
        '@keyframes value must be an object of { name: { step: styles } }.',
      invalidPropertiesStructure:
        '@properties value must be an object of { name: { syntax, inherits, initialValue } }.',
      recipeNotString: "'recipe' value must be a string.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    const STATE_KEY_PATTERNS = [
      /^:/, // pseudo-class
      /^\./, // class selector
      /^\[/, // attribute selector
    ];

    function looksLikeStateKey(key: string): boolean {
      if (key === '') return true;
      return STATE_KEY_PATTERNS.some((p) => p.test(key));
    }

    return {
      ImportDeclaration(node) {
        ctx.trackImport(node);
      },

      'CallExpression ObjectExpression'(node: TSESTree.ObjectExpression) {
        if (!ctx.isStyleObject(node)) return;

        for (const prop of node.properties) {
          if (prop.type !== 'Property' || prop.computed) continue;

          const key = getKeyName(prop.key);
          if (key === null) continue;

          // Check for state keys at top level (common mistake)
          if (looksLikeStateKey(key)) {
            context.report({
              node: prop.key,
              messageId: 'stateKeyAtTopLevel',
              data: { key },
            });
            continue;
          }

          // Validate @keyframes structure
          if (key === '@keyframes') {
            if (prop.value.type !== 'ObjectExpression') {
              context.report({
                node: prop.value,
                messageId: 'invalidKeyframesStructure',
              });
            }
            continue;
          }

          // Validate @properties structure
          if (key === '@properties') {
            if (prop.value.type !== 'ObjectExpression') {
              context.report({
                node: prop.value,
                messageId: 'invalidPropertiesStructure',
              });
            }
            continue;
          }

          // Validate recipe is a string
          if (key === 'recipe') {
            const str = getStringValue(prop.value);
            if (str === null && prop.value.type !== 'Literal') {
              // Allow string literals, template literals without expressions
              if (
                prop.value.type !== 'TemplateLiteral' ||
                prop.value.expressions.length > 0
              ) {
                context.report({
                  node: prop.value,
                  messageId: 'recipeNotString',
                });
              }
            }
          }
        }
      },
    };
  },
});
