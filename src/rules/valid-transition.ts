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

type MessageIds =
  | 'unknownTransition'
  | 'preferSemanticTransition'
  | 'useSemantic';

/**
 * `KNOWN_CSS_PROPERTIES` is keyed by camelCase style keys, but a `transition`
 * value names *CSS* properties, which are kebab-case (`text-decoration-color`).
 * Tasty emits an unmapped name verbatim into the CSS `transition`, so the
 * kebab form is the correct spelling — normalize before the lookup.
 */
function kebabToCamel(name: string): string {
  return name.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
}

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
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    function checkTransitionValue(value: string, node: TSESTree.Node): void {
      const groups = value.split(',');
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

        const semantic = TRANSITION_SEMANTIC_MAPPING[name];
        if (semantic) {
          const nameStartInGroup = group.indexOf(name);
          const start = offset + nameStartInGroup;
          const end = start + name.length;
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

        if (
          !SEMANTIC_TRANSITIONS.has(name) &&
          !KNOWN_CSS_PROPERTIES.has(name) &&
          !KNOWN_CSS_PROPERTIES.has(kebabToCamel(name)) &&
          !name.startsWith('--') &&
          name !== 'all' &&
          name !== 'none'
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
