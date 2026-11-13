# tasty/valid-custom-unit

Reports a number with a unit that is neither a Tasty unit, a CSS unit, nor a unit from your config, such as `2q`.

**Presets:** error in recommended and strict. **Fix:** none.

## Why

Tasty expands its own units (`2x` becomes `calc(2 * var(--gap))`) and passes CSS units through. A unit it does not know reaches the browser as is, and the browser drops the declaration.

## Examples

```js
// ✅ Valid
padding: '2x'
radius: '1r'
border: '1bw'

// ❌ Unknown unit 'q' in '2q'
padding: '2q'

// ✅ Valid when tasty.config lists 'cols' in units
width: '3cols'
```

## Known units

- **Tasty's units:** `x`, `r`, `cr`, `bw`, `ow`, `lh`, `sf`.
- **CSS units:** `px`, `em`, `rem`, `%`, `vw`, `vh`, `vmin`, `vmax`, `ch`, `ex`, `cm`, `mm`, `in`, `pt`, `pc`, `fr`, `deg`, `rad`, `turn`, `grad`, `s`, `ms`, `dpi`, `dpcm`, `dppx`, the small, large and dynamic viewport units (`svw`, `lvh`, `dvh`, …), the container units (`cqw`, `cqh`, `cqi`, `cqb`, `cqmin`, `cqmax`), `cap`, `ic`, `rlh`, `vi` and `vb`.
- **Your units:** the `units` list in `tasty.config.*`. `units: false` turns the check off.

## Options

None.
