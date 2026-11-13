/**
 * The check-edit hook: after an agent edits a file that imports Tasty, lints
 * it with the Tasty rules the project's lint config sets (or the recommended
 * ones) and hands the new problems back.
 *
 * Claude Code runs it on PostToolUse for Edit, Write and MultiEdit, with the
 * event as JSON on stdin. Exit 0 says nothing. Exit 2 puts stderr in front of
 * the agent. Any other exit shows stderr to the person only, which is how a
 * broken setup is reported: the agent cannot fix it.
 */
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  NO_PARSER,
  collectProblems,
  createLinter,
  formatProblems,
  importsFrom,
  isLintable,
  isTypeScript,
  lintOptions,
  loadESLint,
  loadTypeScriptParser,
  newProblems,
  rulePage,
} from './lint.mjs';
import { createConfigResolver, isOn } from './project-config.mjs';

/** More problems than this are summed up, not listed. */
const LIMIT = 20;

const PACKAGE_ROOT = realpathSync(
  fileURLToPath(new URL('../../../', import.meta.url)),
);

function setupError(message) {
  console.error(`tasty-lint (check-edit hook): ${message}`);
  process.exit(1);
}

let event;
try {
  event = JSON.parse(readFileSync(0, 'utf8') || '{}');
} catch {
  process.exit(0);
}
const filePath = event?.tool_input?.file_path;
if (typeof filePath !== 'string' || !isLintable(filePath)) process.exit(0);

const cwd = typeof event.cwd === 'string' ? event.cwd : process.cwd();
const projectDir = process.env.HARNESSPM_PROJECT_DIR || cwd;
const file = resolve(cwd, filePath);
let text;
try {
  text = readFileSync(file, 'utf8');
} catch {
  process.exit(0);
}

const build = (name) => pathToFileURL(join(PACKAGE_ROOT, 'dist', name)).href;
if (!existsSync(join(PACKAGE_ROOT, 'dist/index.js'))) {
  setupError(`cannot find the plugin build in ${PACKAGE_ROOT}/dist.`);
}

// The cheap test first. Only a file without a Tasty import pays for loading
// the config, to look for the design system modules it lists.
if (!importsFrom(text)) {
  const { loadConfig } = await import(build('config.js'));
  let sources = [];
  try {
    sources = loadConfig(file).importSources;
  } catch {
    // A broken config is reported when a file that imports Tasty is linted.
  }
  if (!importsFrom(text, sources)) process.exit(0);
}

let problems;
let linter;
let typeAware = false;
try {
  const dirs = [dirname(file), projectDir];
  let loaded;
  try {
    loaded = await loadESLint(dirs, PACKAGE_ROOT);
  } catch (error) {
    // A project that lints with Oxlint alone may have no ESLint. Then the hook
    // stays out of the way, and `tasty-lint:check` says what to install.
    if (error?.code === 'NO_ESLINT') process.exit(0);
    throw error;
  }
  const { ESLint, espree } = loaded;
  const { default: plugin, recommended } = await import(build('index.js'));
  const project = await createConfigResolver({
    ESLint,
    plugin,
    packageRoot: PACKAGE_ROOT,
  }).forFile(file);
  linter = project.source?.linter;
  const lint = lintOptions(project, { recommended, projectDir });
  if (project.ignored || !Object.values(lint.rules).some(isOn)) process.exit(0);
  const parser = await loadTypeScriptParser(dirs);
  if (!parser && isTypeScript(file)) setupError(NO_PARSER);
  // typeAwareJSX builds a TypeScript program of the whole project: on UI Kit,
  // 13 s instead of 1 s for one file, on every edit. Without it, JSX props are
  // classified by name, so `tasty-lint:check` has the last word on them.
  const { typeAwareJSX, ...settings } = lint.settings;
  typeAware = Boolean(typeAwareJSX);
  const eslint = createLinter({
    ESLint,
    plugin,
    parser,
    espree,
    ...lint,
    settings,
  });
  const lintText = async (source) =>
    collectProblems(
      await eslint.lintText(source, { filePath: file }),
      projectDir,
    ).problems;

  problems = await lintText(text);
  // Report only what this edit added, so problems an older line already had
  // do not come back after every edit of the file.
  const original = event.tool_response?.originalFile;
  if (problems.length > 0 && typeof original === 'string' && original) {
    problems = newProblems(problems, text, await lintText(original), original);
  }
} catch (error) {
  setupError(error instanceof Error ? error.message : String(error));
}

if (problems.length === 0) process.exit(0);

const shown = problems.slice(0, LIMIT);
const relativeFile = shown[0].file;
// Paths print relative to the project root: the event's cwd is wherever the
// agent's shell went last, such as a folder in node_modules.
const pageOf = (name) =>
  rulePage(name, { projectDir, packageRoot: PACKAGE_ROOT, cwd: projectDir });
// The disable comment the project's linter reads.
const directive = `${linter === 'oxlint' ? 'oxlint' : 'eslint'}-disable-next-line`;
const out = [
  `tasty-lint: this edit left ${problems.length} Tasty lint problem${problems.length === 1 ? '' : 's'} in ${relativeFile}. Fix ${problems.length === 1 ? 'it' : 'them'}. For an intentional exception, put \`// ${directive} tasty/<rule> -- <reason>\` above the line.`,
  '',
  formatProblems(shown, pageOf),
];
if (problems.length > LIMIT) {
  out.push(
    '',
    `${problems.length - LIMIT} more: run \`npx harnesspm run tasty-lint:check ${relativeFile}\`.`,
  );
}
if (typeAware) {
  out.push(
    '',
    `This hook skips typeAwareJSX to stay fast, so it reads JSX props by their names. If a reported JSX prop is not a style, check it with \`npx harnesspm run tasty-lint:check ${relativeFile}\`.`,
  );
}
console.error(out.join('\n'));
process.exit(2);
