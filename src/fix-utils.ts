import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { getStringValue } from './utils.js';

/**
 * Source range of a string literal's content, excluding the surrounding
 * quotes/backticks. Returns null for non-string nodes (or template literals
 * with expressions, whose cooked value is not a simple substring of source).
 */
export function getStringContentRange(
  node: TSESTree.Node,
): { start: number; end: number } | null {
  if (node.type === 'Literal' && typeof node.value === 'string') {
    return { start: node.range[0] + 1, end: node.range[1] - 1 };
  }
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return { start: node.range[0] + 1, end: node.range[1] - 1 };
  }
  return null;
}

export interface StringEdit {
  /** Offset within the (cooked) value string where the edit starts. */
  start: number;
  /** Offset where the edit ends (exclusive). */
  end: number;
  /** Replacement text. */
  replacement: string;
}

/**
 * Build non-overlapping range fixes inside a string literal's content.
 *
 * `edits` are offsets within the value string the rule already scanned (the
 * cooked value returned by `getStringValue`). They are mapped to source ranges
 * inside the literal content.
 *
 * Escape guard: when the raw source content does not equal the cooked value
 * (i.e. the literal contains escape sequences), character offsets would drift,
 * so we bail out and emit no fix. Tasty style values rarely contain escapes,
 * so this loses almost nothing while staying correct.
 */
export function replaceInStringValue(
  fixer: TSESLint.RuleFixer,
  valueNode: TSESTree.Node,
  edits: StringEdit[],
  sourceCode: TSESLint.SourceCode,
): TSESLint.RuleFix[] | null {
  const contentRange = getStringContentRange(valueNode);
  if (!contentRange) return null;

  const rawContent = sourceCode.getText(valueNode).slice(1, -1);
  const cooked = getStringValue(valueNode);
  if (cooked === null || rawContent !== cooked) return null;

  const sorted = [...edits].sort((a, b) => a.start - b.start);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start < sorted[i - 1].end) return null;
  }

  return sorted.map((edit) =>
    fixer.replaceTextRange(
      [contentRange.start + edit.start, contentRange.start + edit.end],
      edit.replacement,
    ),
  );
}

/**
 * Replace the entire content of a string literal (keeping the surrounding
 * quotes/backticks intact). Safe for replacements that contain no quote
 * characters (true for all Tasty token rewrites).
 */
export function replaceStringValue(
  fixer: TSESLint.RuleFixer,
  valueNode: TSESTree.Node,
  newValue: string,
): TSESLint.RuleFix | null {
  const contentRange = getStringContentRange(valueNode);
  if (!contentRange) return null;
  return fixer.replaceTextRange(
    [contentRange.start, contentRange.end],
    newValue,
  );
}

/**
 * Remove an object property along with an adjacent comma so the result is
 * valid syntax. Prefers removing the comma/whitespace after the property;
 * for a trailing property, removes the comma/whitespace before it instead.
 */
export function removePropertyWithComma(
  fixer: TSESLint.RuleFixer,
  prop: TSESTree.Property,
  sourceCode: TSESLint.SourceCode,
): TSESLint.RuleFix | null {
  const objectNode = prop.parent;
  if (!objectNode || objectNode.type !== 'ObjectExpression') return null;

  const props = objectNode.properties;
  const idx = props.indexOf(prop);
  if (idx === -1) return null;

  void sourceCode;

  if (idx < props.length - 1) {
    const nextStart = props[idx + 1].range[0];
    return fixer.removeRange([prop.range[0], nextStart]);
  }

  const removeStart =
    idx > 0 ? props[idx - 1].range[1] : objectNode.range[0] + 1;
  return fixer.removeRange([removeStart, prop.range[1]]);
}

/**
 * Move a property to `targetIndex` within its parent object (indexed among
 * `Property` members only). Rebuilds the content between the braces with the
 * properties joined by `, ` — acceptable for state maps, which are simple and
 * rarely carry inline comments. Returns null when the property is already at
 * the target index.
 */
export function movePropertyToIndex(
  fixer: TSESLint.RuleFixer,
  prop: TSESTree.Property,
  targetIndex: number,
  sourceCode: TSESLint.SourceCode,
): TSESLint.RuleFix | null {
  const objectNode = prop.parent;
  if (!objectNode || objectNode.type !== 'ObjectExpression') return null;

  const props = objectNode.properties.filter(
    (p): p is TSESTree.Property => p.type === 'Property',
  );
  const idx = props.indexOf(prop);
  if (idx === -1 || idx === targetIndex) return null;

  const reordered = [...props];
  const [moved] = reordered.splice(idx, 1);
  reordered.splice(targetIndex, 0, moved);

  const newText = reordered.map((p) => sourceCode.getText(p)).join(', ');

  return fixer.replaceTextRange(
    [objectNode.range[0] + 1, objectNode.range[1] - 1],
    ` ${newText} `,
  );
}
