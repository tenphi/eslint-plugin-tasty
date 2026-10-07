import type { TSESTree } from '@typescript-eslint/utils';
import type { TastyContext } from '../context.js';
import { getKeyName, unwrapExpression } from '../utils.js';

/** Inspect explicit props and inline object spreads without evaluating spread bindings. */
export function tastyComponentPropListeners(
  ctx: TastyContext,
  check: (name: string, node: TSESTree.Node) => void,
) {
  function visitSpread(node: TSESTree.Node): void {
    node = unwrapExpression(node);
    if (node.type !== 'ObjectExpression') return;
    for (const prop of node.properties) {
      if (prop.type === 'SpreadElement') {
        visitSpread(prop.argument);
      } else {
        const name = prop.computed
          ? getKeyName(unwrapExpression(prop.key))
          : getKeyName(prop.key);
        // A computed identifier is dynamic; a computed string literal is visible.
        if (
          name !== null &&
          (!prop.computed || unwrapExpression(prop.key).type === 'Literal')
        ) {
          check(name, prop);
        }
      }
    }
  }

  return {
    ImportDeclaration(node: TSESTree.ImportDeclaration) {
      ctx.trackImport(node);
    },
    JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
      let name = node.name;
      while (name.type === 'JSXMemberExpression') name = name.object;
      if (name.type !== 'JSXIdentifier') return;
      if (node.name.type === 'JSXIdentifier' && !/^[A-Z]/.test(name.name))
        return;
      if (!ctx.isTastyJSXComponent(node, name.name)) return;
      for (const attribute of node.attributes) {
        if (attribute.type === 'JSXSpreadAttribute')
          visitSpread(attribute.argument);
        else if (attribute.name.type === 'JSXIdentifier')
          check(attribute.name.name, attribute);
      }
    },
  };
}
