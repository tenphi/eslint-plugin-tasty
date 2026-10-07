import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import { stringStyleValueListeners } from '../style-values.js';

type MessageIds = 'unknownRecipe';

export default createRule<[], MessageIds>({
  name: 'valid-recipe',
  meta: {
    type: 'problem',
    docs: {
      description: 'Validate recipe property values against config',
    },
    messages: {
      unknownRecipe:
        "Unknown recipe '{{name}}'. Add it to 'recipes' in your tasty config, or use a configured recipe.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    function checkRecipeValue(value: string, node: TSESTree.Node): void {
      if (ctx.config.recipes.length === 0) return;

      // Split by / for pre/post merge separation
      const sections = value.split('/');
      for (const section of sections) {
        const names = section.trim().split(/\s+/);
        for (const name of names) {
          if (name.length === 0 || name === 'none') continue;
          if (!ctx.config.recipes.includes(name)) {
            context.report({
              node,
              messageId: 'unknownRecipe',
              data: { name },
            });
          }
        }
      }
    }

    return stringStyleValueListeners(ctx, (value, node, property) => {
      if (property === 'recipe') checkRecipeValue(value, node);
    });
  },
});
