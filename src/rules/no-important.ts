import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import { getStringValue } from '../utils.js';

type MessageIds = 'noImportant';

export default createRule<[], MessageIds>({
  name: 'no-important',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow !important in tasty style values',
    },
    messages: {
      noImportant:
        'Do not use !important in tasty styles. The tasty system manages specificity via doubled selectors and state ordering.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    function checkNode(node: TSESTree.Node): void {
      const str = getStringValue(node);
      if (str && str.includes('!important')) {
        context.report({ node, messageId: 'noImportant' });
      }
    }

    return {
      ImportDeclaration(node) {
        ctx.trackImport(node);
      },

      'CallExpression ObjectExpression'(node: TSESTree.ObjectExpression) {
        if (!ctx.isStyleObject(node)) return;

        for (const prop of node.properties) {
          if (prop.type !== 'Property') continue;

          checkNode(prop.value);

          if (prop.value.type === 'ObjectExpression') {
            for (const stateProp of prop.value.properties) {
              if (stateProp.type === 'Property') {
                checkNode(stateProp.value);
              }
            }
          }
        }
      },
    };
  },
});
