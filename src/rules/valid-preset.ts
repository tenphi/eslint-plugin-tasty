import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import { getKeyName, getStringValue } from '../utils.js';
import { PRESET_MODIFIERS } from '../constants.js';

type MessageIds = 'unknownPreset' | 'unknownModifier';

export default createRule<[], MessageIds>({
  name: 'valid-preset',
  meta: {
    type: 'problem',
    docs: {
      description: 'Validate preset property values against config',
    },
    messages: {
      unknownPreset: "Unknown preset '{{name}}'.",
      unknownModifier: "Unknown preset modifier '{{modifier}}'.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    function checkPresetValue(value: string, node: TSESTree.Node): void {
      const parts = value.trim().split(/\s+/);
      if (parts.length === 0) return;

      const [presetName, ...modifiers] = parts;

      if (
        ctx.config.presets.length > 0 &&
        !ctx.config.presets.includes(presetName)
      ) {
        context.report({
          node,
          messageId: 'unknownPreset',
          data: { name: presetName },
        });
      }

      for (const mod of modifiers) {
        if (!PRESET_MODIFIERS.has(mod)) {
          context.report({
            node,
            messageId: 'unknownModifier',
            data: { modifier: mod },
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

        for (const prop of node.properties) {
          if (prop.type !== 'Property' || prop.computed) continue;

          const key = getKeyName(prop.key);
          if (key !== 'preset') continue;

          // Direct string value
          const str = getStringValue(prop.value);
          if (str) {
            checkPresetValue(str, prop.value);
            continue;
          }

          // true is always valid
          if (prop.value.type === 'Literal' && prop.value.value === true) {
            continue;
          }

          // State map
          if (prop.value.type === 'ObjectExpression') {
            for (const stateProp of prop.value.properties) {
              if (stateProp.type !== 'Property') continue;
              const stateStr = getStringValue(stateProp.value);
              if (stateStr) {
                checkPresetValue(stateStr, stateProp.value);
              }
            }
          }
        }
      },
    };
  },
});
