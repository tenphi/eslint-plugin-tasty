---
'@tenphi/eslint-plugin-tasty': patch
---

## `prefer-shorthand-property` stops rewriting keys inside an extension layer

The rename this rule offers is safe in a base definition and unsafe in an extension layer,
because layers merge per key. `paddingTop: '2x'` → `padding: '2x top'` looked like a
narrowing rewrite but dropped the base component's other three edges to `0`, and even the
carry-over pair (`backgroundColor` → `fill`, `borderRadius` → `radius`) replaced a state map
the layer never mentioned.

Inside `tasty(Base, {...})` / `tastyStatic(Base, {...})` — sub-element objects included — the
report now carries no fix and names the shape that actually belongs there: a token in the base
component's property, set from the layer.

```js
const Card = tasty({ styles: { padding: '$v-padding $h-padding' } });
const TallCard = tasty(Card, { styles: { '$v-padding': '4x' } });
```

The native property is still reported, since it is still not the tasty form. But the base is
often someone else's file, and a layered longhand is sometimes the only option left, so the
rule only suggests — it no longer rewrites.

Base definitions, selector-mode `tastyStatic('.card', {...})`, and `variants` are unchanged
and still auto-fix.
