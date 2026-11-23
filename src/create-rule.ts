import type { ESLintUtils, TSESLint } from '@typescript-eslint/utils';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function mergeOption(defaultValue: unknown, value: unknown): unknown {
  if (!isRecord(defaultValue) || !isRecord(value)) return value;
  return Object.fromEntries(
    [...new Set([...Object.keys(defaultValue), ...Object.keys(value)])].map(
      (key) => [
        key,
        key in value
          ? mergeOption(defaultValue[key], value[key])
          : defaultValue[key],
      ],
    ),
  );
}

export function createRule<
  Options extends readonly unknown[],
  MessageIds extends string,
>({
  name,
  meta,
  defaultOptions,
  create,
}: Readonly<
  ESLintUtils.RuleWithMetaAndName<Options, MessageIds>
>): TSESLint.RuleModule<MessageIds, Options> & { name: string } {
  const defaults = meta.defaultOptions ?? defaultOptions ?? [];
  return {
    name,
    meta: {
      ...meta,
      docs: {
        ...meta.docs,
        url: `https://github.com/tenphi/eslint-plugin-tasty/blob/main/docs/rules/${name}.md`,
      },
    },
    defaultOptions,
    create(context) {
      const options = structuredClone(defaults).map((value, index) => {
        const configured = context.options?.[index];
        return configured === undefined
          ? value
          : mergeOption(value, configured);
      });
      return create(context, options as unknown as Options);
    },
  };
}
