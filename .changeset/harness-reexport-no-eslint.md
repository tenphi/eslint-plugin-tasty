---
'@tenphi/eslint-plugin-tasty': patch
---

`tasty-lint:check` and the edit hook now follow a lint config that loads the plugin through a package in `importSources` that re-exports it, or from an `oxlint.config.js`/`.mjs`/`.cjs`, and `tasty-lint:check` names a config it passed over; without `eslint`, the hook tells the agent once per session that it did not lint the edit.
