import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { getKeyName, getStringValue } from '../utils.js';
import { parseStateKey } from '../parsers/state-key-parser.js';
import type { StateKeyParserOptions } from '../parsers/state-key-parser.js';

type MessageIds = 'invalidStateKey' | 'ownOutsideSubElement' | 'unknownAlias';

export default createRule<[], MessageIds>({
  name: 'valid-state-key',
  meta: {
    type: 'problem',
    docs: {
      description: 'Validate state key syntax in style mapping objects',
    },
    messages: {
      invalidStateKey: '{{reason}}',
      ownOutsideSubElement:
        '@own() can only be used inside sub-element styles.',
      unknownAlias:
        "Unknown state alias '{{alias}}'. Configured aliases: {{known}}.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    const parserOpts: StateKeyParserOptions = {
      knownAliases: ctx.config.states,
    };

    function isInsideSubElement(node: TSESTree.Node): boolean {
      let current: TSESTree.Node | undefined = node.parent;
      while (current) {
        if (
          current.type === 'Property' &&
          !current.computed &&
          current.key.type === 'Identifier' &&
          /^[A-Z]/.test(current.key.name)
        ) {
          return true;
        }
        current = current.parent;
      }
      return false;
    }

    function checkStateKey(
      key: string,
      keyNode: TSESTree.Node,
      insideSubElement: boolean,
    ): void {
      if (key === '') return;

      const result = parseStateKey(key, parserOpts);

      // Report all parse/validation errors
      for (const error of result.errors) {
        context.report({
          node: keyNode,
          messageId: 'invalidStateKey',
          data: { reason: error.message },
        });
      }

      // Check @own usage outside sub-element
      if (result.hasOwn && !insideSubElement) {
        context.report({
          node: keyNode,
          messageId: 'ownOutsideSubElement',
        });
      }

      // Check aliases against config
      if (ctx.config.states.length > 0) {
        for (const alias of result.referencedAliases) {
          if (!ctx.config.states.includes(alias)) {
            context.report({
              node: keyNode,
              messageId: 'unknownAlias',
              data: {
                alias,
                known: ctx.config.states.join(', '),
              },
            });
          }
        }
      }
    }

    function handleStyleObject(node: TSESTree.ObjectExpression) {
      if (!ctx.isStyleObject(node)) return;

      const insideSubElement = isInsideSubElement(node);

      for (const prop of node.properties) {
        if (prop.type !== 'Property' || prop.computed) continue;

        const key = getKeyName(prop.key);
        if (key === null) continue;

        if (/^[A-Z]/.test(key) || key.startsWith('@') || key.startsWith('&'))
          continue;

        if (prop.value.type !== 'ObjectExpression') continue;

        for (const stateProp of prop.value.properties) {
          if (stateProp.type !== 'Property') continue;

          const stateKey = !stateProp.computed
            ? getKeyName(stateProp.key)
            : getStringValue(stateProp.key);
          if (stateKey === null) continue;

          checkStateKey(stateKey, stateProp.key, insideSubElement);
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
