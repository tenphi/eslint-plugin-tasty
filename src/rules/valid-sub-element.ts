import type { TSESTree } from '@typescript-eslint/utils';
import selectorParser from 'postcss-selector-parser';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { getKeyName, getStringValue, unwrapExpression } from '../utils.js';

type MessageIds = 'subElementNotObject' | 'subElementTargetsRoot';

const LEGACY_PSEUDO_ELEMENTS = new Set([
  ':before',
  ':after',
  ':first-line',
  ':first-letter',
]);

function hasDescendantTarget(nodes: selectorParser.Node[]): boolean {
  let lastCharacter = '';
  for (const node of nodes.slice(1)) {
    if (node.type === 'combinator') {
      if (node.value.trim()) return true;
      // The affix renderer skips authored whitespace. Tags insert their own
      // separator; pseudos attach directly, and classes/attributes attach
      // after a tag, class, attribute or placeholder.
      continue;
    }
    if (node.type === 'tag' || node.type === 'universal') {
      if (lastCharacter) return true;
    } else if (node.type === 'class' || node.type === 'attribute') {
      if (lastCharacter && !/[\]@a-zA-Z0-9-]/.test(lastCharacter)) return true;
    }
    lastCharacter = node.toString().trim().slice(-1);
  }
  return false;
}

function firstRootSelector(selector: string, key: string): string | null {
  try {
    const root = selectorParser().astSync(selector);
    for (const branch of root.nodes) {
      const nodes = branch.nodes.filter((node) => node.type !== 'comment');
      if (nodes[0]?.type !== 'nesting' || nodes.length < 2) continue;
      // An explicit placeholder creates a descendant selector even with an
      // ampersand prefix. A different trailing uppercase name injects the key
      // as its descendant; the sub-element's own name does not.
      if (
        nodes.some((node) => node.type === 'tag' && node.value.startsWith('@'))
      )
        continue;
      const trailingElement = branch
        .toString()
        .trim()
        .slice(1)
        .trim()
        .match(/(?:^|[\s>+~\]:])([A-Z][a-zA-Z0-9]*)$/);
      if (trailingElement && trailingElement[1] !== key) continue;
      // Follow Tasty's affix normalization, rather than CSS whitespace alone.
      // Nested :is() arguments do not change the outer selector's target.
      if (hasDescendantTarget(nodes)) continue;
      const hasPseudoElement = nodes.some((node) => {
        if (node.type !== 'pseudo') return false;
        let name = node.value.toLowerCase();
        if (name.startsWith('::')) return true;
        if (name.includes('\\')) {
          const identifier = selectorParser().astSync(name.slice(1)).first
            ?.first;
          if (identifier?.type === 'tag')
            name = ':' + identifier.value.toLowerCase();
        }
        return LEGACY_PSEUDO_ELEMENTS.has(name);
      });
      if (!hasPseudoElement) return branch.toString().trim();
    }
  } catch {
    // Invalid/incomplete selector text belongs to syntax validation.
  }
  return null;
}

export default createRule<[], MessageIds>({
  name: 'valid-sub-element',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Validate sub-element values and prevent root-targeting affixes',
    },
    messages: {
      subElementNotObject:
        "Sub-element '{{name}}' value must be a style object, not a {{type}}.",
      subElementTargetsRoot:
        "Sub-element '{{name}}' selector '{{selector}}' styles the containing element instead of a sub-element. Use property state maps in that containing scope, or a descendant '$' selector such as 'h1'. Pseudo-elements such as '&::before' are allowed.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);
    const visited = new WeakSet<TSESTree.ObjectExpression>();

    function checkAffix(name: string, node: TSESTree.ObjectExpression) {
      for (const prop of node.properties) {
        if (prop.type !== 'Property') continue;
        const key = prop.computed
          ? getStringValue(unwrapExpression(prop.key))
          : getKeyName(prop.key);
        if (key !== '$') continue;
        const selector = getStringValue(unwrapExpression(prop.value));
        if (selector === null) continue;
        const rootSelector = firstRootSelector(selector, name);
        if (rootSelector === null) continue;
        context.report({
          node: prop.value,
          messageId: 'subElementTargetsRoot',
          data: { name, selector: rootSelector },
        });
      }
    }

    // Recurse only through owned sub-elements. Some shared/JSX listeners match
    // just the root, and descriptor objects and state maps are not styles.
    function checkStyleObject(node: TSESTree.ObjectExpression) {
      if (visited.has(node)) return;
      visited.add(node);

      for (const prop of node.properties) {
        if (prop.type !== 'Property') continue;

        const key = prop.computed
          ? getStringValue(unwrapExpression(prop.key))
          : getKeyName(prop.key);
        if (key === null || !/^[A-Z]/.test(key)) continue;

        const value = unwrapExpression(prop.value);
        if (value.type === 'ObjectExpression') {
          checkAffix(key, value);
          checkStyleObject(value);
        } else {
          if (value.type === 'Literal' && value.value === false) {
            continue;
          }

          const valueType =
            value.type === 'Literal' ? typeof value.value : value.type;

          context.report({
            node: prop.value,
            messageId: 'subElementNotObject',
            data: { name: key, type: valueType },
          });
        }
      }
    }

    function handleStyleObject(node: TSESTree.ObjectExpression) {
      if (ctx.isStyleObject(node)) checkStyleObject(node);
    }

    return {
      ImportDeclaration(node) {
        ctx.trackImport(node);
      },
      ...styleObjectListeners(handleStyleObject),
    };
  },
});
