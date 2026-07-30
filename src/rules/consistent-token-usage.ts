import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { getKeyName, getStringValue } from '../utils.js';
import { replaceStringValue, replaceInStringValue } from '../fix-utils.js';

type MessageIds = 'preferToken' | 'replaceWithToken';

const PX_TO_UNIT: Record<string, string> = {
  '8px': '1x',
  '16px': '2x',
  '24px': '3x',
  '32px': '4x',
  '40px': '5x',
  '48px': '6x',
  '56px': '7x',
  '64px': '8x',
};

export default createRule<[], MessageIds>({
  name: 'consistent-token-usage',
  meta: {
    type: 'suggestion',
    hasSuggestions: true,
    docs: {
      description:
        'Suggest using design tokens and custom units instead of raw CSS values',
    },
    messages: {
      preferToken: "Consider using '{{suggestion}}' instead of '{{raw}}'.",
      replaceWithToken: "Replace '{{raw}}' with '{{suggestion}}'",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    function checkValue(
      property: string,
      value: string,
      node: TSESTree.Node,
    ): void {
      const trimmed = value.trim();

      // Check pixel values that map to gap multiples
      if (trimmed in PX_TO_UNIT) {
        const suggestion = PX_TO_UNIT[trimmed];
        context.report({
          node,
          messageId: 'preferToken',
          data: { suggestion, raw: trimmed },
          suggest: [
            {
              messageId: 'replaceWithToken',
              data: { raw: trimmed, suggestion },
              fix(fixer) {
                return replaceStringValue(fixer, node, suggestion);
              },
            },
          ],
        });
        return;
      }

      // Check 6px in radius context
      if (property === 'radius' && trimmed === '6px') {
        context.report({
          node,
          messageId: 'preferToken',
          data: { suggestion: '1r', raw: '6px' },
          suggest: [
            {
              messageId: 'replaceWithToken',
              data: { raw: '6px', suggestion: '1r' },
              fix(fixer) {
                return replaceStringValue(fixer, node, '1r');
              },
            },
          ],
        });
        return;
      }

      // Check 1px in border context
      if (property === 'border' && trimmed.includes('1px')) {
        const edits: { start: number; end: number; replacement: string }[] = [];
        const re = /\b1px\b/g;
        let match: RegExpExecArray | null;
        while ((match = re.exec(value)) !== null) {
          edits.push({
            start: match.index,
            end: match.index + match[0].length,
            replacement: '1bw',
          });
        }
        if (edits.length === 0) return;
        context.report({
          node,
          messageId: 'preferToken',
          data: { suggestion: '1bw', raw: '1px' },
          suggest: [
            {
              messageId: 'replaceWithToken',
              data: { raw: '1px', suggestion: '1bw' },
              fix(fixer) {
                return replaceInStringValue(
                  fixer,
                  node,
                  edits,
                  context.sourceCode,
                );
              },
            },
          ],
        });
      }
    }

    function handleStyleObject(node: TSESTree.ObjectExpression) {
      if (!ctx.isStyleObject(node)) return;

      for (const prop of node.properties) {
        if (prop.type !== 'Property' || prop.computed) continue;

        const key = getKeyName(prop.key);
        if (key === null) continue;

        const str = getStringValue(prop.value);
        if (str) {
          checkValue(key, str, prop.value);
          continue;
        }

        // Only recurse into genuine state maps. Sub-element objects
        // (`Icon: { … }`) are style objects in their own right and are visited
        // separately by the listener, so treating them as state maps here both
        // double-reports and attributes the value to the wrong property.
        if (
          prop.value.type === 'ObjectExpression' &&
          ctx.isStateMap(prop.value, prop)
        ) {
          for (const stateProp of prop.value.properties) {
            if (stateProp.type !== 'Property') continue;
            const stateStr = getStringValue(stateProp.value);
            if (stateStr) {
              checkValue(key, stateStr, stateProp.value);
            }
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
