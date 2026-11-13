/**
 * tasty-lint:check — lints files with this plugin's Tasty rules only, as the
 * project's own lint config sets them, with the project's tasty.config.* and
 * ESLint.
 */
import { existsSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  NO_PARSER,
  collectProblems,
  createLinter,
  formatProblems,
  isLintable,
  isTypeScript,
  lintOptions,
  loadESLint,
  loadTypeScriptParser,
  rulePage,
  summarize,
} from './lint.mjs';
import { createConfigResolver, isOn } from './project-config.mjs';

const USAGE = `Usage: npx harnesspm run tasty-lint:check <files or folders>... [--strict] [--json]

Lints the files with the Tasty rules of @tenphi/eslint-plugin-tasty only, as
the project's own lint runs them: each file gets the tasty/* rules, their
options and settings.tasty (such as typeAwareJSX) from the nearest
.oxlintrc.json, .oxlintrc.jsonc, oxlint.config.ts, oxlint.config.mts or ESLint
flat config above it that loads the plugin, and the files that config ignores
are skipped. Without such a config, it runs the recommended preset. The rules
read the project's tasty.config.* too. Other plugins' rules do not run.

Disable comments for the Tasty rules apply: // eslint-disable-next-line
tasty/<rule> -- <reason>, and the oxlint-disable forms, unless the config is
ESLint's.

A path is read from the current folder, else from the project root. Each
problem prints as file:line:col  tasty/<rule>  <severity>  message, with the
file relative to the project root. The page of each rule reported follows. Exit code: 0
without errors (warnings allowed), 1 with errors, 2 when nothing could be
linted.

--strict  also run the strict preset's rules that the config does not set
--json    print the problems as JSON`;

const PACKAGE_ROOT = realpathSync(
  fileURLToPath(new URL('../../../', import.meta.url)),
);
const BUILD = join(PACKAGE_ROOT, 'dist/index.js');
const cwd = process.cwd();
const projectDir = process.env.HARNESSPM_PROJECT_DIR || cwd;

function fail(message) {
  console.error(`tasty-lint: ${message}`);
  process.exit(2);
}

const errorText = (error) =>
  error instanceof Error ? error.message : String(error);

const options = { strict: false, json: false, help: false };
const paths = [];
for (const arg of process.argv.slice(2)) {
  if (!arg.startsWith('--')) paths.push(arg);
  else if (arg.slice(2) in options) options[arg.slice(2)] = true;
  else fail(`unknown option ${arg}\n\n${USAGE}`);
}
if (options.help || paths.length === 0) {
  console.log(USAGE);
  process.exit(options.help ? 0 : 2);
}

// A path is read from the current folder, else from the project root: an
// agent's shell can be elsewhere when it names a file of the project.
const targets = paths.map((path) =>
  [resolve(cwd, path), resolve(projectDir, path)].find((p) => existsSync(p)),
);
const missing = paths.filter((_, i) => !targets[i]);
if (missing.length > 0) fail(`cannot find ${missing.join(', ')}`);
if (!existsSync(BUILD)) {
  fail(
    `cannot find the plugin build at ${BUILD}. In the plugin's repository, run \`pnpm build\` first.`,
  );
}

const {
  default: plugin,
  recommended,
  strict,
} = await import(pathToFileURL(BUILD).href);
const preset = options.strict ? 'strict' : 'recommended';

let ESLint;
let espree;
let parser;
try {
  ({ ESLint, espree } = await loadESLint([cwd, projectDir], PACKAGE_ROOT));
  parser = await loadTypeScriptParser([cwd, projectDir]);
} catch (error) {
  fail(errorText(error));
}

const show = (file) => relative(projectDir, file) || file;

/** The files in a folder that the tools lint, as ESLint skips node_modules. */
function* walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : 1,
  );
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git') {
        yield* walk(path);
      }
    } else if (isLintable(entry.name)) {
      yield path;
    }
  }
}

// Each file gets the rules its config sets, so files are linted in groups of
// the same rules and settings. A file named on the command line that is not
// linted is reported; one found in a folder is skipped quietly, as ESLint does.
const resolver = createConfigResolver({
  ESLint,
  plugin,
  packageRoot: PACKAGE_ROOT,
});
const groups = new Map();
const skipped = [];
const configs = new Set();
for (const target of targets) {
  const named = !statSync(target).isDirectory();
  for (const file of named ? [target] : walk(target)) {
    if (!isLintable(file)) {
      skipped.push({
        file: show(file),
        reason: 'not a JavaScript or TypeScript file.',
      });
      continue;
    }
    let project;
    try {
      project = await resolver.forFile(file);
    } catch (error) {
      fail(
        `cannot read the lint config for ${show(file)}: ${errorText(error)}`,
      );
    }
    const config = project.source && show(project.source.file);
    const lint = lintOptions(project, {
      recommended,
      strict,
      useStrict: options.strict,
      projectDir,
    });
    if (project.ignored || !Object.values(lint.rules).some(isOn)) {
      if (named) {
        skipped.push({
          file: show(file),
          reason: project.ignored
            ? `${config} does not lint it.`
            : `${config} runs no tasty/* rule on it.`,
        });
      }
      continue;
    }
    if (config) configs.add(config);
    const key = JSON.stringify(lint);
    if (!groups.has(key)) groups.set(key, { lint, files: [], config });
    groups.get(key).files.push(file);
  }
}

const results = [];
for (const { lint, files } of groups.values()) {
  const eslint = createLinter({ ESLint, plugin, parser, espree, ...lint });
  try {
    results.push(...(await eslint.lintFiles(files)));
  } catch (error) {
    fail(errorText(error));
  }
}
results.sort((a, b) => (a.filePath < b.filePath ? -1 : 1));

if (!parser && results.some((result) => isTypeScript(result.filePath))) {
  fail(NO_PARSER);
}

// Paths print relative to the project root, as harnesspm runs from there.
const collected = collectProblems(results, projectDir);
const { problems } = collected;
skipped.push(...collected.skipped);
const pageOf = (name) =>
  rulePage(name, { projectDir, packageRoot: PACKAGE_ROOT, cwd: projectDir });
const errors = problems.filter((p) => p.severity === 'error').length;
const linted = results.length - collected.skipped.length;

// Which rules ran: a config's, with --strict also the strict preset's others,
// and the preset for files without a config.
const sources = [...new Set([...groups.values()].map((g) => g.config ?? null))];
const ruleset = sources
  .map((config) =>
    config
      ? `rules from ${config}${options.strict ? ' and the strict preset' : ''}`
      : `${preset} rules`,
  )
  .join('; ');

if (options.json) {
  console.log(
    JSON.stringify(
      {
        preset,
        configs: [...configs],
        files: results.map((r) => r.filePath),
        linted,
        problems: problems.map((p) => ({
          ...p,
          page: p.rule ? pageOf(p.rule.slice('tasty/'.length)) : null,
        })),
        skipped,
      },
      null,
      2,
    ),
  );
} else {
  const out = [];
  const count = `${linted} file${linted === 1 ? '' : 's'}`;
  if (linted === 0) {
    out.push(`Nothing linted in ${paths.join(', ')}.`);
  } else if (problems.length === 0) {
    out.push(`No tasty/* problems in ${count} (${ruleset}).`);
  } else {
    out.push(
      formatProblems(problems, pageOf),
      '',
      `${summarize(problems)} in ${count} (${ruleset}).`,
    );
  }
  for (const s of skipped) out.push(`Skipped ${s.file}: ${s.reason}`);
  if (linted === 0 && skipped.length === 0) {
    out.push(
      'Pass .js, .jsx, .ts or .tsx files of the project, or folders with them.',
    );
  }
  console.log(out.join('\n'));
}

// Nothing linted is not a pass.
process.exit(errors > 0 ? 1 : linted === 0 ? 2 : 0);
