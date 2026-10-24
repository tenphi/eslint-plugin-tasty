import type { JSONSchema4 } from '@typescript-eslint/utils/json-schema';
import type { TSESTree } from '@typescript-eslint/utils';
import type { TastyContext } from '../context.js';
import { getKeyName, unwrapExpression } from '../utils.js';

export type PropRuleOptions = [{ alsoDisabledBy?: string[] }];

/**
 * React's `forbid-component-props` commonly forbids the same prop on every
 * component, Tasty ones included. A reasoned exception written for it already
 * acknowledges the usage, so it covers the Tasty rule too, and the line needs
 * one directive instead of two.
 */
export const PROP_RULE_DEFAULT_OPTIONS: PropRuleOptions = [
  { alsoDisabledBy: ['react/forbid-component-props'] },
];

export const PROP_RULE_SCHEMA: JSONSchema4[] = [
  {
    type: 'object',
    properties: {
      alsoDisabledBy: {
        type: 'array',
        items: { type: 'string' },
        uniqueItems: true,
      },
    },
    additionalProperties: false,
  },
];

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
