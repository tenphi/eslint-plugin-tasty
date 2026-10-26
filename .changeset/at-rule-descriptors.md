---
'@tenphi/eslint-plugin-tasty': patch
---

At-rule descriptors no longer count as CSS properties. `known-css-properties` lists names such as `prefix`, `suffix`, `src`, `syntax`, `symbols`, `unicodeRange` and `orientation`, which a style rule cannot declare. The generated property list now leaves out every name that the W3C specs, through `@webref/css`, define only as a descriptor. Names that are also properties, such as `fontWeight` or `speakAs`, stay. `known-property` now reports these names as style keys. A JSX prop with one of these names, such as `<NumberInput prefix="$" />`, is no longer value-checked as a style.
