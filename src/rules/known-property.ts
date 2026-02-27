import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import { getKeyName } from '../utils.js';
import {
  KNOWN_TASTY_PROPERTIES,
  KNOWN_CSS_PROPERTIES,
  SPECIAL_STYLE_KEYS,
  SHORTHAND_MAPPING,
} from '../constants.js';

type MessageIds = 'unknownProperty';

export default createRule<[], MessageIds>({
  name: 'known-property',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Warn when a style property name is not recognized as a valid tasty or CSS property',
    },
    messages: {
      unknownProperty: "Unknown style property '{{name}}'.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

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

          // Sub-element keys (uppercase start)
          if (/^[A-Z]/.test(key)) continue;

          // Nested selectors (handled by no-nested-selector)
          if (key.startsWith('&')) continue;

          // Special @ keys
          if (key.startsWith('@')) continue;

          // Custom CSS property definitions
          if (key.startsWith('$')) continue;

          // Color token definitions
          if (key.startsWith('#')) continue;

          // Known tasty property
          if (KNOWN_TASTY_PROPERTIES.has(key)) continue;

          // Known CSS property
          if (KNOWN_CSS_PROPERTIES.has(key)) continue;

          // Special style keys
          if (SPECIAL_STYLE_KEYS.has(key)) continue;

          // Shorthand mappings (reported by prefer-shorthand-property)
          if (key in SHORTHAND_MAPPING) continue;

          // Custom styles from config
          if (ctx.config.styles.includes(key)) continue;

          // Check if the parent is a state map — state keys are not properties
          if (
            prop.value.type === 'ObjectExpression' &&
            node.parent?.type === 'Property'
          ) {
            const parentProp = node.parent as TSESTree.Property;
            if (!parentProp.computed && ctx.isStateMap(node, parentProp)) {
              continue;
            }
          }

          context.report({
            node: prop.key,
            messageId: 'unknownProperty',
            data: { name: key },
          });
        }
      },
    };
  },
});
