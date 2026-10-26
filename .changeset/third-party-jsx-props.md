---
'@tenphi/eslint-plugin-tasty': patch
---

Without `typeAwareJSX`, the style-value rules no longer check JSX props on components imported from other packages. That means a bare specifier outside `importSources` (or a subpath of one) and `ownedSources`, such as `react-aria`'s `<FocusScope contain />`. Such a component's props are its own. `const` aliases resolve to the component they name. Components declared in the file, `tasty()` wrappers, and relative or in-repo imports are still checked. With `typeAwareJSX` on, prop types decide as before.
