/**
 * The check-edit hook: after an agent edits a file that imports Tasty, lints
 * it with the recommended Tasty rules and hands the new problems back.
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
  loadESLint,
  loadTypeScriptParser,
  newProblems,
  rulePage,
} from './lint.mjs';

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
try {
  const { default: plugin, recommended } = await import(build('index.js'));
  const dirs = [dirname(file), projectDir];
  const ESLint = await loadESLint(dirs, PACKAGE_ROOT);
  const parser = await loadTypeScriptParser(dirs);
  if (!parser && isTypeScript(file)) setupError(NO_PARSER);
  const eslint = createLinter({
    ESLint,
    plugin,
    rules: recommended,
    parser,
    cwd: projectDir,
  });
  const lint = async (source) =>
    collectProblems(
      await eslint.lintText(source, { filePath: file }),
      projectDir,
    ).problems;

  problems = await lint(text);
  // Report only what this edit added, so problems an older line already had
  // do not come back after every edit of the file.
  const original = event.tool_response?.originalFile;
  if (problems.length > 0 && typeof original === 'string' && original) {
    problems = newProblems(problems, text, await lint(original), original);
  }
} catch (error) {
  setupError(error instanceof Error ? error.message : String(error));
}

if (problems.length === 0) process.exit(0);

const shown = problems.slice(0, LIMIT);
const relativeFile = shown[0].file;
const pageOf = (name) =>
  rulePage(name, { projectDir, packageRoot: PACKAGE_ROOT, cwd });
const out = [
  `tasty-lint: this edit left ${problems.length} Tasty lint problem${problems.length === 1 ? '' : 's'} in ${relativeFile}. Fix ${problems.length === 1 ? 'it' : 'them'}. For an intentional exception, put \`// eslint-disable-next-line tasty/<rule> -- <reason>\` above the line.`,
  '',
  formatProblems(shown, pageOf),
];
if (problems.length > LIMIT) {
  out.push(
    '',
    `${problems.length - LIMIT} more: run \`npx harnesspm run tasty-lint:check ${relativeFile}\`.`,
  );
}
console.error(out.join('\n'));
process.exit(2);
