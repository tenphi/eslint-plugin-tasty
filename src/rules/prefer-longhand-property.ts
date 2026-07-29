import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { getKeyName } from '../utils.js';
import { LONGHAND_MAPPING } from '../constants.js';

type MessageIds = 'preferLonghand';

export default createRule<[], MessageIds>({
  name: 'prefer-longhand-property',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow lossy CSS shorthands whose longhands are the preferred Tasty form',
    },
    messages: {
      preferLonghand:
        "'{{shorthand}}' resets the components you omit to non-initial values. Use {{alternative}} instead.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    function handleStyleObject(node: TSESTree.ObjectExpression) {
      if (!ctx.isStyleObject(node)) return;

      for (const prop of node.properties) {
        if (prop.type !== 'Property' || prop.computed) continue;

        const key = getKeyName(prop.key);
        if (key === null) continue;

        const mapping = LONGHAND_MAPPING[key];
        if (!mapping) continue;

        // Report-only: splitting the shorthand requires knowing which of the
        // three components the author actually meant to set.
        context.report({
          node: prop.key,
          messageId: 'preferLonghand',
          data: { shorthand: key, alternative: mapping.hint },
        });
      }
    }

    return {
      ImportDeclaration(node) {
        ctx.trackImport(node);
      },
      ...styleObjectListeners(handleStyleObject),
    };
  },
});
