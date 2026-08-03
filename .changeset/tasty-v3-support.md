---
'@tenphi/eslint-plugin-tasty': major
---

## Target `@tenphi/tasty` v3

The plugin now validates the v3 style DSL. Most of the upgrade is mechanical: the renamed at-rule keys are reported with an auto-fix, so `eslint --fix` handles them.

For tasty v2, pin `@tenphi/eslint-plugin-tasty@^0.11`.

### `$$name(...)` CSS function calls no longer error

v3 adds CSS `@function` support, invoked as `$$name(...)`. Because bare `$$name` is the custom-property reference `transition` uses, the classifier's `$$` branch ran first and rejected the call form outright — `padding: '$$negative(10px)'` produced a hard `valid-value` **error**, and `valid-custom-property` demanded that `$negative` be declared as a token.

Calls are now recognized as a distinct `tasty-function` token before the bare-reference check, and the `valid-custom-property` / `valid-color-token` regexes no longer match a name followed by `(`. The bare `$$name` / `##name` forms are unchanged, so `transition: '$$gradient-angle 0.3s'` still validates. A malformed name (`$$9bad(10px)`) still reports.

### At-rule keys use the CSS at-rule spelling

v3 renamed the camelCase keys to match the at-rules Tasty already emitted. `valid-styles-structure` reports the old spellings with a fix:

```
'@properties'   ->  '@property'
'@fontFace'     ->  '@font-face'
'@counterStyle' ->  '@counter-style'
```

`@function` is recognized as a special key and its value is structure-checked. Previously every `@`-prefixed key was accepted unconditionally, so v3 code got no validation at all and v2 code got no migration signal.

The at-rule list is now also used consistently: `isStateMap` excludes all five at-rule keys (it previously excluded only `@keyframes` and `@properties`, so a `@font-face` or `@counter-style` descriptor map could be mistaken for a state map), and `valid-value` skips all of them.

### One value per directional group

v3 dropped the positional multi-value form. Values and modifiers are bucketed separately per comma group, so `'2x 4x top right'`, `'2x top 4x right'`, and `'top 2x right 4x'` were the same input and the pairing depended on which order the *modifiers* happened to appear in. `valid-directional-modifier` now reports a group that names directions and carries more than one value:

```
padding: '2x 4x top right'   ->  padding: '2x top, 4x right'
fade:    '3x 1x top bottom'  ->  fade:    '3x top, 1x bottom'
```

Applies to `padding`, `margin`, `inset`, `scrollMargin`, and `fade`. Not to `border` (a group carries width + style + color) or `radius` (`leaf`/`backleaf` take two values) — neither uses the positional per-side form. Groups that name no direction keep plain CSS shorthand order, so `padding: '1x 2x 3x 4x'` and `fade: '3x 1x'` are still valid, as is a CSS-wide keyword alongside a direction (`padding: 'inherit top'`). `inset`'s `dock` keeps its two-value form; a third value reports.

The rule now parses with the shared value parser instead of splitting on whitespace, which is what makes comma groups visible to it.

### `valid-directional-modifier` reports what it always claimed to

The rule skipped any property absent from its own modifier table, which made its documented purpose unreachable: `fill: '#purple top'` and `width: '1x top'` were silently accepted despite the rule existing to catch exactly that. Both now report. A direction outside a property's own set (`padding: '1x top-left'`) now reports with the accepted list rather than the misleading "does not support directional modifiers".

It also no longer descends into `$` affix values (a selector, not a value — `$: '.active'` was read as an unknown unit), sub-element keys, or at-rule blocks.

### `scrollMargin` accepts directional modifiers

It shares tasty's directional engine but was missing from the modifier table, so `scrollMargin: '2x top'` reported as an unsupported property.

### `meta.version` reports the real version

It was a hardcoded `'0.1.0'` literal that had drifted from the released version. Now read from `package.json`, with a test asserting the two match so it cannot drift again.

### Config: `funcs` is now `functions`

Matching tasty's `TastyExtensionConfig`, which has always declared `functions` — the plugin read `funcs`, so a `functions: [...]` list in a shared `tasty.config.ts` was silently ignored and custom function names were never validated. `funcs` is still read as a deprecated alias.
