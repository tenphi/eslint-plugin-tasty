import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { getKeyName, getStringValue } from '../utils.js';
import { DIRECTIONAL_BOX_IDENTITY } from '../constants.js';
import { replaceStringValue } from '../fix-utils.js';

type MessageIds = 'preferDirectionalShorthand';

const SIDES = ['top', 'right', 'bottom', 'left'] as const;

function isZeroLike(token: string): boolean {
  const trimmed = token.trim();
  if (trimmed === '0') return true;
  return /^0+(?:\.0+)?(?:px|em|rem|%|x|r|cr|bw|ow|lh|sf)?$/i.test(trimmed);
}

/**
 * Whether `token` is the placeholder value for an unset side, i.e. dropping it
 * from the shorthand leaves the emitted CSS unchanged.
 */
function isIdentity(token: string, identity: string): boolean {
  if (identity === 'auto') return token.trim().toLowerCase() === 'auto';
  return isZeroLike(token);
}

function suggestDirectional(value: string, identity: string): string | null {
  const tokens = value.trim().split(/\s+/);
  if (tokens.length !== 4) return null;

  const meaningful = tokens
    .map((token, index) => ({ token, side: SIDES[index] }))
    .filter(({ token }) => !isIdentity(token, identity));

  // Only collapse when exactly one side carries a real value — otherwise the
  // directional shorthand would drop the others.
  if (meaningful.length !== 1) return null;

  const { token, side } = meaningful[0];
  return `${token} ${side}`;
}

export default createRule<[], MessageIds>({
  name: 'prefer-directional-shorthand',
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description:
        'Suggest Tasty directional shorthand instead of 4-value CSS box syntax with zero placeholders',
    },
    messages: {
      preferDirectionalShorthand:
        "'{{property}}' value '{{raw}}' only sets one side. Use the directional shorthand '{{suggestion}}' (e.g. '1x bottom') instead.",
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
      const suggestion = suggestDirectional(
        value,
        DIRECTIONAL_BOX_IDENTITY[property],
      );
      if (!suggestion) return;

      context.report({
        node,
        messageId: 'preferDirectionalShorthand',
        data: { property, raw: value, suggestion },
        fix(fixer) {
          return replaceStringValue(fixer, node, suggestion);
        },
      });
    }

    function handleStyleObject(node: TSESTree.ObjectExpression) {
      if (!ctx.isStyleObject(node)) return;

      for (const prop of node.properties) {
        if (prop.type !== 'Property' || prop.computed) continue;

        const key = getKeyName(prop.key);
        if (key === null) continue;
        if (!(key in DIRECTIONAL_BOX_IDENTITY)) continue;

        const str = getStringValue(prop.value);
        if (str) {
          checkValue(key, str, prop.value);
          continue;
        }

        if (prop.value.type === 'ObjectExpression') {
          for (const stateProp of prop.value.properties) {
            if (stateProp.type !== 'Property') continue;
            const stateStr = getStringValue(stateProp.value);
            if (stateStr) {
              checkValue(key, stateStr, stateProp.value);
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
