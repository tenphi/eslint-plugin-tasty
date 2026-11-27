---
'@tenphi/eslint-plugin-tasty': patch
---

The agent harness now names harnesspm by its new package, `@harnesspm/cli`: the `tasty-lint:check` usage line and the edit hook's messages print `npx -y @harnesspm/cli run tasty-lint:check`, which also works outside the project folder.
