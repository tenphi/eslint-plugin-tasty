---
'@tenphi/eslint-plugin-tasty': minor
---

Validate tasty 3.8's enhanced logical styles.

Tasty 3.8 gave each logical axis/category pair its own handler — `blockPadding`,
`inlineBorder`, `blockSize` and the rest — which emits native logical CSS instead of
converting the value to a physical edge. All eighteen names are now recognised style
properties, and each rule that reads a property vocabulary knows theirs:

- `known-property` accepts them; `valid-boolean-property` accepts `true` on each
  (its category's design-system default), and now also on `scrollMargin` and
  `scrollPadding`.
- `valid-directional-modifier` gives them `start`/`end`, and reports a mix in either
  direction: a physical side on a logical axis (`blockPadding: '1x top'`) and a logical
  edge on a physical property (`padding: '1x start'`) are both silently dropped by the
  runtime. `scrollPadding` gained a directional handler in 3.8 and now answers to the
  same one-value-per-group rule as `scrollMargin`.
- `prefer-shorthand-property` points the native CSS spellings at the enhanced style
  (`paddingBlock` → `blockPadding`, `minBlockSize` → `blockSize: 'min ...'`), mirroring
  the physical rows. The axis renames are auto-fixed; edge longhands and `border-*`
  renames stay report-only because they change what the browser renders.
- `no-raw-color-values` covers `blockBorder`/`inlineBorder` and the logical CSS border
  colours.

`paddingBlock`, `paddingInline`, `insetBlock` and `insetInline` are no longer *tasty*
properties: 3.8 stopped reading them in its physical handlers, so they carry no category
default. They remain valid keys as ordinary CSS properties.
