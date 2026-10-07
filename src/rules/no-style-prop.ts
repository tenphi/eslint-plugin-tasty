import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import { tastyComponentPropListeners } from './tasty-component-props.js';

export default createRule<[], 'noStyleProp'>({
  name: 'no-style-prop',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer tokens over React inline style on Tasty components',
    },
    messages: {
      noStyleProp:
        "Avoid the 'style' prop on Tasty components. Define styles with token references and pass dynamic values through 'tokens' (e.g. tokens={{ $size: value }}).",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);
    return tastyComponentPropListeners(ctx, (name, node) => {
      if (name === 'style') context.report({ node, messageId: 'noStyleProp' });
    });
  },
});
