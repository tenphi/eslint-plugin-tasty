import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { getKeyName, getStringValue } from '../utils.js';

type MessageIds = 'invalidSyntax' | 'unknownProperty';

const CUSTOM_PROP_REGEX = /\$\$?[a-zA-Z][a-zA-Z0-9-]*/g;

interface PendingExistenceCheck {
  token: string;
  baseName: string;
  node: TSESTree.Node;
}

export default createRule<[], MessageIds>({
  name: 'valid-custom-property',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Validate $name custom property references',
    },
    messages: {
      invalidSyntax: "Invalid custom property syntax '{{token}}'.",
      unknownProperty: "Unknown custom property '{{token}}'.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);
    const fileCustomProperties = new Set<string>();
    const pendingChecks: PendingExistenceCheck[] = [];

    function collectLocalProperties(node: TSESTree.ObjectExpression): void {
      for (const prop of node.properties) {
        if (prop.type !== 'Property' || prop.computed) continue;
        const key = getKeyName(prop.key);
        if (key && key.startsWith('$') && !key.startsWith('$$')) {
          fileCustomProperties.add(key);
        }
      }
    }

    function checkValue(value: string, node: TSESTree.Node): void {
      if (ctx.config.tokens === false) return;

      let match;
      CUSTOM_PROP_REGEX.lastIndex = 0;

      while ((match = CUSTOM_PROP_REGEX.exec(value)) !== null) {
        const token = match[0];
        const baseName = token.startsWith('$$') ? '$' + token.slice(2) : token;

        pendingChecks.push({ token, baseName, node });
      }
    }

    function handleStyleObject(node: TSESTree.ObjectExpression) {
      if (!ctx.isStyleObject(node)) return;
      collectLocalProperties(node);

      for (const prop of node.properties) {
        if (prop.type !== 'Property') continue;

        const str = getStringValue(prop.value);
        if (str && str.includes('$')) {
          checkValue(str, prop.value);
        }

        if (prop.value.type === 'ObjectExpression') {
          for (const stateProp of prop.value.properties) {
            if (stateProp.type !== 'Property') continue;
            const stateStr = getStringValue(stateProp.value);
            if (stateStr && stateStr.includes('$')) {
              checkValue(stateStr, stateProp.value);
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

      'Program:exit'() {
        if (
          !Array.isArray(ctx.config.tokens) ||
          ctx.config.tokens.length === 0
        ) {
          return;
        }

        for (const { token, baseName, node } of pendingChecks) {
          if (fileCustomProperties.has(baseName)) continue;
          if (ctx.config.tokens.includes(baseName)) continue;

          context.report({
            node,
            messageId: 'unknownProperty',
            data: { token },
          });
        }
      },
    };
  },
});
