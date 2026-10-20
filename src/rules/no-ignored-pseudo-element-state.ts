import type { TSESTree } from '@typescript-eslint/utils';
import selectorParser from 'postcss-selector-parser';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { getStateAtoms, parseStateKey } from '../parsers/state-key-parser.js';
import {
  pseudoElementItems,
  pseudoElementMismatch,
} from '../pseudo-elements.js';
import { getKeyName, getStringValue, unwrapExpression } from '../utils.js';

/**
 * What a state atom tests that a pseudo-element has none of, or `null`.
 * `@root()`, `@parent()`, and at-rule conditions describe other things, and
 * `@alias` definitions are not known here.
 */
function atomMismatch(atom: string): string | null {
  if (atom.startsWith('@')) return null;
  if (/^[:.[]/.test(atom)) return pseudoElementMismatch(atom);
  // Boolean and value modifiers (`hovered`, `theme=dark`) are attributes.
  return 'modifiers';
}

/** The first item of `selectors` that ends in a pseudo-element. */
function firstPseudoElementItem(selectors: string[] | null): string | null {
  for (const selector of selectors ?? []) {
    const [item] = pseudoElementItems(selector) ?? [];
    if (item) return item;
  }
  return null;
}

/** The items of a selector list, or `null` when it cannot be parsed. */
function selectorItems(selector: string): string[] | null {
  try {
    return selectorParser()
      .astSync(selector)
      .nodes.map((item) => item.toString().trim());
  } catch {
    return null;
  }
}

export default createRule<[], 'ignoredState'>({
  name: 'no-ignored-pseudo-element-state',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Report states that Tasty ignores because they test a pseudo-element for attributes, modifiers, classes, or tree position',
    },
    messages: {
      ignoredState:
        "Tasty ignores state '{{state}}' on '{{selector}}': a pseudo-element has no {{mismatch}}. To condition on the element the pseudo-element belongs to, write the condition in the selector before the pseudo-element.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);
    const visited = new WeakSet<TSESTree.ObjectExpression>();

    /** The key and object of the property whose value is `node`. */
    function ownerEntry(
      node: TSESTree.ObjectExpression,
    ): { key: string; object: TSESTree.ObjectExpression } | null {
      let wrapped: TSESTree.Node = node;
      while (wrapped.parent && unwrapExpression(wrapped.parent) === node) {
        wrapped = wrapped.parent;
      }
      const prop = wrapped.parent;
      if (prop?.type !== 'Property' || prop.computed) return null;
      if (prop.parent.type !== 'ObjectExpression') return null;
      const key = getKeyName(prop.key);
      return key === null ? null : { key, object: prop.parent };
    }

    /** The literal selector of a selector-mode call, such as useGlobalStyles. */
    function baseSelector(node: TSESTree.ObjectExpression): string | null {
      if (!ctx.getStyleContext(node)?.isSelectorMode) return null;
      const call = node.parent;
      if (call?.type !== 'CallExpression' || call.arguments[1] !== node) {
        return null;
      }
      return getStringValue(unwrapExpression(call.arguments[0]));
    }

    function checkStateMap(
      map: TSESTree.ObjectExpression,
      own: string | null,
      root: string | null,
    ) {
      for (const prop of map.properties) {
        if (prop.type !== 'Property') continue;
        const state = prop.computed
          ? getStringValue(unwrapExpression(prop.key))
          : getKeyName(prop.key);
        if (state === null || state.trim() === '' || state.trim() === '_') {
          continue;
        }
        // Malformed keys are valid-state-key's to report.
        if (parseStateKey(state).errors.length > 0) continue;

        for (const atom of getStateAtoms(state)) {
          // Root states describe the root; @own() states the selected element.
          const selector = atom.own ? (own ?? root) : root;
          if (selector === null) continue;
          const mismatch = atomMismatch(atom.value);
          if (mismatch === null) continue;
          context.report({
            node: prop.key,
            messageId: 'ignoredState',
            data: { state, selector, mismatch },
          });
          break;
        }
      }
    }

    /**
     * `suffixes` are the selectors this object's styles apply to, relative
     * to the root (`&`); `root` is the base selector item of a selector-mode
     * call that ends in a pseudo-element, if there is one.
     */
    function checkStyleObject(
      node: TSESTree.ObjectExpression,
      suffixes: string[] | null,
      root: string | null,
    ) {
      visited.add(node);
      const own = firstPseudoElementItem(suffixes);

      for (const prop of node.properties) {
        if (prop.type !== 'Property' || prop.computed) continue;
        const key = getKeyName(prop.key);
        const value = unwrapExpression(prop.value);
        if (key === null || value.type !== 'ObjectExpression') continue;

        if (ctx.isSubElementKey(key)) {
          checkStyleObject(
            value,
            subElementSuffixes(value, key, suffixes),
            root,
          );
        } else if (ctx.isNestedSelectorKey(key)) {
          checkStyleObject(value, extend(suffixes, key, true), root);
        } else if (!ctx.isSpecialKey(key)) {
          checkStateMap(value, own, root);
        }
      }
    }

    function subElementSuffixes(
      node: TSESTree.ObjectExpression,
      name: string,
      parents: string[] | null,
    ): string[] | null {
      for (const prop of node.properties) {
        if (prop.type !== 'Property') continue;
        const key = prop.computed
          ? getStringValue(unwrapExpression(prop.key))
          : getKeyName(prop.key);
        if (key !== '$') continue;
        const selector = getStringValue(unwrapExpression(prop.value));
        return selector === null ? null : extend(parents, selector, false);
      }
      // Without `$`, the sub-element is its own [data-element] element.
      return [name];
    }

    /**
     * Selectors relative to `parents`: `&` attaches to the owner, so
     * `&::before` under `a` is `a::before`. Other items of a nested `&` key
     * are descendants of the owner; other `$` items stand on their own.
     */
    function extend(
      parents: string[] | null,
      selector: string,
      nested: boolean,
    ): string[] | null {
      const items = selectorItems(selector);
      if (items === null) return null;
      const result: string[] = [];
      for (const item of items) {
        if (!item.startsWith('&') && !nested) {
          result.push(item);
          continue;
        }
        if (parents === null) return null;
        for (const parent of parents) {
          result.push(
            item.startsWith('&') ? parent + item.slice(1) : `${parent} ${item}`,
          );
        }
      }
      return result;
    }

    function handleStyleObject(node: TSESTree.ObjectExpression) {
      if (visited.has(node) || !ctx.isStyleObject(node)) return;
      // Sub-elements and nested selectors are checked from their owner,
      // which knows the selector they extend.
      const owner = ownerEntry(node);
      if (
        owner &&
        (ctx.isSubElementKey(owner.key) ||
          ctx.isNestedSelectorKey(owner.key)) &&
        ctx.isStyleObject(owner.object)
      ) {
        return;
      }

      const base = baseSelector(node);
      const root = base === null ? null : firstPseudoElementItem([base]);
      checkStyleObject(node, ['&'], root);
    }

    return {
      ImportDeclaration(node) {
        ctx.trackImport(node);
      },
      ...styleObjectListeners(handleStyleObject),
    };
  },
});
