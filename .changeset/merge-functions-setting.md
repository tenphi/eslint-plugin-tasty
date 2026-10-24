---
'@tenphi/eslint-plugin-tasty': minor
---

Add a `mergeFunctions` linter setting (`settings.tasty.mergeFunctions`) that names project helpers wrapping `mergeStyles`, such as `mergeStyleLayers`. Their object arguments are now linted like `mergeStyles` arguments: the first is the base and later ones are partial overrides, including objects behind a conditional or held in a render-scope variable.
