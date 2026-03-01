---
"@tenphi/eslint-plugin-tasty": minor
---

Detect style objects in variable declarations (not only inside `tasty()` calls). Variables with names ending in `style`/`styles` (case-insensitive) or typed as `Styles` are now validated. Handles TypeScript type annotations (`TSAsExpression`, `TSSatisfiesExpression`, etc.).

Move `valid-recipe` and `valid-preset` rules to the `recommended` config. Both rules now use the broader `ObjectExpression` selector to catch style variables.

Fix `valid-preset` to allow CSS global keywords (`inherit`, `initial`, `unset`, `revert`).

Fix config `extends` resolution to find `tasty.config.*` files inside npm packages (walk `node_modules` instead of `require.resolve`). Strip comments and use balanced brace matching when parsing TS/JS config files.
