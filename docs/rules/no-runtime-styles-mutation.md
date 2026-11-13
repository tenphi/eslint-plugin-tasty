# tasty/no-runtime-styles-mutation

Reports style values and keys computed at render time: props, state, hook results, parameters, local bindings, calls, conditionals, computed keys and template interpolation.

**Presets:** warning in recommended and strict. **Fix:** none.

## Why

Tasty generates CSS once per distinct styles object. Values that change on every render generate new CSS each time they change, and they hide what the component can look like. Express dynamic behavior with modifiers (`mods`), tokens (`tokens`) or CSS custom properties, and keep style values static.

## Examples

```js
// ❌ Prefer a static style value for 'fill'. Use states with mods, tokens, or styleProps.
function Tab({ isActive }) {
  return <Box styles={{ fill: isActive ? '#blue' : '#gray' }} />;
}

// ✅ A state map and a modifier
const TabBox = tasty({
  styles: {
    fill: {
      '': '#gray',
      active: '#blue',
    },
  },
});

function Tab({ isActive }) {
  return <TabBox mods={{ active: isActive }} />;
}
```

## What is reported

The rule reports the specific value inside a state map or sub-element.

- A style object that no function encloses is built once, while the module loads, so none of its values is reported, calls and unresolved names included. An instance field does not count as module level: it runs for every instance.
- Inside a function, values fixed once the module has loaded are allowed, since Tasty generates their CSS once, as for a literal: `undefined`, module-scope `const` bindings, enums and imports (and their members, including computed members with such keys), and templates, operators, conditionals and `mergeStyles(...)` calls built only from those. The same test applies to computed keys.
- Anything that reaches render-time scope is reported: props, state, hook results, parameters, a local or `let` binding, any other call.
- A `mergeStyles` object-literal argument is a style object of its own and is checked where it stands.
- Literal strings, `null`, `false` and `true` are fine.

Style objects are found where they reach Tasty, not only where they are written: an object behind a conditional or logical operator (`mergeStyles(cond ? { … } : null, styles)`), and an object held in a render-scope variable that is read as styles (`const local = { … }` or `styles = { ...styles, … }`, then `styles={local}`, `mergeStyles(styles, local)` or `Icon: local`). A render-scope `const` bound to an object literal is not reported where it is passed on: its values are checked where it is written.

Not covered here:

- Spreads, which [`tasty/no-style-spread`](no-style-spread.md) reports, so each can be disabled on its own.
- `tastyStatic()`, which [`tasty/static-no-dynamic-values`](static-no-dynamic-values.md) checks.
- At-rule definition objects (`@keyframes`, `@font-face`, …), which may be shared JavaScript data.

## Exceptions

For JavaScript computation that is really needed, disable the rule for that line, with a reason.

## Options

None.
