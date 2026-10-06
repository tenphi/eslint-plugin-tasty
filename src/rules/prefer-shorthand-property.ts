import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import type { StyleContext } from '../context.js';
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
function shorthandMapping(key: string, prop: TSESTree.Property) {
  const mapping = SHORTHAND_MAPPING[key];
  if (!mapping) return null;
  if (key !== 'fontFamily') return mapping;

  const value = getStringValue(prop.value)?.trim().toLowerCase();
  return value && CSS_WIDE_KEYWORDS.has(value)
    ? { ...mapping, property: 'preset', hint: `preset: '${value}'` }
    : mapping;
}

function tokenOverrideHint(
  key: string,
  property: string,
  styleCtx: StyleContext,
  isSubElement: boolean,
): string {
  const usesTokensProp = styleCtx.type === 'tasty';
  const original = styleCtx.isExtending
    ? usesTokensProp
      ? `base component's`
      : `base style definition's`
    : 'original';
  const warning = styleCtx.isExtending
    ? ''
    : ` Replacing '${property}' can reset its other values.`;
  const defaultHint =
    usesTokensProp && isSubElement
      ? ' Declare the default on the component root so this sub-element inherits the token.'
      : '';
  const dimension = /^(min|max)(Width|Height|BlockSize|InlineSize)$/.exec(key);

  if (dimension) {
    const token = `$${key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)}`;
    const values =
      dimension[1] === 'min'
        ? `${token} auto initial`
        : `initial auto ${token}`;
    const override = usesTokensProp
      ? `set tokens={{ '${token}': '20x' }}`
      : `set the '${token.replace('$', '--')}' CSS custom property on the target element to a CSS value (e.g. '160px')`;

    return `${warning} To override only '${key}', expose a token with a default in the ${original} '${property}' (e.g. ${property}: '${values}'), keep its other values, and ${override}.${defaultHint}`;
  }

  const override = usesTokensProp
    ? `set it via the 'tokens' prop`
    : 'set its CSS custom property on the target element';

  if (property === 'preset') {
    return `${warning} For independent typography overrides, use the CSS value tokens referenced by a named preset in the ${original} styles, keep its other values, and ${override}. Keep preset names and modifiers static.${defaultHint}`;
  }

  if (key === 'scrollbarWidth' || key === 'scrollbarGutter') {
    return `${warning} For independent overrides, expose the value as a token with a default in the ${original} '${key}' longhand, keep its other values, and ${override}. '${property}' width and gutter modifiers are static.${defaultHint}`;
  }

  return `${warning} For independent overrides, expose the part you need to change as a token with a default in the ${original} '${property}', keep its other values, and ${override}.${defaultHint}`;
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
        "When defining the complete style, prefer tasty shorthand '{{alternative}}' instead of '{{native}}'.{{overrideHint}}",
      preferShorthandExtending:
        "'{{native}}' changes one part of the base styles. '{{alternative}}' would replace the whole '{{property}}'.{{overrideHint}}",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    function handleStyleObject(node: TSESTree.ObjectExpression) {
      const styleCtx = ctx.getStyleContext(node);
      if (!styleCtx) return;
      const isSubElement = ctx.isInsideSubElement(node);

      for (const prop of node.properties) {
        if (prop.type !== 'Property' || prop.computed) continue;

        const key = getKeyName(prop.key);
        if (key === null) continue;

        const mapping = shorthandMapping(key, prop);
        if (mapping) {
          const hint = mapping.hint;
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
                overrideHint: tokenOverrideHint(
                  key,
                  mapping.property,
                  styleCtx,
                  isSubElement,
                ),
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
                : tokenOverrideHint(
                    key,
                    mapping.property,
                    styleCtx,
                    isSubElement,
                  ),
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
