import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import { stringStyleValueListeners } from '../style-values.js';
import { getStringValue, isRawHexColor } from '../utils.js';
import { scanValueWords } from '../value-words.js';
import { COLOR_BEARING_PROPERTIES, NAMED_CSS_COLORS } from '../constants.js';

type MessageIds = 'rawHexColor' | 'rawColorFunction' | 'rawNamedColor';

const COLOR_FUNCTIONS = new Set([
  'rgb',
  'rgba',
  'hsl',
  'hsla',
  'hwb',
  'lab',
  'lch',
  'oklab',
  'oklch',
  'okhsl',
  'okhsv',
  'okhst',
  'color',
  'device-cmyk',
  'light-dark',
]);

export default createRule<[], MessageIds>({
  name: 'no-raw-color-values',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Suggest using color tokens instead of raw hex/rgb/okhsl/named colors',
    },
    messages: {
      rawHexColor:
        "Use a color token instead of raw hex color '{{value}}'. For an intentional one-off color, explicitly disable tasty/no-raw-color-values on this line with a reason.",
      rawColorFunction:
        'Use a color token instead of raw {{func}}() color. For an intentional one-off color, explicitly disable tasty/no-raw-color-values on this line with a reason.',
      rawNamedColor:
        "Use a color token instead of raw named color '{{name}}'. For an intentional one-off color, explicitly disable tasty/no-raw-color-values on this line with a reason.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    function isInTokenDefinition(node: TSESTree.Node): boolean {
      // Check if this is inside a :root or token-defining context
      let current: TSESTree.Node | undefined = node;
      while (current) {
        if (current.type === 'CallExpression') {
          const imp = ctx.isTastyCall(current);
          if (imp && imp.importedName === 'tastyStatic') {
            const firstArg = current.arguments[0];
            const selectorStr = getStringValue(firstArg);
            if (selectorStr === ':root') return true;
          }
          break;
        }
        current = current.parent;
      }
      return false;
    }

    function checkValue(
      value: string,
      node: TSESTree.Node,
      propertyKey?: string | null,
    ): void {
      if (
        isInTokenDefinition(node) ||
        (propertyKey && /^[#$]/.test(propertyKey))
      )
        return;
      for (const word of scanValueWords(value)) {
        if (isRawHexColor(word.value)) {
          context.report({
            node,
            messageId: 'rawHexColor',
            data: { value: word.value },
          });
        } else if (
          word.isFunction &&
          COLOR_FUNCTIONS.has(word.value.toLowerCase())
        ) {
          context.report({
            node,
            messageId: 'rawColorFunction',
            data: { func: word.value },
          });
        } else if (
          !word.isFunction &&
          propertyKey &&
          COLOR_BEARING_PROPERTIES.has(propertyKey) &&
          NAMED_CSS_COLORS.has(word.value.toLowerCase())
        ) {
          context.report({
            node,
            messageId: 'rawNamedColor',
            data: { name: word.value },
          });
        }
      }
    }

    return stringStyleValueListeners(ctx, (value, node, property) => {
      checkValue(value, node, property);
    });
  },
});
