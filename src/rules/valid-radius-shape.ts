import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { getKeyName, getStringValue } from '../utils.js';
import { RADIUS_SHAPES } from '../constants.js';

type MessageIds = 'unknownShape';

const SHAPE_LIKE = /^[a-z]+$/;

export default createRule<[], MessageIds>({
  name: 'valid-radius-shape',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Validate special shape keywords used with the radius property',
    },
    messages: {
      unknownShape:
        "Unknown radius shape '{{shape}}'. Valid shapes: {{valid}}.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    function checkRadiusValue(value: string, node: TSESTree.Node): void {
      const trimmed = value.trim();
      // Only check single-word values that look like keywords
      if (!SHAPE_LIKE.test(trimmed)) return;

      // Known valid keywords
      if (RADIUS_SHAPES.has(trimmed)) return;
      if (trimmed === 'true' || trimmed === 'false') return;
      if (trimmed === 'none' || trimmed === 'inherit' || trimmed === 'initial')
        return;

      // Check if it's a directional modifier (handled elsewhere)
      const directions = new Set([
        'top',
        'right',
        'bottom',
        'left',
        'top-left',
        'top-right',
        'bottom-left',
        'bottom-right',
      ]);
      if (directions.has(trimmed)) return;

      // It looks like they tried to use a shape keyword
      const suggestion = findClosestShape(trimmed);
      const validList = [...RADIUS_SHAPES].join(', ');

      context.report({
        node,
        messageId: 'unknownShape',
        data: {
          shape: trimmed,
          valid:
            validList + (suggestion ? `. Did you mean '${suggestion}'?` : ''),
        },
      });
    }

    function findClosestShape(input: string): string | null {
      for (const shape of RADIUS_SHAPES) {
        if (
          shape.startsWith(input.slice(0, 3)) ||
          input.startsWith(shape.slice(0, 3))
        ) {
          return shape;
        }
      }
      return null;
    }

    function handleStyleObject(node: TSESTree.ObjectExpression) {
      if (!ctx.isStyleObject(node)) return;

      for (const prop of node.properties) {
        if (prop.type !== 'Property' || prop.computed) continue;

        const key = getKeyName(prop.key);
        if (key !== 'radius') continue;

        const str = getStringValue(prop.value);
        if (str) {
          checkRadiusValue(str, prop.value);
          continue;
        }

        if (prop.value.type === 'ObjectExpression') {
          for (const stateProp of prop.value.properties) {
            if (stateProp.type !== 'Property') continue;
            const stateStr = getStringValue(stateProp.value);
            if (stateStr) {
              checkRadiusValue(stateStr, stateProp.value);
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
