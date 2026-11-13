# AGENTS.md — @tenphi/eslint-plugin-tasty

## Project overview

`@tenphi/eslint-plugin-tasty` lints the style objects of [`@tenphi/tasty`](https://github.com/tenphi/tasty): `tasty()`, `tastyStatic()`, `useStyles()`, `useGlobalStyles()`, `mergeStyles()`, style props in JSX, and a design system's own style functions. It runs in ESLint and in Oxlint (through its JavaScript plugins). Projects list their tokens, units, presets, recipes and states in a `tasty.config.*` file, which the rules read.

Repository: <https://github.com/tenphi/eslint-plugin-tasty>

## Quick reference

| Command | Purpose |
| --- | --- |
| `pnpm build` | Build `dist/` with tsdown (ESM, unbundled, `.d.ts`) |
| `pnpm test` | Run the tests once (Vitest) |
| `pnpm test:linters` | Run the built plugin in real ESLint and Oxlint (needs `pnpm build`) |
| `pnpm typecheck` | Type-check without emitting |
| `pnpm lint` | Lint `src/` and `harness/` |
| `pnpm format` | Format with Prettier (`format:check` only checks) |
| `pnpm check:harness` | Validate the agent harness in `harness/` (`harnesspm check`) |
| `pnpm generate:css-properties` | Regenerate the CSS property list from `known-css-properties` |
| `pnpm changeset` | Add a changeset |

## Before pushing changes

1. Run `pnpm typecheck`, `pnpm lint`, `pnpm format`, `pnpm test`, `pnpm build`, `pnpm test:linters` and `pnpm check:harness`.
2. **Changeset.** A change that users notice (a rule, a message, a fix, an option, the presets, the docs pages or the harness) needs a changeset: run `pnpm changeset`, pick `patch`, `minor` or `major`, and write one line for users. Commit it with the change. Changes to CI, tests or repo-only files need none. Do not edit `CHANGELOG.md` or `version` in `package.json` by hand: the release flow writes them.
3. **Commits.** Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat`, `fix`, `docs`, `test`, `chore`, `ci`, …).
4. **Branches.** Do not push to `main`. Open a pull request.

## Project structure

```text
src/
  index.ts          Plugin entry: the rule map, the recommended and strict presets
  configs.ts        The presets
  create-rule.ts    createRule(): every rule's meta.docs.url points at docs/rules/<rule>.md
  context.ts        TastyContext: import tracking and style object detection
  config.ts         Loads tasty.config.* (extends chains, requires, mtime cache)
  constants.ts      Known properties, units, mappings (part generated)
  parsers/          The value and state key parsers
  rules/            One file per rule, with its tests next to it
docs/rules/         One page per rule
harness/            The agent harness that projects get through harnesspm
test/               ESLint and Oxlint integration (linter-integration.mjs) and fixtures
SPECIFICATION.md    Goals, detection scope, config, implementation notes and the rule index
```

## Rules and their docs

- **A new rule needs `docs/rules/<rule>.md`**, and a row in the index in `SPECIFICATION.md`. Add it to the rule map in `src/index.ts`, to a preset in `src/configs.ts` if it belongs there, and to the README tables.
- A page starts with `# tasty/<rule>`, then one line on what it checks, then `**Presets:** … **Fix:** …`, then why, examples (❌ and ✅), details and options. `src/rule-docs.test.ts` checks that every rule has a page, that every page names a rule, that the presets line matches `src/configs.ts`, that the fix line matches the rule's meta, and that the index links every page.
- When a rule's behavior, message, options or preset changes, change its page in the same commit.
- The pages ship in the package. The harness's docs index lists them, so agents read the page of the installed version.

## Agent harness (`harness/`)

The harness that projects get through [harnesspm](https://www.npmjs.com/package/@tenphi/harnesspm), as plugin `tasty-lint`. It is for people who **use** the plugin; contributor instructions stay in this file. Tasty's own harness (plugin `tasty`) covers how to write styles; this one covers linting them. `pnpm check:harness` validates it, and CI runs it.

| File | Description |
| --- | --- |
| [`harness/plugin.json`](harness/plugin.json) | Agent Plugins manifest: plugin `tasty-lint`, `docs` pointing at `../docs` (indexed from each page's H1, so there is no `llms.txt`), the `check` script (with `allow`) and the `check-edit` script, which has no description because only the hook runs it. |
| [`harness/dev.harnesspm/rules/usage.md`](harness/dev.harnesspm/rules/usage.md) | The one always-on rule: lint what you change, the `check` tool, the rule pages, and how to disable a rule for one line. It is copied into every consumer's `AGENTS.md`, so keep it under 400 bytes (a test checks). Its `##` sections let a consumer, such as a UI kit, patch one of them. |
| [`harness/dev.harnesspm/hooks.json`](harness/dev.harnesspm/hooks.json) | `tasty-lint:hooks/check-edit`: `PostToolUse` on Claude Code's `Edit`, `Write` and `MultiEdit`. Codex is left out: its `apply_patch` event gives the patch text in `tool_input.command`, not a file path. |
| [`harness/dev.harnesspm/scripts/check.mjs`](harness/dev.harnesspm/scripts/check.mjs) | `tasty-lint:check <files or folders> [--strict] [--json]`: runs only the `tasty/*` rules with ESLint's API, as the project's lint config sets them for each file (else the recommended or strict preset), with the project's `tasty.config.*`. Exit 1 on errors, 2 when it cannot lint. |
| [`harness/dev.harnesspm/scripts/check-edit.mjs`](harness/dev.harnesspm/scripts/check-edit.mjs) | The hook. Reads the event on stdin and returns at once unless `tool_input.file_path` is a JS or TS file that imports `@tenphi/tasty` or a configured `importSources` module. Lints it with the project's Tasty rules, without `typeAwareJSX` (seconds per edit), keeps only the problems the edit added (from `tool_response.originalFile`), and on problems exits 2 with them on stderr, which Claude Code hands to the agent. Without `eslint` in the project, it exits 0: an Oxlint-only project. Another setup problem, such as no TypeScript parser, exits 1, which only the person sees. |
| [`harness/dev.harnesspm/scripts/lint.mjs`](harness/dev.harnesspm/scripts/lint.mjs) | What both compute: the lint config, the parser wrapper that reads Oxlint's `oxlint-disable` comments as ESLint's (it rewrites each directive comment's `value` after parsing, so the text, lines and columns stay), the problems, the diff against the original file, the output, and where ESLint, espree and the TypeScript parser come from (the project's `eslint`, and its `@typescript-eslint/parser` or the one `typescript-eslint` brings). Functions take ESLint, the plugin and the parsers as arguments, so `src/harness.test.ts` runs them against the source. The scripts load the plugin from `../../../dist/`, so in this repository run `pnpm build` first. |
| [`harness/dev.harnesspm/scripts/project-config.mjs`](harness/dev.harnesspm/scripts/project-config.mjs) | The project's Tasty lint config for a file: the nearest `.oxlintrc.json`, `.oxlintrc.jsonc`, `oxlint.config.ts` or `oxlint.config.mts` (the names Oxlint finds) that lists the plugin in `jsPlugins`, or ESLint flat config that names `@tenphi/eslint-plugin-tasty`. An Oxlint config becomes a flat config with only its Tasty part (rules, overrides, `settings.tasty`, `ignorePatterns`, `extends`), and both are read through ESLint's `calculateConfigForFile()`. `test/fixtures/harness/oxlint/` is an Oxlint project, and `pnpm test:linters` checks that `tasty-lint:check` reports what Oxlint and ESLint report there. |

## Code conventions

- TypeScript in strict mode; `consistent-type-imports` is enforced.
- Tests are `*.test.ts`, next to the code they test. Unused names start with `_`.
- Every rule is created with `createRule()` and finds style objects through `TastyContext`.
- Prettier: single quotes, semicolons, trailing commas, 80 columns.
- Node 20 or later; pnpm.
