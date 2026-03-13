import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { getKeyName, getStringValue } from '../utils.js';
import { SEMANTIC_TRANSITIONS, KNOWN_CSS_PROPERTIES } from '../constants.js';

type MessageIds = 'unknownTransition';

export default createRule<[], MessageIds>({
  name: 'valid-transition',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Validate transition property values use valid semantic transition names',
    },
    messages: {
      unknownTransition:
        "Unknown transition name '{{name}}'. Use a semantic name ({{known}}) or a CSS property name.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    function checkTransitionValue(value: string, node: TSESTree.Node): void {
      const groups = value.split(',');

      for (const group of groups) {
        const parts = group.trim().split(/\s+/);
        if (parts.length === 0) continue;

        const name = parts[0];

        // $$ prefix is always valid (custom property reference)
        if (name.startsWith('$$')) continue;

        if (
          !SEMANTIC_TRANSITIONS.has(name) &&
          !KNOWN_CSS_PROPERTIES.has(name) &&
          name !== 'all' &&
          name !== 'none'
        ) {
          context.report({
            node,
            messageId: 'unknownTransition',
            data: {
              name,
              known: [...SEMANTIC_TRANSITIONS].join(', '),
            },
          });
        }
      }
    }

    function handleStyleObject(node: TSESTree.ObjectExpression) {
      if (!ctx.isStyleObject(node)) return;

      for (const prop of node.properties) {
        if (prop.type !== 'Property' || prop.computed) continue;

        const key = getKeyName(prop.key);
        if (key !== 'transition') continue;

        const str = getStringValue(prop.value);
        if (str) {
          checkTransitionValue(str, prop.value);
          continue;
        }

        if (prop.value.type === 'ObjectExpression') {
          for (const stateProp of prop.value.properties) {
            if (stateProp.type !== 'Property') continue;
            const stateStr = getStringValue(stateProp.value);
            if (stateStr) {
              checkTransitionValue(stateStr, stateProp.value);
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
