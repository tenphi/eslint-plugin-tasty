import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import { getKeyName, getStringValue } from '../utils.js';
import { validateStateDefinition } from '../parsers/state-key-parser.js';
import { BUILT_IN_STATE_PREFIXES } from '../constants.js';

type MessageIds = 'invalidKeyPrefix' | 'invalidDefinition';

export default createRule<[], MessageIds>({
  name: 'valid-state-definition',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Validate state definition values (the right-hand side of state aliases in configure() or tasty.config)',
    },
    messages: {
      invalidKeyPrefix:
        "State alias '{{key}}' must start with '@'.",
      invalidDefinition: '{{reason}}',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    function checkStateDefinitions(node: TSESTree.ObjectExpression): void {
      for (const prop of node.properties) {
        if (prop.type !== 'Property' || prop.computed) continue;

        const key = getKeyName(prop.key);
        if (key === null) continue;

        // Keys should start with @
        if (!key.startsWith('@')) {
          context.report({
            node: prop.key,
            messageId: 'invalidKeyPrefix',
            data: { key },
          });
          continue;
        }

        // Skip built-in prefixes — they're not aliases
        let isBuiltin = false;
        for (const prefix of BUILT_IN_STATE_PREFIXES) {
          if (key === prefix || key.startsWith(prefix + '(')) {
            isBuiltin = true;
            break;
          }
        }
        if (isBuiltin) continue;

        // Validate the value (the state definition expression)
        const value = getStringValue(prop.value);
        if (!value) continue;

        const result = validateStateDefinition(value);
        for (const error of result.errors) {
          context.report({
            node: prop.value,
            messageId: 'invalidDefinition',
            data: { reason: error.message },
          });
        }
      }
    }

    return {
      ImportDeclaration(node) {
        ctx.trackImport(node);
      },

      /**
       * Detect configure({ states: { ... } }) calls.
       */
      'CallExpression'(node: TSESTree.CallExpression) {
        if (node.callee.type !== 'Identifier') return;

        const imp = ctx.getImport(node.callee.name);
        if (!imp) return;

        // Only handle configure() calls
        if (imp.importedName !== 'configure') return;

        const arg = node.arguments[0];
        if (arg?.type !== 'ObjectExpression') return;

        for (const prop of arg.properties) {
          if (
            prop.type === 'Property' &&
            !prop.computed &&
            prop.key.type === 'Identifier' &&
            prop.key.name === 'states' &&
            prop.value.type === 'ObjectExpression'
          ) {
            checkStateDefinitions(prop.value);
          }
        }
      },
    };
  },
});
