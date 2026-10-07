import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import { stringStyleValueListeners } from '../style-values.js';
import { getStringValue } from '../utils.js';
import { replaceInStringValue } from '../fix-utils.js';
import { maskValueLiterals } from '../value-words.js';

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
      if (!str) return;
      const masked = maskValueLiterals(str);
      const edits = [...masked.matchAll(/!important\b(?!-)/gi)].map((match) => {
        let start = match.index;
        while (start > 0 && /\s/.test(str[start - 1])) start--;
        return { start, end: match.index + match[0].length, replacement: '' };
      });
      if (!edits.length) return;
      context.report({
        node,
        messageId: 'noImportant',
        fix: (fixer) =>
          replaceInStringValue(fixer, node, edits, context.sourceCode),
      });
    }

    return stringStyleValueListeners(ctx, (_value, node) => {
      checkNode(node);
    });
  },
});
