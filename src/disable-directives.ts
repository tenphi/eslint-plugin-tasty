import type { TSESTree } from '@typescript-eslint/utils';
import type { SourceCode } from '@typescript-eslint/utils/ts-eslint';

interface Directive {
  kind: 'disable-next-line' | 'disable-line' | 'disable' | 'enable';
  /** Empty when the directive names no rules, i.e. applies to all of them. */
  rules: string[];
  comment: TSESTree.Comment;
}

const DIRECTIVE =
  /^\s*(?:eslint|oxlint)-(disable-next-line|disable-line|disable|enable)(?=\s|$)([\s\S]*)$/;

// Keyed by the file's AST: a linter may reuse one `SourceCode` across files.
const directives = new WeakMap<TSESTree.Program, Directive[]>();

function parseDirectives(sourceCode: SourceCode): Directive[] {
  const result: Directive[] = [];
  for (const comment of sourceCode.getAllComments()) {
    const match = DIRECTIVE.exec(comment.value);
    if (!match) continue;
    const kind = match[1] as Directive['kind'];
    // Block directives only take effect in block comments, as in ESLint.
    if ((kind === 'disable' || kind === 'enable') && comment.type !== 'Block')
      continue;
    const rules = match[2]
      .split(/\s-{2,}\s/)[0]
      .split(',')
      .map((rule) => rule.trim())
      .filter(Boolean);
    result.push({ kind, rules, comment });
  }
  return result;
}

function names(directive: Directive, rules: ReadonlySet<string>): boolean {
  return (
    directive.rules.length === 0 ||
    directive.rules.some((rule) => rules.has(rule))
  );
}

function isBefore(a: TSESTree.Position, b: TSESTree.Position): boolean {
  return a.line < b.line || (a.line === b.line && a.column <= b.column);
}

/**
 * Whether an ESLint or Oxlint disable directive for one of `rules` covers a
 * report on `node`, following the linters' own placement rules: the line after
 * `disable-next-line`, the comment's own line for `disable-line`, and the span
 * from a block `disable` to the matching `enable`.
 */
export function isDisabledFor(
  sourceCode: SourceCode,
  node: TSESTree.Node,
  rules: ReadonlySet<string>,
): boolean {
  if (rules.size === 0) return false;
  let list = directives.get(sourceCode.ast);
  if (!list) {
    list = parseDirectives(sourceCode);
    directives.set(sourceCode.ast, list);
  }

  const start = node.loc.start;
  let disabled = false;
  for (const directive of list) {
    if (!names(directive, rules)) continue;
    const { loc } = directive.comment;
    switch (directive.kind) {
      case 'disable-next-line':
        if (loc.end.line + 1 === start.line) return true;
        break;
      case 'disable-line':
        if (loc.start.line === loc.end.line && loc.start.line === start.line)
          return true;
        break;
      case 'disable':
      case 'enable':
        if (isBefore(loc.start, start)) disabled = directive.kind === 'disable';
        break;
    }
  }
  return disabled;
}
