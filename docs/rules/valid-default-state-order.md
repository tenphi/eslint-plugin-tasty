# tasty/valid-default-state-order

Reports a `''` default that is not the first key of a state map, a `_` fallback floor that is not the first key, and a `''` that is redundant next to `_`.

**Presets:** warning in recommended and strict. **Fix:** autofix.

## Why

A state map resolves in the order it is written: the last key whose condition holds wins. The `''` default always holds, so after other states it overrides them. The `_` floor is the lowest layer of the cascade, so it goes first, above `''`.

## Examples

```js
// ❌ Default state ('') in 'fill' must be the first key in the state map.
fill: { hovered: '#blue', '': '#white' }

// ✅ After the autofix
fill: { '': '#white', hovered: '#blue' }

// ❌ Fallback floor ('_') in 'fill' must be the first key in the state map, above the '' default.
fill: { '': '#white', _: '#gray', hovered: '#blue' }

// ✅ After the autofix
fill: { _: '#gray', '': '#white', hovered: '#blue' }

// ❌ Default state ('') in 'fill' is redundant when '_' is the only other state.
fill: { _: '#gray', '': '#white' }

// ✅ After the autofix
fill: { _: '#gray' }
```

## Checks

1. With `''` and `_` as the only keys, `''` is removed: `_` already gives the always-on value.
2. A `_` that is not first moves to the top.
3. With `_` first, a `''` moves right after it.
4. Without `_`, a `''` that is not first moves to the top.

The fix applies one step at a time, so a map with both keys misplaced takes two `--fix` passes, which ESLint runs on its own.

## Options

None.
