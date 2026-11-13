# tasty/no-nested-selector

Reports `&`-prefixed nested selectors, such as `'& img'` or `'&:hover'`, as keys of a style object.

**Presets:** error in recommended and strict. **Fix:** none.

## Why

Nested selectors are legacy syntax. Sub-elements (capitalized keys that target `data-element`) and state maps are more explicit and compose: Tasty resolves their priority, and `mergeStyles` and extensions merge them per key.

## Examples

```js
// ❌ Avoid nested selectors. Use sub-element styling instead.
tasty({
  styles: {
    '& img': { width: '100%' },
    '&:hover': { fill: '#blue' },
  },
});

// ✅ A sub-element
tasty({
  styles: {
    Image: { width: '100%' },
  },
});

// ✅ A state map for a pseudo-class
tasty({
  styles: {
    fill: { '': '#white', ':hover': '#blue' },
  },
});
```

## Options

None.
