---
'@tenphi/eslint-plugin-tasty': patch
---

## An unmistakable shape now overrules the variable-name guess

1.0.2 let a type annotation decide whether an object is tasty styles. Plenty of raw-CSS
objects carry no annotation at all, though, and for those the name was still the only
evidence — so this kept being linted as tasty:

```ts
const tableStyles = {
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '12px', borderBottom: '1px solid #eee' },
  td: { padding: '12px', borderBottom: '1px solid #eee' },
};
```

It reported `known-property` on each HTML tag name, read every block as a state map and
demanded a default, and offered `no-raw-color-values` rewrites that are only meaningful
inside tasty.

The shape is unmistakable, so it now overrules the name. An object reached **only** through
the name heuristic is skipped when every top-level key is a block name rather than a style
key — not a known property, not a sub-element (capitalised), not an at-rule, state,
custom-property or colour key — **and** every top-level value is an object literal.

Both halves matter. Requiring every value to be an object is what stops this swallowing the
case it would hurt most:

```ts
const styles = { colour: 'red' }; // still reported — the value is a string, not a block
```

Without that clause, the rule that catches a misspelled property would be silenced by the
misspelling. And one recognisable key is enough to keep the whole object in scope, so
`{ padding: '1x', td: {…} }` and `{ Icon: {…}, td: {…} }` are still linted.

This only applies where the name was the sole evidence. An import-tracked `tasty()` call, a
`styles` key or JSX prop, and a `Styles` annotation are all unaffected.
