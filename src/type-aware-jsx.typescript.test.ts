import { Linter } from 'eslint';
import parser from '@typescript-eslint/parser';
import ts from 'typescript';
import { mkdtempSync, rmSync } from 'node:fs';
import type * as NodeModule from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import plugin from './index.js';

// What `require('typescript')` returns inside the plugin; an Error is thrown.
const installed = vi.hoisted(() => ({ typescript: undefined as unknown }));

vi.mock('node:module', async (importOriginal) => {
  const actual = await importOriginal<typeof NodeModule>();
  return {
    ...actual,
    createRequire(url: string | URL) {
      const require = actual.createRequire(url);
      return Object.assign((id: string) => {
        if (id !== 'typescript') return require(id);
        if (installed.typescript instanceof Error) throw installed.typescript;
        return installed.typescript;
      }, require);
    },
  };
});

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'tasty-typescript-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function lint() {
  return new Linter({ cwd: dir }).verify(
    '<Box position="after" />;',
    [
      {
        files: ['**/*.tsx'],
        languageOptions: {
          parser,
          parserOptions: { ecmaFeatures: { jsx: true } },
        },
        plugins: { tasty: plugin },
        settings: { tasty: { typeAwareJSX: true } },
        rules: { 'tasty/valid-value': 'error' },
      },
    ],
    { filename: join(dir, 'consumer.tsx') },
  );
}

it('reports a missing TypeScript install', () => {
  installed.typescript = new Error("Cannot find module 'typescript'");
  expect(lint).toThrow(
    'tasty: typeAwareJSX requires TypeScript. Install typescript as a dev dependency.',
  );
});

it('reports TypeScript 7, which has no JavaScript compiler API', () => {
  installed.typescript = { version: '7.0.2', versionMajorMinor: '7.0' };
  expect(lint).toThrow(
    'tasty: typeAwareJSX requires the TypeScript compiler API, which typescript 7.0.2 does not provide. Install TypeScript 5.6–6.x as a dev dependency.',
  );
  installed.typescript = {};
  expect(lint).toThrow(
    'which the installed typescript does not provide. Install TypeScript 5.6–6.x',
  );
});

it('loads a supported TypeScript after an unusable one', () => {
  installed.typescript = { version: '7.0.2' };
  expect(lint).toThrow('typescript 7.0.2 does not provide');
  installed.typescript = ts;
  expect(lint).toThrow('could not find a tsconfig');
});
