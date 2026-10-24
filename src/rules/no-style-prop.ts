import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import { isDisabledFor } from '../disable-directives.js';
import {
  PROP_RULE_DEFAULT_OPTIONS,
  PROP_RULE_SCHEMA,
  type PropRuleOptions,
  tastyComponentPropListeners,
} from './tasty-component-props.js';

export default createRule<PropRuleOptions, 'noStyleProp'>({
  name: 'no-style-prop',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer tokens over React inline style on Tasty components',
    },
    messages: {
      noStyleProp:
        "Avoid the 'style' prop on Tasty components. Define styles with token references and pass dynamic values through 'tokens' (e.g. tokens={{ $size: value }}). If a third-party library requires inline styles, explicitly disable tasty/no-style-prop for this usage with an ESLint comment and a reason.",
    },
    schema: PROP_RULE_SCHEMA,
  },
  defaultOptions: PROP_RULE_DEFAULT_OPTIONS,
  create(context, [{ alsoDisabledBy = [] }]) {
    const ctx = new TastyContext(context);
    const overlapping = new Set(alsoDisabledBy);
    return tastyComponentPropListeners(ctx, (name, node) => {
      if (
        name === 'style' &&
        !isDisabledFor(context.sourceCode, node, overlapping)
      )
        context.report({ node, messageId: 'noStyleProp' });
    });
  },
});
