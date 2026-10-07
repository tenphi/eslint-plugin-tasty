import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import { stringStyleValueListeners } from '../style-values.js';
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
      unknownPreset:
        "Unknown preset '{{name}}'. Add it to 'presets' in your tasty config, or use a configured preset.",
      unknownModifier:
        "Unknown preset modifier '{{modifier}}'. Valid modifiers: {{valid}}.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    const CSS_GLOBAL_KEYWORDS = new Set([
      'inherit',
      'initial',
      'unset',
      'revert',
      'revert-layer',
    ]);

    function checkPresetValue(value: string, node: TSESTree.Node): void {
      const segments = value.trim().split(/\s*\/\s*/);
      if (segments.length === 0) return;

      const nameSegment = segments[0].trim();
      const modSegment = segments[1]?.trim();

      if (!nameSegment) return;
      if (CSS_GLOBAL_KEYWORDS.has(nameSegment)) return;

      const nameTokens = nameSegment.split(/\s+/).filter(Boolean);
      // Mod-only shorthand: every token in the name segment is a recognized
      // modifier (e.g. preset="bold", preset="bold italic").
      const isModOnlyShorthand =
        nameTokens.length > 0 &&
        nameTokens.every((t) => PRESET_MODIFIERS.has(t));

      if (!isModOnlyShorthand) {
        const presetName = nameTokens[0];
        if (
          presetName &&
          ctx.config.presets.length > 0 &&
          !ctx.config.presets.includes(presetName)
        ) {
          context.report({
            node,
            messageId: 'unknownPreset',
            data: { name: presetName },
          });
        }
      }

      if (modSegment) {
        for (const mod of modSegment.split(/\s+/).filter(Boolean)) {
          if (!PRESET_MODIFIERS.has(mod)) {
            context.report({
              node,
              messageId: 'unknownModifier',
              data: {
                modifier: mod,
                valid: [...PRESET_MODIFIERS].join(', '),
              },
            });
          }
        }
      }
    }

    return stringStyleValueListeners(ctx, (value, node, property) => {
      if (property === 'preset') checkPresetValue(value, node);
    });
  },
});
