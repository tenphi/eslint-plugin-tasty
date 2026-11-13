# tasty/prefer-shorthand-property

Prefer Tasty's shorthand properties when defining a complete style, such as
`fill` instead of `backgroundColor` or `height` instead of separate size constraints.

**Presets:** warning in recommended and strict. **Fix:** autofix for pure key renames.

## Why

Tasty's shorthands carry its units, tokens, modifiers and defaults: `fill` takes
color tokens and mixes, `padding: '2x top'` names its side, `blockPadding`
emits native logical CSS. A native longhand bypasses that handler.

## Examples

```js
// ❌ When defining the complete style, prefer tasty shorthand 'fill' instead of 'backgroundColor'.
tasty({ styles: { backgroundColor: '#purple' } });

// ✅ After the autofix
tasty({ styles: { fill: '#purple' } });

// ❌ Prefer 'padding: '... top'' instead of 'paddingTop'. Reported without a fix.
tasty({ styles: { paddingTop: '2x' } });
```

## Mapping

| Native CSS | Tasty |
| --- | --- |
| `backgroundColor` | `fill` |
| `backgroundImage` | `image` |
| `borderColor`, `borderWidth`, `borderStyle` | `border` |
| `borderTop`, `borderRight`, `borderBottom`, `borderLeft` | `border: '... top'` and the other sides |
| `borderRadius` | `radius` |
| `minWidth`, `maxWidth` | `width: 'min ...'`, `width: 'max ...'` |
| `minHeight`, `maxHeight` | `height: 'min ...'`, `height: 'max ...'` |
| `flexDirection`, `flexWrap`, `flexFlow`, `gridAutoFlow` | `flow` |
| `flexGap` | `gap` |
| `gridTemplateColumns`, `gridTemplateRows`, `gridTemplateAreas` | `gridColumns`, `gridRows`, `gridAreas` |
| `top`, `right`, `bottom`, `left` | `inset: '... top'` and the other sides |
| `outlineColor`, `outlineWidth`, `outlineStyle` | `outline` |
| `outlineOffset` | `outline: '... / offset'` |
| `paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft` | `padding: '... top'` and the other sides |
| `marginTop`, `marginRight`, `marginBottom`, `marginLeft` | `margin: '... top'` and the other sides |
| `fontSize`, `letterSpacing`, `textTransform` | `preset` |
| `fontWeight`, `lineHeight`, `fontStyle` | `preset: 'name / strong'`, `'name / tight'`, `'name / italic'` |
| `fontFamily` | `font` (`preset` for a CSS-wide keyword such as `inherit`) |
| `boxShadow` | `shadow` |
| `scrollbarWidth`, `scrollbarColor`, `scrollbarGutter` | `scrollbar` |
| `lineClamp` | `textOverflow: 'ellipsis / {lines}'` |

**Logical properties** (Tasty 3.8 and later). Tasty moved the enhanced behavior
onto the `<axis><Category>` names and left the native spellings as plain CSS:

| Native CSS | Tasty |
| --- | --- |
| `paddingBlock`, `paddingInline` | `blockPadding`, `inlinePadding` |
| `paddingBlockStart`, `paddingInlineEnd`, … | `blockPadding: '... start'`, `inlinePadding: '... end'`, … |
| `marginBlock`, `marginInline` and their edges | `blockMargin`, `inlineMargin` |
| `insetBlock`, `insetInline` and their edges | `blockInset`, `inlineInset` |
| `scrollMarginBlock`, `scrollPaddingInline` and the like | `blockScrollMargin`, `inlineScrollPadding` and the like |
| `borderBlock`, `borderBlockColor`, `borderBlockWidth`, `borderBlockStyle` | `blockBorder` |
| `borderInlineStart`, … | `inlineBorder: '... start'`, … |
| `minBlockSize`, `maxBlockSize` | `blockSize: 'min ...'`, `blockSize: 'max ...'` |
| `minInlineSize`, `maxInlineSize` | `inlineSize: 'min ...'`, `inlineSize: 'max ...'` |

Logical corners (`borderStartStartRadius` and the like) are left out on purpose:
`radius` sets physical corners, so pointing a logical corner at it would be wrong.

## Autofix

Only renames that change nothing but the key are fixed, outside extension
layers: `backgroundColor` to `fill`, `borderRadius` to `radius`, and the logical
axis renames such as `paddingBlock: '1x 2x'` to `blockPadding: '1x 2x'`, which
emit the same `padding-block: 1x 2x`.

The others stay report-only. An edge longhand needs a `start`, `end` or side
modifier in the value, and the axis handler resets the edge you do not name. A
`border-*` rename adds the style and color defaults that `border-block` never
had (`border-block: 1bw` renders nothing).

## Extension layers

In an extension layer (`tasty(Base, {...})`, `tastyStatic(Base, {...})` or a
`styles` prop), the report says the shorthand would replace the base's whole
property, and has no fix. Styles merge per key there, so renaming the key
replaces the base component's whole property instead of patching the part the
layer writes: `paddingTop: '2x'` to `padding: '2x top'` sets the base's other
three edges to `0`, and `backgroundColor` to `fill` replaces a `fill` state map
the layer never mentioned.

The recommended shape is a token in the base component, set from the layer:

```js
// base component: the seam
const Card = tasty({ styles: { padding: '$v-padding $h-padding' } });

// extension layer: no raw CSS longhand needed
const TallCard = tasty(Card, { styles: { '$v-padding': '4x' } });
```

**Ownership.** That advice helps only if the base component is yours to edit,
so the report is skipped when the base is imported from a package. Over a UI kit
component, the only options left are the longhand already written or a rewrite
that would clobber the base. Components declared in the same file count as
owned, as do relative, absolute, `~`, `#` and `@/` imports. List a design system
published from the same monorepo in `ownedSources` in `tasty.config.ts`. A base
the plugin cannot resolve to an import is treated as owned.

```js
import { Button } from '@uikit/button';
import { Card } from './card';

// ✅ Not reported: '@uikit/button' is not this project's to change
tasty(Button, { styles: { paddingTop: '2x' } });

// ❌ Reported without a fix: the seam belongs in ./card
tasty(Card, { styles: { paddingTop: '2x' } });
```

## Changing one part with a token

A shorthand can also reset values you did not intend to change. For example,
replacing `minHeight: '20x'` with `height: 'min 20x'` resets `height` to `auto` and
`max-height` to `initial`. In a component extension, it replaces the base's whole
`height` definition, including its state map. The rule reports these changes
without an autofix.

For an independent override, expose the relevant part as a token in the original
component definition. Keep the other values and any states already defined there:

```tsx
const Card = tasty({
  styles: {
    '$min-height': '100vh',
    height: '$min-height auto 100vw',
  },
});

// Changes only min-height; height and max-height keep their original values.
<Card tokens={{ '$min-height': '20x' }} />;
```

The default token preserves the original minimum height until it is overridden.
Use your existing height and maximum height in place of `auto` and `100vw`.
The diagnostic's `initial` placeholders describe an otherwise unconstrained
dimension; keep any constraints from the original definition when adding a token.

Two dimension values mean **minimum and maximum**, with the main size set to
`auto`: `height: '$min-height 100vw'` sets `min-height` and `max-height`. Three
values mean **minimum, size, maximum**: `height: '$min-height 100vh 100vw'` also
sets an explicit height. The same pattern works for `width`, `blockSize`, and
`inlineSize`, and for independent maximum-size overrides.

The diagnostics also recommend tokens for other partial shorthand overrides,
such as one padding edge or one border part. Add the token in the original
definition while preserving its other values, then override it through `tokens`.
Extension diagnostics point to the base component, where the token must be
exposed. Reports over imported components you cannot edit remain suppressed;
`ownedSources` can opt a design system from your own project back in.

For sub-elements, declare the token default on the component root and reference
it from the sub-element's shorthand. A default declared on the sub-element itself
would take precedence over a token inherited from the root.

`useStyles`, `useGlobalStyles`, and `tastyStatic` produce classes or CSS rather than
a component accepting `tokens`. Their diagnostics instead recommend setting the
corresponding CSS custom property on the target element, for example
`element.style.setProperty('--min-height', '160px')`. These values must use CSS
units; the component `tokens` prop processes Tasty units such as `20x` for you.

Preset names and modifiers are static. For independent typography overrides,
use the CSS value tokens referenced by the original named preset, such as
`$body-font-size` for `preset: 'body'`. A token cannot replace the preset name
or its modifiers. Scrollbar width and gutter modifiers are also static;
independent token overrides belong in the `scrollbarWidth` or `scrollbarGutter`
longhand instead of the `scrollbar` DSL.

## Motion longhands

Motion longhands are left alone on purpose. Tasty has an enhanced `transition`
shorthand and accepts the native CSS `animation` shorthand. Replacing
`transitionDuration`, `animationDuration` or another motion longhand with a
shorthand could reset other values in a state or extension, and `animation` can
also reset `animationTimeline` and `animationRange`. Use a shorthand to define a
complete effect and longhands to change one part.
[`tasty/no-raw-transition-duration`](no-raw-transition-duration.md) and
[`tasty/no-raw-motion-duration`](no-raw-motion-duration.md) check raw timing in
either form.

## Options

None.
