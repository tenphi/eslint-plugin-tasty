import type { TSESTree } from '@typescript-eslint/utils';
import selectorParser from 'postcss-selector-parser';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import {
  isPseudoElement,
  pseudoElementMismatch,
  pseudoName,
  splitAtPseudoElement,
} from '../pseudo-elements.js';
import { getKeyName, getStringValue, unwrapExpression } from '../utils.js';

const STRUCTURAL_PSEUDOS = new Set([':is', ':where']);

function isCondition(node: selectorParser.Node): boolean {
  if (node.type === 'attribute') {
    // An exact data-element identity is structural, like Tasty's uppercase
    // element names. Other attributes express conditions on that element.
    return !(
      node.attribute === 'data-element' &&
      !node.namespace &&
      node.operator === '=' &&
      node.value
    );
  }
  if (node.type !== 'pseudo') return false;
  return !isPseudoElement(node) && !STRUCTURAL_PSEUDOS.has(pseudoName(node));
}

function findCondition(nodes: selectorParser.Node[]): string | null {
  for (const node of nodes) {
    if (isCondition(node)) return node.toString().trim();
    // Continue into structural wrappers: :where(img:hover) still contains
    // a condition, although the wrapper itself is structural.
    if (selectorParser.isContainer(node)) {
      const condition = findCondition(node.nodes);
      if (condition !== null) return condition;
    }
  }
  return null;
}

/** Whether @own() can express `node` on a pseudo-element. */
function isPseudoElementState(node: selectorParser.Node): boolean {
  return node.type === 'pseudo' && !pseudoElementMismatch(node.toString());
}

function firstItemCondition(item: selectorParser.Selector): string | null {
  const split = splitAtPseudoElement(item);
  if (split === null) return findCondition(item.nodes);

  // The item ends in a pseudo-element, which Tasty treats as the subject:
  // @own() states go after the pseudo-element, and the states it cannot have
  // are dropped. Conditions on the originating element before it, and inside
  // it (::slotted(img:hover), ::after:hover::marker), must stay in `$`.
  return (
    findCondition(item.nodes.slice(0, split.compound)) ??
    findCondition(item.nodes.slice(split.last + 1).filter(isPseudoElementState))
  );
}

function firstStateCondition(selector: string): string | null {
  let root: selectorParser.Root;
  try {
    root = selectorParser().astSync(selector);
  } catch {
    // This recommendation is not a CSS syntax validator. Incomplete selectors
    // must not crash lint or produce a misleading state-map recommendation.
    return null;
  }

  // Each item of a selector list is judged on its own.
  for (const item of root.nodes) {
    const condition = firstItemCondition(item);
    if (condition !== null) return condition;
  }
  return null;
}

export default createRule<[], 'stateInSelector'>({
  name: 'no-state-in-selector',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Keep sub-element selectors structural and express conditions in property state maps',
    },
    messages: {
      stateInSelector:
        "Move state condition '{{condition}}' out of the sub-element '$' selector and into property state maps. Use @own(...) for the sub-element's own state. If the condition must stay in this selector, explicitly disable tasty/no-state-in-selector on this line with a reason.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);
    const visited = new WeakSet<TSESTree.ObjectExpression>();

    function handleStyleObject(node: TSESTree.ObjectExpression) {
      if (visited.has(node) || !ctx.isStyleObject(node)) return;
      visited.add(node);
      const isSubElement = ctx.isInsideSubElement(node);

      for (const prop of node.properties) {
        if (prop.type !== 'Property') continue;
        const key = prop.computed
          ? getStringValue(unwrapExpression(prop.key))
          : getKeyName(prop.key);
        // Some listeners match only the shared/JSX root. Follow its owned
        // sub-elements explicitly, without entering state maps or metadata.
        if (!prop.computed && key && ctx.isSubElementKey(key)) {
          const child = unwrapExpression(prop.value);
          if (child.type === 'ObjectExpression') handleStyleObject(child);
        }
        if (!isSubElement || key !== '$') continue;

        const selector = getStringValue(unwrapExpression(prop.value));
        if (selector === null) continue;
        const condition = firstStateCondition(selector);
        if (condition === null) continue;

        context.report({
          node: prop.value,
          messageId: 'stateInSelector',
          data: { condition },
        });
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
