import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import { stringStyleValueListeners } from '../style-values.js';
import {
  getKeyName,
  validateColorTokenSyntax,
  isRawHexColor,
} from '../utils.js';
import { scanValueWords } from '../value-words.js';

type MessageIds = 'invalidSyntax' | 'unknownToken';

interface PendingExistenceCheck {
  token: string;
  baseName: string;
  node: TSESTree.Node;
}

export default createRule<[], MessageIds>({
  name: 'valid-color-token',
  meta: {
    type: 'problem',
    docs: {
      description: 'Validate color token syntax and existence',
    },
    messages: {
      invalidSyntax: "Invalid color token '{{token}}': {{reason}}.",
      unknownToken:
        "Unknown color token '{{token}}'. Declare it as a '#name' key, or add it to 'tokens' in your tasty config.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);
    const fileColorTokens = new Set<string>();
    const pendingChecks: PendingExistenceCheck[] = [];

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
      for (const word of scanValueWords(value)) {
        const token = word.value;
        if (!token.startsWith('#')) continue;
        if (
          token.startsWith('##') &&
          word.isFunction &&
          value[word.offset + token.length] === '('
        )
          continue;

        if (isRawHexColor(token)) continue;

        const syntaxError = validateColorTokenSyntax(token);
        if (syntaxError) {
          context.report({
            node,
            messageId: 'invalidSyntax',
            data: { token, reason: syntaxError },
          });
          continue;
        }

        if (ctx.config.tokens === false) continue;

        const baseName = token.startsWith('##')
          ? '#' + token.slice(2).split('.')[0]
          : '#' + token.slice(1).split('.')[0];

        if (baseName === '#current') continue;

        pendingChecks.push({ token, baseName, node });
      }
    }

    return {
      ...stringStyleValueListeners(
        ctx,
        (value, node) => {
          checkColorTokensInValue(value, node);
        },
        { onStyleObject: collectLocalTokens },
      ),

      'Program:exit'() {
        if (
          !Array.isArray(ctx.config.tokens) ||
          ctx.config.tokens.length === 0
        ) {
          return;
        }

        for (const { token, baseName, node } of pendingChecks) {
          if (fileColorTokens.has(baseName)) continue;
          if (ctx.config.tokens.includes(baseName)) continue;

          context.report({
            node,
            messageId: 'unknownToken',
            data: { token },
          });
        }
      },
    };
  },
});
