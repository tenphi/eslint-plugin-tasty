import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { getKeyName, getStringValue } from '../utils.js';
import { replaceInStringValue } from '../fix-utils.js';

type MessageIds =
  | 'rawTransitionDuration'
  | 'useDurationToken'
  | 'useDefaultDuration';

/**
 * A CSS time literal: `0.2s`, `200ms`, `.15s`, `0`.
 *
 * A bare `0` counts because it is a duration in the timing slot — and the one
 * spelling of "no transition" a design system would rather express as a state
 * than as a hardcoded zero.
 *
 * Deliberately narrow. `$fast-transition`, `var(--transition)`, `(0.2s * 2)`
 * and `calc(…)` all reach the same slot and none is a raw literal: the first
 * two are already tokens, and the arithmetic forms are somebody deriving a
 * duration from one, which is not what this rule is about. A unitless non-zero
 * (`fill 200`) is invalid CSS rather than a hardcoded token, so it is left to
 * `valid-value`.
 */
const TIME_LITERAL = /^(?:\d*\.?\d+m?s|0)$/i;

/**
 * A plausible transition name: a semantic name, a CSS property, or a `$$name` /
 * `##name` / `--name` custom-property reference.
 *
 * This is the guard that makes the naive comma split safe. A value can carry a
 * multi-argument easing — `transition: 'fill cubic-bezier(0.4, 0, 0.2, 1) 1s'`
 * — whose commas are not group separators, so the last "group" comes out as
 * `1) 1s`. Requiring the name slot to look like a name drops that fragment
 * instead of reporting a duration for a property called `1)`.
 */
const TRANSITION_NAME = /^(?:\$\$|##|--)?[a-zA-Z][\w-]*$/;

/**
 * Config `tokens` entries that name a duration.
 *
 * Tasty resolves an omitted duration to `var(--<name>-transition,
 * var(--transition))`, so `-transition` is the naming convention the runtime
 * itself imposes; `duration` is the other spelling design systems reach for.
 */
const DURATION_TOKEN = /(?:^\$transition$|-transition$|duration)/i;

/** The default timing tasty substitutes for a group whose duration is omitted. */
function defaultTimingHint(name: string): string {
  // A custom-property reference names no semantic group, so there is no
  // per-name timing token to point at — only the global one.
  if (!/^[a-zA-Z][\w-]*$/.test(name)) return '$transition';

  return `$${name}-transition (falling back to $transition)`;
}

export default createRule<[], MessageIds>({
  name: 'no-raw-transition-duration',
  meta: {
    type: 'suggestion',
    hasSuggestions: true,
    docs: {
      description:
        "Suggest a duration token, or tasty's default timing, instead of a hardcoded transition duration",
    },
    messages: {
      rawTransitionDuration:
        "Transition duration '{{duration}}' is hardcoded. Use a duration token{{available}}, or omit it to inherit {{fallback}}.",
      useDurationToken: "Replace '{{duration}}' with '{{token}}'",
      useDefaultDuration:
        "Remove '{{duration}}' to inherit the default transition timing",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    /** `$`-prefixed config tokens whose name reads as a duration. */
    const durationTokens = Array.isArray(ctx.config.tokens)
      ? ctx.config.tokens.filter(
          (token) => token.startsWith('$') && DURATION_TOKEN.test(token),
        )
      : [];

    function checkTransitionValue(value: string, node: TSESTree.Node): void {
      let offset = 0;

      for (const group of value.split(',')) {
        const tokens = group.trim().split(/\s+/).filter(Boolean);
        const [name, timing] = tokens;

        // Only the second token is inspected, which is exactly the slot tasty
        // reads as the duration. A later time value is a *delay*
        // (`fill ease-in 0.1s`), and the advice here would not hold for one:
        // omitting a delay means "no delay", a real rendering change, whereas
        // omitting a duration falls back to the design system's own timing.
        if (
          !name ||
          !timing ||
          !TRANSITION_NAME.test(name) ||
          !TIME_LITERAL.test(timing)
        ) {
          offset += group.length + 1;
          continue;
        }

        // Search from the end of the name so a duration that repeats the name's
        // own text cannot match the wrong occurrence.
        const nameEnd = group.indexOf(name) + name.length;
        const startInGroup = group.indexOf(timing, nameEnd);
        if (startInGroup === -1) {
          offset += group.length + 1;
          continue;
        }

        const start = offset + startInGroup;
        const end = start + timing.length;
        // Removal swallows the separating whitespace too, so dropping the
        // duration does not leave `fill  ease-in` behind.
        const removeStart = offset + nameEnd;

        context.report({
          node,
          messageId: 'rawTransitionDuration',
          data: {
            duration: timing,
            available: durationTokens.length
              ? ` (${durationTokens.join(', ')})`
              : '',
            fallback: defaultTimingHint(name),
          },
          suggest: [
            // Config tokens first: naming the project's own duration is better
            // advice than deleting the author's intent, when one exists.
            ...durationTokens.map((token) => ({
              messageId: 'useDurationToken' as const,
              data: { duration: timing, token },
              fix: (fixer: Parameters<typeof replaceInStringValue>[0]) =>
                replaceInStringValue(
                  fixer,
                  node,
                  [{ start, end, replacement: token }],
                  context.sourceCode,
                ),
            })),
            {
              messageId: 'useDefaultDuration' as const,
              data: { duration: timing },
              fix: (fixer: Parameters<typeof replaceInStringValue>[0]) =>
                replaceInStringValue(
                  fixer,
                  node,
                  [{ start: removeStart, end, replacement: '' }],
                  context.sourceCode,
                ),
            },
          ],
        });

        offset += group.length + 1;
      }
    }

    function handleStyleObject(node: TSESTree.ObjectExpression) {
      if (!ctx.isStyleObject(node)) return;

      for (const prop of node.properties) {
        if (prop.type !== 'Property' || prop.computed) continue;

        const key = getKeyName(prop.key);
        if (key !== 'transition') continue;

        const str = getStringValue(prop.value);
        if (str) {
          checkTransitionValue(str, prop.value);
          continue;
        }

        if (prop.value.type === 'ObjectExpression') {
          for (const stateProp of prop.value.properties) {
            if (stateProp.type !== 'Property') continue;
            const stateStr = getStringValue(stateProp.value);
            if (stateStr) {
              checkTransitionValue(stateStr, stateProp.value);
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
