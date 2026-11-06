import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import { BUILT_IN_UNITS, CSS_UNITS } from '../constants.js';
import type { ResolvedConfig } from '../types.js';
import {
  extractCustomUnit,
  getStringValue,
  isRawHexColor,
  isStaticValue,
  unwrapExpression,
} from '../utils.js';
import { scanValueWords } from '../value-words.js';
import {
  type JSXElementKind,
  type JSXPropNode,
  jsxPropListeners,
} from './tasty-component-props.js';

type Elements = 'tasty' | 'components' | 'all';
type Values = 'all' | 'static';

const KINDS: Record<Elements, ReadonlySet<JSXElementKind>> = {
  tasty: new Set(['tasty']),
  components: new Set(['tasty', 'component']),
  all: new Set(['tasty', 'component', 'element']),
};

/** `lh` is a Tasty unit and a CSS one, so inline CSS reads it correctly. */
const INLINE_CSS_UNITS = new Set([...CSS_UNITS, 'lh']);

/** A word inline CSS cannot read: a Tasty unit, color token or `$` token. */
function tastySyntaxWord(value: string, config: ResolvedConfig): string | null {
  for (const { value: word } of scanValueWords(value)) {
    if (/^\$\$?[a-z]/i.test(word)) return word;
    if (/^##?[a-z]/i.test(word) && !isRawHexColor(word)) return word;
    const unit = extractCustomUnit(word);
    if (
      unit !== null &&
      !INLINE_CSS_UNITS.has(unit) &&
      (BUILT_IN_UNITS.has(unit) ||
        (Array.isArray(config.units) && config.units.includes(unit)))
    ) {
      return word;
    }
  }
  return null;
}

export default createRule<
  [{ elements?: Elements; values?: Values }],
  'noStyleProp' | 'noInlineStyle' | 'staticStyle' | 'tastySyntax'
>({
  name: 'no-style-prop',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer tokens over React inline style on Tasty components',
    },
    messages: {
      noStyleProp:
        "Avoid the 'style' prop on Tasty components. Define styles with token references and pass dynamic values through 'tokens' (e.g. tokens={{ $size: value }}). If a third-party library requires inline styles, explicitly disable tasty/no-style-prop for this usage with an ESLint comment and a reason.",
      noInlineStyle:
        "Avoid the 'style' prop. Move these styles into Tasty: render a tasty() element, or wrap the component with tasty(Component, { styles }), using token references and passing dynamic values through 'tokens'. If a third-party library requires inline styles, explicitly disable tasty/no-style-prop for this usage with an ESLint comment and a reason.",
      staticStyle:
        "This 'style' is static, so it belongs in Tasty styles: style props or the component's styles on a Tasty component, a tasty() element or tasty(Component, { styles }) elsewhere. If a third-party library requires inline styles, explicitly disable tasty/no-style-prop for this usage with an ESLint comment and a reason.",
      tastySyntax:
        "'{{word}}' is Tasty syntax, but 'style' hands it to the browser unparsed, which drops the declaration. Move this style into Tasty styles.",
    },
    schema: [
      {
        type: 'object',
        properties: {
          elements: { type: 'string', enum: ['tasty', 'components', 'all'] },
          values: { type: 'string', enum: ['all', 'static'] },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ elements: 'tasty', values: 'all' }],
  create(context, [{ elements = 'tasty', values = 'all' }]) {
    const ctx = new TastyContext(context);

    /** The style's own value: the attribute's expression or the spread key's. */
    function styleValue(node: JSXPropNode): TSESTree.Node | null {
      if (node.type === 'Property') return unwrapExpression(node.value);
      if (node.value?.type !== 'JSXExpressionContainer') return null;
      const expression = node.value.expression;
      return expression.type === 'JSXEmptyExpression'
        ? null
        : unwrapExpression(expression);
    }

    /** The object a style is written as, inline or through a local `const`. */
    function styleObject(
      value: TSESTree.Node | null,
    ): TSESTree.ObjectExpression | null {
      if (value?.type === 'ObjectExpression') return value;
      if (value?.type !== 'Identifier') return null;
      let scope: ReturnType<typeof context.sourceCode.getScope> | null =
        context.sourceCode.getScope(value);
      while (scope && !scope.set.has(value.name)) scope = scope.upper;
      const variable = scope?.set.get(value.name);
      const def = variable?.defs.length === 1 ? variable.defs[0] : undefined;
      if (
        def?.type !== 'Variable' ||
        def.parent.kind !== 'const' ||
        !def.node.init
      ) {
        return null;
      }
      const init = unwrapExpression(def.node.init);
      return init.type === 'ObjectExpression' ? init : null;
    }

    return jsxPropListeners(ctx, KINDS[elements], (name, node, kind) => {
      if (name !== 'style') return;
      const object = styleObject(styleValue(node));

      for (const prop of object?.properties ?? []) {
        if (prop.type !== 'Property') continue;
        const text = getStringValue(unwrapExpression(prop.value));
        const word = text === null ? null : tastySyntaxWord(text, ctx.config);
        if (word !== null) {
          context.report({ node, messageId: 'tastySyntax', data: { word } });
          return;
        }
      }

      if (values === 'static') {
        if (object && isStaticValue(object)) {
          context.report({ node, messageId: 'staticStyle' });
        }
        return;
      }

      context.report({
        node,
        messageId: kind === 'tasty' ? 'noStyleProp' : 'noInlineStyle',
      });
    });
  },
});
