---
'@tenphi/eslint-plugin-tasty': minor
---

Add `tasty/no-raw-transition-duration` (recommended, warn).

Reports a hardcoded duration in a `transition` value — `transition: 'fill 0.2s'` — and
suggests either a duration token from your `tasty.config` (`$transition`,
`$fast-transition`, anything named `*-transition` or containing `duration`) or dropping
the duration so tasty substitutes `var(--<name>-transition, var(--transition))`. Motion
timing a design system owns belongs in one place; a `0.2s` spread through components is
the same drift as a raw hex colour.

Only the duration slot is checked. A later time value is a *delay*
(`transition: 'fill ease-in 0.1s'`) and is left alone, because omitting a delay means
"no delay" rather than "inherit the default". Already-tokenised and derived forms —
`$transition`, `var(--transition)`, `(0.2s * 2)` — are not reported. Both suggestions
change what the browser renders, so neither is applied by `eslint --fix`.
