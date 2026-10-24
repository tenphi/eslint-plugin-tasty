import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import {
  type JSXElementKind,
  jsxPropListeners,
} from './tasty-component-props.js';

type Elements = 'tasty' | 'components' | 'all';

const KINDS: Record<Elements, ReadonlySet<JSXElementKind>> = {
  tasty: new Set(['tasty']),
  components: new Set(['tasty', 'component']),
  all: new Set(['tasty', 'component', 'element']),
};

export default createRule<
  [{ elements?: Elements }],
  'noStyleProp' | 'noInlineStyle'
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
    },
    schema: [
      {
        type: 'object',
        properties: {
          elements: { type: 'string', enum: ['tasty', 'components', 'all'] },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ elements: 'tasty' }],
  create(context, [{ elements = 'tasty' }]) {
    const ctx = new TastyContext(context);
    return jsxPropListeners(ctx, KINDS[elements], (name, node, kind) => {
      if (name !== 'style') return;
      context.report({
        node,
        messageId: kind === 'tasty' ? 'noStyleProp' : 'noInlineStyle',
      });
    });
  },
});
