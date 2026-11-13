# tasty/prefer-directional-shorthand

Reports a four-value box, such as `margin: '0 0 1x 0'`, that sets only part of the box. Tasty's directional form, `'1x bottom'`, says the same thing.

**Presets:** warning in recommended and strict. **Fix:** autofix, and an editor suggestion for `border`.

## Why

In a four-value box, the reader has to count positions to see which side is set. The directional form names it.

## Examples

```js
// ❌ 'margin' value '0 0 1x 0' only sets part of the box. Use '1x bottom' instead.
margin: '0 0 1x 0'

// ✅ After the autofix
margin: '1x bottom'

// ❌ 'inset' value 'auto 0 0 0' only sets part of the box. Use '0 bottom dock' instead.
inset: 'auto 0 0 0'

// ✅ After the autofix
inset: '0 bottom dock'

// ❌ 'border' value '0 0 1bw 0' does not do what it looks like. Suggestion: '1bw bottom'
border: '0 0 1bw 0'
```

## Checks

The rule reads `margin`, `padding`, `inset`, `radius`, `fade` and `border` values with exactly four parts, plain or in a state map. A part is a placeholder when it is `0` (or `auto` for `inset`).

| Four-value box | Directional form |
| --- | --- |
| One real value, such as `'0 0 0 2x'` | `'2x left'` |
| `radius` with one real corner, such as `'0 1r 0 0'` | `'1r top-right'` |
| `inset` with three equal values and one `auto`, such as `'0 0 0 auto'` | `'0 right dock'` |

The value is always carried into the fix, never replaced by the property default: `margin` defaults to `var(--gap)`, not `1x`, so `'0 0 1x 0'` must not become `'bottom'`.

For `border`, Tasty reads four parts as one border value, so `'0 0 1bw 0'` draws no border at all today. The directional form is what the author meant, but it changes what renders, so it is an editor suggestion, not an autofix.

## Options

None.
