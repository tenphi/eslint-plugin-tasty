import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { getStringValue, getKeyName } from '../utils.js';
import { COLOR_BEARING_PROPERTIES, NAMED_CSS_COLORS } from '../constants.js';

type MessageIds = 'rawHexColor' | 'rawColorFunction' | 'rawNamedColor';

const HEX_COLOR_REGEX = /#([0-9a-fA-F]{3,8})\b/g;
const COLOR_FUNC_REGEX =
  /\b(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|okhsl|okhsv|okhst|color|device-cmyk|light-dark)\s*\(/gi;
const NAMED_COLOR_REGEX = new RegExp(
  `\\b(${[...NAMED_CSS_COLORS].sort((a, b) => b.length - a.length).join('|')})\\b`,
  'gi',
);

export default createRule<[], MessageIds>({
  name: 'no-raw-color-values',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Suggest using color tokens instead of raw hex/rgb/okhsl/named colors',
    },
    messages: {
      rawHexColor: "Use a color token instead of raw hex color '{{value}}'.",
      rawColorFunction: 'Use a color token instead of raw {{func}}() color.',
      rawNamedColor: "Use a color token instead of raw named color '{{name}}'.",
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
      if (isInTokenDefinition(node)) return;

      // Check hex colors
      HEX_COLOR_REGEX.lastIndex = 0;
      let match;
      while ((match = HEX_COLOR_REGEX.exec(value)) !== null) {
        const hex = match[1];
        if ([3, 4, 6, 8].includes(hex.length)) {
          context.report({
            node,
            messageId: 'rawHexColor',
            data: { value: match[0] },
          });
        }
      }

      // Check color functions (rgb, hsl, okhsl, okhst, oklch, …)
      COLOR_FUNC_REGEX.lastIndex = 0;
      while ((match = COLOR_FUNC_REGEX.exec(value)) !== null) {
        context.report({
          node,
          messageId: 'rawColorFunction',
          data: { func: match[1] },
        });
      }

      // Check named CSS colors — scoped to color-bearing properties to avoid
      // false positives on string properties like `content` or `cursor`. Skip
      // matches that are part of a `#token` or `$prop` reference (e.g. `#purple`,
      // `$red`) — those are Tasty tokens/custom properties, not raw colors.
      if (propertyKey && COLOR_BEARING_PROPERTIES.has(propertyKey)) {
        NAMED_COLOR_REGEX.lastIndex = 0;
        while ((match = NAMED_COLOR_REGEX.exec(value)) !== null) {
          const prev = match.index > 0 ? value[match.index - 1] : '';
          if (prev === '#' || prev === '$') continue;
          context.report({
            node,
            messageId: 'rawNamedColor',
            data: { name: match[1] },
          });
        }
      }
    }

    function handleStyleObject(node: TSESTree.ObjectExpression) {
      if (!ctx.isStyleObject(node)) return;

      for (const prop of node.properties) {
        if (prop.type !== 'Property') continue;
        const key = getKeyName(prop.key);

        const str = getStringValue(prop.value);
        if (str) checkValue(str, prop.value, key);

        if (prop.value.type === 'ObjectExpression') {
          for (const stateProp of prop.value.properties) {
            if (stateProp.type !== 'Property') continue;
            const stateStr = getStringValue(stateProp.value);
            if (stateStr) checkValue(stateStr, stateProp.value, key);
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
