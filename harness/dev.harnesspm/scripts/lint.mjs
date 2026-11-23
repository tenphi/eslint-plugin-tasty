/**
 * What `tasty-lint:check` and the `check-edit` hook compute. The functions
 * that lint take ESLint's class, the plugin and the parser as arguments: the
 * tools pass the project's ESLint and this package's `dist/` build, and
 * `src/harness.test.ts` passes the source, so most tests need no build.
 */
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import semver from 'semver';
import { SOURCES } from './project-config.mjs';

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

/** The Tasty functions that take styles, by the names a package exports. */
const STYLE_FUNCTIONS = new Set([
  'tasty',
  'tastyStatic',
  'useStyles',
  'useGlobalStyles',
]);
const NAMED_IMPORT =
  /\bimport\s*(?:[\w$]+\s*,\s*)?\{([^}]*)\}\s*from\s*(['"])([^'"]+)\2/g;

/**
 * The first Tasty function that the text imports by name from a package, such
 * as `{ name: 'tasty', source: '@tenphi/cookbook/styling' }`, or undefined. A
 * text test: type-only and relative imports do not count.
 */
export function styleFunctionImport(text) {
  for (const [, names, , source] of text.matchAll(NAMED_IMPORT)) {
    if (source.startsWith('.') || source.startsWith('/')) continue;
    const specifiers = names.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '');
    for (const specifier of specifiers.split(',')) {
      const name = specifier.trim().split(/\s+/)[0];
      if (STYLE_FUNCTIONS.has(name)) return { name, source };
    }
  }
  return undefined;
}

/**
 * Oxlint reads `oxlint-disable`, `oxlint-disable-next-line`,
 * `oxlint-disable-line` and `oxlint-enable` comments as ESLint reads the
 * `eslint-` ones, and also takes `eslint-disable` and `eslint-enable` in line
 * comments, which ESLint skips. ESLint reads directives from each comment's
 * `value`, so the parser below rewrites the value of those comments after
 * parsing. The source text is not touched, so strings, code, lines and
 * columns stay as they are.
 */
const OXLINT_DIRECTIVE =
  /^(\s*)oxlint-(disable(?:-next-line|-line)?|enable)(?=\s|$)/;
const BLOCK_DIRECTIVE = /^\s*eslint-(?:disable|enable)(?=\s|$)/;

export function readOxlintComments(comment) {
  comment.value = comment.value.replace(OXLINT_DIRECTIVE, '$1eslint-$2');
  if (comment.type === 'Line' && BLOCK_DIRECTIVE.test(comment.value)) {
    comment.type = 'Block';
  }
}

/** The parser with Oxlint's disable comments read as ESLint's. */
export function withOxlintComments(parser) {
  return {
    meta: { name: 'tasty-lint/oxlint-comments' },
    parseForESLint(text, options) {
      const result =
        typeof parser.parseForESLint === 'function'
          ? parser.parseForESLint(text, options)
          : { ast: parser.parse(text, options) };
      for (const comment of result.ast.comments ?? []) {
        readOxlintComments(comment);
      }
      return result;
    },
  };
}

/**
 * The ESLint flat config that runs only this plugin's rules: `rules` and
 * `settings` (`settings.tasty`) come from the project's lint config, or the
 * rules from a preset. `espree` is ESLint's own parser, for JavaScript, and
 * `parser` the TypeScript one. With `oxlintComments`, Oxlint's disable
 * comments count too.
 */
export function lintConfig({
  plugin,
  rules,
  settings = {},
  parser,
  espree,
  oxlintComments = true,
}) {
  const read = (p) => (oxlintComments ? withOxlintComments(p) : p);
  const config = [
    {
      files: [SOURCES],
      plugins: { tasty: plugin },
      // Directives for other plugins' rules are not this tool's business.
      linterOptions: { reportUnusedDisableDirectives: false },
      languageOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ...(espree ? { parser: read(espree) } : {}),
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
      settings: { tasty: settings },
      rules,
    },
  ];
  if (parser) {
    config.push({
      files: ['**/*.{ts,tsx,mts,cts}'],
      // The parser prints its TypeScript version warning on stdout, which
      // would break --json. The project's own lint still shows it.
      languageOptions: {
        parser: read(parser),
        parserOptions: { loggerFn: false },
      },
    });
  }
  return config;
}

export function createLinter({ ESLint, cwd, ...options }) {
  return new ESLint({
    cwd,
    overrideConfigFile: true,
    overrideConfig: lintConfig(options),
    errorOnUnmatchedPattern: false,
  });
}

/**
 * What to lint a file with, from what `createConfigResolver().forFile()` found:
 * the project's rules and settings, or the recommended preset when no config
 * loads the plugin. `useStrict` adds the strict preset's rules that the config
 * does not set. Rules and patterns resolve from the config's folder.
 */
export function lintOptions(
  project,
  { recommended, strict, useStrict = false, projectDir },
) {
  let rules = useStrict ? strict : recommended;
  if (project.rules) {
    rules = useStrict ? { ...strict, ...project.rules } : project.rules;
  }
  return {
    rules,
    settings: project.settings,
    oxlintComments: project.source?.linter !== 'eslint',
    cwd: project.source?.dir ?? projectDir,
  };
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

export const NO_ESLINT =
  'cannot find eslint. Install it in the project as a dev dependency: it is a peer dependency of @tenphi/eslint-plugin-tasty, and the tool runs the Tasty rules through ESLint even in a project that lints with Oxlint.';

/**
 * ESLint as the project installs it, else the copy this package resolves: the
 * flat config class (ESLint 9 and later, or 8.57 through `loadESLint()`), and
 * espree, its JavaScript parser. Without ESLint, the error's `code` is
 * `NO_ESLINT`.
 */
export async function loadESLint(dirs, packageRoot) {
  for (const dir of [...dirs, packageRoot]) {
    const file = resolveFrom(dir, 'eslint');
    if (!file) continue;
    const eslint = await importFile(file);
    if (typeof eslint.loadESLint !== 'function') {
      throw new Error(
        `ESLint ${eslint.ESLint?.version ?? ''} at ${dirname(file)} is too old: the tool needs ESLint 8.57 or later.`,
      );
    }
    const espree = resolveFrom(dirname(file), 'espree');
    return {
      ESLint: await eslint.loadESLint({ useFlatConfig: true }),
      espree: espree ? await importFile(espree) : undefined,
    };
  }
  throw Object.assign(new Error(NO_ESLINT), { code: 'NO_ESLINT' });
}

/**
 * The TypeScript parser the project installs: `@typescript-eslint/parser`, or
 * the one `typescript-eslint` depends on. Undefined when there is none.
 */
async function loadProjectTypeScriptParser(dirs) {
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
    if (!file) continue;
    // The parser can print to stderr before throwing on native TypeScript.
    // Check the compiler it would load, including a nested TS 6 installation.
    const parserDir = dirname(file);
    const compiler = resolveFrom(parserDir, 'typescript/package.json');
    const manifest = resolveFrom(
      parserDir,
      '@typescript-eslint/parser/package.json',
    );
    if (compiler && manifest) {
      const { version } = JSON.parse(readFileSync(compiler, 'utf8'));
      const { peerDependencies } = JSON.parse(readFileSync(manifest, 'utf8'));
      const supported = peerDependencies?.typescript;
      if (
        Number.parseInt(version, 10) >= 7 &&
        supported &&
        !semver.satisfies(version, supported, { includePrerelease: true })
      ) {
        throw new Error(
          `typescript-eslint does not support TypeScript ${version}`,
        );
      }
    }
    return importFile(file);
  }
  return undefined;
}

/** Prefer the project's parser and fall back to syntax-only parsing with Oxc. */
export async function loadTypeScriptParser(dirs) {
  let projectError;
  try {
    const parser = await loadProjectTypeScriptParser(dirs);
    if (parser) return parser;
  } catch (error) {
    projectError = error;
  }
  try {
    return await import('./oxc-eslint-parser.mjs');
  } catch (error) {
    throw new Error(
      [
        'cannot load a TypeScript parser.',
        ...(projectError
          ? [`The project's parser failed: ${projectError.message}.`]
          : []),
        `The Oxc fallback failed: ${error.message}.`,
        "Install the plugin's optional dependencies or a compatible typescript-eslint parser.",
        'JavaScript files such as .js and .mjs can still be linted.',
      ].join(' '),
      { cause: error },
    );
  }
}

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
