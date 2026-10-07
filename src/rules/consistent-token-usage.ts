import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import { styleValueListeners } from '../style-values.js';
import { LOGICAL_BORDER_STYLES, LOGICAL_STYLES } from '../constants.js';
import { getStringValue } from '../utils.js';
import { replaceInStringValue } from '../fix-utils.js';
import { scanValueWords } from '../value-words.js';

type MessageIds = 'preferToken' | 'rawPixelValue' | 'replaceWithToken';

/**
 * Properties whose value carries a border width, so a `1px` in one is the
 * `1bw` token spelled out.
 *
 * The logical axes belong here for the same reason `border` does: they take the
 * same width/style/colour value, parsed by the same `parseBorderValue`. Leaving
 * them out would make the advice depend on which axis vocabulary the author
 * happened to use.
 */
const BORDER_WIDTH_PROPERTIES = new Set<string>([
  'border',
  ...LOGICAL_BORDER_STYLES,
]);

/** Enhanced handlers that convert numeric inputs to pixels. Unitless CSS stays out. */
const NUMERIC_PIXEL_PROPERTIES = new Set<string>([
  ...LOGICAL_STYLES,
  'gap',
  'radius',
  'outlineOffset',
  'width',
  'minWidth',
  'maxWidth',
  'height',
  'minHeight',
  'maxHeight',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'inset',
  'top',
  'right',
  'bottom',
  'left',
  'border',
  'borderTop',
  'borderRight',
  'borderBottom',
  'borderLeft',
  'scrollPadding',
  'scrollPaddingTop',
  'scrollPaddingRight',
  'scrollPaddingBottom',
  'scrollPaddingLeft',
  'scrollMargin',
  'scrollMarginTop',
  'scrollMarginRight',
  'scrollMarginBottom',
  'scrollMarginLeft',
]);

const PX_TO_UNIT: Record<string, string> = {
  '8px': '1x',
  '16px': '2x',
  '24px': '3x',
  '32px': '4x',
  '40px': '5x',
  '48px': '6x',
  '56px': '7x',
  '64px': '8x',
};

export default createRule<[], MessageIds>({
  name: 'consistent-token-usage',
  meta: {
    type: 'suggestion',
    hasSuggestions: true,
    docs: {
      description:
        'Suggest using design tokens and custom units instead of raw CSS values',
    },
    messages: {
      rawPixelValue:
        "Use a design token or custom unit instead of raw pixel value '{{raw}}'.",
      preferToken: "Consider using '{{suggestion}}' instead of '{{raw}}'.",
      replaceWithToken: "Replace '{{raw}}' with '{{suggestion}}'",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    function checkValue(
      property: string,
      value: string,
      node: TSESTree.Node,
    ): void {
      // Definitions establish the scale itself; quoted text and URLs are opaque.
      if (/^[#$]/.test(property)) return;
      const pixels = new Map<
        string,
        { start: number; end: number; replacement: string }[]
      >();
      for (const word of scanValueWords(value)) {
        if (!/^[+-]?(?:\d*\.\d+|\d+\.?\d*)(?:e[+-]?\d+)?px$/i.test(word.value))
          continue;
        const amount = Number(word.value.slice(0, -2));
        if (amount === 0) continue;
        const raw = word.value;
        const canonical = `${amount}px`;
        const suggestion =
          property === 'radius' && amount === 6
            ? '1r'
            : BORDER_WIDTH_PROPERTIES.has(property) && amount === 1
              ? '1bw'
              : PX_TO_UNIT[canonical];
        const edits = pixels.get(raw) ?? [];
        edits.push({
          start: word.offset,
          end: word.offset + raw.length,
          replacement: suggestion ?? '',
        });
        pixels.set(raw, edits);
      }
      for (const [raw, edits] of pixels) {
        const suggestion = edits[0].replacement;
        if (!suggestion) {
          context.report({ node, messageId: 'rawPixelValue', data: { raw } });
          continue;
        }
        context.report({
          node,
          messageId: 'preferToken',
          data: { suggestion, raw },
          suggest: [
            {
              messageId: 'replaceWithToken',
              data: { raw, suggestion },
              fix: (fixer) =>
                getStringValue(node) === null
                  ? fixer.replaceText(node, `'${suggestion}'`)
                  : replaceInStringValue(
                      fixer,
                      node,
                      edits,
                      context.sourceCode,
                    ),
            },
          ],
        });
      }
    }

    return styleValueListeners(ctx, (property, node) => {
      const value = getStringValue(node);
      if (value !== null) {
        checkValue(property, value, node);
      } else if (NUMERIC_PIXEL_PROPERTIES.has(property)) {
        if (node.type === 'Literal' && typeof node.value === 'number') {
          checkValue(property, `${node.value}px`, node);
        } else if (
          node.type === 'UnaryExpression' &&
          (node.operator === '-' || node.operator === '+') &&
          node.argument.type === 'Literal' &&
          typeof node.argument.value === 'number'
        ) {
          const amount =
            node.operator === '-' ? -node.argument.value : node.argument.value;
          checkValue(property, `${amount}px`, node);
        }
      }
    });
  },
});
