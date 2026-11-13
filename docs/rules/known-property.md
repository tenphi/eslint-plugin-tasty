# tasty/known-property

Reports a style property name that is neither a Tasty style nor a CSS property, such as a typo.

**Presets:** warning in recommended and strict. **Fix:** none.

## Why

Tasty passes an unknown key through as a CSS declaration, which the browser drops. A typo such as `colour` or `boarder` fails silently at runtime.

## Examples

```js
// ✅ Valid
tasty({ styles: { fill: '#purple', padding: '2x' } });

// ❌ Unknown style property 'colour'
tasty({ styles: { colour: '#purple' } });

// ❌ Unknown style property 'boarder'
tasty({ styles: { boarder: true } });
```

## What counts as known

- **Tasty styles:** `display`, `font`, `preset`, `hide`, `whiteSpace`, `opacity`, `transition`, `gridArea`, `order`, `gridColumn`, `gridRow`, `placeSelf`, `alignSelf`, `justifySelf`, `zIndex`, `margin`, `inset`, `position`, `padding`, `overflow`, `scrollbar`, `textAlign`, `scrollMargin`, `scrollPadding`, `border`, `radius`, `shadow`, `outline`, `color`, `fill`, `svgFill`, `fade`, `image`, `textTransform`, `fontWeight`, `fontStyle`, `width`, `height`, `flexBasis`, `flexGrow`, `flexShrink`, `flex`, `flow`, `placeItems`, `placeContent`, `alignItems`, `alignContent`, `justifyItems`, `justifyContent`, `align`, `justify`, `gap`, `columnGap`, `rowGap`, `gridColumns`, `gridRows`, `gridTemplate`, `gridAreas`, `recipe`, `textOverflow`.
- **Enhanced logical styles** (Tasty 3.8 and later), one per axis and category:

  | Category | Block axis | Inline axis |
  | --- | --- | --- |
  | Size | `blockSize` (+ `minBlockSize`, `maxBlockSize`) | `inlineSize` (+ `minInlineSize`, `maxInlineSize`) |
  | Padding | `blockPadding` | `inlinePadding` |
  | Margin | `blockMargin` | `inlineMargin` |
  | Inset | `blockInset` | `inlineInset` |
  | Scroll margin | `blockScrollMargin` | `inlineScrollMargin` |
  | Scroll padding | `blockScrollPadding` | `inlineScrollPadding` |
  | Border | `blockBorder` | `inlineBorder` |

- **CSS properties.** The list is generated from `known-css-properties`, the MDN/W3C dataset that stylelint uses for `property-no-unknown`. It covers modern properties (`maskSize`, `anchorName`, `fieldSizing`, `viewTransitionName`, `textBox`) and SVG presentation and geometry properties. A small hand-kept supplement adds properties that ship before the dataset has them. At-rule descriptors that the specs (through `@webref/css`) do not also define as properties, such as `src`, `prefix`, `suffix`, `syntax`, `symbols` and `unicodeRange`, are left out: a style rule cannot declare them. Regenerate the list with `pnpm generate:css-properties`.
- **Names from your config:** the `styles` list in `tasty.config.*`, for handlers added through `configure({ handlers })`.

The native logical spellings (`paddingBlock`, `insetInlineStart`, `borderBlockColor`, …) stay valid as CSS properties. They are no longer Tasty styles: Tasty 3.8 stopped reading `paddingBlock`, `paddingInline`, `insetBlock` and `insetInline` in its physical handlers. [`tasty/prefer-shorthand-property`](prefer-shorthand-property.md) reports them with a migration.

## Keys this rule skips

- A key that starts with an uppercase letter is a sub-element ([`tasty/valid-sub-element`](valid-sub-element.md)).
- A key that starts with `@` is an at-rule key (`@keyframes`, `@property`, …) or a local state alias.
- A key that starts with `$` or `$$` defines a custom property (`$name` is `--name`).
- A key that starts with `#` or `##` defines a color token (`#name` is `--name-color`).
- `--name` custom properties and vendor-prefixed properties (`-webkit-…`).
- A key that starts with `&` is a nested selector, which [`tasty/no-nested-selector`](no-nested-selector.md) reports.

## Options

None.
