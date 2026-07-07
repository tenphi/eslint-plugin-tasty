import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { getStringValue } from '../utils.js';
import { replaceStringValue } from '../fix-utils.js';

type MessageIds = 'noImportant';

export default createRule<[], MessageIds>({
  name: 'no-important',
  meta: {
    type: 'problem',
    fixable: 'code',
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
        const stripped = str.replace(/\s*!important\s*/g, '').trim();
        context.report({
          node,
          messageId: 'noImportant',
          fix(fixer) {
            return replaceStringValue(fixer, node, stripped);
          },
        });
      }
    }

    function handleStyleObject(node: TSESTree.ObjectExpression) {
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
    }

    return {
      ImportDeclaration(node) {
        ctx.trackImport(node);
      },
      ...styleObjectListeners(handleStyleObject),
    };
  },
});
