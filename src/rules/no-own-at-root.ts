import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { getKeyName, getStringValue } from '../utils.js';
import {
  getOwnUnwrapEdits,
  parseStateKey,
} from '../parsers/state-key-parser.js';
import { replaceInStringValue } from '../fix-utils.js';

type MessageIds = 'ownAtRoot';

export default createRule<[], MessageIds>({
  name: 'no-own-at-root',
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description:
        'Warn when @own() is used outside sub-element styles where it is redundant',
    },
    messages: {
      ownAtRoot:
        '@own() is redundant outside sub-element styles. Use the inner selector directly instead (e.g. :hover instead of @own(:hover)).',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    function handleStyleObject(node: TSESTree.ObjectExpression) {
      if (!ctx.isStyleObject(node)) return;

      if (ctx.isInsideSubElement(node)) return;
      // Shared styles may be spread into a sub-element, where `@own` matters.
      if (ctx.isSharedStyleObject(node)) return;

      for (const prop of node.properties) {
        if (prop.type !== 'Property' || prop.computed) continue;

        const key = getKeyName(prop.key);
        if (key === null) continue;

        if (/^[A-Z]/.test(key) || key.startsWith('@') || key.startsWith('&'))
          continue;

        if (prop.value.type !== 'ObjectExpression') continue;

        for (const stateProp of prop.value.properties) {
          if (stateProp.type !== 'Property') continue;

          const stateKey = !stateProp.computed
            ? getKeyName(stateProp.key)
            : getStringValue(stateProp.key);
          if (stateKey === null || stateKey === '' || stateKey === '_')
            continue;

          const result = parseStateKey(stateKey);

          if (result.hasOwn) {
            context.report({
              node: stateProp.key,
              messageId: 'ownAtRoot',
              fix(fixer) {
                const edits = getOwnUnwrapEdits(stateKey);
                if (edits.length === 0) return null;
                return replaceInStringValue(
                  fixer,
                  stateProp.key,
                  edits,
                  context.sourceCode,
                );
              },
            });
          }
        }
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
