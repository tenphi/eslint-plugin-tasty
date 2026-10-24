import type { TSESTree } from '@typescript-eslint/utils';
import type { TastyContext } from '../context.js';
import { getKeyName, unwrapExpression } from '../utils.js';

/**
 * What a JSX element is, for prop rules: a recognized Tasty component, any
 * other component (capitalized or member tag), or a native element.
 */
export type JSXElementKind = 'tasty' | 'component' | 'element';

/** An explicit JSX attribute, or a key of an inline object spread. */
export type JSXPropNode = TSESTree.JSXAttribute | TSESTree.Property;

/**
 * Inspect explicit props and inline object spreads on JSX elements without
 * evaluating spread bindings. `classify` picks the elements to check and what
 * the check is told about each; `null` skips the element.
 */
export function jsxElementPropListeners<T>(
  ctx: TastyContext,
  classify: (node: TSESTree.JSXOpeningElement) => T | null,
  check: (name: string, node: JSXPropNode, target: T) => void,
) {
  function visitSpread(node: TSESTree.Node, target: T): void {
    node = unwrapExpression(node);
    if (node.type !== 'ObjectExpression') return;
    for (const prop of node.properties) {
      if (prop.type === 'SpreadElement') {
        visitSpread(prop.argument, target);
      } else {
        const name = prop.computed
          ? getKeyName(unwrapExpression(prop.key))
          : getKeyName(prop.key);
        // A computed identifier is dynamic; a computed string literal is visible.
        if (
          name !== null &&
          (!prop.computed || unwrapExpression(prop.key).type === 'Literal')
        ) {
          check(name, prop, target);
        }
      }
    }
  }

  return {
    ImportDeclaration(node: TSESTree.ImportDeclaration) {
      ctx.trackImport(node);
    },
    JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
      const target = classify(node);
      if (target === null) return;
      for (const attribute of node.attributes) {
        if (attribute.type === 'JSXSpreadAttribute')
          visitSpread(attribute.argument, target);
        else if (attribute.name.type === 'JSXIdentifier')
          check(attribute.name.name, attribute, target);
      }
    },
  };
}

/**
 * Inspect explicit props and inline object spreads on every JSX element without
 * evaluating spread bindings. `kinds` limits which elements are classified and
 * checked, so a Tasty-only rule never runs component recognition elsewhere.
 */
export function jsxPropListeners(
  ctx: TastyContext,
  kinds: ReadonlySet<JSXElementKind>,
  check: (name: string, node: JSXPropNode, kind: JSXElementKind) => void,
) {
  function classify(node: TSESTree.JSXOpeningElement): JSXElementKind | null {
    let name = node.name;
    while (name.type === 'JSXMemberExpression') name = name.object;
    // `<svg:rect>` and lowercase tags are native; `<motion.div>` is a component.
    if (
      name.type !== 'JSXIdentifier' ||
      (node.name.type === 'JSXIdentifier' && !/^[A-Z]/.test(name.name))
    ) {
      return kinds.has('element') ? 'element' : null;
    }
    if (kinds.has('tasty') && ctx.isTastyJSXComponent(node, name.name))
      return 'tasty';
    return kinds.has('component') ? 'component' : null;
  }

  return jsxElementPropListeners(ctx, classify, check);
}

const TASTY_ONLY = new Set<JSXElementKind>(['tasty']);

/** Inspect explicit props and inline object spreads on recognized Tasty components. */
export function tastyComponentPropListeners(
  ctx: TastyContext,
  check: (name: string, node: JSXPropNode) => void,
) {
  return jsxPropListeners(ctx, TASTY_ONLY, (name, node) => check(name, node));
}
