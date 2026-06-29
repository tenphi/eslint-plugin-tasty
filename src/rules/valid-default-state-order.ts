import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { getKeyName } from '../utils.js';

type MessageIds = 'misplacedDefaultState' | 'redundantDefaultState';

function getStateKeyName(key: TSESTree.Node): string | null {
  if (key.type === 'Identifier') return key.name;
  if (key.type === 'Literal' && typeof key.value === 'string') return key.value;
  return null;
}

export default createRule<[], MessageIds>({
  name: 'valid-default-state-order',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        "Warn when the default ('') state is misplaced or redundant relative to the '_' fallback floor",
    },
    messages: {
      misplacedDefaultState:
        "Default state ('') in '{{property}}' must be the first key in the state map. Move it before other states — otherwise it overrides them at runtime.",
      redundantDefaultState:
        "Default state ('') in '{{property}}' is redundant when '_' is the only other state. Remove '' — '_' already provides the always-on fallback value.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    function checkStateMap(
      property: string,
      stateMap: TSESTree.ObjectExpression,
    ): void {
      const stateKeys: {
        key: string;
        node: TSESTree.Property;
      }[] = [];

      for (const prop of stateMap.properties) {
        if (prop.type !== 'Property' || prop.computed) continue;
        const stateKey = getStateKeyName(prop.key);
        if (stateKey === null) continue;
        stateKeys.push({ key: stateKey, node: prop });
      }

      const defaultIndex = stateKeys.findIndex((entry) => entry.key === '');
      const floorIndex = stateKeys.findIndex((entry) => entry.key === '_');

      if (defaultIndex !== -1 && floorIndex !== -1 && stateKeys.length === 2) {
        context.report({
          node: stateKeys[defaultIndex].node.key,
          messageId: 'redundantDefaultState',
          data: { property },
        });
        return;
      }

      if (defaultIndex > 0) {
        context.report({
          node: stateKeys[defaultIndex].node.key,
          messageId: 'misplacedDefaultState',
          data: { property },
        });
      }
    }

    function handleStyleObject(node: TSESTree.ObjectExpression) {
      if (!ctx.isStyleObject(node)) return;

      for (const prop of node.properties) {
        if (prop.type !== 'Property' || prop.computed) continue;

        const key = getKeyName(prop.key);
        if (key === null) continue;
        if (/^[A-Z@&$#]/.test(key)) continue;

        if (prop.value.type !== 'ObjectExpression') continue;
        if (!ctx.isStateMap(prop.value, prop)) continue;

        checkStateMap(key, prop.value);
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
