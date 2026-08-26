import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { getKeyName, getStringValue } from '../utils.js';
import { SHORTHAND_MAPPING } from '../constants.js';

type MessageIds = 'preferShorthand' | 'preferShorthandExtending';

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
      preferShorthandExtending:
        "'{{native}}' patches the base component's '{{property}}' from an extension layer. Expose a token in the base's '{{property}}' — e.g. padding: '$v-padding $h-padding' — and set it from here; '{{alternative}}' would replace the whole '{{property}}'.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    function handleStyleObject(node: TSESTree.ObjectExpression) {
      const styleCtx = ctx.getStyleContext(node);
      if (!styleCtx) return;

      for (const prop of node.properties) {
        if (prop.type !== 'Property' || prop.computed) continue;

        const key = getKeyName(prop.key);
        if (key === null) continue;

        const mapping = SHORTHAND_MAPPING[key];
        const hint = shorthandHint(key, prop);
        if (mapping && hint) {
          // An extension layer merges per key, so renaming the key replaces the
          // base component's whole `mapping.property` instead of patching the
          // one part written here — `paddingTop: '2x'` -> `padding: '2x top'`
          // drops the base's other three edges to 0. The token seam belongs in
          // the base component, which is another file and may not even be the
          // author's to edit, so this stays a report with no fix.
          if (styleCtx.isExtending) {
            context.report({
              node: prop.key,
              messageId: 'preferShorthandExtending',
              data: {
                native: key,
                alternative: hint,
                property: mapping.property,
              },
            });

            continue;
          }

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
