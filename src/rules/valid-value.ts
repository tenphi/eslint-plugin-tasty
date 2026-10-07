import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../create-rule.js';
import { TastyContext } from '../context.js';
import { stringStyleValueListeners } from '../style-values.js';
import { parseValue } from '../parsers/value-parser.js';
import type { ValueParserOptions } from '../parsers/value-parser.js';
import { getExpectation } from '../property-expectations.js';

const SKIP_PROPERTIES = new Set([
  'recipe',
  'preset',
  'transition',
  '@keyframes',
  '@property',
  '@font-face',
  '@counter-style',
  '@function',
  'content',
  'animation',
  'animationName',
  'gridArea',
  'gridAreas',
  'gridColumn',
  'gridColumnStart',
  'gridColumnEnd',
  'gridRow',
  'gridRowStart',
  'gridRowEnd',
  'gridTemplate',
  'gridTemplateAreas',
  'gridTemplateColumns',
  'gridTemplateRows',
  'listStyle',
  'willChange',
]);

type MessageIds =
  | 'unbalancedParens'
  | 'importantNotAllowed'
  | 'unexpectedMod'
  | 'unexpectedColor'
  | 'invalidMod'
  | 'unknownToken'
  | 'parseError';

export default createRule<[], MessageIds>({
  name: 'valid-value',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Parse style values through the value parser and validate against per-property expectations',
    },
    messages: {
      unbalancedParens: 'Unbalanced parentheses in value.',
      importantNotAllowed:
        'Do not use !important in tasty styles. Use state specificity instead.',
      unexpectedMod:
        "Unrecognized token '{{mod}}' in '{{property}}' value. This may be a typo.",
      unexpectedColor:
        "Property '{{property}}' does not accept color tokens, but found '{{color}}'.",
      invalidMod:
        "Modifier '{{mod}}' is not valid for '{{property}}'. Accepted: {{accepted}}.",
      unknownToken:
        "Unknown token '{{token}}' in '{{property}}' value. Check for a typo.",
      parseError: '{{message}}',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const ctx = new TastyContext(context);

    function getParserOpts(): ValueParserOptions {
      const opts: ValueParserOptions = {};
      if (ctx.config.units === false) {
        opts.skipUnitValidation = true;
      } else if (Array.isArray(ctx.config.units)) {
        opts.knownUnits = new Set(ctx.config.units);
      }
      if (ctx.config.functions === false) {
        opts.skipFuncValidation = true;
      } else if (Array.isArray(ctx.config.functions)) {
        opts.knownFuncs = new Set(ctx.config.functions);
      }
      return opts;
    }

    function checkValue(
      value: string,
      property: string | null,
      node: TSESTree.Node,
    ): void {
      if (property && SKIP_PROPERTIES.has(property)) return;

      const result = parseValue(value, getParserOpts());

      const erroredRaws = new Set<string>();

      // Report parser-level errors (bracket balance, unknown units/functions)
      for (const error of result.errors) {
        if (error.message.includes('parenthes')) {
          context.report({ node, messageId: 'unbalancedParens' });
          return;
        }
        context.report({
          node,
          messageId: 'parseError',
          data: { message: error.message },
        });
        if (error.raw) {
          erroredRaws.add(error.raw);
        }
      }

      if (!property) return;

      const expectation = getExpectation(property);

      for (const group of result.groups) {
        for (const part of group.parts) {
          for (const token of part.tokens) {
            // Check !important
            if (token.type === 'important') {
              context.report({ node, messageId: 'importantNotAllowed' });
              continue;
            }

            // Check color tokens in non-color properties
            if (
              !expectation.acceptsColor &&
              (token.type === 'color-token' || token.type === 'color-ref')
            ) {
              const colorName =
                token.type === 'color-token'
                  ? `#${token.name}`
                  : `##${token.name}`;
              context.report({
                node,
                messageId: 'unexpectedColor',
                data: { property, color: colorName },
              });
              continue;
            }

            // Check color functions in non-color properties
            if (
              !expectation.acceptsColor &&
              token.type === 'css-function' &&
              isColorFunction(token.name)
            ) {
              context.report({
                node,
                messageId: 'unexpectedColor',
                data: { property, color: `${token.name}()` },
              });
              continue;
            }

            // Skip tokens already reported via parser errors
            if (
              (token.type === 'unknown' || token.type === 'css-function') &&
              'raw' in token &&
              token.raw &&
              erroredRaws.has(token.raw)
            ) {
              continue;
            }

            // Check unknown tokens against property expectations
            if (token.type === 'unknown') {
              const raw = token.raw;

              if (expectation.acceptsMods === true) {
                // Passthrough: accept any unknown token
              } else if (expectation.acceptsMods === false) {
                context.report({
                  node,
                  messageId: 'unexpectedMod',
                  data: { property, mod: raw },
                });
              } else if (Array.isArray(expectation.acceptsMods)) {
                if (!expectation.acceptsMods.includes(raw)) {
                  context.report({
                    node,
                    messageId: 'invalidMod',
                    data: {
                      property,
                      mod: raw,
                      accepted: expectation.acceptsMods.join(', '),
                    },
                  });
                }
              }
            }
          }
        }
      }
    }

    return stringStyleValueListeners(ctx, (value, node, property) => {
      if (!/^[#$]/.test(property)) checkValue(value, property, node);
    });
  },
});

const COLOR_FUNC_NAMES = new Set([
  'rgb',
  'rgba',
  'hsl',
  'hsla',
  'hwb',
  'lab',
  'lch',
  'oklab',
  'oklch',
  'color',
  'color-mix',
  'color-contrast',
]);

function isColorFunction(name: string): boolean {
  return COLOR_FUNC_NAMES.has(name);
}
