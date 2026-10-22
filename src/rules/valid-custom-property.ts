import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import { stringStyleValueListeners } from '../style-values.js';
import { BUILT_IN_CUSTOM_PROPERTIES } from '../constants.js';
import { getKeyName, getStringValue, unwrapExpression } from '../utils.js';
import { scanValueWords } from '../value-words.js';

type MessageIds = 'invalidSyntax' | 'unknownProperty';

interface PendingExistenceCheck {
  token: string;
  baseName: string;
  node: TSESTree.Node;
}

export default createRule<[], MessageIds>({
  name: 'valid-custom-property',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Validate $name custom property references',
    },
    messages: {
      invalidSyntax:
        "Invalid custom property '{{token}}'. Use '$name' with letters, digits, or hyphens (e.g. $accent-color).",
      unknownProperty:
        "Unknown custom property '{{token}}'. Declare it as a '$name' key in a styles object or 'tokens' prop in this file, or add it to your tasty config.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);
    const fileCustomProperties = new Set<string>();
    const pendingChecks: PendingExistenceCheck[] = [];

    function collectLocalProperties(node: TSESTree.ObjectExpression): void {
      for (const prop of node.properties) {
        if (prop.type !== 'Property' || prop.computed) continue;
        const key = getKeyName(prop.key);
        if (key && key.startsWith('$') && !key.startsWith('$$')) {
          fileCustomProperties.add(key);
        }
      }
    }

    /**
     * Tokens declare custom properties too: `tokens={{ $progress: … }}` on an
     * element, a `tokens` option of a component definition, and a raw
     * `'--progress'` entry of an inline `style`, which sets the same property.
     */
    function collectDeclaredTokens(
      node: TSESTree.ObjectExpression,
      prefix: '$' | '--',
    ): void {
      for (const prop of node.properties) {
        if (prop.type !== 'Property') continue;
        const key = prop.computed
          ? getStringValue(unwrapExpression(prop.key))
          : getKeyName(prop.key);
        if (key === null) continue;
        const name =
          prefix === '$' ? key : key.startsWith('--') ? '$' + key.slice(2) : '';
        if (/^\$[^$]/.test(name)) fileCustomProperties.add(name);
      }
    }

    function checkValue(value: string, node: TSESTree.Node): void {
      if (ctx.config.tokens === false) return;

      for (const word of scanValueWords(value)) {
        // A dynamic color opacity is another custom-property reference.
        const token =
          word.value.startsWith('#') && word.value.includes('.$')
            ? word.value.slice(word.value.indexOf('.$') + 1)
            : word.value;
        if (!token.startsWith('$')) continue;
        if (
          token.startsWith('$$') &&
          word.isFunction &&
          value[word.offset + word.value.length] === '('
        )
          continue;
        const baseName = token.startsWith('$$') ? '$' + token.slice(2) : token;

        if (BUILT_IN_CUSTOM_PROPERTIES.has(baseName)) continue;

        pendingChecks.push({ token, baseName, node });
      }
    }

    const listeners = stringStyleValueListeners(ctx, checkValue, {
      onStyleObject: collectLocalProperties,
      onProgramExit() {
        if (
          !Array.isArray(ctx.config.tokens) ||
          ctx.config.tokens.length === 0
        ) {
          return;
        }

        for (const { token, baseName, node } of pendingChecks) {
          if (fileCustomProperties.has(baseName)) continue;
          if (ctx.config.tokens.includes(baseName)) continue;

          context.report({
            node,
            messageId: 'unknownProperty',
            data: { token },
          });
        }
      },
    });

    return {
      ...listeners,
      JSXAttribute(node: TSESTree.JSXAttribute) {
        listeners.JSXAttribute(node);
        if (node.name.type !== 'JSXIdentifier') return;
        const name = node.name.name;
        if (name !== 'tokens' && name !== 'style') return;
        if (node.value?.type !== 'JSXExpressionContainer') return;
        const value = unwrapExpression(node.value.expression);
        if (value.type !== 'ObjectExpression') return;
        collectDeclaredTokens(value, name === 'tokens' ? '$' : '--');
      },
      Property(node: TSESTree.Property) {
        if (node.computed || getKeyName(node.key) !== 'tokens') return;
        const value = unwrapExpression(node.value);
        const call = node.parent.parent;
        if (
          value.type !== 'ObjectExpression' ||
          call?.type !== 'CallExpression'
        )
          return;
        const imp = ctx.isTastyCall(call);
        if (
          imp?.importedName === 'tasty' ||
          (imp &&
            ctx.config.styleFunctions?.[imp.importedName]?.kind === 'options')
        ) {
          collectDeclaredTokens(value, '$');
        }
      },
    };
  },
});
