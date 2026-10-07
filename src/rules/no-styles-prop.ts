import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import { tastyComponentPropListeners } from './tasty-component-props.js';

type MessageIds = 'noStylesProp';

export default createRule<[], MessageIds>({
  name: 'no-styles-prop',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prefer tokens, mods, and styled wrappers over instance styles on Tasty components',
    },
    messages: {
      noStylesProp:
        "Avoid the 'styles' prop on Tasty components. Use 'tokens' for dynamic values, 'mods' for state changes, exposed style props or variants, or a wrapper with tasty(Component, { styles: ... }). For an edge case that requires instance overrides, explicitly disable tasty/no-styles-prop for this usage with an ESLint comment and a reason.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);
    return tastyComponentPropListeners(ctx, (name, node) => {
      if (name === 'styles')
        context.report({ node, messageId: 'noStylesProp' });
    });
  },
});
