import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { RENAMED_SPECIAL_STYLE_KEYS } from '../constants.js';
import { getKeyName, getStringValue } from '../utils.js';

type MessageIds =
  | 'stateKeyAtTopLevel'
  | 'invalidKeyframesStructure'
  | 'invalidPropertiesStructure'
  | 'invalidFontFaceStructure'
  | 'invalidCounterStyleStructure'
  | 'invalidFunctionStructure'
  | 'renamedSpecialKey'
  | 'recipeNotString';

/**
 * Whether an at-rule value is *definitely* not the descriptor object it must be.
 *
 * Only literal shapes are conclusive. An identifier, member expression, or call
 * can perfectly well evaluate to an object — `'@font-face': fontFaceMap` is valid
 * — so anything the plugin cannot see into is left alone.
 */
function isDefinitelyNotAnObject(node: TSESTree.Node): boolean {
  let current = node;

  // Look through `as` / `satisfies` wrappers.
  while (
    current.type === 'TSAsExpression' ||
    current.type === 'TSSatisfiesExpression' ||
    current.type === 'TSNonNullExpression'
  ) {
    current = current.expression;
  }

  return (
    current.type === 'Literal' ||
    current.type === 'TemplateLiteral' ||
    current.type === 'ArrayExpression'
  );
}

export default createRule<[], MessageIds>({
  name: 'valid-styles-structure',
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description:
        'Validate overall structure of styles object passed to tasty APIs',
    },
    messages: {
      stateKeyAtTopLevel:
        "State key '{{key}}' at top level is not valid. State maps belong inside property values, not at the root of the styles object.",
      invalidKeyframesStructure:
        '@keyframes value must be an object of { name: { step: styles } }.',
      invalidPropertiesStructure:
        "'@property' value must be an object of { name: { syntax, inherits, initialValue } }.",
      invalidFontFaceStructure:
        "'@font-face' value must be an object of { familyName: descriptors | descriptors[] }.",
      invalidCounterStyleStructure:
        "'@counter-style' value must be an object of { name: descriptors }.",
      invalidFunctionStructure:
        "'@function' value must be an object of { '$$name': { args, result } }.",
      renamedSpecialKey:
        "'{{oldKey}}' was renamed to '{{newKey}}' in Tasty v3 — at-rule keys now match the CSS at-rule names Tasty emits.",
      recipeNotString: "'recipe' value must be a string.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    const STATE_KEY_PATTERNS = [
      /^:/, // pseudo-class
      /^\./, // class selector
      /^\[/, // attribute selector
    ];

    function looksLikeStateKey(key: string): boolean {
      // '' default and '_' fallback floor are state-map keys, never top-level.
      if (key === '' || key === '_') return true;
      return STATE_KEY_PATTERNS.some((p) => p.test(key));
    }

    function handleStyleObject(node: TSESTree.ObjectExpression) {
      if (!ctx.isStyleObject(node)) return;

      for (const prop of node.properties) {
        if (prop.type !== 'Property' || prop.computed) continue;

        const key = getKeyName(prop.key);
        if (key === null) continue;

        // Check for state keys at top level (common mistake)
        if (looksLikeStateKey(key)) {
          context.report({
            node: prop.key,
            messageId: 'stateKeyAtTopLevel',
            data: { key },
          });
          continue;
        }

        // Report the v2 camelCase at-rule spellings, with a fix.
        const renamedTo = key ? RENAMED_SPECIAL_STYLE_KEYS[key] : undefined;
        if (renamedTo) {
          const keyNode = prop.key;
          context.report({
            node: keyNode,
            messageId: 'renamedSpecialKey',
            data: { oldKey: key, newKey: renamedTo },
            fix(fixer) {
              // Always emit a quoted key: the new spellings are kebab-case and so
              // are not valid bare identifiers.
              const quote =
                keyNode.type === 'Literal' &&
                typeof keyNode.raw === 'string' &&
                keyNode.raw.startsWith('"')
                  ? '"'
                  : "'";

              return fixer.replaceText(keyNode, `${quote}${renamedTo}${quote}`);
            },
          });
          continue;
        }

        // Validate @keyframes structure
        if (key === '@keyframes') {
          if (isDefinitelyNotAnObject(prop.value)) {
            context.report({
              node: prop.value,
              messageId: 'invalidKeyframesStructure',
            });
          }
          continue;
        }

        // Validate @property structure
        if (key === '@property') {
          if (isDefinitelyNotAnObject(prop.value)) {
            context.report({
              node: prop.value,
              messageId: 'invalidPropertiesStructure',
            });
          }
          continue;
        }

        // Validate @font-face structure
        if (key === '@font-face') {
          if (isDefinitelyNotAnObject(prop.value)) {
            context.report({
              node: prop.value,
              messageId: 'invalidFontFaceStructure',
            });
          }
          continue;
        }

        // Validate @counter-style structure
        if (key === '@counter-style') {
          if (isDefinitelyNotAnObject(prop.value)) {
            context.report({
              node: prop.value,
              messageId: 'invalidCounterStyleStructure',
            });
          }
          continue;
        }

        // Validate @function structure
        if (key === '@function') {
          if (isDefinitelyNotAnObject(prop.value)) {
            context.report({
              node: prop.value,
              messageId: 'invalidFunctionStructure',
            });
          }
          continue;
        }

        // Validate recipe is a string
        if (key === 'recipe') {
          const str = getStringValue(prop.value);
          if (str === null && prop.value.type !== 'Literal') {
            // Allow string literals, template literals without expressions
            if (
              prop.value.type !== 'TemplateLiteral' ||
              prop.value.expressions.length > 0
            ) {
              context.report({
                node: prop.value,
                messageId: 'recipeNotString',
              });
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
