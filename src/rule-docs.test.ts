/**
 * Every rule has a page in `docs/rules/`, which `meta.docs.url` links and the
 * harness's docs index lists. The pages are plain Markdown; these tests keep
 * them in step with the rules and the presets.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import plugin from './index';
import { recommended, strict } from './configs';

const ROOT = join(__dirname, '..');
const DOCS = join(ROOT, 'docs/rules');

const rules = Object.keys(plugin.rules);
const pages = readdirSync(DOCS)
  .filter((name) => name.endsWith('.md'))
  .map((name) => name.slice(0, -'.md'.length));
const read = (name: string) => readFileSync(join(DOCS, `${name}.md`), 'utf8');

/** What the page's `**Presets:**` line must say, from `src/configs.ts`. */
function expectedPresets(name: string): string {
  const severity = (value: unknown) =>
    value === 'error' || value === 2 ? 'error' : 'warning';
  const inRecommended = recommended[`tasty/${name}`];
  const inStrict = strict[`tasty/${name}`];
  if (inRecommended && inStrict) {
    return `${severity(inRecommended)} in recommended and strict.`;
  }
  if (inStrict) return `${severity(inStrict)} in strict.`;
  return 'none. Turn it on in your config.';
}

describe('rule pages', () => {
  it('has a page for every rule', () => {
    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) expect(pages, rule).toContain(rule);
  });

  it('names an existing rule on every page', () => {
    for (const page of pages) expect(rules, page).toContain(page);
  });

  it('links each rule to its page', () => {
    for (const [name, rule] of Object.entries(plugin.rules)) {
      expect(rule.meta.docs?.url).toBe(
        `https://github.com/tenphi/eslint-plugin-tasty/blob/main/docs/rules/${name}.md`,
      );
    }
  });

  it.each(rules)('%s: titles the page with the rule ID', (name) => {
    expect(read(name).split('\n')[0]).toBe(`# tasty/${name}`);
  });

  it.each(rules)('%s: states the presets and the fix', (name) => {
    const line = read(name)
      .split('\n')
      .find((l) => l.startsWith('**Presets:**'));
    const match = line?.match(/^\*\*Presets:\*\* (.+?) \*\*Fix:\*\* (.+)$/);

    expect(match, `${name}: a "**Presets:** … **Fix:** …" line`).toBeTruthy();
    expect(match![1]).toBe(expectedPresets(name));

    const { meta } = plugin.rules[name as keyof typeof plugin.rules];
    const fix = match![2];
    if (meta.fixable) expect(fix).toMatch(/autofix/);
    if (meta.hasSuggestions) expect(fix).toMatch(/suggestion/);
    if (!meta.fixable && !meta.hasSuggestions) expect(fix).toBe('none.');
  });

  it('links between pages only to files that exist', () => {
    for (const page of pages) {
      const links = [...read(page).matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g)]
        .map((m) => m[1])
        .filter((link) => !/^[a-z]+:/.test(link));
      for (const link of links) {
        expect(existsSync(join(DOCS, link)), `${page}: ${link}`).toBe(true);
      }
    }
  });

  it('lists every page in the SPECIFICATION.md index', () => {
    const spec = readFileSync(join(ROOT, 'SPECIFICATION.md'), 'utf8');
    for (const rule of rules) {
      expect(spec, rule).toContain(
        `[\`tasty/${rule}\`](docs/rules/${rule}.md)`,
      );
    }
  });
});
