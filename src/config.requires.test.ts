import { mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { loadConfig } from './config.js';

// A snapshot published ahead of 1.13.0.
vi.mock('./version.js', () => ({ version: '1.13.0-snapshot-20261026' }));

let root: string;
afterEach(() => rmSync(root, { recursive: true, force: true }));

it('lets a snapshot of the next release satisfy a range of the current one', () => {
  root = mkdtempSync(join(tmpdir(), 'tasty-requires-'));
  writeFileSync(join(root, 'package.json'), '{}');
  const config = join(root, 'tasty.config.json');
  writeFileSync(config, JSON.stringify({ requires: '>=1.12.0' }));
  expect(() => loadConfig(join(root, 'component.ts'))).not.toThrow();

  writeFileSync(config, JSON.stringify({ requires: '>=1.13.0' }));
  utimesSync(config, new Date(), new Date(Date.now() + 1000));
  expect(() => loadConfig(join(root, 'other.ts'))).toThrow(
    'but 1.13.0-snapshot-20261026 is installed',
  );
});
