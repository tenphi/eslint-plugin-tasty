# tasty/prefer-longhand-property

Reports the `flex` shorthand. Use `flexGrow`, `flexShrink` and `flexBasis` instead.

**Presets:** error in recommended and strict. **Fix:** none.

## Why

`flex` resets the parts you leave out to values that are not their initial ones: `flex: 1` sets `flex-basis` to `0%`, not `auto`. The longhands set only what you write, which also lets a state or an extension change one part without touching the others.

## Examples

```js
// ❌ 'flex' resets the components you omit to non-initial values. Use flexGrow / flexShrink / flexBasis instead.
flex: '1'

// ✅ Only what you mean
flexGrow: 1
```

There is no autofix: splitting the shorthand needs to know which parts you meant to set.

## Options

None.
