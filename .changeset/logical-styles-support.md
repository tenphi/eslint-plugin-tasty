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

**The `@tenphi/tasty` peer floor moves from `>=3` to `>=3.8.0`.** The plugin never imports
tasty, so its constants are baked at publish time and cannot adapt to the consumer's
version — and on 3.7 and below `blockPadding` is not a style tasty knows. An unhandled
camelCase key renders straight through to `block-padding`, which the browser drops, so the
auto-fix below would silently delete the padding. Recognising the logical names is harmless
on an older tasty (a missed warning); rewriting *to* them is not.

**Migrating off the native spellings.** `paddingBlock`, `paddingInline`, `insetBlock`,
`insetInline`, `marginBlock`, `marginInline`, `scrollMarginBlock`, `scrollPaddingInline`
and the rest are no longer *tasty* properties: 3.8 stopped reading them in its physical
handlers, so they carry no category default. They stay valid keys as ordinary CSS, so
nothing breaks — but each is reported with an **auto-fix** onto the enhanced style, so
`eslint --fix` migrates a codebase in one pass:

```diff
- paddingBlock: '1x 2x'
+ blockPadding: '1x 2x'
- insetInline: '0'
+ inlineInset: '0'
```

The axis renames are pure key edits — both keys emit the same declaration — and
`constants.round-trip.test.ts` now asserts that against the installed runtime for every
`safeFix` rename, so a handler that starts adding a default fails a test instead of
shipping an autofix that changes rendering.

Three groups are reported **without** a fix, because the rewrite is not equivalent:

- Edge longhands (`paddingBlockStart` → `blockPadding: '... start'`). The axis handler
  resets the edge you do not name, so the rewrite zeroes the opposite edge — the same
  reason `paddingTop` → `padding: '... top'` has never been auto-fixed.
- `borderBlock` and friends → `blockBorder`, which fills in the style and colour
  defaults `border-block` never had (`border-block: 1bw` renders nothing at all).
- `minBlockSize` → `blockSize: 'min ...'`, which also emits `block-size` and
  `max-block-size`, mirroring `minWidth`.

`consistent-token-usage` also treats a `1px` in `blockBorder`/`inlineBorder` as the
`1bw` token spelled out, as it already did for physical `border` — the logical axes take
the same width/style/colour value through the same parser, so the advice should not
depend on which vocabulary the author used.

`place` is recognised as well. It is a real Tasty style (`place: 'center start'` emits
four alignment declarations) with no CSS property of the same name to fall back on, so
`known-property` had been reporting valid code. Found by checking the constants against
tasty's exported style lists, which is now a test: every style in them must be a
property the plugin recognises.
