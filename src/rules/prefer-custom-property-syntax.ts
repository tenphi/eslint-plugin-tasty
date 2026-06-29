import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { getKeyName, getStringValue } from '../utils.js';

type MessageIds = 'preferCustomPropertySyntax';

const VAR_REGEX = /var\(\s*--([a-zA-Z0-9_-]+)\s*(?:,\s*([^)]+))?\s*\)/g;

function suggestVarSyntax(name: string, fallback?: string): string {
  if (name.endsWith('-color')) {
    const tokenName = name.slice(0, -'-color'.length);
    const tastyToken = `#${tokenName}`;
    if (fallback) {
      return `(${tastyToken}, ${fallback.trim()})`;
    }
    return tastyToken;
  }

  const propToken = `$${name}`;
  if (fallback) {
    return `(${propToken}, ${fallback.trim()})`;
  }
  return propToken;
}

export default createRule<[], MessageIds>({
  name: 'prefer-custom-property-syntax',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Suggest Tasty $prop and (#color, fallback) syntax instead of var(--prop)',
    },
    messages: {
      preferCustomPropertySyntax:
        "Use Tasty token syntax '{{suggestion}}' instead of '{{raw}}'.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    function checkValue(value: string, node: TSESTree.Node): void {
      VAR_REGEX.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = VAR_REGEX.exec(value)) !== null) {
        const raw = match[0];
        const name = match[1];
        const fallback = match[2];
        const suggestion = suggestVarSyntax(name, fallback);

        context.report({
          node,
          messageId: 'preferCustomPropertySyntax',
          data: { raw, suggestion },
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

        const str = getStringValue(prop.value);
        if (str) {
          checkValue(str, prop.value);
          continue;
        }

        if (prop.value.type === 'ObjectExpression') {
          for (const stateProp of prop.value.properties) {
            if (stateProp.type !== 'Property') continue;
            const stateStr = getStringValue(stateProp.value);
            if (stateStr) {
              checkValue(stateStr, stateProp.value);
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
