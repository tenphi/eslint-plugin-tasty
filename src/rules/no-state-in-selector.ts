import type { TSESTree } from '@typescript-eslint/utils';
import selectorParser from 'postcss-selector-parser';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { getKeyName, getStringValue, unwrapExpression } from '../utils.js';

const STRUCTURAL_PSEUDOS = new Set([':is', ':where']);
const LEGACY_PSEUDO_ELEMENTS = new Set([
  ':before',
  ':after',
  ':first-line',
  ':first-letter',
]);

function firstStateCondition(selector: string): string | null {
  let root: selectorParser.Root;
  try {
    root = selectorParser().astSync(selector);
  } catch {
    // This recommendation is not a CSS syntax validator. Incomplete selectors
    // must not crash lint or produce a misleading state-map recommendation.
    return null;
  }

  let condition: string | null = null;
  root.walk((node) => {
    if (node.type === 'attribute') {
      // An exact data-element identity is structural, like Tasty's uppercase
      // element names. Other attributes express conditions on that element.
      if (
        node.attribute === 'data-element' &&
        !node.namespace &&
        node.operator === '=' &&
        node.value
      ) {
        return;
      }
    } else if (node.type === 'pseudo') {
      let name = node.value.toLowerCase();
      if (name.includes('\\')) {
        // The parser decodes tag identifiers but preserves pseudo spelling.
        const colons = name.startsWith('::') ? '::' : ':';
        const identifier = selectorParser().astSync(name.slice(colons.length))
          .first?.first;
        if (identifier?.type === 'tag') {
          name = colons + identifier.value.toLowerCase();
        }
      }
      if (
        name.startsWith('::') ||
        LEGACY_PSEUDO_ELEMENTS.has(name) ||
        STRUCTURAL_PSEUDOS.has(name)
      ) {
        // Continue walking: :where(img:hover) and ::slotted(img[width])
        // still contain conditions, although the outer wrapper is structural.
        return;
      }
    } else {
      return;
    }

    condition = node.toString().trim();
    return false;
  });
  return condition;
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
        "Move state condition '{{condition}}' out of the sub-element '$' selector and into property state maps. Use @own(...) for the sub-element's own state.",
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
