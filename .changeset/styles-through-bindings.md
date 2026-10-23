---
'@tenphi/eslint-plugin-tasty': patch
---

Style objects are recognized where they reach Tasty, not only where they are written in place. An object behind a conditional or logical operator (`mergeStyles(contentPadding != null ? { '$content-padding': contentPadding } : null, styles)`, `cond && { … }`, `styles ?? { … }`) takes the position of the whole expression. An object held in a render-scope variable counts when that variable is read as styles: `const local = { fontSize: size }` or `styles = { ...styles, fontSize: size }`, then `styles={local}`, `mergeStyles(styles, local)` or a sub-element `Icon: local`. `no-runtime-styles-mutation` now reports the render values in these objects, and every other rule checks them too, so a spread in a reassignment like the one above also gets `no-style-spread`'s warning. Module-scope bindings are unchanged.
