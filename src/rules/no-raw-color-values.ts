import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { getStringValue } from '../utils.js';

type MessageIds = 'rawHexColor' | 'rawColorFunction';

const HEX_COLOR_REGEX = /#([0-9a-fA-F]{3,8})\b/g;
const COLOR_FUNC_REGEX = /\b(rgb|rgba|hsl|hsla)\s*\(/gi;

export default createRule<[], MessageIds>({
  name: 'no-raw-color-values',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Suggest using color tokens instead of raw hex/rgb values',
    },
    messages: {
      rawHexColor: "Use a color token instead of raw hex color '{{value}}'.",
      rawColorFunction: 'Use a color token instead of raw {{func}}() color.',
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

    function checkValue(value: string, node: TSESTree.Node): void {
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

      // Check color functions
      COLOR_FUNC_REGEX.lastIndex = 0;
      while ((match = COLOR_FUNC_REGEX.exec(value)) !== null) {
        context.report({
          node,
          messageId: 'rawColorFunction',
          data: { func: match[1] },
        });
      }
    }

    function handleStyleObject(node: TSESTree.ObjectExpression) {
      if (!ctx.isStyleObject(node)) return;

      for (const prop of node.properties) {
        if (prop.type !== 'Property') continue;

        const str = getStringValue(prop.value);
        if (str) checkValue(str, prop.value);

        if (prop.value.type === 'ObjectExpression') {
          for (const stateProp of prop.value.properties) {
            if (stateProp.type !== 'Property') continue;
            const stateStr = getStringValue(stateProp.value);
            if (stateStr) checkValue(stateStr, stateProp.value);
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
