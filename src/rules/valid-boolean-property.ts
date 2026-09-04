import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { getKeyName } from '../utils.js';
import { BOOLEAN_TRUE_PROPERTIES } from '../constants.js';

type MessageIds = 'invalidBooleanTrue';

export default createRule<[], MessageIds>({
  name: 'valid-boolean-property',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Validate that true/false values are only used on properties that support them',
    },
    messages: {
      invalidBooleanTrue:
        "Property '{{name}}' does not accept boolean true. Only these properties support it: {{allowed}}.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    function report(name: string, node: TSESTree.Node): void {
      context.report({
        node,
        messageId: 'invalidBooleanTrue',
        data: { name, allowed: [...BOOLEAN_TRUE_PROPERTIES].join(', ') },
      });
    }

    function handleStyleObject(node: TSESTree.ObjectExpression) {
      if (!ctx.isStyleObject(node)) return;

      for (const prop of node.properties) {
        if (prop.type !== 'Property' || prop.computed) continue;

        const key = getKeyName(prop.key);
        if (key === null) continue;

        // Skip sub-elements and special keys
        if (/^[A-Z@&$#]/.test(key)) continue;

        if (BOOLEAN_TRUE_PROPERTIES.has(key)) continue;

        // Check for true literal — false is always valid (tombstone)
        if (prop.value.type === 'Literal' && prop.value.value === true) {
          report(key, prop.value);
          continue;
        }

        // A state map holds values for the same property, so `true` is exactly
        // as unsupported in one as it is written directly — and rather more
        // likely, since a per-state default (`fill: { '': '#clear', hovered:
        // true }`) is the shape that reads as if it should work.
        //
        // Only genuine state maps: a sub-element object is a style object in its
        // own right and is visited by the listener, so descending into one here
        // would attribute its keys to the outer property.
        if (
          prop.value.type === 'ObjectExpression' &&
          ctx.isStateMap(prop.value, prop)
        ) {
          for (const stateProp of prop.value.properties) {
            if (stateProp.type !== 'Property') continue;
            if (
              stateProp.value.type === 'Literal' &&
              stateProp.value.value === true
            ) {
              report(key, stateProp.value);
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
