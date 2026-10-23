---
'@tenphi/eslint-plugin-tasty': patch
---

`no-runtime-styles-mutation` reports only values that can change between renders. Values fixed once the module has loaded generate their CSS once, like a literal, so they are no longer reported: `undefined`, module-scope `const` bindings, enums and imports and their members (`THEMES.special.color`), and templates, operators, conditionals and `mergeStyles(...)` calls built only from those (`` `${WIDTH}px` ``, `Icon: mergeStyles(BASE, { gridArea: 'icon' })`). Computed keys get the same test. Props, state, hook results, function parameters, local or `let` bindings and other calls are still reported, as in `mergeStyles(BASE, props.styles)` inside a component.
