---
'@tenphi/eslint-plugin-tasty': minor
---

Report `fill: true`, and check `true` inside state maps.

`fill` is documented as accepting `true`, but as of tasty 3.8 the handler passes the
boolean straight through: `fill: true` emits `background-color: true`, which the browser
drops, leaving the element with no background at all. That is invisible at runtime and
indistinguishable from a typo at lint time, so `valid-boolean-property` now reports it.
`fill: false` stays valid — it is a tombstone, like `false` on any property.

Two round-trip guards keep this honest against the runtime rather than the docs: no
property in `BOOLEAN_TRUE_PROPERTIES` may render the literal `true`, and `fill` still
does — so whichever way tasty resolves the discrepancy, a test says so instead of the
plugin quietly disagreeing. `fill` was the only entry in the list affected.

`valid-boolean-property` also descends into state maps now, which it never did. A state
map holds values for the same property, so `true` is exactly as unsupported in one as it
is written directly — and `fill: { '': '#clear', hovered: true }` is the shape that reads
as if it should work. Every other value-checking rule in the plugin already descended;
this one was the exception.
