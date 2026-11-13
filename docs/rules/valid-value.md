# tasty/valid-value

Parses every string style value and reports what Tasty cannot read: unknown words, modifiers a property does not take, colors where none belong, unbalanced parentheses and `!important`.

**Presets:** error in recommended and strict. **Fix:** none.

## Why

Tasty's runtime parser files every word it does not recognize as a modifier and moves on, so a typo renders as nothing, with no error. This rule uses the plugin's own value parser, which reports every unrecognized token instead.

## Examples

```js
// ❌ Modifier 'topp' is not valid for 'padding'. Accepted: top, right, bottom, left, longhand.
padding: '2x topp'

// ❌ Property 'padding' does not accept color tokens, but found '#red'.
padding: '2x #red'

// ❌ Unbalanced parentheses in value.
fill: 'rgb(255, 0, 0'

// ❌ 'svgFill' takes a single paint: Tasty keeps one color and drops the rest.
svgFill: 'none #red'

// ❌ '#purple' is not expanded after url()
svgFill: 'url(#gradient) #purple'

// ✅ Valid
fill: '#purple.5'
padding: '2x top bottom'
border: '1bw solid #red top'
border: '1bw Highlight' // CSS named and system colors are colors
width: 'min 200px'
display: '-webkit-box' // with -webkit-line-clamp; also -webkit-inline-box
aspectRatio: '16/10' // <ratio> allows optional whitespace: same as '16 / 10'
svgFill: 'context-stroke'
svgFill: 'url(#gradient) currentColor' // a url() fallback is plain CSS
```

## How it works

1. The value is split into groups (by commas) and parts (by spaced slashes), and each token is classified: color token, custom property, function, number with a unit, keyword, or unknown.
2. The result is compared with what the property expects:
   - A property without modifiers (`fill`, `color`, `opacity`, `width`, `height`, …) must have no modifier words.
   - A property with modifiers (`border`, `padding`, `radius`, …) takes only modifiers from its own set.
   - A property without colors (`padding`, `margin`, `gap`, `width`, …) must have no color tokens.
   - `svgFill` is the native SVG `fill`, so it also takes `context-fill` and `context-stroke`. It takes one paint: Tasty keeps one color and drops the rest. A `url()` may have one fallback, but Tasty passes that value through as plain CSS, so a `#name` fallback is reported: it is never expanded.

`recipe` (checked by [`tasty/valid-recipe`](valid-recipe.md)) and the at-rule keys are not parsed.

## Related rules

`valid-value` asks "does it parse?". Other rules check that the names exist in your config:

| Check | Rule |
| --- | --- |
| Does this value parse without unknown tokens? | `tasty/valid-value` |
| Is `#purple` a known color token? | [`tasty/valid-color-token`](valid-color-token.md) |
| Is `3cols` a known unit? | [`tasty/valid-custom-unit`](valid-custom-unit.md) |
| Is `$spacign` a known custom property? | [`tasty/valid-custom-property`](valid-custom-property.md) |

## Options

None.
