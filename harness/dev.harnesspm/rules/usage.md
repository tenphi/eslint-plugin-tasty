# Linting Tasty styles

## After you change styles

- Lint the changed files and fix every `tasty/*` problem.
- `tasty-lint:check <files>` runs only the Tasty rules.
- Each `tasty/<rule>` has a page in the `tasty-lint` docs index.

## Exceptions

- Disable a rule for one line only: `// eslint-disable-next-line tasty/<rule> -- <reason>`.
