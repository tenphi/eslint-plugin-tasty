import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { replaceInStringValue } from '../fix-utils.js';
import { scanTokens, type ScannedToken } from '../parsers/utils.js';
import { getKeyName, getStringValue } from '../utils.js';
import {
  getDurationTokens,
  hasRawTimeInExpression,
  isNonzeroTime,
  isTimeExpression,
  isTimeLiteral,
  isZeroTime,
} from './motion-duration-utils.js';

type MessageIds = 'rawMotionDuration' | 'useDurationToken';

const PROPERTIES = new Set([
  'animation',
  'animationDuration',
  'transitionDuration',
]);

export default createRule<[], MessageIds>({
  name: 'no-raw-motion-duration',
  meta: {
    type: 'suggestion',
    hasSuggestions: true,
    docs: {
      description:
        'Suggest motion tokens for animation and explicit CSS duration properties',
    },
    messages: {
      rawMotionDuration:
        "{{property}} duration '{{duration}}' is hardcoded. Use a duration token.",
      useDurationToken: "Replace '{{duration}}' with '{{token}}'",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);
    const durationTokens = getDurationTokens(ctx.config.tokens);

    function checkDuration(
      token: ScannedToken,
      property: string,
      node: TSESTree.Node,
    ): void {
      const value = token.value;
      if (!isNonzeroTime(value) && !hasRawTimeInExpression(value)) return;

      // Animation has no implicit timing token. Only names that read as an
      // animation or generic duration are useful suggestions for that property.
      const candidates =
        property === 'transitionDuration'
          ? durationTokens
          : durationTokens.filter((name) => /animation|duration/i.test(name));
      const isLiteral = isTimeLiteral(value);
      context.report({
        node,
        messageId: 'rawMotionDuration',
        data: { property, duration: value },
        suggest: isLiteral
          ? candidates.map((candidate) => ({
              messageId: 'useDurationToken' as const,
              data: { duration: value, token: candidate },
              fix: (fixer: Parameters<typeof replaceInStringValue>[0]) =>
                replaceInStringValue(
                  fixer,
                  node,
                  [
                    {
                      start: token.offset,
                      end: token.offset + value.length,
                      replacement: candidate,
                    },
                  ],
                  context.sourceCode,
                ),
            }))
          : [],
      });
    }

    function checkGroup(
      group: ScannedToken[],
      property: string,
      node: TSESTree.Node,
    ): void {
      for (const token of group) {
        // The first time in an animation shorthand is its duration; a second
        // time is a delay. A variable can also be a duration, so stop there
        // rather than misreporting a later literal delay.
        if (
          property === 'animation' &&
          (/^\$[\w-]+$/.test(token.value) ||
            /^var\(/i.test(token.value) ||
            isZeroTime(token.value) ||
            (isTimeExpression(token.value) &&
              !hasRawTimeInExpression(token.value)))
        ) {
          return;
        }
        if (isTimeLiteral(token.value)) {
          checkDuration(token, property, node);
          if (property === 'animation') return;
        } else if (hasRawTimeInExpression(token.value)) {
          checkDuration(token, property, node);
          if (property === 'animation') return;
        }
      }
    }

    function checkValue(
      value: string,
      property: string,
      node: TSESTree.Node,
    ): void {
      let group: ScannedToken[] = [];
      for (const token of scanTokens(value)) {
        if (token.value) group.push(token);
        if (token.isComma) {
          checkGroup(group, property, node);
          group = [];
        }
      }
      checkGroup(group, property, node);
    }

    function handleStyleObject(node: TSESTree.ObjectExpression): void {
      if (!ctx.isStyleObject(node)) return;

      for (const prop of node.properties) {
        if (prop.type !== 'Property' || prop.computed) continue;
        const key = getKeyName(prop.key);
        if (!key || !PROPERTIES.has(key)) continue;

        const value = getStringValue(prop.value);
        if (value) {
          checkValue(value, key, prop.value);
        } else if (
          prop.value.type === 'ObjectExpression' &&
          ctx.isStateMap(prop.value, prop)
        ) {
          for (const stateProp of prop.value.properties) {
            if (stateProp.type !== 'Property') continue;
            const stateValue = getStringValue(stateProp.value);
            if (stateValue) checkValue(stateValue, key, stateProp.value);
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
