import selectorParser from 'postcss-selector-parser';

/**
 * Tasty's pseudo-element rules (tenphi/tasty#406). When a selector ends in a
 * pseudo-element, the pseudo-element is the subject: its own states go after
 * it, and a state testing what a pseudo-element has none of is dropped with a
 * PSEUDO_ELEMENT_STATE_IGNORED warning. Like Tasty, these helpers use the CSS
 * language alone, never what one browser supports.
 */

const LEGACY_PSEUDO_ELEMENTS = new Set([
  ':before',
  ':after',
  ':first-line',
  ':first-letter',
]);

const QUOTED_RE = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g;
const TREE_PSEUDO_RE =
  /:(?:root|empty|scope|has|(?:first|last|only)-(?:child|of-type)|nth-(?:last-)?(?:child|of-type))(?![\w-])/i;

/** Lowercase pseudo name with CSS escapes decoded (`:b\65 fore` → `:before`). */
export function pseudoName(node: selectorParser.Pseudo): string {
  const name = node.value.toLowerCase();
  if (!name.includes('\\')) return name;
  // The parser decodes tag identifiers but preserves pseudo spelling.
  const colons = name.startsWith('::') ? '::' : ':';
  const identifier = selectorParser().astSync(name.slice(colons.length)).first
    ?.first;
  return identifier?.type === 'tag'
    ? colons + identifier.value.toLowerCase()
    : name;
}

/** `::name`, or a legacy single-colon spelling such as `:before`. */
export function isPseudoElement(node: selectorParser.Node): boolean {
  if (node.type !== 'pseudo') return false;
  const name = pseudoName(node);
  return name.startsWith('::') || LEGACY_PSEUDO_ELEMENTS.has(name);
}

export interface PseudoElementSplit {
  /** Index of the first node of the last compound. */
  compound: number;
  /** Index of the pseudo-element the item ends in. */
  first: number;
  /** Index of the last pseudo-element chained after it (`::after::marker`). */
  last: number;
}

/**
 * Where a selector item ends in a pseudo-element: the first top-level
 * pseudo-element in its last compound. Nodes before it select the
 * originating element; pseudo-classes after the last chained one are the
 * pseudo-element's own states. `null` when the item ends in an element.
 */
export function splitAtPseudoElement(
  item: selectorParser.Selector,
): PseudoElementSplit | null {
  const { nodes } = item;
  let compound = 0;
  nodes.forEach((node, index) => {
    if (node.type === 'combinator') compound = index + 1;
  });
  const first = nodes.findIndex(
    (node, index) => index >= compound && isPseudoElement(node),
  );
  if (first === -1) return null;
  let last = first;
  nodes.forEach((node, index) => {
    if (index > first && isPseudoElement(node)) last = index;
  });
  return { compound, first, last };
}

/**
 * The items of a selector list that end in a pseudo-element, as written.
 * `null` when the selector cannot be parsed.
 */
export function pseudoElementItems(selector: string): string[] | null {
  let root: selectorParser.Root;
  try {
    root = selectorParser().astSync(selector);
  } catch {
    return null;
  }
  return root.nodes
    .filter((item) => splitAtPseudoElement(item) !== null)
    .map((item) => item.toString().trim());
}

/**
 * What a selector state (`:first-child`, `[open]`, `.active`, `:not([x])`)
 * tests that a pseudo-element has none of, in the words of Tasty's warning,
 * or `null` when a pseudo-element can be in that state.
 */
export function pseudoElementMismatch(selector: string): string | null {
  const text = selector.replace(QUOTED_RE, '""');
  if (TREE_PSEUDO_RE.test(text)) return 'position in the DOM tree';
  if (text.includes('[')) return 'attributes';
  if (text.includes('.') || text.includes('#')) return 'classes or ids';
  return null;
}
