# tasty/no-own-at-root

Reports `@own(...)` in a state key of the root styles, where it is redundant.

**Presets:** warning in recommended and strict. **Fix:** autofix.

## Why

`@own(...)` says "this state belongs to the sub-element itself, not to the root". At the root, the element is the root, so `@own(:hover)` means the same as `:hover`. Writing it there suggests a difference that does not exist.

## Examples

```js
// ❌ @own() is redundant outside sub-element styles.
tasty({
  styles: {
    fill: { '': '#white', '@own(:hover)': '#blue' },
  },
});

// ✅ After the autofix
tasty({
  styles: {
    fill: { '': '#white', ':hover': '#blue' },
  },
});

// ✅ In a sub-element, @own() is the sub-element's own state
tasty({
  styles: {
    Icon: {
      fill: { '': '#white', '@own(:hover)': '#blue' },
    },
  },
});
```

## Autofix

The fix unwraps every `@own(...)` term of the key and keeps a term with operators inside grouped:

| Before | After |
| --- | --- |
| `'@parent(:hover) & !@own(:hover)'` | `'@parent(:hover) & !:hover'` |
| `'@own(pin=start \| pin=end)'` | `'pin=start \| pin=end'` |
| `'@own(hovered \| focused) & active'` | `'(hovered \| focused) & active'` |

A key with a comma inside `@own(...)` is reported without a fix.

## Not reported

- Sub-element styles, at any depth.
- Shared style objects, such as a `const CELL_STYLES: Styles = { … }` that may be spread into a sub-element, where `@own(...)` matters.

## Options

None.
