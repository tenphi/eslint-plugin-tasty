---
'@tenphi/eslint-plugin-tasty': patch
---

The style-value rules no longer check JSX props on components imported from other packages, such as `react-aria`'s `<FocusScope contain />`. Such a component's props are its own. This applies to a bare specifier that neither `importSources` nor `ownedSources` lists. An entry in either list covers the paths below it, so `@my/ds` covers `@my/ds/button`. `const` aliases resolve to the component they name. Components declared in the file, `tasty()` wrappers, and relative or in-repo imports are still checked. With `typeAwareJSX` on, prop types decide, and this rule applies only where they cannot, such as `any` or unresolved props. `ownedSources` entries now cover their subpaths for `prefer-shorthand-property` as well.
