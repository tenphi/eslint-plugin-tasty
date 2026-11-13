---
'@tenphi/eslint-plugin-tasty': patch
---

`tasty-lint:check` and the edit hook now run the `tasty/*` rules as the project's Oxlint or ESLint config sets them (levels, options, `settings.tasty`, overrides and ignored files), honor `oxlint-disable` comments, and the hook stays quiet in a project without `eslint`.
