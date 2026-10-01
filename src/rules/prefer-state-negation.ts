import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { getKeyName, getStringValue } from '../utils.js';
import { getStateNegationEdits } from '../parsers/state-key-parser.js';
import { replaceInStringValue } from '../fix-utils.js';
import type { StringEdit } from '../fix-utils.js';

function applyEdits(value: string, edits: StringEdit[]): string {
  return edits.reduceRight(
    (result, edit) =>
      result.slice(0, edit.start) + edit.replacement + result.slice(edit.end),
    value,
  );
}

export default createRule<[], 'preferStateNegation'>({
  name: 'prefer-state-negation',
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: {
      description: 'Prefer the ! prefix over top-level :not() in state keys',
    },
    messages: {
      preferStateNegation:
        "Use the '!' prefix instead of top-level :not() in state keys.",
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
        if (
          key === null ||
          /^[A-Z@&]/.test(key) ||
          prop.value.type !== 'ObjectExpression'
        )
          continue;

        for (const stateProp of prop.value.properties) {
          if (stateProp.type !== 'Property') continue;
          const stateKey = !stateProp.computed
            ? getKeyName(stateProp.key)
            : getStringValue(stateProp.key);
          if (stateKey === null) continue;

          const edits = getStateNegationEdits(stateKey);
          if (edits.length === 0) continue;

          // Fix a whole key together so repeated :not() atoms never compete.
          context.report({
            node: stateProp.key,
            messageId: 'preferStateNegation',
            fix(fixer) {
              const replacement = applyEdits(stateKey, edits);
              // Never overwrite another entry when two spellings coexist.
              const collision =
                prop.value.type === 'ObjectExpression' &&
                prop.value.properties.some((other) => {
                  if (other === stateProp || other.type !== 'Property')
                    return false;
                  const otherKey = other.computed
                    ? getStringValue(other.key)
                    : getKeyName(other.key);
                  return (
                    otherKey !== null &&
                    applyEdits(otherKey, getStateNegationEdits(otherKey)) ===
                      replacement
                  );
                });
              if (collision) return null;
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

    return {
      ImportDeclaration(node) {
        ctx.trackImport(node);
      },
      ...styleObjectListeners(handleStyleObject),
    };
  },
});
