import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import { tastyComponentPropListeners } from './tasty-component-props.js';

export default createRule<[], 'noClassNameProp'>({
  name: 'no-classname-prop',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prefer Tasty styling and data-element identities over className',
    },
    messages: {
      noClassNameProp:
        "Avoid the 'className' prop on Tasty components. Keep styling in Tasty; for sub-element styling, use data-element=\"Name\" and define the matching capitalized sub-element in the parent's styles. If a third-party library requires classes, explicitly disable tasty/no-classname-prop for this usage with an ESLint comment and a reason.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);
    return tastyComponentPropListeners(ctx, (name, node) => {
      if (name === 'className')
        context.report({ node, messageId: 'noClassNameProp' });
    });
  },
});
