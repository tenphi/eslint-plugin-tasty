import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { getKeyName } from '../utils.js';
import { removePropertyWithComma, movePropertyToIndex } from '../fix-utils.js';

type MessageIds =
  | 'misplacedDefaultState'
  | 'misplacedFloorState'
  | 'redundantDefaultState';

function getStateKeyName(key: TSESTree.Node): string | null {
  if (key.type === 'Identifier') return key.name;
  if (key.type === 'Literal' && typeof key.value === 'string') return key.value;
  return null;
}

export default createRule<[], MessageIds>({
  name: 'valid-default-state-order',
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description:
        "Warn when the default ('') state or '_' fallback floor is misplaced or redundant",
    },
    messages: {
      misplacedDefaultState:
        "Default state ('') in '{{property}}' must be the first key in the state map (or right after the '_' floor when present). Move it before other states — otherwise it overrides them at runtime.",
      misplacedFloorState:
        "Fallback floor ('_') in '{{property}}' must be the first key in the state map, above the '' default. Move it to the top — it is the lowest-priority cascade layer.",
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

      // 1. Both '' and '_' present with no other states → '' is redundant.
      if (defaultIndex !== -1 && floorIndex !== -1 && stateKeys.length === 2) {
        context.report({
          node: stateKeys[defaultIndex].node.key,
          messageId: 'redundantDefaultState',
          data: { property },
          fix(fixer) {
            return removePropertyWithComma(
              fixer,
              stateKeys[defaultIndex].node,
              context.sourceCode,
            );
          },
        });
        return;
      }

      // 2. '_' present but not first → move it to the top. Re-evaluated next
      //    pass so a misplaced '' is handled afterwards.
      if (floorIndex !== -1 && floorIndex !== 0) {
        context.report({
          node: stateKeys[floorIndex].node.key,
          messageId: 'misplacedFloorState',
          data: { property },
          fix(fixer) {
            return movePropertyToIndex(
              fixer,
              stateKeys[floorIndex].node,
              0,
              context.sourceCode,
            );
          },
        });
        return;
      }

      // 3. '_' at top, '' present but not right after it → move '' to index 1.
      if (floorIndex === 0 && defaultIndex !== -1 && defaultIndex !== 1) {
        context.report({
          node: stateKeys[defaultIndex].node.key,
          messageId: 'misplacedDefaultState',
          data: { property },
          fix(fixer) {
            return movePropertyToIndex(
              fixer,
              stateKeys[defaultIndex].node,
              1,
              context.sourceCode,
            );
          },
        });
        return;
      }

      // 4. No '_', '' not first → move '' to the top.
      if (floorIndex === -1 && defaultIndex > 0) {
        context.report({
          node: stateKeys[defaultIndex].node.key,
          messageId: 'misplacedDefaultState',
          data: { property },
          fix(fixer) {
            return movePropertyToIndex(
              fixer,
              stateKeys[defaultIndex].node,
              0,
              context.sourceCode,
            );
          },
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
