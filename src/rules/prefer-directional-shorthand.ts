import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { getKeyName, getStringValue } from '../utils.js';
import {
  DIRECTIONAL_BOX,
  DOCK_PROPERTIES,
  type DirectionalBoxConfig,
} from '../constants.js';
import { replaceStringValue } from '../fix-utils.js';

type MessageIds = 'preferDirectionalShorthand' | 'preferDirectionalUnrendered';

function isZeroLike(token: string): boolean {
  const trimmed = token.trim();
  if (trimmed === '0') return true;
  return /^0+(?:\.0+)?(?:px|em|rem|%|x|r|cr|bw|ow|lh|sf)?$/i.test(trimmed);
}

/**
 * Whether `token` is the placeholder for an unset position, i.e. dropping it
 * from the shorthand leaves the emitted CSS unchanged.
 */
function isIdentity(token: string, identity: string): boolean {
  if (identity === 'auto') return token.trim().toLowerCase() === 'auto';
  return isZeroLike(token);
}

/**
 * Rewrites a 4-value box into the directional shorthand, or returns null when
 * no equivalent form exists.
 *
 * The value is always carried into the suggestion, never dropped in favour of
 * the property default. Whether an explicit value *equals* the default is
 * project-dependent: `margin` defaults to `var(--gap)` (4px out of the box)
 * while `1x` is 8px, so `margin: '0 0 1x 0'` -> `margin: 'bottom'` would
 * silently change the spacing.
 */
function suggestDirectional(
  value: string,
  config: DirectionalBoxConfig,
  supportsDock: boolean,
): string | null {
  const tokens = value.trim().split(/\s+/);
  if (tokens.length !== 4) return null;

  const { identity, positions } = config;
  const placeholders = tokens.map((token) => isIdentity(token, identity));
  const setCount = placeholders.filter((placeholder) => !placeholder).length;

  // Exactly one real value: collapse to `<value> <position>`.
  if (setCount === 1) {
    const index = placeholders.indexOf(false);

    return `${tokens[index]} ${positions[index]}`;
  }

  // Three equal real values around a single placeholder: one edge pinned with
  // the perpendicular pair spanned, which `dock` expresses. The docked edge is
  // opposite the placeholder.
  if (supportsDock && setCount === 3) {
    const freeIndex = placeholders.indexOf(true);
    const set = tokens.filter((_, index) => index !== freeIndex);

    if (new Set(set).size === 1) {
      return `${set[0]} ${positions[(freeIndex + 2) % 4]} dock`;
    }
  }

  return null;
}

export default createRule<[], MessageIds>({
  name: 'prefer-directional-shorthand',
  meta: {
    type: 'suggestion',
    fixable: 'code',
    hasSuggestions: true,
    docs: {
      description:
        'Suggest Tasty directional shorthand instead of 4-value CSS box syntax with placeholder positions',
    },
    messages: {
      preferDirectionalShorthand:
        "'{{property}}' value '{{raw}}' only sets part of the box. Use the directional shorthand '{{suggestion}}' instead.",
      preferDirectionalUnrendered:
        "'{{property}}' value '{{raw}}' does not do what it looks like — {{note}}. Use '{{suggestion}}' instead.",
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
      const config = DIRECTIONAL_BOX[property];
      const suggestion = suggestDirectional(
        value,
        config,
        DOCK_PROPERTIES.has(property),
      );
      if (!suggestion) return;

      if (config.fixable) {
        context.report({
          node,
          messageId: 'preferDirectionalShorthand',
          data: { property, raw: value, suggestion },
          fix(fixer) {
            return replaceStringValue(fixer, node, suggestion);
          },
        });

        return;
      }

      // Applying this changes what the browser renders, so it is offered as a
      // manual suggestion rather than an `eslint --fix` rewrite.
      context.report({
        node,
        messageId: 'preferDirectionalUnrendered',
        data: { property, raw: value, suggestion, note: config.note ?? '' },
        suggest: [
          {
            messageId: 'preferDirectionalShorthand',
            data: { property, raw: value, suggestion },
            fix(fixer) {
              return replaceStringValue(fixer, node, suggestion);
            },
          },
        ],
      });
    }

    function handleStyleObject(node: TSESTree.ObjectExpression) {
      if (!ctx.isStyleObject(node)) return;

      for (const prop of node.properties) {
        if (prop.type !== 'Property' || prop.computed) continue;

        const key = getKeyName(prop.key);
        if (key === null) continue;
        if (!(key in DIRECTIONAL_BOX)) continue;

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
