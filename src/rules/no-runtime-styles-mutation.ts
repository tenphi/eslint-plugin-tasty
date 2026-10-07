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
      } else if (!isStaticValue(value)) {
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

        if (prop.computed) {
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
