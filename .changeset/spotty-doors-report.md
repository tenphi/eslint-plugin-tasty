---
'@tenphi/eslint-plugin-tasty': patch
---

Stop reporting sub-element styles twice in `consistent-token-usage`, `no-important` and `no-raw-color-values`.

`STYLE_OBJECT_SELECTORS` includes the descendant selector `CallExpression ObjectExpression`, so inside `tasty({ styles: { Icon: { … } } })` the handler fires for the `styles` object **and** for the `Icon` object. These three rules recursed into any nested `ObjectExpression` as if it were a state map, so a sub-element's declarations were reported once while walking `styles` and again when the listener reached the sub-element itself:

```js
tasty({ styles: { Icon: { width: '64px' } } });
// consistent-token-usage: "Consider using '8x' instead of '64px'"  x2
```

The recursion is now guarded by the existing `isStateMap()` helper, which excludes sub-elements (keys starting with an uppercase letter). `prefer-hide` and `prefer-custom-property-syntax` were already immune — the former only looks at the `display` key, the latter skips `/^[A-Z@&$#]/` keys explicitly.

The duplicate report was the visible symptom, but the same code path also attributed the value to the **wrong property**, since the sub-element name was passed down as the property name. That silently affected rule behaviour rather than just the message count:

- `no-raw-color-values` scopes its named-colour check to colour-bearing properties, so `Icon: { fill: 'red' }` was checked against the property `Icon`.
- `consistent-token-usage` special-cases `radius` (`6px` → `1r`) and `border` (`1px` → `1bw`), which could not match when the property name was a sub-element.

Genuine state maps — including state maps nested inside a sub-element, e.g. `Icon: { fill: { '': 'red' } }` — are unaffected and still reported exactly once. Added regression tests to all three rules covering both directions.
