---
'@tenphi/eslint-plugin-tasty': patch
---

`tasty-lint:check` now adds a note to "No tasty/* problems" for a file named on the command line that imports nothing from `@tenphi/tasty` or a configured `importSources` module, as the rules may have found no styles in it. When the file imports `tasty`, `tastyStatic`, `useStyles` or `useGlobalStyles` from another package, the note names that package and says to list it in `importSources` or extend its `tasty.config.*`. `--json` lists these files in `noTastyImport`. Files found in a folder, and the edit hook, stay quiet.
