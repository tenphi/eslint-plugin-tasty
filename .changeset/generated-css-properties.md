---
'@tenphi/eslint-plugin-tasty': patch
---

## The CSS property list is generated from MDN/W3C data

`known-property` matched style keys against a hand-written list of 332 CSS properties.
Tasty renders any camelCase key straight through to its kebab-case declaration, so
anything the list had not caught up with was reported as a typo on valid CSS:

```ts
tasty({
  styles: {
    maskSize: 'cover', // Unknown style property 'maskSize'.
    anchorName: '--trigger', // Unknown style property 'anchorName'.
    viewTransitionName: 'card', // Unknown style property 'viewTransitionName'.
    fieldSizing: 'content', // Unknown style property 'fieldSizing'.
  },
});
```

The list is now generated from [`known-css-properties`][kcp] — the MDN/W3C-sourced
dataset stylelint uses for `property-no-unknown` — taking it from 332 to 818 entries.
That covers the whole modern surface, including masking, anchor positioning, view
transitions, `text-box-*`, `field-sizing`, `reading-flow`, the `item-flow` family, and
SVG presentation and geometry properties (`cx`, `r`, `d`).

Seventeen `corner-*-shape` properties ship in Chromium but have not landed in the
dataset yet, so they are carried in a small hand-maintained supplement. A guard test
prunes each entry once the dataset covers it.

Regenerate after bumping the dataset — do not edit the list by hand:

```sh
pnpm generate:css-properties
```

`valid-transition` reads the same list, so `transition: 'mask-size 0.3s'` is accepted
too.

This widens the list; it does not loosen the rule. Misspellings are still reported,
including near-misses of the newly recognized properties — `markSize` is a typo of
`maskSize`, not a property.

[kcp]: https://github.com/known-css-properties/known-css-properties
