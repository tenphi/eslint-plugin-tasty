import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext, styleObjectListeners } from '../context.js';
import { getKeyName, getStringValue } from '../utils.js';

type MessageIds =
  | 'preferCustomPropertySyntax'
  | 'preferColorToken'
  | 'preferClearToken'
  | 'preferCurrentToken';

const VAR_REGEX = /var\(\s*--([a-zA-Z0-9_-]+)\s*(?:,\s*([^)]+))?\s*\)/g;
// `$x-color` → `#x`. Negative lookbehind avoids `$$func` / `##transition`.
// `\b` after `-color` avoids matching `$x-colorful`. Optional opacity suffix.
const COLOR_PROP_REGEX =
  /(?<![$#])\$([a-zA-Z][a-zA-Z0-9_-]*)-color\b(\.[0-9]+|\.\$[a-zA-Z][a-zA-Z0-9_-]*)?/g;
const KEYWORD_REGEX = /\b(transparent|currentColor)\b/gi;

function normalizeFallback(fallback: string): string {
  const trimmed = fallback.trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'transparent') return '#clear';
  if (lower === 'currentcolor') return '#current';
  return trimmed;
}

function suggestVarSyntax(name: string, fallback?: string): string {
  if (name.endsWith('-color')) {
    const tokenName = name.slice(0, -'-color'.length);
    const tastyToken = `#${tokenName}`;
    if (fallback) {
      return `(${tastyToken}, ${normalizeFallback(fallback)})`;
    }
    return tastyToken;
  }

  const propToken = `$${name}`;
  if (fallback) {
    return `(${propToken}, ${normalizeFallback(fallback)})`;
  }
  return propToken;
}

interface Span {
  start: number;
  end: number;
}

function isInsideSpans(start: number, end: number, spans: Span[]): boolean {
  for (const span of spans) {
    if (start >= span.start && end <= span.end) return true;
  }
  return false;
}

export default createRule<[], MessageIds>({
  name: 'prefer-custom-property-syntax',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prefer Tasty token syntax ($prop, #color, #clear, #current) over raw CSS (var(), $x-color, transparent, currentColor)',
    },
    messages: {
      preferCustomPropertySyntax:
        "Use Tasty token syntax '{{suggestion}}' instead of '{{raw}}'.",
      preferColorToken:
        "Use color token '{{suggestion}}' instead of custom property reference '{{raw}}'.",
      preferClearToken:
        "Use the '#clear' token instead of the 'transparent' keyword.",
      preferCurrentToken:
        "Use the '#current' token instead of the 'currentColor' keyword.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    function checkValue(value: string, node: TSESTree.Node): void {
      // Pass 1: var(--x) / var(--x, fallback) → $x / (#x, fallback).
      // Records spans so standalone keywords inside var() aren't double-reported.
      const varSpans: Span[] = [];
      VAR_REGEX.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = VAR_REGEX.exec(value)) !== null) {
        const raw = match[0];
        const name = match[1];
        const fallback = match[2];
        const suggestion = suggestVarSyntax(name, fallback);

        if (match.index !== undefined) {
          varSpans.push({
            start: match.index,
            end: match.index + raw.length,
          });
        }

        context.report({
          node,
          messageId: 'preferCustomPropertySyntax',
          data: { raw, suggestion },
        });
      }

      // Pass 2: $x-color → #x.
      COLOR_PROP_REGEX.lastIndex = 0;
      while ((match = COLOR_PROP_REGEX.exec(value)) !== null) {
        const raw = match[0];
        const name = match[1];
        const opacity = match[2] ?? '';
        const suggestion = `#${name}${opacity}`;

        context.report({
          node,
          messageId: 'preferColorToken',
          data: { raw, suggestion },
        });
      }

      // Pass 3: standalone transparent / currentColor (skip inside var()).
      KEYWORD_REGEX.lastIndex = 0;
      while ((match = KEYWORD_REGEX.exec(value)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        if (isInsideSpans(start, end, varSpans)) continue;

        const lower = match[0].toLowerCase();
        context.report({
          node,
          messageId:
            lower === 'transparent' ? 'preferClearToken' : 'preferCurrentToken',
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
