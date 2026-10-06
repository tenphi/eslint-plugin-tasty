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

function tokenOverrideHint(
  key: string,
  property: string,
  isExtending: boolean,
): string {
  const original = isExtending ? `base component's` : 'original';
  const warning = isExtending
    ? ''
    : ` Replacing '${property}' can reset its other values.`;
  const dimension = /^(min|max)(Width|Height|BlockSize|InlineSize)$/.exec(key);

  if (dimension) {
    const token = `$${key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)}`;
    const values =
      dimension[1] === 'min' ? `${token} auto 100%` : `0 auto ${token}`;

    return `${warning} To override only '${key}', expose a token with a default in the ${original} '${property}' (e.g. ${property}: '${values}'), keep its other values, and set tokens={{ '${token}': '20x' }}.`;
  }

  return `${warning} For independent overrides, expose the part you need to change as a token with a default in the ${original} '${property}', keep its other values, and set it via the 'tokens' prop.`;
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
        "Prefer tasty shorthand '{{alternative}}' instead of '{{native}}'.{{overrideHint}}",
      preferShorthandExtending:
        "'{{native}}' patches the base component's '{{property}}' from an extension layer. '{{alternative}}' would replace the whole '{{property}}'.{{overrideHint}}",
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
            // The token seam has to be added to the base component's own
            // definition, so the suggestion is only actionable when that file
            // belongs to this project. Over an imported base — a UI kit, say —
            // the author's remaining options are the longhand they already
            // wrote or a rewrite that would clobber the base, and a warning
            // recommending neither is just noise. `ownedSources` opts a
            // published-from-this-monorepo design system back in.
            if (!ctx.isOwnedComponent(styleCtx.baseComponent)) continue;

            context.report({
              node: prop.key,
              messageId: 'preferShorthandExtending',
              data: {
                native: key,
                alternative: hint,
                property: mapping.property,
                overrideHint: tokenOverrideHint(key, mapping.property, true),
              },
            });

            continue;
          }

          context.report({
            node: prop.key,
            messageId: 'preferShorthand',
            data: {
              native: key,
              alternative: hint,
              overrideHint: mapping.safeFix
                ? ''
                : tokenOverrideHint(key, mapping.property, false),
            },
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
