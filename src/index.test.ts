import { readFileSync } from 'node:fs';
import plugin from './index.js';
import { recommended, strict } from './configs.js';

describe('plugin surface', () => {
  const pkg = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  ) as { name: string; version: string };

  it('reports its real name and version', () => {
    // Previously a hardcoded literal that had drifted to 0.1.0.
    expect(plugin.meta.name).toBe(pkg.name);
    expect(plugin.meta.version).toBe(pkg.version);
  });

  it('registers every rule referenced by a preset', () => {
    const ruleIds = new Set(Object.keys(plugin.rules));

    // `configs.ts` exports the rules records directly, not wrapped in `{ rules }`.
    for (const [preset, rules] of [
      ['recommended', recommended],
      ['strict', strict],
    ] as const) {
      for (const id of Object.keys(rules)) {
        const bare = id.replace(/^tasty\//, '');
        expect(ruleIds, `${preset} references ${id}`).toContain(bare);
      }
    }
  });

  it('gives every rule a matching meta.docs.url', () => {
    for (const [id, rule] of Object.entries(plugin.rules)) {
      expect(rule.meta.docs?.url, id).toContain(id);
    }
  });
});
