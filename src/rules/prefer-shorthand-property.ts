import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { getKeyName, getStringValue } from '../utils.js';
import { SHORTHAND_MAPPING } from '../constants.js';

type MessageIds = 'preferShorthand';

const CSS_WIDE_KEYWORDS = new Set([
  'inherit',
  'initial',
  'unset',
  'revert',
  'revert-layer',
]);

/**
 * `font` resolves to `<value>, var(--font-sans, var(--font-sans-fallback))`,
 * so it cannot express a CSS-wide keyword — `font: 'inherit'` emits
 * `font-family: inherit, …`, which is invalid and drops the inherit.
 *
 * `preset` is the property that handles these: a CSS-wide keyword used as the
 * preset name short-circuits token lookup and is emitted verbatim across the
 * whole typography group, so `preset: 'inherit'` yields a real
 * `font-family: inherit`. Point at that instead of `font`.
 */
function shorthandHint(key: string, prop: TSESTree.Property): string | null {
  const mapping = SHORTHAND_MAPPING[key];
  if (!mapping) return null;
  if (key !== 'fontFamily') return mapping.hint;

  const value = getStringValue(prop.value)?.trim().toLowerCase();
  return value && CSS_WIDE_KEYWORDS.has(value)
    ? `preset: '${value}'`
    : mapping.hint;
}

export default createRule<[], MessageIds>({
  name: 'prefer-shorthand-property',
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description:
        'Suggest tasty shorthand when a native CSS property with a tasty alternative is used',
    },
    messages: {
      preferShorthand:
        "Prefer tasty shorthand '{{alternative}}' instead of '{{native}}'.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    function handleStyleObject(node: TSESTree.ObjectExpression) {
      if (!ctx.isStyleObject(node)) return;

      for (const prop of node.properties) {
        if (prop.type !== 'Property' || prop.computed) continue;

        const key = getKeyName(prop.key);
        if (key === null) continue;

        const mapping = SHORTHAND_MAPPING[key];
        const hint = shorthandHint(key, prop);
        if (mapping && hint) {
          context.report({
            node: prop.key,
            messageId: 'preferShorthand',
            data: { native: key, alternative: hint },
            fix(fixer) {
              // Only auto-fix the carry-over subset where the value passes
              // through unchanged (e.g. backgroundColor → fill, borderRadius →
              // radius). Directional / min/max / border-* renames change
              // semantics and stay report-only.
              if (!mapping.safeFix) return null;
              return fixer.replaceText(prop.key, mapping.property);
            },
          });
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
