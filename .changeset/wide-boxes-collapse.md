---
'@tenphi/eslint-plugin-tasty': minor
---

Extend `prefer-directional-shorthand` to `radius`, `fade` and `border`, and teach it the `inset` `dock` modifier.

0.10.0 restricted the rule to `margin`, `padding` and `inset` because the other properties had no lossless target. `@tenphi/tasty` 2.10 adds the two missing forms — single-corner `radius` modifiers and the `inset` `dock` modifier — so those rewrites are now expressible and the rule covers them. **Requires `@tenphi/tasty` >= 2.10** for the newly suggested syntax.

**`radius` (auto-fixable)** — positions are corners, not sides, so the suggestion uses corner names:

```
radius: '0 1r 0 0'  ->  radius: '1r top-right'
radius: '4px 0 0 0' ->  radius: '4px top-left'
```

**`inset` with `dock` (auto-fixable)** — three equal offsets around a single `auto` is one edge pinned with the perpendicular pair spanned:

```
inset: 'auto 0 0 0' ->  inset: '0 bottom dock'
inset: '0 0 0 auto' ->  inset: '0 right dock'
```

**`fade` (auto-fixable)** — the extra groups in a 4-value `fade` are zero-length gradients, which are a no-op under `mask-composite: intersect`, so collapsing is equivalent and emits one mask layer instead of four:

```
fade: '0 0 2x 0'    ->  fade: '2x bottom'
```

**`border` (report-only, with a manual suggestion)** — four `border` tokens parse as a *single* border value (width/style/color), not as a box, so `border: '0 0 1bw 0'` currently emits `border: 0 solid …` — no border on any side. The directional form is what the author meant, but applying it changes what renders, so the rule reports it with an explanation and offers the rewrite as an editor suggestion rather than an `eslint --fix`.

**Suggestions always keep the explicit value** and never drop it in favour of the property default, because whether the two match is project-dependent. `margin` defaults to `var(--gap)` — 4px out of the box — while `1x` is 8px, so `margin: '0 0 1x 0'` -> `margin: 'bottom'` would silently halve the spacing. The rule emits `margin: '1x bottom'`.

`DIRECTIONAL_BOX_IDENTITY` is replaced by `DIRECTIONAL_BOX`, which carries the identity token, the position names and whether the rewrite is auto-fixable per property.
