# tasty/valid-radius-shape

Reports a `radius` shape keyword Tasty does not know, such as `'circle'`.

**Presets:** error in recommended and strict. **Fix:** editor suggestions.

## Why

`radius` takes four shape keywords besides lengths. Any other word renders no radius.

## Examples

```js
// ✅ Valid
radius: 'round'
radius: 'ellipse'

// ❌ Unknown radius shape 'circle'. Valid shapes: round, ellipse, leaf, backleaf.
radius: 'circle'

// ❌ Unknown radius shape 'roud'. Did you mean 'round'? Suggestion: 'round'
radius: 'roud'
```

## Checks

Valid shapes: `round`, `ellipse`, `leaf`, `backleaf`. A word close to one of them gets an editor suggestion to replace it.

## Options

None.
