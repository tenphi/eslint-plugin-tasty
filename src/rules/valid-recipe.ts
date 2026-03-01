import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import { getKeyName, getStringValue } from '../utils.js';

type MessageIds = 'unknownRecipe';

export default createRule<[], MessageIds>({
  name: 'valid-recipe',
  meta: {
    type: 'problem',
    docs: {
      description: 'Validate recipe property values against config',
    },
    messages: {
      unknownRecipe: "Unknown recipe '{{name}}'.",
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

    function checkObject(node: TSESTree.ObjectExpression): void {
      if (!ctx.isStyleObject(node)) return;

      for (const prop of node.properties) {
        if (prop.type !== 'Property' || prop.computed) continue;

        const key = getKeyName(prop.key);
        if (key !== 'recipe') continue;

        const str = getStringValue(prop.value);
        if (str) {
          checkRecipeValue(str, prop.value);
        }
      }
    }

    return {
      ImportDeclaration(node) {
        ctx.trackImport(node);
      },

      ObjectExpression: checkObject,
    };
  },
});
