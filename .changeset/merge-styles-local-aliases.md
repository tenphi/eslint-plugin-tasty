---
'@tenphi/eslint-plugin-tasty': patch
---

`no-unknown-state-alias` and `valid-state-key` see local `@name` state aliases the way Tasty resolves them. A `mergeStyles(...)` call used as a sub-element value (`Icon: mergeStyles(BASE, { … })`) was checked without the aliases of the styles around it, so an alias defined on the root was reported as unknown. Its arguments now see the enclosing styles' aliases, aliases from every object argument of the same `mergeStyles` call count, and a sub-element also sees aliases defined on the sub-elements that contain it, as Tasty's renderer does.
