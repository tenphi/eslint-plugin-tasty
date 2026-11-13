# tasty/valid-directional-modifier

Reports a direction a property does not take, such as `start` on `padding` or `top` on `blockPadding`, and more than one value in a group that names directions.

**Presets:** error in recommended and strict. **Fix:** none.

## Why

Physical properties speak `top`, `right`, `bottom` and `left`. Logical properties speak `start` and `end`. Each handler drops a direction from the other vocabulary without a word. In a group that names directions, Tasty keeps values and modifiers apart, so `'2x 4x top right'` does not pair `2x` with `top`.

## Examples

```js
// ✅ Valid
border: '1bw #red top'
padding: '2x left right'
inlinePadding: '1x start, 2x end'
blockBorder: '1bw solid #accent start'

// ❌ Modifier 'top' is not valid for 'blockPadding'. Accepted: start, end.
blockPadding: '1x top'

// ❌ Modifier 'start' is not valid for 'padding'. Accepted: top, right, bottom, left.
padding: '1x start'

// ❌ A group that names directions takes a single value, but '2x 4x top right' has 2.
padding: '2x 4x top right'

// ✅ One group per side
padding: '2x top, 4x right'
```

## Directions per property

| Property | Directions |
| --- | --- |
| `border`, `padding`, `margin`, `fade`, `scrollMargin`, `scrollPadding` | `top`, `right`, `bottom`, `left` |
| `radius` | `top`, `right`, `bottom`, `left`, `top-left`, `top-right`, `bottom-left`, `bottom-right` |
| `inset` | `top`, `right`, `bottom`, `left`, `dock` |
| Every enhanced logical style (`blockPadding`, `inlineBorder`, …) | `start`, `end` |

A group that names directions takes one value, applied to every direction it names. With `dock`, it takes up to two: the second insets the sides the dock spans. Colors do not count, since a `fade` group carries a width and up to two mask colors.

## Options

None.
