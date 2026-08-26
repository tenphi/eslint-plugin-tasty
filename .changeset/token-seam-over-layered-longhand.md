---
'@tenphi/eslint-plugin-tasty': patch
---

## `prefer-shorthand-property` stops rewriting keys inside an extension layer

The rename this rule offers is safe in a base definition and unsafe in an extension layer,
because layers merge per key. `paddingTop: '2x'` → `padding: '2x top'` looked like a
narrowing rewrite but dropped the base component's other three edges to `0`, and even the
carry-over pair (`backgroundColor` → `fill`, `borderRadius` → `radius`) replaced a state map
the layer never mentioned.

Inside `tasty(Base, {...})` / `tastyStatic(Base, {...})` — sub-element objects included — the
report now carries no fix and names the shape that actually belongs there: a token in the base
component's property, set from the layer.

```js
const Card = tasty({ styles: { padding: '$v-padding $h-padding' } });
const TallCard = tasty(Card, { styles: { '$v-padding': '4x' } });
```

### A `styles` prop is an extension layer too

`<Card styles={{ … }} />` and a Storybook `args.styles` land on top of a component that
already has its own styles, which is the same situation as `tasty(Base, {…})` — but the style
context reported `isExtending: false` for them. They now extend, so this rule withholds its
rewrite there as well, and `require-default-state` stops asking a `styles` prop for a `''`
default the base already provides.

### The suggestion is skipped over a base you cannot edit

Adding a token seam means editing the base component's own definition, so the report is
skipped when the base is imported from a package: over a UI-kit component the author's only
remaining options are the longhand they already wrote or a rewrite that would clobber the
base, and recommending neither is noise. Same-file declarations and relative, absolute, `~`,
`#` and `@/` imports count as yours; a base that cannot be resolved to an import is treated as
yours too, so silence needs positive evidence. A design system published from your own
monorepo is opted back in with the new `ownedSources` config key:

```ts
// tasty.config.ts
export default { ownedSources: ['@my-org/*'] };
```

Base definitions, selector-mode `tastyStatic('.card', {...})`, and `variants` are unchanged
and still auto-fix.
