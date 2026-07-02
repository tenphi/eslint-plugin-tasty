import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { getKeyName, getStringValue } from '../utils.js';
import { parseStateKey } from '../parsers/state-key-parser.js';
import { replaceStringValue } from '../fix-utils.js';

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

    function isInsideSubElement(node: TSESTree.Node): boolean {
      let current: TSESTree.Node | undefined = node.parent;
      while (current) {
        if (
          current.type === 'Property' &&
          !current.computed &&
          current.key.type === 'Identifier' &&
          /^[A-Z]/.test(current.key.name)
        ) {
          return true;
        }
        current = current.parent;
      }
      return false;
    }

    function handleStyleObject(node: TSESTree.ObjectExpression) {
      if (!ctx.isStyleObject(node)) return;

      const insideSubElement = isInsideSubElement(node);

      if (insideSubElement) return;

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
                if (!stateKey.startsWith('@own(') || !stateKey.endsWith(')')) {
                  return null;
                }
                const inner = stateKey.slice(5, -1);
                if (!inner) return null;
                return replaceStringValue(fixer, stateProp.key, inner);
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
