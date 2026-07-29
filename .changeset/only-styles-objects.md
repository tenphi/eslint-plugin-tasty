---
'@tenphi/eslint-plugin-tasty': patch
---

Only treat `styles` and `*Styles` variables as style objects.

The name test was `/styles?$/i`, which also matched the **singular** `style` — conventionally a DOM inline-style object holding raw CSS longhands, not tasty syntax. Every rule then ran against those objects and reported their longhands as violations:

```js
// reported `top`, `left`, `right`, `bottom` and `maxWidth` as tasty problems
const style = { position: 'absolute', top: '0px', maxWidth: '100%' };
setStyle(element, style);
```

`cube-ui-kit` had 5 findings from a single such object, plus more from `hostStyle: CSSProperties` and `baseStyle: Record<string, string>`.

Detection is now `name === 'styles' || name.endsWith('Styles')`. An explicit `Styles` type annotation still opts a differently-named variable in, and the existing exclusion of `SCREAMING_CASE` names is unchanged.

Added `src/context.test.ts` covering both directions. It probes through `prefer-shorthand-property` rather than `known-property`, because the properties involved (`top`, `maxWidth`) are perfectly *known* — a `known-property` probe stays silent either way and would not catch this regression.
