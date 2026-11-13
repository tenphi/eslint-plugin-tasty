# tasty/no-important

Reports `!important` in a style value.

**Presets:** error in recommended and strict. **Fix:** autofix (removes `!important`).

## Why

Tasty manages specificity itself, through doubled class selectors and the order of states. `!important` overrides that system: states and extensions can no longer win where they should.

## Examples

```js
// ❌ Do not use !important in tasty styles.
fill: '#red !important'

// ✅ After the autofix
fill: '#red'
```

To make a state win, give it a later place in the state map, or combine conditions in its key.

## Options

None.
