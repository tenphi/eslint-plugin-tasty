import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import { stringStyleValueListeners } from '../style-values.js';
import { isValidUnit } from '../utils.js';
import { scanValueWords } from '../value-words.js';

type MessageIds = 'unknownUnit';

export default createRule<[], MessageIds>({
  name: 'valid-custom-unit',
  meta: {
    type: 'problem',
    docs: {
      description: 'Validate that custom units in style values are recognized',
    },
    messages: {
      unknownUnit:
        "Unknown unit '{{unit}}' in '{{value}}'. Use a built-in unit (x, r, cr, bw, ow, lh, sf) or a CSS unit, or add '{{unit}}' to 'units' in your tasty config.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    function checkUnitsInValue(value: string, node: TSESTree.Node): void {
      if (ctx.config.units === false) return;

      for (const word of scanValueWords(value)) {
        const match = word.value.match(
          /^[+-]?(?:\d*\.\d+|\d+\.?\d*)(?:e[+-]?\d+)?([a-z][a-z0-9]*)$/i,
        );
        const unit = match?.[1];
        if (unit && !isValidUnit(unit, ctx.config)) {
          context.report({
            node,
            messageId: 'unknownUnit',
            data: { unit, value: word.value },
          });
        }
      }
    }

    return stringStyleValueListeners(ctx, (value, node) => {
      checkUnitsInValue(value, node);
    });
  },
});
