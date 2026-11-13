# tasty/prefer-hide

Reports `display: 'none'`. Use `hide: true` instead.

**Presets:** warning in recommended and strict. **Fix:** autofix for a plain value; a value in a state map is reported only.

## Why

Tasty resolves `display` together with `hide`, `textOverflow`, `overflow` and `whiteSpace`, and `hide` has the highest priority. `hide: true` hides the element whatever `display` a state, a recipe or an extension sets. `display: 'none'` is one more `display` value that another one can override.

## Examples

```js
// ❌ Use 'hide: true' instead of "display: 'none'".
tasty({ styles: { display: 'none' } });

// ✅ After the autofix
tasty({ styles: { hide: true } });

// ❌ Reported in a state map, without a fix
tasty({ styles: { display: { '': 'flex', collapsed: 'none' } } });

// ✅ By hand
tasty({ styles: { display: 'flex', hide: { '': false, collapsed: true } } });
```

A `'none'` inside a state map has no autofix, because moving it to `hide` changes the shape of both maps.

## Options

None.
