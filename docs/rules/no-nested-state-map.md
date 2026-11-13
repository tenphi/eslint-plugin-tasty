# tasty/no-nested-state-map

Reports a state map inside another state map.

**Presets:** error in recommended and strict. **Fix:** none.

## Why

A state map's keys are states and its values are style values. Tasty does not read a map as a value, so the nested map renders nothing. Combine the states in one key instead.

## Examples

```js
// ❌ Nested state maps are not allowed. Use combined state keys instead.
fill: {
  '': '#white',
  hovered: {
    '': '#blue',
    pressed: '#red',
  },
}

// ✅ Combined states
fill: {
  '': '#white',
  hovered: '#blue',
  'hovered & pressed': '#red',
}
```

## Options

None.
