import type { TSESTree } from '@typescript-eslint/utils';
import semver from 'semver';
import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import { getInstalledTastyVersion } from '../config.js';
import { replaceStringValue } from '../fix-utils.js';
import { parseValue } from '../parsers/index.js';
import type { ValueToken } from '../parsers/index.js';
import { splitTopLevelCommas } from '../parsers/utils.js';
import { COLOR_FUNCS } from '../parsers/value-parser.js';
import { stringStyleValueListeners } from '../style-values.js';

type MessageIds =
  | 'twoColorFill'
  | 'twoColorFillManual'
  | 'translucentMixPart'
  | 'useWeight';

/** The first `@tenphi/tasty` release that mixes comma-separated fill colors. */
const FILL_MIX_TASTY_VERSION = '3.15.0';

const FILL_PROPERTIES = new Set(['fill', 'backgroundColor']);

/** Color functions Tasty recognizes beyond the ones the parser classifies. */
const EXTRA_COLOR_FUNCS = new Set([
  'light-dark',
  'contrast-color',
  'okhsl',
  'okhst',
]);

/** Whether Tasty's parser takes this token for a color. */
function isColor(token: ValueToken): boolean {
  switch (token.type) {
    case 'color-token':
    case 'color-keyword':
      return true;
    case 'custom-prop':
      // `$name` is a color only when the name ends with `-color`.
      return token.name.endsWith('-color');
    case 'css-function': {
      const name = token.name.toLowerCase();
      return COLOR_FUNCS.has(name) || EXTRA_COLOR_FUNCS.has(name);
    }
    case 'group-expr':
      // A fallback chain such as `(#accent, #purple)`.
      return token.inner.includes('#');
    default:
      return false;
  }
}

/** `#clear` and its fades compile to `transparent`. */
function isClear(token: ValueToken): boolean {
  return (
    token.type === 'color-token' &&
    (token.raw === '#clear' || token.raw.startsWith('#clear.'))
  );
}

/**
 * The weight a `#name.N` fade stands for, written the way Tasty compiles the
 * opacity: `.04` is `4%`, `.5` is `50%`, `.$hover` is `($hover * 100%)`.
 */
function opacityWeight(opacity: string): string {
  if (opacity.startsWith('$')) return `(${opacity} * 100%)`;
  return `${Number((Number(`0.${opacity}`) * 100).toFixed(6))}%`;
}

/** A faded color token split into the color and the weight its opacity is. */
function splitFade(
  token: ValueToken,
): { color: string; weight: string } | null {
  if (token.type !== 'color-token' || token.opacity === undefined) return null;
  return {
    color: token.raw.slice(0, -(token.opacity.length + 1)),
    weight: opacityWeight(token.opacity),
  };
}

/**
 * The comma mix that paints what `'<base> <overlay>'` painted, or `null` when
 * the overlay's alpha is not written on it. Exact when the overlay token holds
 * an opaque color: drawing it at alpha `a` over the base is the base mixed with
 * it at weight `a` in sRGB, which is what Tasty compiles the mix to.
 */
function rewriteOverlay(base: string, overlay: ValueToken): string | null {
  if (isClear(overlay)) return base;

  const fade = splitFade(overlay);
  if (!fade) return null;
  if (fade.weight === '0%') return base;

  return `${fade.color} ${fade.weight}, ${base}`;
}

/** A token as written. */
function tokenText(token: ValueToken): string {
  return 'raw' in token ? token.raw : token.value;
}

export default createRule<[], MessageIds>({
  name: 'prefer-fill-mix',
  meta: {
    type: 'suggestion',
    fixable: 'code',
    hasSuggestions: true,
    docs: {
      description:
        "Replace deprecated space-separated two-color fills with a comma mix ('#dark 4%, #surface'), and catch mix parts weighted by their opacity",
    },
    messages: {
      twoColorFill:
        "Two space-separated colors in '{{property}}' are deprecated: the second is painted as a background-image layer that contrast checkers cannot read. Use '{{suggestion}}'.",
      twoColorFillManual:
        "Two space-separated colors in '{{property}}' are deprecated: the second is painted as a background-image layer that contrast checkers cannot read. Mix an opaque overlay color in by weight ('#overlay 4%, #base'), or use an opaque overlay alone.",
      translucentMixPart:
        "'{{part}}' is translucent and has no percentage, so its alpha weighs it down on top of its share of the mix and the background comes out see-through. Give it a weight instead: '{{suggestion}}'.",
      useWeight: "Use '{{suggestion}}'.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    // The comma mix is new syntax: rewriting to it for an older Tasty would
    // leave the fill showing only its first color.
    const tastyVersion = getInstalledTastyVersion(context.filename);
    if (
      !tastyVersion ||
      !semver.satisfies(tastyVersion, `>=${FILL_MIX_TASTY_VERSION}`)
    ) {
      return {};
    }

    const ctx = new TastyContext(context);

    function checkSpaceSeparated(
      tokens: ValueToken[],
      colorCount: number,
      node: TSESTree.Node,
      property: string,
    ): void {
      const suggestion =
        tokens.length === 2 && colorCount === 2
          ? rewriteOverlay(tokenText(tokens[0]), tokens[1])
          : null;

      if (suggestion === null) {
        context.report({
          node,
          messageId: 'twoColorFillManual',
          data: { property },
        });
        return;
      }

      context.report({
        node,
        messageId: 'twoColorFill',
        data: { property, suggestion },
        fix: (fixer) => replaceStringValue(fixer, node, suggestion),
      });
    }

    function checkMix(
      value: string,
      groups: ValueToken[][],
      node: TSESTree.Node,
    ): void {
      const parts = splitTopLevelCommas(value).map((part) => part.trim());

      for (const [i, tokens] of groups.entries()) {
        if (tokens.length !== 1) continue;

        const [token] = tokens;
        const other = parts[1 - i];
        let replacement: string | null = null;

        if (isClear(token)) {
          // A transparent color mixes in nothing.
          replacement = other;
        } else {
          const fade = splitFade(token);
          if (fade) {
            const weighted = [...parts];
            weighted[i] = `${fade.color} ${fade.weight}`;
            replacement = weighted.join(', ');
          }
        }

        if (replacement === null) continue;

        const suggestion = replacement;
        context.report({
          node,
          messageId: 'translucentMixPart',
          data: { part: parts[i], suggestion },
          suggest: [
            {
              messageId: 'useWeight',
              data: { suggestion },
              fix: (fixer) => replaceStringValue(fixer, node, suggestion),
            },
          ],
        });
        return;
      }
    }

    function checkValue(
      value: string,
      node: TSESTree.Node,
      property: string,
    ): void {
      const { groups } = parseValue(value);

      // Slash-separated parts mean nothing to `fill`; leave such values alone.
      if (groups.some((group) => group.parts.length !== 1)) return;
      const tokenGroups = groups.map((group) => group.parts[0].tokens);

      if (tokenGroups.length === 1) {
        const colorCount = tokenGroups[0].filter(isColor).length;
        if (colorCount >= 2) {
          checkSpaceSeparated(tokenGroups[0], colorCount, node, property);
        }
      } else if (tokenGroups.length === 2) {
        checkMix(value, tokenGroups, node);
      }
    }

    return stringStyleValueListeners(
      ctx,
      (value, node, property) => {
        if (FILL_PROPERTIES.has(property)) checkValue(value, node, property);
      },
      { requireTastyJSX: true },
    );
  },
});
