import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import { KNOWN_TASTY_PROPERTIES } from '../constants.js';
import {
  type ProtectedComponent,
  ProtectedComponents,
} from '../protected-components.js';
import { getKeyName, unwrapExpression } from '../utils.js';
import { jsxElementPropListeners } from './tasty-component-props.js';

type MessageIds = 'restyleProp' | 'restyleWrapper';

/** `tasty(Base, options)` keys that configure the wrapper instead of setting a default prop. */
const WRAPPER_OPTIONS = new Set([
  'as',
  'element',
  'elements',
  'mods',
  'modProps',
  'qa',
  'qaVal',
  'styleProps',
  'tokenProps',
  'tokens',
  'variant',
]);

interface Target extends ProtectedComponent {
  /** The tag or base as written: `UI.Button`, `CopyButton`. */
  reference: string;
}

/** `inputStyles`, `triggerStyles`, ...: styles for one of the component's inner elements. */
function isInnerStylesProp(name: string): boolean {
  return /^[a-z][A-Za-z0-9]*Styles$/.test(name);
}

/** A value that cannot be a style value: a callback or an element. */
function isNeverStyleValue(node: TSESTree.Node): boolean {
  const value = unwrapExpression(node);
  return (
    value.type === 'ArrowFunctionExpression' ||
    value.type === 'FunctionExpression' ||
    value.type === 'JSXElement' ||
    value.type === 'JSXFragment'
  );
}

export default createRule<[], MessageIds>({
  name: 'no-protected-restyle',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        "Warn when a design system's protected components are restyled instead of customized through their props",
    },
    messages: {
      restyleProp:
        "'{{prop}}' restyles {{component}}, a protected {{source}} component. Customize it through its own props, 'tokens' or 'mods'. If this override is intended, explicitly disable tasty/no-protected-restyle for this usage with an ESLint comment and a reason.",
      restyleWrapper:
        "This tasty() wrapper restyles {{component}}, a protected {{source}} component, through '{{prop}}'. Set its own props, 'tokens' or 'mods' instead. If this override is intended, explicitly disable tasty/no-protected-restyle for this usage with an ESLint comment and a reason.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);
    const components = new ProtectedComponents(context, ctx);
    if (!components.enabled) return {};

    const styleProps = new Set([
      ...KNOWN_TASTY_PROPERTIES,
      ...ctx.config.styles,
    ]);

    /** Root `styles` that only places or sizes the component, through allowed keys. */
    function placesOnly(value: TSESTree.Node | null, target: Target): boolean {
      const object = value && unwrapExpression(value);
      return (
        object?.type === 'ObjectExpression' &&
        object.properties.every((prop) => {
          if (prop.type !== 'Property' || prop.computed) return false;
          const key = getKeyName(prop.key);
          return key !== null && target.allowedStyleProps.has(key);
        })
      );
    }

    function restyles(
      name: string,
      value: TSESTree.Node | null,
      target: Target,
      attribute?: TSESTree.JSXAttribute,
    ): boolean {
      if (name === 'styles') return !placesOnly(value, target);
      if (isInnerStylesProp(name)) return true;
      if (!styleProps.has(name) || target.allowedStyleProps.has(name)) {
        return false;
      }
      if (value && isNeverStyleValue(value)) return false;
      // With typeAwareJSX, a prop the component declares itself is not a style prop.
      return !(attribute && ctx.isComponentJSXProp(attribute));
    }

    function report(
      node: TSESTree.Node,
      messageId: MessageIds,
      prop: string,
      target: Target,
    ): void {
      context.report({
        node,
        messageId,
        data: {
          prop,
          component:
            target.reference === target.name
              ? `'${target.name}'`
              : `'${target.reference}' (based on '${target.name}')`,
          source: `'${target.source}'`,
        },
      });
    }

    function checkWrapperOptions(
      options: TSESTree.ObjectExpression,
      target: Target,
    ): void {
      for (const prop of options.properties) {
        if (prop.type === 'SpreadElement') {
          const spread = unwrapExpression(prop.argument);
          if (spread.type === 'ObjectExpression') {
            checkWrapperOptions(spread, target);
          }
          continue;
        }
        const key = prop.computed ? unwrapExpression(prop.key) : prop.key;
        if (prop.computed && key.type !== 'Literal') continue;
        const name = getKeyName(key);
        if (name === null || WRAPPER_OPTIONS.has(name)) continue;
        if (name === 'variants' || restyles(name, prop.value, target)) {
          report(prop, 'restyleWrapper', name, target);
        }
      }
    }

    const jsx = jsxElementPropListeners(
      ctx,
      (node): Target | null => {
        const target = components.resolveTag(node.name);
        return (
          target && {
            ...target,
            reference: context.sourceCode.getText(node.name),
          }
        );
      },
      (name, node, target) => {
        const value =
          node.type === 'Property'
            ? node.value
            : node.value?.type === 'JSXExpressionContainer'
              ? node.value.expression
              : node.value;
        const attribute = node.type === 'JSXAttribute' ? node : undefined;
        if (restyles(name, value, target, attribute)) {
          report(node, 'restyleProp', name, target);
        }
      },
    );

    return {
      ...jsx,
      'Program:exit'() {
        ctx.finishJSXAnalysis();
      },
      CallExpression(node) {
        const [base, options] = node.arguments;
        if (!options || !components.isWrapperCall(node)) return;
        const component = components.resolveExpression(base);
        const object = unwrapExpression(options);
        if (!component || object.type !== 'ObjectExpression') return;
        checkWrapperOptions(object, {
          ...component,
          reference: context.sourceCode.getText(unwrapExpression(base)),
        });
      },
    };
  },
});
