---
'@tenphi/eslint-plugin-tasty': minor
---

`protectedComponents` entries can name a sub-component by its member path, such as `'Button.Group'` or `'Menu.*'`, in `include` or `exclude`. An entry that names a member path decides for it before an entry that matches only the export it hangs off. A separate component attached for convenience, such as a layout-primitive `Button.Group`, can then stay open while `Button` keeps its contract. The longest named path wins, so `'Button.Group'` also covers `Button.Group.Item`. Aliases, namespace imports, `const` aliases and relative re-exports of a member (`export const SplitButton = Button.Split`) resolve to the same path.
