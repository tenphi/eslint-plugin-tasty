import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { SPECIAL_STYLE_KEYS } from '../constants.js';
import { getKeyName, isStaticValue, unwrapExpression } from '../utils.js';

type MessageIds = 'dynamicStyleValue' | 'dynamicStyleKey';

export default createRule<[], MessageIds>({
  name: 'no-runtime-styles-mutation',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Warn when style objects contain JavaScript-computed values',
    },
    messages: {
      dynamicStyleValue:
        "Prefer a static style value for '{{property}}'. Use states with mods, tokens, or styleProps for dynamic behavior. For necessary JavaScript computation, explicitly disable tasty/no-runtime-styles-mutation on this line with a reason.",
      dynamicStyleKey:
        "Prefer a static style key for '{{property}}'. Define states as literal keys instead of computing them in JavaScript. For necessary generated keys, explicitly disable tasty/no-runtime-styles-mutation on this line with a reason.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    /**
     * Whether a value is fixed once the module has loaded, so Tasty generates
     * its CSS once, exactly as for a literal: literals and `undefined`, module
     * `const` bindings and imports (and their members), and templates,
     * operators and `mergeStyles(...)` calls built only from those. Anything
     * that reaches render-time scope — props, state, hook results, parameters,
     * a local `let` — is not.
     */
    function isLoadTimeValue(node: TSESTree.Node): boolean {
      const value = unwrapExpression(node);
      if (isStaticValue(value)) return true;

      switch (value.type) {
        case 'Identifier':
          return isLoadTimeBinding(value);
        case 'ChainExpression':
          return isLoadTimeValue(value.expression);
        case 'MemberExpression':
          return (
            isLoadTimeValue(value.object) &&
            (!value.computed || isLoadTimeValue(value.property))
          );
        case 'TemplateLiteral':
          return value.expressions.every(isLoadTimeValue);
        case 'UnaryExpression':
          return value.operator !== 'delete' && isLoadTimeValue(value.argument);
        case 'BinaryExpression':
        case 'LogicalExpression':
          return (
            value.left.type !== 'PrivateIdentifier' &&
            isLoadTimeValue(value.left) &&
            isLoadTimeValue(value.right)
          );
        case 'ConditionalExpression':
          return (
            isLoadTimeValue(value.test) &&
            isLoadTimeValue(value.consequent) &&
            isLoadTimeValue(value.alternate)
          );
        case 'ArrayExpression':
          return value.elements.every(
            (element) =>
              element === null ||
              isLoadTimeValue(
                element.type === 'SpreadElement' ? element.argument : element,
              ),
          );
        case 'CallExpression':
          // Object-literal arguments are style objects of their own, and this
          // rule checks their values where they stand.
          return (
            ctx.isMergeStylesCall(value) &&
            value.arguments.every((arg) => {
              const argument = unwrapExpression(
                arg.type === 'SpreadElement' ? arg.argument : arg,
              );
              return (
                argument.type === 'ObjectExpression' ||
                isLoadTimeValue(argument)
              );
            })
          );
        default:
          return false;
      }
    }

    /**
     * A module-scope `const`, enum or import, or a render-scope `const` object;
     * `undefined` when not shadowed.
     */
    function isLoadTimeBinding(node: TSESTree.Identifier): boolean {
      let scope: ReturnType<typeof context.sourceCode.getScope> | null =
        context.sourceCode.getScope(node);
      while (scope && !scope.set.has(node.name)) scope = scope.upper;
      const variable = scope?.set.get(node.name);

      if (!scope || !variable || variable.defs.length === 0) {
        return node.name === 'undefined';
      }
      if (scope.type !== 'module' && scope.type !== 'global') {
        // A render-scope `const` object passed on as styles is a style object
        // of its own; its values are checked where it is written.
        return variable.defs.every(
          (def) =>
            def.type === 'Variable' &&
            def.parent.kind === 'const' &&
            def.node.init !== null &&
            unwrapExpression(def.node.init).type === 'ObjectExpression',
        );
      }

      return variable.defs.every(
        (def) =>
          def.type === 'ImportBinding' ||
          def.type === 'TSEnumName' ||
          (def.type === 'Variable' && def.parent.kind === 'const'),
      );
    }

    function checkValue(
      node: TSESTree.Node,
      property: string,
      isStateMap = false,
    ): void {
      const value = unwrapExpression(node);

      if (value.type === 'ObjectExpression') {
        checkProperties(value, property, isStateMap);
      } else if (value.type === 'ArrayExpression') {
        for (const element of value.elements) {
          // A separate rule reports spreads, including array spreads.
          if (element && element.type !== 'SpreadElement') {
            checkValue(element, property);
          }
        }
      } else if (!isLoadTimeValue(value)) {
        context.report({
          node: value,
          messageId: 'dynamicStyleValue',
          data: { property },
        });
      }
    }

    function checkProperties(
      node: TSESTree.ObjectExpression,
      parentProperty = '(style)',
      isStateMap = false,
    ): void {
      for (const prop of node.properties) {
        // Spreads have their own warning and explicit per-line suppression.
        if (prop.type === 'SpreadElement') continue;

        // At-rule definitions have their own shape and may legitimately be
        // assembled as JavaScript objects (for example, shared keyframes).
        const key = !prop.computed ? getKeyName(prop.key) : null;
        if (key && SPECIAL_STYLE_KEYS.has(key)) continue;

        const property =
          isStateMap || prop.computed
            ? parentProperty
            : (key ?? parentProperty);

        if (prop.computed && !isLoadTimeValue(prop.key)) {
          context.report({
            node: prop.key,
            messageId: 'dynamicStyleKey',
            data: { property },
          });
        }

        const value = unwrapExpression(prop.value);
        const childIsStateMap =
          value.type === 'ObjectExpression' && ctx.isStateMap(value, prop);
        checkValue(prop.value, property, childIsStateMap);
      }
    }

    function handleStyleObject(node: TSESTree.ObjectExpression): void {
      const styleCtx = ctx.getStyleContext(node);
      // tastyStatic has a stricter build-time error for dynamic values.
      if (!styleCtx || styleCtx.isStaticCall) return;
      // Walk the full tree once; sub-element objects also match AST selectors.
      if (ctx.getRootStyleObject(node) !== node) return;

      checkProperties(node);
    }

    return {
      ImportDeclaration(node) {
        ctx.trackImport(node);
      },
      ...styleObjectListeners(handleStyleObject),
    };
  },
});
