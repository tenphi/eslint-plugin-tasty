import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import { stringStyleValueListeners } from '../style-values.js';
import { getStringValue, isRawHexColor } from '../utils.js';
import { scanValueWords } from '../value-words.js';
import { COLOR_BEARING_PROPERTIES, NAMED_CSS_COLORS } from '../constants.js';

type MessageIds =
  | 'rawHexColor'
  | 'rawColorFunction'
  | 'rawNamedColor'
  | 'rawAttributeColor';

/**
 * Color presentation attributes of native elements, in both JSX spellings,
 * mapped to the style property whose named-color check applies.
 */
const COLOR_ATTRIBUTES = new Map<string, string>([
  ['fill', 'fill'],
  ['stroke', 'stroke'],
  ['color', 'color'],
  ['stopColor', 'stopColor'],
  ['stop-color', 'stopColor'],
  ['floodColor', 'floodColor'],
  ['flood-color', 'floodColor'],
  ['lightingColor', 'lightingColor'],
  ['lighting-color', 'lightingColor'],
]);

/**
 * Inside these elements a fill is geometry (`<clipPath>`) or luminance
 * (`<mask>`), not a theme color.
 */
const GEOMETRY_ELEMENTS = new Set(['clipPath', 'mask']);

/** The string of a literal attribute value, or null for anything dynamic. */
function getLiteralAttributeValue(
  value: TSESTree.JSXAttribute['value'],
): string | null {
  const expr =
    value?.type === 'JSXExpressionContainer' ? value.expression : value;
  if (expr?.type === 'Literal') {
    return typeof expr.value === 'string' ? expr.value : null;
  }
  if (expr?.type === 'TemplateLiteral' && expr.expressions.length === 0) {
    return expr.quasis[0]?.value.cooked ?? null;
  }
  return null;
}

/** Whether the element sits inside a `<clipPath>` or `<mask>`, or is one. */
function isInsideGeometryElement(opening: TSESTree.JSXOpeningElement): boolean {
  let current: TSESTree.Node | undefined = opening.parent;
  while (current) {
    if (current.type === 'JSXElement') {
      const name = current.openingElement.name;
      if (name.type === 'JSXIdentifier' && GEOMETRY_ELEMENTS.has(name.name)) {
        return true;
      }
    }
    current = current.parent;
  }
  return false;
}

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
      rawAttributeColor:
        "Raw color '{{value}}' in the {{attribute}} attribute does not follow the theme. Write {{attribute}}=\"currentColor\" and set the color from a token in Tasty styles (`color: '#token'` on this element or a parent), or use Tasty's `svgFill` / `stroke` styles. For fixed artwork, explicitly disable tasty/no-raw-color-values on this line with a reason.",
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

    /** The kind of raw color a word is, or null when it is not one. */
    function classify(
      word: { value: string; isFunction: boolean },
      propertyKey?: string | null,
    ): 'hex' | 'function' | 'named' | null {
      if (isRawHexColor(word.value)) return 'hex';
      if (word.isFunction) {
        return COLOR_FUNCTIONS.has(word.value.toLowerCase())
          ? 'function'
          : null;
      }
      return propertyKey &&
        COLOR_BEARING_PROPERTIES.has(propertyKey) &&
        NAMED_CSS_COLORS.has(word.value.toLowerCase())
        ? 'named'
        : null;
    }

    function checkValue(
      value: string,
      node: TSESTree.Node,
      propertyKey?: string | null,
      attribute?: string,
    ): void {
      if (
        isInTokenDefinition(node) ||
        (propertyKey && /^[#$]/.test(propertyKey))
      )
        return;
      for (const word of scanValueWords(value)) {
        const kind = classify(word, propertyKey);
        if (!kind) continue;
        if (attribute) {
          context.report({
            node,
            messageId: 'rawAttributeColor',
            data: {
              value: kind === 'function' ? `${word.value}()` : word.value,
              attribute,
            },
          });
        } else if (kind === 'hex') {
          context.report({
            node,
            messageId: 'rawHexColor',
            data: { value: word.value },
          });
        } else if (kind === 'function') {
          context.report({
            node,
            messageId: 'rawColorFunction',
            data: { func: word.value },
          });
        } else {
          context.report({
            node,
            messageId: 'rawNamedColor',
            data: { name: word.value },
          });
        }
      }
    }

    const listeners = stringStyleValueListeners(
      ctx,
      (value, node, property) => {
        checkValue(value, node, property);
      },
    );
    const styleAttribute = listeners.JSXAttribute;

    return {
      ...listeners,
      JSXAttribute(node) {
        styleAttribute?.(node);
        // Native elements only (lowercase tags). Component props keep the
        // style-prop handling above.
        if (node.name.type !== 'JSXIdentifier') return;
        const property = COLOR_ATTRIBUTES.get(node.name.name);
        if (!property) return;
        const opening = node.parent;
        if (
          opening?.type !== 'JSXOpeningElement' ||
          opening.name.type !== 'JSXIdentifier' ||
          !/^[a-z]/.test(opening.name.name)
        )
          return;
        const value = getLiteralAttributeValue(node.value);
        if (value === null || isInsideGeometryElement(opening)) return;
        checkValue(value, node, property, node.name.name);
      },
    };
  },
});
