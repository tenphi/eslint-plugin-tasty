---
'@tenphi/eslint-plugin-tasty': patch
---

`no-style-prop`, `no-classname-prop`, `no-styles-prop` and the Tasty-component gate for JSX value rewrites recognize Tasty components imported from relative modules (`import { Panel } from './styled'`). The imported module is read the same syntactic way as the current file: a `tasty()` or configured options-factory result, a `const` alias of one, an import from `importSources`, a default export, or a re-export (`export { … } from`, `export * from`) that leads to one. Specifiers resolve with or without an extension, including `./styled.js` for `styled.ts` and directory `index` files. Reading the module needs the `typescript` package. Without it, imported components are not recognized, as before. Namespace imports (`<UI.Panel />`) and path aliases are not followed.
