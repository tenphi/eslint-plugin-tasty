import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import {
  getKeyName,
  getStringValue,
  validateColorTokenSyntax,
  isRawHexColor,
} from '../utils.js';

type MessageIds = 'invalidSyntax' | 'unknownToken';

export default createRule<[], MessageIds>({
  name: 'valid-color-token',
  meta: {
    type: 'problem',
    docs: {
      description: 'Validate color token syntax and existence',
    },
    messages: {
      invalidSyntax: "Invalid color token '{{token}}': {{reason}}.",
      unknownToken: "Unknown color token '{{token}}'.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);
    const fileColorTokens = new Set<string>();

    function collectLocalTokens(node: TSESTree.ObjectExpression): void {
      for (const prop of node.properties) {
        if (prop.type !== 'Property' || prop.computed) continue;
        const key = getKeyName(prop.key);
        if (key && key.startsWith('#') && !key.startsWith('##')) {
          fileColorTokens.add(key);
        }
      }
    }

    function checkColorTokensInValue(value: string, node: TSESTree.Node): void {
      // Match color token references: #name or #name.N or ##name
      const tokenRegex = /##?[a-zA-Z][a-zA-Z0-9-]*(?:\.\$?[a-zA-Z0-9-]+)?/g;
      let match;

      while ((match = tokenRegex.exec(value)) !== null) {
        const token = match[0];

        // Skip raw hex colors
        if (isRawHexColor(token)) continue;

        // Check syntax
        const syntaxError = validateColorTokenSyntax(token);
        if (syntaxError) {
          context.report({
            node,
            messageId: 'invalidSyntax',
            data: { token, reason: syntaxError },
          });
          continue;
        }

        // Check existence (if tokens config is not false)
        if (ctx.config.tokens === false) continue;

        const baseName = token.startsWith('##')
          ? '#' + token.slice(2).split('.')[0]
          : '#' + token.slice(1).split('.')[0];

        if (baseName === '#current') continue;

        if (
          !fileColorTokens.has(baseName) &&
          !(
            Array.isArray(ctx.config.tokens) &&
            ctx.config.tokens.includes(baseName)
          )
        ) {
          // Only warn if config.tokens is a non-empty array
          if (
            Array.isArray(ctx.config.tokens) &&
            ctx.config.tokens.length > 0
          ) {
            context.report({
              node,
              messageId: 'unknownToken',
              data: { token },
            });
          }
        }
      }
    }

    return {
      ImportDeclaration(node) {
        ctx.trackImport(node);
      },

      'CallExpression ObjectExpression'(node: TSESTree.ObjectExpression) {
        if (!ctx.isStyleObject(node)) return;
        collectLocalTokens(node);

        for (const prop of node.properties) {
          if (prop.type !== 'Property') continue;

          // Check string values for color tokens
          if (prop.value.type === 'Literal') {
            const str = getStringValue(prop.value);
            if (str && str.includes('#')) {
              checkColorTokensInValue(str, prop.value);
            }
          }

          // Check state map values
          if (prop.value.type === 'ObjectExpression') {
            for (const stateProp of prop.value.properties) {
              if (stateProp.type !== 'Property') continue;
              const str = getStringValue(stateProp.value);
              if (str && str.includes('#')) {
                checkColorTokensInValue(str, stateProp.value);
              }
            }
          }
        }
      },
    };
  },
});
