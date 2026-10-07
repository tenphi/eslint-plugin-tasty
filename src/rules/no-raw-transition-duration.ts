import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import { stringStyleValueListeners } from '../style-values.js';
import { replaceInStringValue } from '../fix-utils.js';
import { scanTokens, type ScannedToken } from '../parsers/utils.js';
import {
  getDurationTokens,
  hasRawTimeInExpression,
  isNonzeroTime,
  isTimeLiteral,
} from './motion-duration-utils.js';

type MessageIds =
  | 'rawTransitionDuration'
  | 'rawTransitionDurationExpression'
  | 'useDurationToken'
  | 'useDefaultDuration';

/**
 * A plausible transition name: a semantic name, a CSS property, or a `$$name` /
 * `##name` / `--name` custom-property reference.
 *
 * This excludes malformed groups from duration advice.
 */
const TRANSITION_NAME = /^(?:\$\$|##|--)?[a-zA-Z][\w-]*$/;
const NON_TRANSITION_NAMES = new Set([
  'none',
  'inherit',
  'initial',
  'unset',
  'revert',
  'revert-layer',
]);

/** The default timing tasty substitutes for a group whose duration is omitted. */
function defaultTimingHint(name: string): string {
  // The parser turns $$name into --name and ##name into --name-color before
  // the transition handler selects its per-property timing variable.
  const property = name.startsWith('$$')
    ? name.slice(2)
    : name.startsWith('##')
      ? `${name.slice(2)}-color`
      : name.startsWith('--')
        ? name.slice(2)
        : name;
  return `$${property}-transition (falling back to $transition)`;
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
      rawTransitionDurationExpression:
        "Transition duration '{{duration}}' contains a hardcoded time. Derive it from a duration token instead.",
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
    const durationTokens = getDurationTokens(ctx.config.tokens);

    function checkGroup(tokens: ScannedToken[], node: TSESTree.Node): void {
      const [name, timing] = tokens;

      // Only the second token is the duration slot. A later time value is a
      // delay, for which removing the value has different semantics.
      if (!name || !timing || !TRANSITION_NAME.test(name.value)) return;
      if (NON_TRANSITION_NAMES.has(name.value)) return;

      const isLiteral = isTimeLiteral(timing.value);
      if (isLiteral && !isNonzeroTime(timing.value)) return;
      if (!isLiteral && !hasRawTimeInExpression(timing.value)) return;

      if (!isLiteral) {
        // Replacing or dropping a whole expression can change its behavior in
        // ways the rule cannot infer, so offer a report without a quick fix.
        context.report({
          node,
          messageId: 'rawTransitionDurationExpression',
          data: { duration: timing.value },
        });
        return;
      }

      const start = timing.offset;
      const end = start + timing.value.length;
      // Removal swallows the separating whitespace too, so dropping the
      // duration does not leave `fill  ease-in` behind.
      const removeStart = name.offset + name.value.length;

      context.report({
        node,
        messageId: 'rawTransitionDuration',
        data: {
          duration: timing.value,
          available: durationTokens.length
            ? ` (${durationTokens.join(', ')})`
            : '',
          fallback: defaultTimingHint(name.value),
        },
        suggest: [
          // Config tokens first: naming the project's own duration is better
          // advice than deleting the author's intent, when one exists.
          ...durationTokens.map((token) => ({
            messageId: 'useDurationToken' as const,
            data: { duration: timing.value, token },
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
            data: { duration: timing.value },
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
    }

    function checkTransitionValue(value: string, node: TSESTree.Node): void {
      let group: ScannedToken[] = [];
      for (const token of scanTokens(value)) {
        if (token.value) group.push(token);
        if (token.isComma) {
          checkGroup(group, node);
          group = [];
        }
      }
      checkGroup(group, node);
    }

    return stringStyleValueListeners(
      ctx,
      (value, node, property) => {
        if (property === 'transition') checkTransitionValue(value, node);
      },
      { requireTastyJSX: true },
    );
  },
});
