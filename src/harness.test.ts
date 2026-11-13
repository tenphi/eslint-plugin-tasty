/**
 * The agent harness in `harness/`: the manifest, the hook, the always-on rule,
 * and what `tasty-lint:check` and the `check-edit` hook compute. The lint logic
 * runs against the source plugin, so most tests need no build. The CLI tests run
 * only once `dist/` exists, as they do in CI after `pnpm build`.
 */
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import * as tsParser from '@typescript-eslint/parser';

import {
  collectProblems,
  createLinter,
  formatProblems,
  importsFrom,
  isLintable,
  lintOptions,
  loadESLint,
  newProblems,
  readOxlintComments,
  summarize,
} from '../harness/dev.harnesspm/scripts/lint.mjs';
import {
  createConfigResolver,
  fileGlob,
  ignoreGlobs,
  parseJsonc,
  tastyRules,
} from '../harness/dev.harnesspm/scripts/project-config.mjs';
import { recommended, strict } from './configs';
import plugin from './index';

const ROOT = join(__dirname, '..');
const HARNESS = join(ROOT, 'harness');
const FIXTURES = join(ROOT, 'test/fixtures/harness');
const OXLINT_PROJECT = join(FIXTURES, 'oxlint');

interface Problem {
  file: string;
  line: number;
  column: number;
  rule: string | null;
  severity: 'error' | 'warning';
  message: string;
}

// ESLint and espree, its JavaScript parser, as the tools load them.
const { ESLint, espree } = await loadESLint([ROOT], ROOT);

async function lint(
  code: string,
  file = 'Card.tsx',
  rules = recommended,
  options: { oxlintComments?: boolean; settings?: object } = {},
): Promise<Problem[]> {
  const eslint = createLinter({
    ESLint,
    plugin,
    rules,
    parser: tsParser,
    espree,
    cwd: FIXTURES,
    ...options,
  });
  const results = await eslint.lintText(code, {
    filePath: join(FIXTURES, file),
  });
  return collectProblems(results, FIXTURES).problems;
}

const card = (styles: string) =>
  `import { tasty } from '@tenphi/tasty';\n\nexport const Card = tasty({\n  styles: ${styles},\n});\n`;

describe('tasty-lint lint logic', () => {
  it('reports only tasty/* problems, with their place', async () => {
    const problems = await lint(
      readFileSync(join(FIXTURES, 'Card.tsx'), 'utf8'),
    );

    expect(problems).toEqual([
      expect.objectContaining({
        file: 'Card.tsx',
        line: 5,
        column: 11,
        rule: 'tasty/no-raw-color-values',
        severity: 'warning',
      }),
      expect.objectContaining({
        line: 7,
        rule: 'tasty/valid-preset',
        severity: 'error',
      }),
    ]);
  });

  it('runs the strict-only rules with the strict preset', async () => {
    const code = card(`{ padding: '$spacign' }`);

    expect(await lint(code)).toEqual([]);
    expect((await lint(code, 'Card.tsx', strict)).map((p) => p.rule)).toEqual([
      'tasty/valid-custom-property',
    ]);
  });

  it('honors disable comments for its rules and ignores those for other plugins', async () => {
    const code = card(`{
    // eslint-disable-next-line tasty/no-raw-color-values -- brand color
    fill: '#ff0000',
    // eslint-disable-next-line react-hooks/exhaustive-deps
    color: '#text',
  }`);

    expect(await lint(code)).toEqual([]);
  });

  it('honors Oxlint disable comments in every form', async () => {
    const code = `import { tasty } from '@tenphi/tasty';
import { Box } from '@acme/ui';

export const Card = tasty({
  styles: {
    // oxlint-disable-next-line tasty/no-raw-color-values -- brand color
    fill: '#ff0000',
    color: '#00ff00', // oxlint-disable-line tasty/no-raw-color-values
    /* oxlint-disable-next-line */
    outline: '#0000ff',
    // oxlint-disable tasty/no-raw-color-values, tasty/valid-preset -- legacy block
    border: '1bw solid #ff0000',
    preset: 'h9',
    // oxlint-enable tasty/no-raw-color-values, tasty/valid-preset
    // eslint-disable tasty/valid-preset -- Oxlint also reads this one in a line comment
    shadow: '0 0 1x #ff0000',
  },
});
export const Other = tasty({ styles: { preset: 'h9' } });

export const view = (
  <>
    {/* oxlint-disable-next-line tasty/no-styles-prop -- adapter overrides */}
    <Box styles={overrides} />
    {/* oxlint-disable-next-line react/no-unknown-property -- another plugin's rule */}
    <Box styles={overrides} />
  </>
);
`;

    // Only after the block ends, and under another plugin's comment.
    expect((await lint(code)).map((p) => `${p.line} ${p.rule}`)).toEqual([
      '16 tasty/no-raw-color-values',
      '26 tasty/no-styles-prop',
    ]);
  });

  it('honors them in JavaScript files, parsed by espree', async () => {
    const code = `import { Box } from '@acme/ui';
// oxlint-disable-next-line tasty/valid-color-token -- legacy token
export const a = <Box fill="#nope" />;
export const b = <Box fill="#nope" />;
`;

    expect((await lint(code, 'Kit.jsx')).map((p) => p.line)).toEqual([4]);
  });

  it('leaves strings, templates and JSX text alone', async () => {
    const code = `import { tasty } from '@tenphi/tasty';
import { Box } from '@acme/ui';

const note = '// oxlint-disable-next-line tasty/no-raw-color-values';
const doc = \`/* oxlint-disable */\`;
export const Card = tasty({
  styles: {
    content: '"// oxlint-disable-next-line tasty/no-raw-color-values"',
    fill: '#ff0000',
  },
});
export const view = (
  <p>
    // oxlint-disable-next-line tasty/no-styles-prop
    <Box styles={overrides} />
  </p>
);
`;

    expect(
      (await lint(code)).map((p) => `${p.line}:${p.column} ${p.rule}`),
    ).toEqual(['9:11 tasty/no-raw-color-values', '15:10 tasty/no-styles-prop']);
  });

  it('reads only ESLint comments for a project that lints with ESLint', async () => {
    const code = card(`{
    // oxlint-disable-next-line tasty/no-raw-color-values -- brand color
    fill: '#ff0000',
  }`);

    expect(await lint(code, 'Card.tsx', recommended)).toEqual([]);
    expect(
      (
        await lint(code, 'Card.tsx', recommended, { oxlintComments: false })
      ).map((p) => p.rule),
    ).toEqual(['tasty/no-raw-color-values']);
  });

  it('rewrites only directive comments, and keeps their place', () => {
    const read = (type: string, value: string) => {
      const comment = { type, value, range: [0, value.length + 2] };
      readOxlintComments(comment);
      return comment;
    };

    expect(read('Line', ' oxlint-disable-next-line tasty/x -- why')).toEqual({
      type: 'Line',
      value: ' eslint-disable-next-line tasty/x -- why',
      range: [0, 42],
    });
    expect(read('Block', ' oxlint-disable-line ')).toMatchObject({
      type: 'Block',
      value: ' eslint-disable-line ',
    });
    // ESLint skips disable and enable in line comments; Oxlint does not.
    expect(read('Line', ' oxlint-disable tasty/x')).toMatchObject({
      type: 'Block',
      value: ' eslint-disable tasty/x',
    });
    expect(read('Line', ' eslint-enable')).toMatchObject({ type: 'Block' });
    for (const value of [
      ' oxlint-disabled tasty/x',
      ' see oxlint-disable-next-line',
      ' oxlint tasty/x: off',
    ]) {
      expect(read('Line', value)).toEqual({
        type: 'Line',
        value,
        range: [0, value.length + 2],
      });
    }
  });

  it('parses JSX in JavaScript files without the TypeScript parser', async () => {
    const eslint = createLinter({
      ESLint,
      plugin,
      rules: recommended,
      espree,
      cwd: FIXTURES,
    });
    const results = await eslint.lintText(
      readFileSync(join(FIXTURES, 'Kit.jsx'), 'utf8'),
      { filePath: join(FIXTURES, 'Kit.jsx') },
    );

    // `@acme/ui` is in the fixture's importSources.
    expect(
      collectProblems(results, FIXTURES).problems.map((p) => p.rule),
    ).toEqual(['tasty/no-styles-prop', 'tasty/valid-color-token']);
  });

  it('keeps parse errors and the files ESLint skipped', () => {
    const { problems, skipped } = collectProblems(
      [
        {
          filePath: join(FIXTURES, 'a.tsx'),
          messages: [
            {
              ruleId: null,
              fatal: true,
              severity: 2,
              line: 1,
              column: 5,
              message: 'Parsing error: x',
            },
            {
              ruleId: 'no-console',
              severity: 2,
              line: 2,
              column: 1,
              message: 'other plugin',
            },
          ],
        },
        {
          filePath: join(FIXTURES, 'b.tsx'),
          messages: [
            { ruleId: null, severity: 1, message: 'File ignored by default.' },
          ],
        },
      ],
      FIXTURES,
    );

    expect(problems).toEqual([
      {
        file: 'a.tsx',
        line: 1,
        column: 5,
        rule: null,
        severity: 'error',
        message: 'Parsing error: x',
      },
    ]);
    expect(skipped).toEqual([
      { file: 'b.tsx', reason: 'File ignored by default.' },
    ]);
  });

  it('keeps only the problems an edit added, also when lines moved', async () => {
    // A problem matches by the text of its line, so each property gets its own.
    const before = card(`{\n    fill: '#ff0000',\n    preset: 't3',\n  }`);
    const after = `// A new first line moves every problem down.\n${card(`{\n    fill: '#ff0000',\n    preset: 'h9',\n  }`)}`;

    const added = newProblems(
      await lint(after),
      after,
      await lint(before),
      before,
    );

    expect(added.map((p: Problem) => p.rule)).toEqual(['tasty/valid-preset']);
  });

  it('prints one line per problem and the page of each rule', () => {
    const problems: Problem[] = [
      {
        file: 'src/Card.tsx',
        line: 5,
        column: 11,
        rule: 'tasty/no-raw-color-values',
        severity: 'warning',
        message: 'Use a token.',
      },
      {
        file: 'src/Card.tsx',
        line: 9,
        column: 3,
        rule: 'tasty/no-raw-color-values',
        severity: 'warning',
        message: 'Use a token.',
      },
      {
        file: 'src/Card.tsx',
        line: 1,
        column: 1,
        rule: null,
        severity: 'error',
        message: 'Parsing error: x',
      },
    ];

    expect(
      formatProblems(problems, (name: string) => `docs/rules/${name}.md`),
    ).toBe(
      [
        'src/Card.tsx:5:11  tasty/no-raw-color-values  warning  Use a token.',
        'src/Card.tsx:9:3  tasty/no-raw-color-values  warning  Use a token.',
        'src/Card.tsx:1:1  parse error  Parsing error: x',
        '',
        'Rule pages:',
        '  tasty/no-raw-color-values  docs/rules/no-raw-color-values.md',
      ].join('\n'),
    );
    expect(summarize(problems)).toBe('3 problems (1 error, 2 warnings)');
  });

  it('tells Tasty imports from other text before anything is parsed', () => {
    expect(importsFrom(`import { tasty } from '@tenphi/tasty';`)).toBe(true);
    expect(
      importsFrom(`import { tastyStatic } from "@tenphi/tasty/static";`),
    ).toBe(true);
    expect(
      importsFrom(`import { Button } from '@acme/ui/button';`, ['@acme/ui']),
    ).toBe(true);
    expect(
      importsFrom(`import { Button } from '@acme/uikit';`, ['@acme/ui']),
    ).toBe(false);
    expect(importsFrom(`const tasty = 1; // @tenphi/tasty`)).toBe(false);
  });

  it('lints JavaScript and TypeScript sources, not declarations', () => {
    for (const file of [
      'a.ts',
      'a.tsx',
      'a.js',
      'a.jsx',
      'a.mts',
      'a.cts',
      'a.mjs',
      'a.cjs',
    ]) {
      expect(isLintable(file), file).toBe(true);
    }
    for (const file of ['a.d.ts', 'a.d.mts', 'a.css', 'a.md', 'a.json']) {
      expect(isLintable(file), file).toBe(false);
    }
  });
});

describe("tasty-lint and the project's lint config", () => {
  const resolver = () =>
    createConfigResolver({ ESLint, plugin, packageRoot: ROOT });

  it('reads the Tasty part of the nearest Oxlint config', async () => {
    const project = await resolver().forFile(join(OXLINT_PROJECT, 'Card.tsx'));

    expect(project.source).toMatchObject({
      linter: 'oxlint',
      file: join(OXLINT_PROJECT, '.oxlintrc.json'),
      dir: OXLINT_PROJECT,
    });
    // Its levels, Oxlint's `deny` and `allow` included, and no other rule.
    expect(project.rules).toEqual({
      'tasty/no-raw-color-values': 'error',
      'tasty/valid-preset': 'error',
      'tasty/known-property': 'off',
    });
    expect(project.settings).toEqual({ mergeFunctions: ['mergeLayers'] });
  });

  it('applies its overrides and ignorePatterns', async () => {
    const stories = await resolver().forFile(
      join(OXLINT_PROJECT, 'Card.stories.tsx'),
    );
    expect(stories.rules['tasty/no-raw-color-values']).toBe('warn');

    const generated = await resolver().forFile(
      join(OXLINT_PROJECT, 'generated/Gen.tsx'),
    );
    expect(generated.ignored).toBe(true);
  });

  it('lints with those rules, settings and comments', async () => {
    const file = join(OXLINT_PROJECT, 'Card.tsx');
    const lint = lintOptions(await resolver().forFile(file), {
      recommended,
      strict,
      projectDir: FIXTURES,
    });
    const eslint = createLinter({
      ESLint,
      plugin,
      parser: tsParser,
      espree,
      ...lint,
    });
    const results = await eslint.lintText(readFileSync(file, 'utf8'), {
      filePath: file,
    });

    expect(
      collectProblems(results, FIXTURES).problems.map(
        (p: Problem) => `${p.line} ${p.rule} ${p.severity}`,
      ),
    ).toEqual([
      '7 tasty/no-raw-color-values error',
      '10 tasty/valid-preset error',
      // A style object only because settings.tasty.mergeFunctions lists it.
      '15 tasty/no-raw-color-values error',
    ]);
  });

  it('falls back to a preset without a config, and adds strict on request', async () => {
    const none = await resolver().forFile(join(FIXTURES, 'Card.tsx'));
    expect(none).toEqual({ source: null, rules: null, settings: {} });

    const options = { recommended, strict, projectDir: FIXTURES };
    expect(lintOptions(none, options)).toEqual({
      rules: recommended,
      settings: {},
      oxlintComments: true,
      cwd: FIXTURES,
    });
    expect(lintOptions(none, { ...options, useStrict: true }).rules).toBe(
      strict,
    );

    const project = await resolver().forFile(join(OXLINT_PROJECT, 'Card.tsx'));
    const rules = lintOptions(project, { ...options, useStrict: true }).rules;
    // The config's levels win, the strict preset fills in the rest.
    expect(rules['tasty/known-property']).toBe('off');
    expect(rules['tasty/valid-custom-property']).toBe('warn');
  });

  it('finds the plugin under any name Oxlint gives it', () => {
    const known = new Set(['known-property', 'valid-preset']);

    expect(
      tastyRules(
        {
          '@tenphi/tasty/known-property': 'warn',
          '@tenphi/eslint-plugin-tasty/valid-preset': ['deny', { x: 1 }],
          'tasty/known-property': 'error',
          'other/known-property': 'error',
          '@tenphi/tasty/not-a-rule': 'error',
        },
        new Set(['@tenphi/tasty', '@tenphi/eslint-plugin-tasty']),
        known,
      ),
    ).toEqual({
      'tasty/known-property': 'warn',
      'tasty/valid-preset': ['error', { x: 1 }],
    });
  });

  it('turns Oxlint globs into ESLint ones', () => {
    // Without a slash, Oxlint matches the name at any depth.
    expect(fileGlob('*.test.ts')).toBe('**/*.test.ts');
    expect(fileGlob('./src/**')).toBe('src/**');
    // ignorePatterns follow .gitignore.
    expect(ignoreGlobs('*.js')).toEqual(['**/*.js', '**/*.js/**']);
    expect(ignoreGlobs('generated/')).toEqual(['**/generated/**']);
    expect(ignoreGlobs('/dist')).toEqual(['dist', 'dist/**']);
    expect(ignoreGlobs('!src/keep.js')).toEqual([
      '!src/keep.js',
      '!src/keep.js/**',
    ]);
  });

  it('parses JSON with comments and trailing commas, not touching strings', () => {
    expect(
      parseJsonc(`{
  // a comment
  "a": "// not a comment, ]",
  /* a block */ "b": ["/* kept */", 1,],
  "c": { "d": "say \\"hi\\", ]" , },
}`),
    ).toEqual({
      a: '// not a comment, ]',
      b: ['/* kept */', 1],
      c: { d: 'say "hi", ]' },
    });
  });
});

describe('harness files', () => {
  const plugin = JSON.parse(
    readFileSync(join(HARNESS, 'plugin.json'), 'utf8'),
  ) as {
    name: string;
    extensions: {
      'dev.harnesspm': {
        docs: string;
        scripts: Record<
          string,
          { file: string; description?: string; allow?: boolean }
        >;
      };
    };
  };
  const ext = plugin.extensions['dev.harnesspm'];

  it('names the plugin tasty-lint and points at the rule docs', () => {
    expect(plugin.name).toBe('tasty-lint');
    expect(existsSync(join(HARNESS, ext.docs, 'rules'))).toBe(true);
  });

  it('points every script at a file, and offers only check to agents', () => {
    for (const script of Object.values(ext.scripts)) {
      expect(existsSync(join(HARNESS, script.file))).toBe(true);
    }
    expect(ext.scripts.check).toMatchObject({ allow: true });
    expect(ext.scripts.check.description).toBeTruthy();
    // Without a description, a script is for hooks only.
    expect(ext.scripts['check-edit'].description).toBeUndefined();
  });

  it('runs the check-edit hook after Claude Code edits a file', () => {
    const { hooks } = JSON.parse(
      readFileSync(join(HARNESS, 'dev.harnesspm/hooks.json'), 'utf8'),
    );

    expect(hooks).toEqual({
      PostToolUse: [
        {
          id: 'check-edit',
          // Codex's apply_patch gives patch text, not a file path.
          matcher: { claude: 'Edit|Write|MultiEdit' },
          run: 'check-edit',
          timeout: 30,
        },
      ],
    });
  });

  it('keeps the always-on rule short, since every consumer pays for it', () => {
    const rule = readFileSync(
      join(HARNESS, 'dev.harnesspm/rules/usage.md'),
      'utf8',
    );

    expect(Buffer.byteLength(rule)).toBeLessThanOrEqual(400);
    // Sections a consumer can patch one by one.
    expect(rule.match(/^## /gm)?.length).toBeGreaterThanOrEqual(2);
    expect(rule).toContain('tasty-lint:check');
  });
});

const BUILD = join(ROOT, 'dist/index.js');

describe.runIf(existsSync(BUILD))('tasty-lint CLI (needs pnpm build)', () => {
  const scripts = join(HARNESS, 'dev.harnesspm/scripts');
  const node = (
    script: string,
    args: string[],
    {
      cwd = FIXTURES,
      project = cwd,
      input,
    }: { cwd?: string; project?: string; input?: string } = {},
  ) =>
    spawnSync(process.execPath, [join(scripts, script), ...args], {
      cwd,
      input,
      encoding: 'utf8',
      env: { ...process.env, HARNESSPM_PROJECT_DIR: project },
    });
  const hook = (payload: object, cwd = FIXTURES) =>
    node('check-edit.mjs', [], {
      cwd,
      input: JSON.stringify({ cwd, ...payload }),
    });

  describe('check', () => {
    it('prints each problem and its page, and fails on errors', () => {
      const run = node('check.mjs', ['Card.tsx', 'Clean.tsx']);

      expect(run.status).toBe(1);
      expect(run.stdout).toContain(
        'Card.tsx:5:11  tasty/no-raw-color-values  warning  Use a color token',
      );
      expect(run.stdout).toContain(
        'Card.tsx:7:13  tasty/valid-preset  error  Unknown preset',
      );
      expect(run.stdout).toMatch(
        /tasty\/valid-preset {2}\S*docs\/rules\/valid-preset\.md/,
      );
      expect(run.stdout).toContain(
        '2 problems (1 error, 1 warning) in 2 files (recommended rules).',
      );
    });

    it('passes a clean file, and warnings alone', () => {
      expect(node('check.mjs', ['Clean.tsx']).stdout).toContain(
        'No tasty/* problems in 1 file (recommended rules).',
      );
      expect(node('check.mjs', ['Kit.jsx', '--strict']).status).toBe(1);
    });

    it('prints JSON', () => {
      const result = JSON.parse(
        node('check.mjs', ['Card.tsx', '--json']).stdout,
      );

      expect(result.preset).toBe('recommended');
      expect(result.problems[1]).toMatchObject({
        rule: 'tasty/valid-preset',
        severity: 'error',
        page: expect.stringMatching(/docs\/rules\/valid-preset\.md$/),
      });
    });

    it('fails clearly on a missing file or option', () => {
      const missing = node('check.mjs', ['Nope.tsx']);
      expect(missing.status).toBe(2);
      expect(missing.stderr).toContain('cannot find Nope.tsx');
      expect(node('check.mjs', ['Card.tsx', '--fix']).status).toBe(2);
    });

    it('reads a path from the project root when the shell is elsewhere', () => {
      // An agent's shell may have moved, such as into node_modules.
      const run = node('check.mjs', ['Card.tsx'], {
        cwd: ROOT,
        project: FIXTURES,
      });

      expect(run.stdout).toContain('Card.tsx:7:13  tasty/valid-preset');
      expect(run.stdout).not.toContain('Skipped');
    });

    it('does not pass when nothing was linted', () => {
      const run = node('check.mjs', ['package.json']);

      expect(run.status).toBe(2);
      expect(run.stdout).toContain('Nothing linted in package.json.');
      expect(run.stdout).toContain('Skipped package.json');
    });
  });

  describe('check-edit hook', () => {
    it('hands the problems of an edited Tasty file back with exit 2', () => {
      const run = hook({
        tool_name: 'Edit',
        tool_input: { file_path: 'Card.tsx' },
      });

      expect(run.status).toBe(2);
      expect(run.stdout).toBe('');
      expect(run.stderr).toContain('2 Tasty lint problems in Card.tsx');
      expect(run.stderr).toContain('Card.tsx:7:13  tasty/valid-preset');
      expect(run.stderr).toContain('eslint-disable-next-line tasty/<rule>');
    });

    it('prints paths from the project root, wherever the shell is', () => {
      const run = node('check-edit.mjs', [], {
        cwd: ROOT,
        project: FIXTURES,
        input: JSON.stringify({
          cwd: join(ROOT, 'node_modules'),
          tool_input: { file_path: join(FIXTURES, 'Card.tsx') },
        }),
      });

      expect(run.stderr).toContain('Card.tsx:7:13  tasty/valid-preset');
      expect(run.stderr).toContain(
        '  tasty/valid-preset  ../../../docs/rules/valid-preset.md',
      );
    });

    it('lints a file that imports only a configured import source', () => {
      expect(
        hook({ tool_input: { file_path: join(FIXTURES, 'Kit.jsx') } }).status,
      ).toBe(2);
    });

    it('stays silent on clean files, other files and problems the file had before', () => {
      const silent = (payload: object) => {
        const run = hook(payload);
        expect(run.status, JSON.stringify(payload)).toBe(0);
        expect(run.stderr).toBe('');
      };
      const card = readFileSync(join(FIXTURES, 'Card.tsx'), 'utf8');

      silent({ tool_input: { file_path: 'Clean.tsx' } });
      silent({ tool_input: { file_path: 'plain.ts' } });
      silent({ tool_input: { file_path: 'package.json' } });
      silent({ tool_input: { file_path: 'Missing.tsx' } });
      silent({ tool_input: {} });
      silent({
        tool_input: { file_path: 'Card.tsx' },
        tool_response: { originalFile: `// before\n${card}` },
      });
    });
  });

  describe('in a project that lints with Oxlint', () => {
    const run = (args: string[]) =>
      node('check.mjs', args, { cwd: OXLINT_PROJECT });

    it('runs the rules, levels and settings of its .oxlintrc.json', () => {
      const check = run(['Card.tsx', 'Card.stories.tsx', 'generated/Gen.tsx']);

      expect(check.status).toBe(1);
      expect(
        check.stdout.split('\n').filter((line) => line.includes('  tasty/')),
      ).toEqual([
        expect.stringMatching(
          /^Card\.stories\.tsx:3:\d+ {2}tasty\/no-raw-color-values {2}warning /,
        ),
        expect.stringMatching(
          /^Card\.tsx:7:\d+ {2}tasty\/no-raw-color-values {2}error /,
        ),
        expect.stringMatching(
          /^Card\.tsx:10:\d+ {2}tasty\/valid-preset {2}error /,
        ),
        expect.stringMatching(
          /^Card\.tsx:15:\d+ {2}tasty\/no-raw-color-values {2}error /,
        ),
        expect.stringMatching(/^ {2}tasty\/no-raw-color-values {2}/),
        expect.stringMatching(/^ {2}tasty\/valid-preset {2}/),
      ]);
      expect(check.stdout).toContain(
        '4 problems (3 errors, 1 warning) in 2 files (rules from .oxlintrc.json).',
      );
      expect(check.stdout).toContain(
        'Skipped generated/Gen.tsx: .oxlintrc.json does not lint it.',
      );
    });

    it('skips the files it ignores quietly in a folder', () => {
      const result = JSON.parse(run(['.', '--json']).stdout);

      expect(result.configs).toEqual(['.oxlintrc.json']);
      expect(result.linted).toBe(2);
      expect(result.skipped).toEqual([]);
    });

    it('adds the strict preset on request', () => {
      expect(run(['Card.tsx', '--strict']).stdout).toContain(
        '(rules from .oxlintrc.json and the strict preset)',
      );
    });

    it('hands back new problems with the oxlint-disable form', () => {
      const card = readFileSync(join(OXLINT_PROJECT, 'Card.tsx'), 'utf8');
      const edit = hook(
        { tool_input: { file_path: 'Card.tsx' } },
        OXLINT_PROJECT,
      );

      expect(edit.status).toBe(2);
      expect(edit.stderr).toContain(
        '`// oxlint-disable-next-line tasty/<rule> -- <reason>`',
      );
      expect(edit.stderr).toContain('3 Tasty lint problems in Card.tsx');
      expect(edit.stderr).not.toContain('Card.tsx:9:');

      // An unrelated edit of a file with an exception adds nothing.
      const unrelated = hook(
        {
          tool_input: { file_path: 'Card.tsx' },
          tool_response: { originalFile: card.replace('2x', '3x') },
        },
        OXLINT_PROJECT,
      );
      expect(unrelated.status).toBe(0);
      expect(unrelated.stderr).toBe('');
      expect(
        hook({ tool_input: { file_path: 'generated/Gen.tsx' } }, OXLINT_PROJECT)
          .status,
      ).toBe(0);
    });
  });

  describe('in a project that lints with ESLint', () => {
    let dir: string;

    beforeAll(() => {
      dir = realpathSync(mkdtempSync(join(tmpdir(), 'tasty-lint-eslint-')));
      // The project installs the plugin and the parser, and imports the plugin
      // in its flat config.
      const modules = join(dir, 'node_modules');
      mkdirSync(join(modules, '@tenphi'), { recursive: true });
      mkdirSync(join(modules, '@typescript-eslint'), { recursive: true });
      symlinkSync(ROOT, join(modules, '@tenphi/eslint-plugin-tasty'));
      symlinkSync(
        join(ROOT, 'node_modules/@typescript-eslint/parser'),
        join(modules, '@typescript-eslint/parser'),
      );
      writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
      cpSync(join(FIXTURES, 'tasty.config.ts'), join(dir, 'tasty.config.ts'));
      writeFileSync(
        join(dir, 'eslint.config.mjs'),
        `import tasty from '@tenphi/eslint-plugin-tasty';
export default [
  { files: ['**/*.tsx'], plugins: { tasty }, rules: { 'tasty/no-raw-color-values': 'error' } },
  { files: ['**/*.stories.tsx'], rules: { 'tasty/no-raw-color-values': 'off' } },
];
`,
      );
      for (const file of ['Card.tsx', 'Card.stories.tsx']) {
        cpSync(join(OXLINT_PROJECT, file), join(dir, file));
      }
    });

    afterAll(() => rmSync(dir, { recursive: true, force: true }));

    it('runs the rules of its flat config, with ESLint comments only', () => {
      const check = node('check.mjs', ['Card.tsx', 'Card.stories.tsx'], {
        cwd: dir,
      });

      // The oxlint-disable comment on line 9 does not count in ESLint.
      expect(check.stdout.match(/^Card\.tsx:\d+/gm)).toEqual([
        'Card.tsx:7',
        'Card.tsx:9',
      ]);
      expect(check.stdout).toContain(
        '2 problems (2 errors, 0 warnings) in 1 file (rules from eslint.config.mjs).',
      );
      expect(check.stdout).toContain(
        'Skipped Card.stories.tsx: eslint.config.mjs runs no tasty/* rule on it.',
      );
    });
  });

  describe('in a project without ESLint', () => {
    let dir: string;
    let scripts: string;

    beforeAll(() => {
      // A copy of the package, so that ESLint resolves from nowhere.
      dir = realpathSync(mkdtempSync(join(tmpdir(), 'tasty-lint-oxlint-')));
      const pkg = join(dir, 'node_modules/@tenphi/eslint-plugin-tasty');
      for (const part of ['package.json', 'dist', 'harness']) {
        cpSync(join(ROOT, part), join(pkg, part), { recursive: true });
      }
      for (const dep of [
        'jiti',
        'semver',
        'postcss-selector-parser',
        '@typescript-eslint/utils',
      ]) {
        mkdirSync(dirname(join(pkg, 'node_modules', dep)), { recursive: true });
        symlinkSync(
          join(ROOT, 'node_modules', dep),
          join(pkg, 'node_modules', dep),
        );
      }
      scripts = join(pkg, 'harness/dev.harnesspm/scripts');
      writeFileSync(join(dir, 'package.json'), '{"name":"app"}');
      cpSync(join(FIXTURES, 'Card.tsx'), join(dir, 'Card.tsx'));
    });

    afterAll(() => rmSync(dir, { recursive: true, force: true }));

    const run = (script: string, args: string[], input?: string) =>
      spawnSync(process.execPath, [join(scripts, script), ...args], {
        cwd: dir,
        input,
        encoding: 'utf8',
        // NODE_PATH could lead to a global ESLint.
        env: { ...process.env, NODE_PATH: '', HARNESSPM_PROJECT_DIR: dir },
      });

    it('keeps the hook quiet, and says what check needs', () => {
      const edit = run(
        'check-edit.mjs',
        [],
        JSON.stringify({ cwd: dir, tool_input: { file_path: 'Card.tsx' } }),
      );
      expect(edit.status).toBe(0);
      expect(edit.stderr).toBe('');

      const check = run('check.mjs', ['Card.tsx']);
      expect(check.status).toBe(2);
      expect(check.stderr).toContain('cannot find eslint');
      expect(check.stderr).toContain('lints with Oxlint');
    });
  });

  describe('without a TypeScript parser in the project', () => {
    let dir: string;

    beforeAll(() => {
      dir = realpathSync(mkdtempSync(join(tmpdir(), 'tasty-lint-')));
      writeFileSync(join(dir, 'package.json'), '{"name":"app"}');
      writeFileSync(
        join(dir, 'Card.tsx'),
        "import { tasty } from '@tenphi/tasty';\nexport const Card = tasty({ styles: { fill: '#ff0000' } });\n",
      );
    });

    afterAll(() => rmSync(dir, { recursive: true, force: true }));

    it('says what to install', () => {
      const check = node('check.mjs', ['Card.tsx'], { cwd: dir });
      expect(check.status).toBe(2);
      expect(check.stderr).toContain('Install typescript-eslint');

      // A hook reports a setup problem to the person, not to the agent.
      const edit = hook({ tool_input: { file_path: 'Card.tsx' } }, dir);
      expect(edit.status).toBe(1);
      expect(edit.stderr).toContain('Install typescript-eslint');
    });
  });
});
