# tasty/valid-preset

Reports a `preset` name your config does not list, and a preset modifier Tasty does not know.

**Presets:** error in recommended and strict. **Fix:** none.

## Why

An unknown preset name renders no typography at all. The component falls back to inherited font styles, and nothing reports it at runtime.

## Examples

```js
// ✅ Valid, when tasty.config lists 'h1' and 't2' in presets
preset: 'h1'
preset: 'h1 strong'
preset: 't2 italic'

// ❌ Unknown preset 'heading1'
preset: 'heading1'

// ❌ Unknown preset modifier 'heavy'
preset: 'h1 / heavy'
```

## Checks

1. **Name.** When `presets` in `tasty.config.*` lists names, the first word of the value must be one of them.
2. **Modifiers.** Words after a `/` must be `strong`, `bold`, `italic`, `icon`, `tight` or `normal` (`line-height: normal`).

A value made only of modifiers, such as `preset: 'normal'` or `preset: 'bold italic'`, is the modifier-only shorthand: its words are not checked against `presets`. CSS-wide keywords (`inherit`, `initial`, …) and `preset: true` are always valid. Without `presets` in the config, only modifiers are checked.

## Options

None.
