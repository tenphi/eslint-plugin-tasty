import type { TSESTree } from '@typescript-eslint/utils';
import {
  parseStateKey,
  createStateParserContext,
  setGlobalPredefinedStates,
} from '@tenphi/tasty/core';
import type { ConditionNode } from '@tenphi/tasty/core';
import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import { getKeyName, getStringValue } from '../utils.js';

type MessageIds =
  | 'unparseable'
  | 'emptyAdvancedState'
  | 'unresolvablePredefined'
  | 'ownOutsideSubElement';

function collectIssues(
  node: ConditionNode,
  knownPredefined: Set<string>,
): string[] {
  const issues: string[] = [];

  function walk(n: ConditionNode): void {
    if (n.kind === 'true' || n.kind === 'false') return;

    if (n.kind === 'compound') {
      for (const child of n.children) {
        walk(child);
      }
      return;
    }

    switch (n.type) {
      case 'media':
        if (
          n.subtype === 'dimension' &&
          !n.dimension &&
          !n.lowerBound &&
          !n.upperBound
        ) {
          issues.push(`Empty or invalid @media dimension query in '${n.raw}'.`);
        }
        break;

      case 'container':
        if (
          n.subtype === 'dimension' &&
          !n.dimension &&
          !n.lowerBound &&
          !n.upperBound
        ) {
          issues.push(
            `Empty or invalid container dimension query in '${n.raw}'.`,
          );
        }
        break;

      case 'own':
        walk(n.innerCondition);
        break;

      case 'parent':
        if ('innerCondition' in n && n.innerCondition) {
          walk(n.innerCondition as ConditionNode);
        }
        break;

      case 'pseudo':
        if (n.raw.startsWith('@') && !knownPredefined.has(n.raw)) {
          issues.push(`Unresolvable predefined state '${n.raw}'.`);
        }
        break;

      default:
        break;
    }
  }

  walk(node);
  return issues;
}

function hasOwnState(node: ConditionNode): boolean {
  if (node.kind === 'true' || node.kind === 'false') return false;
  if (node.kind === 'compound') {
    return node.children.some(hasOwnState);
  }
  if (node.type === 'own') return true;
  return false;
}

/**
 * Matches the same tokens as tasty's internal STATE_TOKEN_PATTERN.
 * Characters not covered by this pattern (excluding whitespace/commas)
 * are flagged as unrecognized.
 */
const STATE_TOKEN_PATTERN =
  /([&|!^])|([()])|(@media:[a-z]+)|(@media\([^)]+\))|(@supports\([^()]*(?:\([^)]*\))?[^)]*\))|(@root\([^)]+\))|(@parent\([^)]+\))|(@own\([^)]+\))|(@\([^()]*(?:\([^)]*\))?[^)]*\))|(@starting)|(@[A-Za-z][A-Za-z0-9-]*)|([a-z][a-z0-9-]*(?:\^=|\$=|\*=|=)(?:"[^"]*"|'[^']*'|[^\s&|!^()]+))|([a-z][a-z0-9-]+)|(:[-a-z][a-z0-9-]*(?:\([^)]+\))?)|(\.[a-z][a-z0-9-]+)|(\[[^\]]+\])/gi;

function hasUnrecognizedTokens(stateKey: string): string | null {
  if (!stateKey.trim()) return null;

  const covered = new Set<number>();

  STATE_TOKEN_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = STATE_TOKEN_PATTERN.exec(stateKey)) !== null) {
    for (let i = match.index; i < match.index + match[0].length; i++) {
      covered.add(i);
    }
  }

  const uncovered: string[] = [];
  for (let i = 0; i < stateKey.length; i++) {
    const ch = stateKey[i];
    if (ch === ' ' || ch === '\t' || ch === ',') continue;
    if (!covered.has(i)) {
      uncovered.push(ch);
    }
  }

  if (uncovered.length > 0) {
    const chars = [...new Set(uncovered)].join('');
    return `Unrecognized characters '${chars}' in state key '${stateKey}'.`;
  }

  return null;
}

export default createRule<[], MessageIds>({
  name: 'valid-state-key',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Validate state key syntax in style mapping objects using the tasty state parser',
    },
    messages: {
      unparseable: '{{reason}}',
      emptyAdvancedState: '{{reason}}',
      unresolvablePredefined: '{{reason}}',
      ownOutsideSubElement:
        '@own() can only be used inside sub-element styles.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    const predefinedStates: Record<string, string> = {};
    for (const alias of ctx.config.states) {
      predefinedStates[alias] = alias;
    }
    setGlobalPredefinedStates(predefinedStates);

    const knownPredefined = new Set(ctx.config.states);

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

    function checkStateKey(
      key: string,
      keyNode: TSESTree.Node,
      insideSubElement: boolean,
    ): void {
      if (key === '') return;

      const tokenError = hasUnrecognizedTokens(key);
      if (tokenError) {
        context.report({
          node: keyNode,
          messageId: 'unparseable',
          data: { reason: tokenError },
        });
        return;
      }

      const parserContext = createStateParserContext();
      const result = parseStateKey(key, { context: parserContext });

      if (hasOwnState(result) && !insideSubElement) {
        context.report({
          node: keyNode,
          messageId: 'ownOutsideSubElement',
        });
      }

      const issues = collectIssues(result, knownPredefined);
      for (const reason of issues) {
        const messageId = reason.startsWith('Unresolvable')
          ? 'unresolvablePredefined'
          : reason.startsWith('Empty')
            ? 'emptyAdvancedState'
            : 'unparseable';

        context.report({
          node: keyNode,
          messageId,
          data: { reason },
        });
      }
    }

    return {
      ImportDeclaration(node) {
        ctx.trackImport(node);
      },

      'CallExpression ObjectExpression'(node: TSESTree.ObjectExpression) {
        if (!ctx.isStyleObject(node)) return;

        const insideSubElement = isInsideSubElement(node);

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
            if (stateKey === null) continue;

            checkStateKey(stateKey, stateProp.key, insideSubElement);
          }
        }
      },
    };
  },
});
