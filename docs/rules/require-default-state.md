# tasty/require-default-state

Reports a state map without a `''` default and without a `_` fallback floor.

**Presets:** error in recommended and strict. **Fix:** none.

## Why

Without `''` or `_`, the property has no value in the normal state: it applies only while one of the listed states holds. That is rarely intended in a component's own styles.

## Examples

```js
// ❌ State mapping for 'fill' has no default ('') or fallback floor ('_') value.
tasty({
  styles: {
    fill: { hovered: '#blue' },
  },
});

// ✅ A '' default
tasty({
  styles: {
    fill: { '': '#white', hovered: '#blue' },
  },
});

// ✅ A '_' fallback floor gives a value in the normal state too
tasty({
  styles: {
    inset: { _: 'auto', '@(scroll-state(stuck: top))': '0 auto auto auto' },
  },
});

// ✅ Extending a component: no default keeps the base's
tasty(Button, {
  styles: {
    fill: { loading: '#yellow' },
  },
});
```

## Not reported

- Extension layers: `tasty(Base, { styles })`, a `styles` prop, a later `mergeStyles` argument and other partial overrides. There, a map without `''` extends the base's map.
- A state map that spreads another (`{ ...BASE_STYLES.fill, hovered: '#blue' }`): the spread may bring the default.

## Options

None.
