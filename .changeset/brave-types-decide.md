---
'@tenphi/eslint-plugin-tasty': patch
---

## A declared type now decides whether an object is tasty styles

`isStyleVariableDeclaration` matched on the variable *name* — `styles`, or anything
ending in `Styles` — and consulted the type annotation only as a way to opt a
differently-named variable *in*. An explicit annotation could never opt one **out**, so a
React inline-style object was treated as tasty styles:

```ts
// Reported as tasty style properties, and rewritten by --fix.
const styles: { wrapper: CSSProperties; region: CSSProperties } = {
  wrapper: { boxShadow: '0px 1px 6px 0px var(--shadow-sm-color)' },
};
```

This is the more serious half of the two false positives from the same rollout that
produced #40, and it is not merely noise. The rewrites these rules offer — `#purple.05`,
`$font-sans`, `#shadow-sm` — are correct **tasty declarations** and meaningless as raw
CSS. Applied to an object handed to React's `style={…}`, where nothing resolves a tasty
token, `--fix` turned a real `var(--shadow-sm-color)` into `#shadow-sm` and the browser
dropped the declaration. Two files in one downstream codebase were affected, and both had
to carry file-level `oxlint-disable` comments to keep the rule usable.

An annotation is the author stating what the object is, so it now wins over the name
guess, in both directions:

| declaration | verdict |
| --- | --- |
| `const styles: CSSProperties = …` | not tasty |
| `const styles: Record<string, CSSProperties> = …` | not tasty |
| `const styles: { a: CSSProperties } = …` | not tasty |
| `const anything: Styles = …` | tasty |
| `const anything: Record<string, Styles> = …` | tasty |
| `const anything: Styles \| undefined = …` | tasty |
| `const styles = …` (no annotation) | tasty, by name as before |

The check walks the whole annotation rather than matching only its outermost reference, so
a wrapped tasty type still opts in. It stays name-based on `Styles`: the plugin has no type
checker, and requiring one would make every rule type-aware.

Unannotated raw-CSS objects that happen to be named `styles` are still matched — that is
inherent to a syntax-only linter, and the name is the only evidence available.
