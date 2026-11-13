# tasty/prefer-auto-calc

Reports `calc(...)` in a style value. Tasty adds `calc()` to a parenthesized expression by itself.

**Presets:** warning in recommended and strict. **Fix:** autofix.

## Why

In Tasty, a parenthesized expression such as `(100% - 2x)` is auto-calc: Tasty renders it as `calc()`. Writing `calc(...)` yourself is longer and mixes two spellings for one thing.

## Examples

```js
// ❌ Replace 'calc(100% - 2x)' with Tasty auto-calc '(100% - 2x)'.
width: 'calc(100% - 2x)'

// ✅ After the autofix
width: '(100% - 2x)'

// ❌ Also inside a state map
margin: { '': '0', hovered: 'calc(1x + 2x)' }
```

## Where it applies

Values in Tasty style objects, and style props of components known to be Tasty components (a local `tasty()` result or a component from your `importSources`). It skips the values of `$name` and `#name` keys, which define tokens.

## Options

None.
