# tasty/valid-styles-structure

Reports a styles object with the wrong shape: state keys at the top level, at-rule keys whose value is not the object they need, a `recipe` that is not a string, and the at-rule key spellings of Tasty v2.

**Presets:** error in recommended and strict. **Fix:** autofix (renamed at-rule keys).

## Why

State maps go inside property values. A state key at the top of a styles object, such as `':hover': { fill: '#gray' }`, is read as a property name and renders nothing.

## Examples

```js
// ❌ State key '' at top level is not valid. State maps belong inside property values.
tastyStatic({
  '': { fill: '#white' },
  _: { fill: '#white' }, // the '_' floor goes inside a property too
  ':hover': { fill: '#gray' },
});

// ✅ A state map inside the property
tastyStatic({
  fill: {
    '': '#white',
    ':hover': '#gray',
  },
});

// ❌ '@properties' was renamed to '@property' in Tasty v3. Autofix: '@property'
tasty({ styles: { '@properties': { angle: { syntax: '<angle>', inherits: false, initialValue: '0deg' } } } });
```

## Checks

1. Top-level keys are properties, sub-elements or special keys, not state keys.
2. `@keyframes` is an object of `{ name: { step: styles } }`.
3. `@property` is an object of `{ name: { syntax, inherits, initialValue } }`.
4. `@font-face` is an object of `{ familyName: descriptors | descriptors[] }`.
5. `@counter-style` is an object of `{ name: descriptors }`.
6. `@function` is an object of `{ '$$name': { args, result } }`.
7. `recipe` is a string.
8. The Tasty v2 spellings `@properties`, `@fontFace` and `@counterStyle` are renamed to `@property`, `@font-face` and `@counter-style`. This is the only autofix, so `eslint --fix` does most of a v2 upgrade.

An at-rule value is reported only when it is surely not an object: a literal, a template or an array. A variable such as `'@font-face': fontFaceMap` may hold the object and is left alone.

## Options

None.
