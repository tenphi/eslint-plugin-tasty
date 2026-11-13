/**
 * tasty-lint:check — lints files with this plugin's Tasty rules only, with the
 * project's tasty.config.* and ESLint.
 */
import { existsSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  NO_PARSER,
  collectProblems,
  createLinter,
  formatProblems,
  isTypeScript,
  loadESLint,
  loadTypeScriptParser,
  rulePage,
  summarize,
} from './lint.mjs';

const USAGE = `Usage: npx harnesspm run tasty-lint:check <files or folders>... [--strict] [--json]

Lints the files with the Tasty rules of @tenphi/eslint-plugin-tasty only: the
recommended preset, or the strict one with --strict. The rules read the
project's tasty.config.* as they do in the project's own lint.

It does not read the project's ESLint or Oxlint config, so other plugins, rule
options and settings such as typeAwareJSX do not apply. Disable comments such
as // eslint-disable-next-line tasty/<rule> -- <reason> do.

Each problem prints as file:line:col  tasty/<rule>  message. The page of each
rule reported follows. Exit code: 0 without errors (warnings allowed), 1 with
errors, 2 when the files cannot be linted.

--strict  also run the rules only the strict preset enables
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

const missing = paths.filter((path) => !existsSync(resolve(path)));
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
let parser;
try {
  ESLint = await loadESLint([cwd, projectDir], PACKAGE_ROOT);
  parser = await loadTypeScriptParser([cwd, projectDir]);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

const eslint = createLinter({
  ESLint,
  plugin,
  rules: options.strict ? strict : recommended,
  parser,
  cwd,
});

let results;
try {
  results = await eslint.lintFiles(paths);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

if (!parser && results.some((result) => isTypeScript(result.filePath))) {
  fail(NO_PARSER);
}

const { problems, skipped } = collectProblems(results, cwd);
const pageOf = (name) =>
  rulePage(name, { projectDir, packageRoot: PACKAGE_ROOT, cwd });
const errors = problems.filter((p) => p.severity === 'error').length;

if (options.json) {
  console.log(
    JSON.stringify(
      {
        preset,
        files: results.map((r) => r.filePath),
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
  const count = `${results.length} file${results.length === 1 ? '' : 's'}`;
  if (problems.length === 0) {
    out.push(`No tasty/* problems in ${count} (${preset} rules).`);
  } else {
    out.push(
      formatProblems(problems, pageOf),
      '',
      `${summarize(problems)} in ${count} (${preset} rules).`,
    );
  }
  for (const s of skipped) out.push(`Skipped ${s.file}: ${s.reason}`);
  if (results.length === 0) {
    out.push(
      `No files to lint in ${paths.join(', ')}: pass .js, .jsx, .ts or .tsx files, or folders with them.`,
    );
  }
  console.log(out.join('\n'));
}

process.exit(errors > 0 ? 1 : 0);
