import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { getKeyName, getStringValue } from '../utils.js';
import {
  DIRECTIONAL_MODIFIERS,
  DOCK_PROPERTIES,
  SINGLE_VALUE_DIRECTIONAL_PROPERTIES,
} from '../constants.js';
import { parseValue } from '../parsers/index.js';
import type { ValueToken } from '../parsers/index.js';

type MessageIds = 'invalidDirectionalModifier' | 'tooManyValues';

const ALL_DIRECTIONS = new Set([
  'top',
  'right',
  'bottom',
  'left',
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
]);

/**
 * Token types that count as a *value* rather than a modifier.
 *
 * Deliberately excludes `keyword`: direction words, `solid`, `inherit` and every
 * other bare word classify as keywords, and a CSS-wide keyword alongside a
 * direction (`padding: 'inherit top'`) is legal while carrying no value of its own.
 *
 * Also excludes colors: a `fade` group carries a width plus up to two mask
 * colors, so colors must not count toward the one-value limit.
 */
const VALUE_TOKEN_TYPES = new Set<ValueToken['type']>([
  'custom-unit',
  'css-unit',
  'number',
  'custom-prop',
  'custom-prop-ref',
  'css-function',
  'tasty-function',
  'group-expr',
]);

/** The source text of a token. `keyword` tokens carry `value` rather than `raw`. */
function tokenText(token: ValueToken): string {
  if ('raw' in token && typeof token.raw === 'string') return token.raw;
  if (token.type === 'keyword') return token.value;

  return '';
}

export default createRule<[], MessageIds>({
  name: 'valid-directional-modifier',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Validate directional modifiers: only on properties that support them, and one value per group',
    },
    messages: {
      invalidDirectionalModifier:
        "Modifier '{{modifier}}' is not valid for '{{property}}'. Accepted: {{accepted}}.",
      tooManyValues:
        'A group that names directions takes {{limit}}, but \'{{group}}\' has {{count}}. Values and modifiers are parsed into separate buckets, so their order is not recoverable — use comma-separated groups for per-side values, e.g. "2x top, 4x right".',
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
      const allowedMods = DIRECTIONAL_MODIFIERS[property];
      // Only properties with a directional vocabulary are checked.
      //
      // This gate looks like it makes the "wrong property" case unreachable, and
      // it does — but removing it is not the fix. Direction words are ordinary CSS
      // *values* for a long tail of properties: `verticalAlign: 'bottom'`,
      // `textAlign: 'left'`, `transformOrigin: 'top center'`,
      // `backgroundPosition`, `objectPosition`, `float`, `clear`,
      // `scrollSnapAlign`, and `transition` (whose value names properties, which
      // can themselves be `left`/`top`). Checking every property reported all of
      // those as errors across a real design system. Catching `fill: '#purple
      // top'` is not worth an allowlist of every property that takes a
      // positional keyword.
      if (!allowedMods) return;

      // `parseValue` splits on commas (groups) and spaced slashes (parts), which
      // is what makes a per-group arity check possible at all.
      const { groups } = parseValue(value, {
        skipUnitValidation: true,
        skipFuncValidation: true,
      });

      for (const group of groups) {
        const tokens = group.parts.flatMap((part) => part.tokens);
        const directions: string[] = [];
        let valueCount = 0;
        let hasSpanModifier = false;

        for (const token of tokens) {
          if (VALUE_TOKEN_TYPES.has(token.type)) {
            valueCount++;
            continue;
          }

          const word = tokenText(token);

          if (ALL_DIRECTIONS.has(word)) {
            directions.push(word);
          } else if (word === 'dock' && DOCK_PROPERTIES.has(property)) {
            hasSpanModifier = true;
          }
        }

        if (directions.length === 0) continue;

        let reportedUnknown = false;
        for (const direction of directions) {
          if (!allowedMods.has(direction)) {
            context.report({
              node,
              messageId: 'invalidDirectionalModifier',
              data: {
                property,
                modifier: direction,
                accepted: [...allowedMods].join(', '),
              },
            });
            reportedUnknown = true;
          }
        }

        // Don't pile an arity complaint on top of an already-invalid modifier.
        if (reportedUnknown) continue;

        if (!SINGLE_VALUE_DIRECTIONAL_PROPERTIES.has(property)) continue;

        // Values and modifiers are bucketed separately by the parser, so the
        // pairing a reader infers from source order does not survive parsing: a
        // group naming directions carries one value, applied to every direction it
        // names. `dock` is the exception — its second value insets the sides the
        // dock spans.
        const limit = hasSpanModifier ? 2 : 1;

        if (valueCount > limit) {
          context.report({
            node,
            messageId: 'tooManyValues',
            data: {
              group: tokens.map(tokenText).filter(Boolean).join(' '),
              count: `${valueCount}`,
              limit: hasSpanModifier ? 'at most two values' : 'a single value',
            },
          });
        }
      }
    }

    function handleStyleObject(node: TSESTree.ObjectExpression) {
      if (!ctx.isStyleObject(node)) return;

      for (const prop of node.properties) {
        if (prop.type !== 'Property' || prop.computed) continue;

        const key = getKeyName(prop.key);
        if (key === null) continue;

        // Sub-elements, at-rules, token declarations, nested selectors, and the
        // `$` affix (which holds a selector, not a value) are not style values.
        if (
          key === '$' ||
          key.startsWith('@') ||
          key.startsWith('$') ||
          key.startsWith('#') ||
          key.startsWith('&') ||
          /^[A-Z]/.test(key)
        ) {
          continue;
        }

        // Direct value
        const str = getStringValue(prop.value);
        if (str) {
          checkValue(key, str, prop.value);
          continue;
        }

        // State map
        if (
          prop.value.type === 'ObjectExpression' &&
          ctx.isStateMap(prop.value, prop)
        ) {
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
