import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import { stringStyleValueListeners } from '../style-values.js';
import {
  SEMANTIC_TRANSITIONS,
  KNOWN_CSS_PROPERTIES,
  TRANSITION_SEMANTIC_MAPPING,
} from '../constants.js';
import { replaceInStringValue } from '../fix-utils.js';
import { splitTopLevelCommas } from '../parsers/utils.js';

type MessageIds =
  | 'unknownTransition'
  | 'preferSemanticTransition'
  | 'useSemantic'
  | 'camelCaseTransition'
  | 'useKebabCase';

/**
 * `KNOWN_CSS_PROPERTIES` is keyed by camelCase style keys, but a `transition`
 * value names *CSS* properties, which are kebab-case (`text-decoration-color`).
 * Tasty emits an unmapped name verbatim into the CSS `transition`, so the
 * kebab form is the correct spelling — normalize before the lookup.
 */
function kebabToCamel(name: string): string {
  return name.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
}

/** `gridTemplateColumns` -> `grid-template-columns`. */
function camelToKebab(name: string): string {
  return name.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

/**
 * Tasty style names that `KNOWN_CSS_PROPERTIES` also lists, but that name no
 * property a browser implements. The `flow` style sets `flex-direction` /
 * `grid-auto-flow`, yet Tasty has no `flow` transition: it emits the name
 * verbatim (`transition: flow …`), which animates nothing.
 */
const NON_TRANSITION_STYLE_NAMES = new Set(['flow']);

export default createRule<[], MessageIds>({
  name: 'valid-transition',
  meta: {
    type: 'suggestion',
    hasSuggestions: true,
    docs: {
      description:
        'Validate transition property values use valid semantic transition names',
    },
    messages: {
      unknownTransition:
        "Unknown transition name '{{name}}'. Use a semantic name ({{known}}) or a CSS property name.",
      preferSemanticTransition:
        "Transition '{{native}}' has a Tasty semantic equivalent — use '{{semantic}}' instead.",
      useSemantic: "Use '{{semantic}}' instead of '{{native}}'",
      camelCaseTransition:
        "Transition '{{name}}' compiles to '{{lowered}}', which is not a CSS property. Use the CSS name '{{kebab}}'.",
      useKebabCase: "Use '{{kebab}}' instead of '{{name}}'",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    function checkTransitionValue(value: string, node: TSESTree.Node): void {
      const groups = splitTopLevelCommas(value);
      let offset = 0;

      for (const group of groups) {
        const parts = group.trim().split(/\s+/);
        if (parts.length === 0 || parts[0] === '') {
          offset += group.length + 1;
          continue;
        }

        const name = parts[0];

        // $$ prefix is always valid (custom property reference: $$name -> --name)
        if (name.startsWith('$$')) {
          offset += group.length + 1;
          continue;
        }

        // ## prefix is always valid (color property reference: ##name -> --name-color)
        if (name.startsWith('##')) {
          offset += group.length + 1;
          continue;
        }

        const start = offset + group.indexOf(name);
        const end = start + name.length;

        const semantic = TRANSITION_SEMANTIC_MAPPING[name];
        if (semantic) {
          context.report({
            node,
            messageId: 'preferSemanticTransition',
            data: { native: name, semantic },
            suggest: [
              {
                messageId: 'useSemantic',
                data: { native: name, semantic },
                fix(fixer) {
                  return replaceInStringValue(
                    fixer,
                    node,
                    [{ start, end, replacement: semantic }],
                    context.sourceCode,
                  );
                },
              },
            ],
          });
          offset += group.length + 1;
          continue;
        }

        // Tasty lowercases the name and emits it verbatim, so a camelCase CSS
        // property comes out as `gridtemplatecolumns`, which is no property.
        // Only the semantic names (`zIndex` -> `z-index`) are translated.
        if (
          /[A-Z]/.test(name) &&
          !SEMANTIC_TRANSITIONS.has(name) &&
          KNOWN_CSS_PROPERTIES.has(name)
        ) {
          const kebab = camelToKebab(name);
          const data = { name, lowered: name.toLowerCase(), kebab };
          context.report({
            node,
            messageId: 'camelCaseTransition',
            data,
            suggest: [
              {
                messageId: 'useKebabCase',
                data,
                fix(fixer) {
                  return replaceInStringValue(
                    fixer,
                    node,
                    [{ start, end, replacement: kebab }],
                    context.sourceCode,
                  );
                },
              },
            ],
          });
          offset += group.length + 1;
          continue;
        }

        if (
          NON_TRANSITION_STYLE_NAMES.has(name) ||
          (!SEMANTIC_TRANSITIONS.has(name) &&
            !KNOWN_CSS_PROPERTIES.has(name) &&
            !KNOWN_CSS_PROPERTIES.has(kebabToCamel(name)) &&
            !name.startsWith('--') &&
            name !== 'all' &&
            name !== 'none')
        ) {
          context.report({
            node,
            messageId: 'unknownTransition',
            data: {
              name,
              known: [...SEMANTIC_TRANSITIONS].join(', '),
            },
          });
        }

        offset += group.length + 1;
      }
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
