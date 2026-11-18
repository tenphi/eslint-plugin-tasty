---
'@tenphi/eslint-plugin-tasty': minor
---

A `protectedComponents` entry takes `allowedInnerStyleProps`, which maps a `*Styles` prop to the style props it may set, such as `{ popoverStyles: ['dimension'] }`. `no-protected-restyle` then lets an inline object that sets only those props through, on instances and in `tasty()` wrappers, and still reports any other key, a sub-element, a spread or a variable. A `*Styles` prop without an allowance is reported as before. Root `styles` and allowed `*Styles` props also pass as a conditional whose branches are each an allowed inline object, `undefined` or `null`, the static choice `no-runtime-styles-mutation` asks for.
