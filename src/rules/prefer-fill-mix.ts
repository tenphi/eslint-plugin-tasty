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
  | 'useWeight'
  | 'commaMix'
  | 'commaMixManual'
  | 'translucentCommaMix'
  | 'useCompound';

/** The first `@tenphi/tasty` release that mixes comma-separated fill colors. */
const FILL_MIX_TASTY_VERSION = '3.15.0';

/**
 * The first `@tenphi/tasty` release with compound colors (`'#surface+#dark.04'`),
 * which replace both two-color fills.
 */
const COMPOUND_COLOR_TASTY_VERSION = '3.16.0';

const FILL_PROPERTIES = new Set(['fill', 'backgroundColor']);

/** Color functions Tasty recognizes beyond the ones the parser classifies. */
const EXTRA_COLOR_FUNCS = new Set([
  'light-dark',
  'contrast-color',
  'okhsl',
  'okhst',
]);

/** A color token, optionally faded: one operand of a compound color. */
const RE_LAYER_OPERAND = /^#[a-z0-9-]+(?:\.(?:\$[a-z_][a-z0-9-_]*|[0-9]+))?$/i;

/** The weight `#name.$prop` compiles to: `($prop * 100%)`. */
const RE_PROP_WEIGHT = /^\(\s*(\$[a-z_][a-z0-9-_]*)\s*\*\s*100%\s*\)$/i;

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

/** Whether a color can be the base of a compound: a token, or a compound. */
function isCompoundBase(color: string): boolean {
  return color.split('+').every((operand) => RE_LAYER_OPERAND.test(operand));
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
): { color: string; opacity: string; weight: string } | null {
  if (token.type !== 'color-token' || token.opacity === undefined) return null;
  return {
    color: token.raw.slice(0, -(token.opacity.length + 1)),
    opacity: token.opacity,
    weight: opacityWeight(token.opacity),
  };
}

/**
 * The opacity suffix a mix weight stands for, the inverse of
 * {@link opacityWeight}: `4%` is `04`, `4.5%` is `045`, `($hover * 100%)` is
 * `$hover`. Built from the digits, so no float artifact creeps in. `null` when
 * the weight has no suffix, such as a `$prop` holding a percentage, or is not
 * strictly between 0% and 100%.
 */
function weightToOpacity(weight: ValueToken): string | null {
  if (weight.type === 'group-expr') {
    return weight.raw.match(RE_PROP_WEIGHT)?.[1] ?? null;
  }
  if (weight.type !== 'css-unit' || weight.unit !== '%') return null;
  if (!(weight.value > 0 && weight.value < 100)) return null;

  const [int, frac = ''] = weight.raw.slice(0, -1).split('.');
  const digits = (int.padStart(2, '0').slice(-2) + frac).replace(/0+$/, '');
  return digits || null;
}

/**
 * `color` painted over `base` at an opacity, as one color: a compound when
 * `base` can be one, and `color-mix()` itself otherwise. Both compile to the
 * same mix, `color-mix(in srgb, <color> <weight>, <base>)`.
 */
function layerOver(
  base: string,
  fade: { color: string; opacity: string; weight: string },
): string {
  return isCompoundBase(base)
    ? `${base}+${fade.color}.${fade.opacity}`
    : `color-mix(in srgb, ${fade.color} ${fade.weight}, ${base})`;
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

/**
 * The compound color that paints what `'<base> <overlay>'` painted, or `null`
 * when the overlay's alpha is not written on it. The same exact rewrite as
 * {@link rewriteOverlay}, a `+` where the space was.
 */
function rewriteOverlayAsCompound(
  base: string,
  overlay: ValueToken,
): string | null {
  if (isClear(overlay)) return base;

  const fade = splitFade(overlay);
  if (!fade) return null;
  if (fade.weight === '0%') return base;

  return layerOver(base, fade);
}

/**
 * The color a two-part comma mix is, written without the comma. A token with a
 * weight its opacity suffix can hold is layered over the other part, as a
 * compound; any other mix is the same parts in `color-mix()` itself.
 */
function rewriteMix(parts: string[], groups: ValueToken[][]): string {
  for (const [i, tokens] of groups.entries()) {
    const [color, weight] = tokens;
    const base = parts[1 - i];
    if (
      tokens.length !== 2 ||
      color.type !== 'color-token' ||
      color.opacity !== undefined ||
      color.raw.includes('+') ||
      groups[1 - i].length !== 1 ||
      !isCompoundBase(base)
    ) {
      continue;
    }

    // A compound leaves out a transparent layer, while the mix lets it thin
    // out the other color: `#clear 10%, #surface` is 90% opaque.
    if (isClear(color)) break;

    // A weight of nothing or of everything leaves one of the colors.
    if (weight.type === 'css-unit' && weight.unit === '%') {
      if (weight.value === 0) return base;
      if (weight.value === 100) return color.raw;
    }

    const opacity = weightToOpacity(weight);
    if (opacity !== null) return `${base}+${color.raw}.${opacity}`;
  }

  return `color-mix(in srgb, ${parts.join(', ')})`;
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
        "Replace deprecated two-color fills with a compound color ('#surface+#dark.04'), or with a comma mix before Tasty 3.16, and catch mix parts weighted by their opacity",
    },
    messages: {
      twoColorFill:
        "Two space-separated colors in '{{property}}' are deprecated: the second is painted as a background-image layer that contrast checkers cannot read. Use '{{suggestion}}'.",
      twoColorFillManual:
        "Two space-separated colors in '{{property}}' are deprecated: the second is painted as a background-image layer that contrast checkers cannot read. {{advice}}",
      translucentMixPart:
        "'{{part}}' is translucent and has no percentage, so its alpha weighs it down on top of its share of the mix and the background comes out see-through. Give it a weight instead: '{{suggestion}}'.",
      useWeight: "Use '{{suggestion}}'.",
      commaMix:
        "Mixing '{{property}}' colors with a comma is deprecated: a compound color or color-mix() is the same color, and works in every color slot. Use '{{suggestion}}'.",
      commaMixManual:
        "Mixing '{{property}}' colors with a comma is deprecated, and Tasty mixes only the first two. Layer the colors as a compound color ('#base+#overlay.04'), or write color-mix() itself.",
      translucentCommaMix:
        "Mixing '{{property}}' colors with a comma is deprecated, and '{{part}}' is translucent and has no percentage, so its alpha weighs it down on top of its share of the mix and the background comes out see-through. To paint it over the other color, use '{{suggestion}}'.",
      useCompound: "Use '{{suggestion}}'.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    // The comma mix and compound colors are new syntax: rewriting to them for
    // an older Tasty would leave the fill showing only its first color.
    const tastyVersion = getInstalledTastyVersion(context.filename);
    if (
      !tastyVersion ||
      !semver.satisfies(tastyVersion, `>=${FILL_MIX_TASTY_VERSION}`)
    ) {
      return {};
    }
    const compound = semver.satisfies(
      tastyVersion,
      `>=${COMPOUND_COLOR_TASTY_VERSION}`,
    );

    const ctx = new TastyContext(context);

    function checkSpaceSeparated(
      tokens: ValueToken[],
      colorCount: number,
      node: TSESTree.Node,
      property: string,
    ): void {
      const rewrite = compound ? rewriteOverlayAsCompound : rewriteOverlay;
      const suggestion =
        tokens.length === 2 && colorCount === 2
          ? rewrite(tokenText(tokens[0]), tokens[1])
          : null;

      if (suggestion === null) {
        context.report({
          node,
          messageId: 'twoColorFillManual',
          data: {
            property,
            advice: compound
              ? "Layer an opaque overlay color with its opacity ('#base+#overlay.04'), or use an opaque overlay alone."
              : "Mix an opaque overlay color in by weight ('#overlay 4%, #base'), or use an opaque overlay alone.",
          },
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

    /**
     * The fix for a mix part that is translucent and has no weight, or `null`
     * when neither part is. Each part without a weight takes half the mix, so
     * such a part is weighed down twice, and the result is see-through.
     */
    function translucentPart(
      parts: string[],
      groups: ValueToken[][],
    ): { part: string; suggestion: string } | null {
      for (const [i, tokens] of groups.entries()) {
        if (tokens.length !== 1) continue;

        const [token] = tokens;
        const other = parts[1 - i];

        // A transparent color mixes in nothing.
        if (isClear(token)) return { part: parts[i], suggestion: other };

        const fade = splitFade(token);
        if (!fade) continue;

        let suggestion: string;
        if (compound) {
          if (fade.weight === '0%')
            return { part: parts[i], suggestion: other };
          suggestion = layerOver(other, fade);
        } else {
          const weighted = [...parts];
          weighted[i] = `${fade.color} ${fade.weight}`;
          suggestion = weighted.join(', ');
        }
        return { part: parts[i], suggestion };
      }

      return null;
    }

    function checkMix(
      value: string,
      groups: ValueToken[][],
      node: TSESTree.Node,
      property: string,
    ): void {
      const parts = splitTopLevelCommas(value).map((part) => part.trim());

      // Opposite a weighted part, a faded one is only the base of a layer.
      const translucent = groups.every((tokens) => tokens.length === 1)
        ? translucentPart(parts, groups)
        : null;

      // A rewrite here changes what renders, so it is only suggested.
      if (translucent) {
        const { part, suggestion } = translucent;
        context.report({
          node,
          messageId: compound ? 'translucentCommaMix' : 'translucentMixPart',
          data: { property, part, suggestion },
          suggest: [
            {
              messageId: compound ? 'useCompound' : 'useWeight',
              data: { suggestion },
              fix: (fixer) => replaceStringValue(fixer, node, suggestion),
            },
          ],
        });
        return;
      }

      if (!compound) return;

      const suggestion = rewriteMix(parts, groups);
      context.report({
        node,
        messageId: 'commaMix',
        data: { property, suggestion },
        fix: (fixer) => replaceStringValue(fixer, node, suggestion),
      });
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
        checkMix(value, tokenGroups, node, property);
      } else if (compound && tokenGroups.length > 2) {
        context.report({
          node,
          messageId: 'commaMixManual',
          data: { property },
        });
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
