import { analyze } from '@typescript-eslint/scope-manager';
import { Visitor, parseSync, visitorKeys } from 'oxc-parser';

export const meta = { name: 'tasty-lint/oxc-parser' };

/** Maps Oxc's UTF-16 offsets to ESLint's one-based lines and zero-based columns. */
function locate(text) {
  const lines = [0];
  for (const match of text.matchAll(/\r\n|[\n\r\u2028\u2029]/g)) {
    lines.push(match.index + match[0].length);
  }
  return (offset) => {
    let first = 0;
    let last = lines.length;
    while (first + 1 < last) {
      const middle = Math.floor((first + last) / 2);
      if (lines[middle] <= offset) first = middle;
      else last = middle;
    }
    return { line: first + 1, column: offset - lines[first] };
  };
}

export function parseForESLint(text, { filePath, sourceType }) {
  const location = locate(text);
  const parsed = parseSync(filePath, text, {
    sourceType,
    range: true,
    preserveParens: false,
  });
  const error = parsed.errors.find(
    (diagnostic) => diagnostic.severity === 'Error',
  );
  if (error) {
    const { line, column } = location(error.labels[0]?.start ?? 0);
    throw Object.assign(new SyntaxError(error.message), {
      lineNumber: line,
      column: column + 1,
    });
  }

  const ast = parsed.program;
  const addLocation = (node) => {
    node.loc = { start: location(node.start), end: location(node.end) };
  };
  new Visitor(
    Object.fromEntries(
      Object.keys(visitorKeys).map((type) => [type, addLocation]),
    ),
  ).visit(ast);
  ast.comments = parsed.comments;
  for (const comment of ast.comments) {
    comment.range = [comment.start, comment.end];
    addLocation(comment);
  }
  // Oxc does not expose tokens. The harness runs only Tasty rules, which use
  // the AST, scopes, comments and source ranges.
  ast.tokens = [];
  const scopeManager = analyze(ast, {
    sourceType: ast.sourceType,
    childVisitorKeys: visitorKeys,
  });
  return { ast, scopeManager, visitorKeys };
}
