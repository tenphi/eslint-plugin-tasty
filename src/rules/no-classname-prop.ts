import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import { isDisabledFor } from '../disable-directives.js';
import {
  PROP_RULE_DEFAULT_OPTIONS,
  PROP_RULE_SCHEMA,
  type PropRuleOptions,
  tastyComponentPropListeners,
} from './tasty-component-props.js';

export default createRule<PropRuleOptions, 'noClassNameProp'>({
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
    schema: PROP_RULE_SCHEMA,
  },
  defaultOptions: PROP_RULE_DEFAULT_OPTIONS,
  create(context, [{ alsoDisabledBy = [] }]) {
    const ctx = new TastyContext(context);
    const overlapping = new Set(alsoDisabledBy);
    return tastyComponentPropListeners(ctx, (name, node) => {
      if (
        name === 'className' &&
        !isDisabledFor(context.sourceCode, node, overlapping)
      )
        context.report({ node, messageId: 'noClassNameProp' });
    });
  },
});
