import type { TSESTree } from '@typescript-eslint/utils';
import selectorParser from 'postcss-selector-parser';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { replaceInStringValue, type StringEdit } from '../fix-utils.js';
import { getKeyName, getStringValue, unwrapExpression } from '../utils.js';

function elementEdits(selector: string, owner: string): StringEdit[] {
  // Tasty's affix tokenizer does not implement the full CSS grammar. Keep
  // escapes, comments and functional pseudo arguments out of this rewrite.
  if (selector.includes('\\') || selector.includes('/*')) return [];
  try {
    const root = selectorParser().astSync(selector);
    const edits: StringEdit[] = [];
    for (const branch of root.nodes) {
      if (
        branch.nodes.some((node, index) => {
          switch (node.type) {
            case 'nesting':
              return index !== 0;
            case 'tag':
              return !/^[A-Za-z][a-zA-Z0-9-]*$/.test(node.value);
            case 'combinator':
              return !/^(?:\s+|[>+~])$/.test(node.value);
            case 'attribute':
              return node.toString().includes(',');
            case 'class':
            case 'universal':
              return false;
            default:
              return true;
          }
        })
      )
        continue;

      for (const [index, node] of branch.nodes.entries()) {
        if (node.type !== 'attribute') continue;
        const previous = branch.nodes[index - 1];
        // Uppercase names insert a separator. Attributes within a compound
        // (including whitespace that Tasty ignores) must remain attributes.
        if (
          previous &&
          previous.type !== 'nesting' &&
          !(previous.type === 'combinator' && /^[>+~]$/.test(previous.value))
        )
          continue;

        // Match the raw spelling too: CSS flags, namespaces, escapes and
        // unsupported element names do not have equivalent Tasty shorthand.
        const match = selector
          .slice(node.sourceIndex)
          .match(
            /^\[\s*data-element\s*=\s*(?:"([A-Z][a-zA-Z0-9]*)"|'([A-Z][a-zA-Z0-9]*)'|([A-Z][a-zA-Z0-9]*))\s*\]/,
          );
        if (!match) continue;
        // Without authored whitespace, the replacement could merge with a
        // following tag/element name: [data-element="Primary"]Search.
        if (
          /^[a-zA-Z0-9]/.test(
            selector.slice(node.sourceIndex + match[0].length),
          )
        )
          continue;
        const name = match[1] ?? match[2] ?? match[3];
        // A different trailing name would append the owner's descendant.
        // Keep that final attribute, while still shortening safe ancestors.
        if (index === branch.nodes.length - 1 && name !== owner) continue;
        edits.push({
          start: node.sourceIndex,
          end: node.sourceIndex + match[0].length,
          replacement: name,
        });
      }
    }
    return edits;
  } catch {
    return [];
  }
}

export default createRule<[], 'preferElementSelector'>({
  name: 'prefer-element-selector',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prefer Tasty element names over exact data-element selectors',
    },
    fixable: 'code',
    messages: {
      preferElementSelector:
        "Use Tasty element names instead of explicit data-element attributes in this sub-element '$' selector.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);
    const visited = new WeakSet<TSESTree.ObjectExpression>();

    function checkAffix(owner: string, node: TSESTree.ObjectExpression) {
      for (const prop of node.properties) {
        if (prop.type !== 'Property') continue;
        const key = prop.computed
          ? getStringValue(unwrapExpression(prop.key))
          : getKeyName(prop.key);
        if (key !== '$') continue;
        const value = unwrapExpression(prop.value);
        const selector = getStringValue(value);
        if (selector === null) continue;
        const edits = elementEdits(selector, owner);
        if (!edits.length) continue;
        context.report({
          node: prop.value,
          messageId: 'preferElementSelector',
          fix: (fixer) =>
            replaceInStringValue(fixer, value, edits, context.sourceCode),
        });
      }
    }

    function checkStyleObject(node: TSESTree.ObjectExpression) {
      if (visited.has(node)) return;
      visited.add(node);
      for (const prop of node.properties) {
        if (prop.type !== 'Property') continue;
        const key = prop.computed
          ? getStringValue(unwrapExpression(prop.key))
          : getKeyName(prop.key);
        if (key === null || !ctx.isSubElementKey(key)) continue;
        const value = unwrapExpression(prop.value);
        if (value.type !== 'ObjectExpression') continue;
        checkAffix(key, value);
        checkStyleObject(value);
      }
    }

    return {
      ImportDeclaration(node) {
        ctx.trackImport(node);
      },
      ...styleObjectListeners((node) => {
        if (ctx.isStyleObject(node)) checkStyleObject(node);
      }),
    };
  },
});
