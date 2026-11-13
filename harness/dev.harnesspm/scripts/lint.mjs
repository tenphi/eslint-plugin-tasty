/**
 * What `tasty-lint:check` and the `check-edit` hook compute. The functions
 * that lint take ESLint's class, the plugin and the parser as arguments: the
 * tools pass the project's ESLint and this package's `dist/` build, and
 * `src/harness.test.ts` passes the source, so most tests need no build.
 */
import { existsSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Files the tools lint: JavaScript and TypeScript, with or without JSX. */
const LINTABLE = /\.(?:[cm]?[jt]s|[jt]sx)$/;
const TYPESCRIPT = /\.(?:[cm]?ts|tsx)$/;
const DECLARATION = /\.d\.[cm]?ts$/;

/** Tasty's own modules, which every import source list includes. */
const TASTY = '@tenphi/tasty';

export function isLintable(file) {
  return LINTABLE.test(file) && !DECLARATION.test(file);
}

export function isTypeScript(file) {
  return TYPESCRIPT.test(file);
}

/**
 * Whether the text imports from Tasty or one of `sources`, subpaths included:
 * a text test that runs before anything is parsed.
 */
export function importsFrom(text, sources = []) {
  for (const source of new Set([TASTY, ...sources])) {
    const escaped = source.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
    if (new RegExp(`(['"\`])${escaped}(?:/[^'"\`]*)?\\1`).test(text)) {
      return true;
    }
  }
  return false;
}

/**
 * The ESLint flat config that runs only this plugin's rules. It does not read
 * the project's linter config, so `settings.tasty` is empty: in particular
 * `typeAwareJSX`, which builds a TypeScript program, stays off.
 */
export function lintConfig({ plugin, rules, parser }) {
  const config = [
    {
      files: ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'],
      plugins: { tasty: plugin },
      // Directives for other plugins' rules are not this tool's business.
      linterOptions: { reportUnusedDisableDirectives: false },
      languageOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
      rules,
    },
  ];
  if (parser) {
    config.push({
      files: ['**/*.{ts,tsx,mts,cts}'],
      // The parser prints its TypeScript version warning on stdout, which
      // would break --json. The project's own lint still shows it.
      languageOptions: { parser, parserOptions: { loggerFn: false } },
    });
  }
  return config;
}

export function createLinter({ ESLint, plugin, rules, parser, cwd }) {
  return new ESLint({
    cwd,
    overrideConfigFile: true,
    overrideConfig: lintConfig({ plugin, rules, parser }),
    errorOnUnmatchedPattern: false,
  });
}

/**
 * The problems in ESLint's results: this plugin's rules and parse errors. A
 * message with no rule that is not fatal says that ESLint skipped the file.
 */
export function collectProblems(results, cwd) {
  const problems = [];
  const skipped = [];
  for (const result of results) {
    const file = relative(cwd, result.filePath) || result.filePath;
    for (const message of result.messages) {
      if (message.ruleId === null && !message.fatal) {
        skipped.push({ file, reason: message.message });
        continue;
      }
      if (!message.fatal && !message.ruleId?.startsWith('tasty/')) continue;
      problems.push({
        file,
        line: message.line ?? 0,
        column: message.column ?? 0,
        rule: message.fatal ? null : message.ruleId,
        severity: message.severity === 2 ? 'error' : 'warning',
        message: message.message,
      });
    }
  }
  return { problems, skipped };
}

/**
 * The problems in `after` that `before` does not have. Two problems match by
 * rule, message and the text of their line, so lines that moved still match.
 */
export function newProblems(after, afterText, before, beforeText) {
  const afterLines = afterText.split('\n');
  const beforeLines = beforeText.split('\n');
  const key = (problem, lines) =>
    [problem.rule, problem.message, lines[problem.line - 1]?.trim()].join('\0');
  const left = new Map();
  for (const problem of before) {
    const k = key(problem, beforeLines);
    left.set(k, (left.get(k) ?? 0) + 1);
  }
  return after.filter((problem) => {
    const k = key(problem, afterLines);
    const count = left.get(k) ?? 0;
    if (count === 0) return true;
    left.set(k, count - 1);
    return false;
  });
}

/** The rule name without the `tasty/` prefix. */
export function ruleName(rule) {
  return rule.slice('tasty/'.length);
}

/**
 * One line per problem, `file:line:col  tasty/<rule>  <severity>  message`,
 * then the page of each rule reported. Without the severity, an agent in the
 * end-to-end run guessed it, and wrongly. `pageOf` turns a rule name into the
 * path to show.
 */
export function formatProblems(problems, pageOf) {
  const lines = problems.map((p) =>
    p.rule
      ? `${p.file}:${p.line}:${p.column}  ${p.rule}  ${p.severity}  ${p.message}`
      : `${p.file}:${p.line}:${p.column}  parse error  ${p.message}`,
  );
  const rules = [...new Set(problems.map((p) => p.rule).filter(Boolean))];
  if (rules.length > 0) {
    lines.push('', 'Rule pages:');
    for (const rule of rules)
      lines.push(`  ${rule}  ${pageOf(ruleName(rule))}`);
  }
  return lines.join('\n');
}

export function summarize(problems) {
  const errors = problems.filter((p) => p.severity === 'error').length;
  const warnings = problems.length - errors;
  const count = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  return `${count(problems.length, 'problem')} (${count(errors, 'error')}, ${count(warnings, 'warning')})`;
}

/** The path of a module as `dir` resolves it, or undefined. */
function resolveFrom(dir, specifier) {
  try {
    return createRequire(join(dir, 'noop.js')).resolve(specifier);
  } catch {
    return undefined;
  }
}

async function importFile(file) {
  const mod = await import(pathToFileURL(file).href);
  return mod.default ?? mod;
}

/**
 * ESLint as the project installs it, else the copy this package resolves. The
 * flat config class: ESLint 9 and later, or 8.57 through `loadESLint()`.
 */
export async function loadESLint(dirs, packageRoot) {
  for (const dir of [...dirs, packageRoot]) {
    const file = resolveFrom(dir, 'eslint');
    if (!file) continue;
    const eslint = await importFile(file);
    if (typeof eslint.loadESLint === 'function') {
      return eslint.loadESLint({ useFlatConfig: true });
    }
    throw new Error(
      `ESLint ${eslint.ESLint?.version ?? ''} at ${dirname(file)} is too old: the tool needs ESLint 8.57 or later.`,
    );
  }
  throw new Error(
    'cannot find eslint. Install it in the project: it is a peer dependency of @tenphi/eslint-plugin-tasty.',
  );
}

/**
 * The TypeScript parser the project installs: `@typescript-eslint/parser`, or
 * the one `typescript-eslint` depends on. Undefined when there is none.
 */
export async function loadTypeScriptParser(dirs) {
  for (const dir of dirs) {
    let file = resolveFrom(dir, '@typescript-eslint/parser');
    if (!file) {
      const manifest = resolveFrom(dir, 'typescript-eslint/package.json');
      if (manifest) {
        file = resolveFrom(
          dirname(realpathSync(manifest)),
          '@typescript-eslint/parser',
        );
      }
    }
    if (file) return importFile(file);
  }
  return undefined;
}

export const NO_PARSER =
  'Linting TypeScript needs a TypeScript parser, and this project has none. Install typescript-eslint (or @typescript-eslint/parser) as a dev dependency.';

/**
 * The path to show for a rule's page: through the stable link harnesspm keeps
 * in the project when it exists, else in this package.
 */
export function rulePage(name, { projectDir, packageRoot, cwd }) {
  const stable = join(
    projectDir,
    'node_modules/.harnesspm/pkgs/@tenphi/eslint-plugin-tasty',
  );
  const root = existsSync(stable) ? stable : packageRoot;
  return relative(cwd, join(root, 'docs/rules', `${name}.md`));
}
