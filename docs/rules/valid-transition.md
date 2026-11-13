# tasty/valid-transition

Reports a `transition` name that is neither a Tasty semantic transition nor a CSS property, a camelCase CSS name, and a CSS name that has a semantic equivalent.

**Presets:** warning in recommended and strict. **Fix:** editor suggestions.

## Why

Tasty expands semantic names (`fill`, `theme`, `radius`, …) into the CSS properties they cover. Any other name is lowercased and emitted as is, so a typo or a camelCase name animates nothing.

## Examples

```js
// ✅ Valid
transition: 'fill 0.2s'
transition: 'theme 0.3s ease'
transition: '$$my-prop 0.2s'

// ❌ Unknown transition name 'colour'
transition: 'colour 0.2s'

// ❌ 'gridTemplateColumns' compiles to 'gridtemplatecolumns', which is not a CSS property.
//    Suggestion: 'grid-template-columns'
transition: 'gridTemplateColumns 0.2s'

// ❌ 'background-color' has a Tasty semantic equivalent. Suggestion: 'fill'
transition: 'background-color 0.2s'
```

## Checks

A transition value is a comma-separated list. Each entry is `name [duration] [easing] [delay]`.

1. The name must be a semantic transition, a CSS property, or a `$$name` custom property reference.
2. A CSS property must be kebab-case. `zIndex` is the exception: it is a semantic name that compiles to `z-index`.
3. A CSS property with a semantic equivalent (`background-color`, `box-shadow`) gets a suggestion to use the semantic name.

Semantic names: `fade`, `fill`, `color`, `theme`, `border`, `radius`, `shadow`, `outline`, `preset`, `text`, `gap`, `opacity`, `translate`, `rotate`, `scale`, `filter`, `image`, `background`, `width`, `height`, `inset` and `zIndex`.

`flow` is reported although the CSS property dataset lists it: no browser implements it, and Tasty has no `flow` transition.

Durations are checked by [`tasty/no-raw-transition-duration`](no-raw-transition-duration.md).

## Options

None.
