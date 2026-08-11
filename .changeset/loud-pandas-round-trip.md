---
'@tenphi/eslint-plugin-tasty': patch
---

## `prefer-custom-property-syntax`: stop the autofix producing declarations the browser drops

Two bugs, both of which silently deleted CSS. They were found by wiring this rule into a
large codebase, running `eslint --fix`, and then diffing every changed value through
`renderStyles` — nothing else surfaced them, because there is no error at any stage: the
fix applies, the build passes, and the declaration is discarded at computed-value time.

### `-color` matched in the middle of a name

`COLOR_PROP_REGEX` used `\b` after `-color`, and `\b` matches between `color` and a
following `-`. So `$purple-color-rgb` matched as `$purple-color` and was rewritten to
`#purple-rgb`, and `$cui-text-color-secondary` became `#cui-text-secondary`.

In practice this cascaded across two `--fix` passes: `var(--purple-color-rgb)` became
`$purple-color-rgb` on the first (correct — `$x` is `var(--x)`), then `#purple-rgb` on the
second, which renders `var(--purple-rgb-color)`. That property does not exist. `-color` must
now end the identifier, so both names are left alone; `$purple-color` still converts.

### Suggesting a token form the property cannot expand

Tasty expands `$name` and `#name` **per property**, not globally, and this rule assumed
otherwise. `fontFamily` has its own handler that passes the value through verbatim, so
rewriting `var(--font-sans)` to `$font-sans` emitted a literal `font-family: $font-sans`.
The colour properties are the mirror image: `fill`, `color` and `backgroundColor` expand
`#token` but **not** `$name`, so `fill: 'rgb(var(--purple-color-rgb) / .05)'` could not be
rewritten either — while the very same rewrite is correct on `gap`.

Each of the three passes now checks that the form it is about to suggest round-trips for
that property, and suppresses the report when it does not. The guard is per-property rather
than a blanket mute, so `gap: 'var(--purple-color-rgb)'` is still reported. Suppressing
rather than warning-without-a-fix is deliberate: the rule is autofixable and runs unattended
in pre-commit hooks, so an unsafe suggestion is worse than no suggestion.

The two exception lists live in `constants.ts` and are **derived from tasty, not written by
hand** — `constants.round-trip.test.ts` rebuilds both against the installed runtime and
fails on drift, including a regression assertion for each of the three declarations above.
That guard is why `@tenphi/tasty` and `react` are now **devDependencies**; the optional-peer
stance is unchanged, since the plugin still has no runtime dependency on tasty.
