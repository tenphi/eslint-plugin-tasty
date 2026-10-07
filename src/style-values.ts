import type { TSESTree } from '@typescript-eslint/utils';
import type { TastyContext } from './context.js';
import { KNOWN_CSS_PROPERTIES, KNOWN_TASTY_PROPERTIES } from './constants.js';
import { getKeyName, getStringValue, unwrapExpression } from './utils.js';

interface ValueListenerOptions {
  /** Collect declarations before checking their values (token existence rules). */
  onStyleObject?: (node: TSESTree.ObjectExpression) => void;
  /** Rewrites that depend on Tasty semantics need evidence beyond the prop name. */
  requireTastyJSX?: boolean;
}

/** Visit visible values without evaluating bindings, calls, or interpolations. */
export function styleValueListeners(
  ctx: TastyContext,
  check: (property: string, node: TSESTree.Node) => void,
  options: ValueListenerOptions = {},
) {
  function visit(property: string, node: TSESTree.Node): void {
    node = unwrapExpression(node);
    if (node.type === 'ObjectExpression') {
      // A property value object is a state map, never a sub-element here.
      for (const prop of node.properties) {
        if (prop.type === 'Property' && !prop.computed) {
          const value = unwrapExpression(prop.value);
          if (value.type !== 'ObjectExpression') visit(property, value);
        }
      }
    } else if (node.type === 'ConditionalExpression') {
      visit(property, node.consequent);
      visit(property, node.alternate);
    } else if (node.type === 'LogicalExpression') {
      const left = unwrapExpression(node.left);
      const str = getStringValue(left);
      const known = left.type === 'Literal' || str !== null;
      const value = left.type === 'Literal' ? left.value : str;
      if (node.operator === '&&') {
        // The left operand can only be the result when it is falsy.
        if (!known || value) visit(property, node.right);
      } else if (known) {
        visit(
          property,
          node.operator === '??'
            ? value == null
              ? node.right
              : left
            : value
              ? left
              : node.right,
        );
      } else {
        visit(property, node.left);
        visit(property, node.right);
      }
    } else {
      check(property, node);
    }
  }

  return {
    ImportDeclaration(node: TSESTree.ImportDeclaration) {
      ctx.trackImport(node);
    },
    ObjectExpression(node: TSESTree.ObjectExpression) {
      if (!ctx.isStyleObject(node)) return;
      options.onStyleObject?.(node);
      for (const prop of node.properties) {
        if (prop.type !== 'Property' || prop.computed) continue;
        const key = getKeyName(prop.key);
        if (key === null || /^[A-Z@&]/.test(key) || key === '$') continue;
        visit(key, prop.value);
      }
    },
    JSXAttribute(node: TSESTree.JSXAttribute) {
      if (node.name.type !== 'JSXIdentifier') return;
      const key = node.name.name;
      if (
        !KNOWN_TASTY_PROPERTIES.has(key) &&
        !KNOWN_CSS_PROPERTIES.has(key) &&
        !ctx.config.styles.includes(key)
      )
        return;

      const opening = node.parent;
      if (opening?.type !== 'JSXOpeningElement') return;
      let tag = opening.name;
      while (tag.type === 'JSXMemberExpression') tag = tag.object;
      // Native HTML/SVG attributes contain CSS, not Tasty's value language.
      if (tag.type !== 'JSXIdentifier' || !/^[A-Z]/.test(tag.name)) return;
      if (options.requireTastyJSX && !ctx.isTastyJSXComponent(node, tag.name))
        return;
      if (ctx.isComponentJSXProp(node)) return;

      const value =
        node.value?.type === 'JSXExpressionContainer'
          ? node.value.expression
          : node.value;
      if (value) visit(key, value);
      else check(key, node); // A bare JSX attribute means boolean true.
    },
  };
}

/** Adapt a node listener to the string-only rules. */
export function stringStyleValueListeners(
  ctx: TastyContext,
  check: (value: string, node: TSESTree.Node, property: string) => void,
  options: ValueListenerOptions = {},
) {
  return styleValueListeners(
    ctx,
    (property, node) => {
      const value = getStringValue(node);
      if (value !== null) check(value, node, property);
    },
    options,
  );
}
