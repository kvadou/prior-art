import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

test('plugin version is represented in README and changelog', () => {
  const plugin = JSON.parse(read('.claude-plugin/plugin.json'));
  assert.match(plugin.version, /^\d+\.\d+\.\d+$/);
  assert.ok(read('README.md').includes(`Version **${plugin.version}**`));
  assert.ok(read('CHANGELOG.md').includes(`## ${plugin.version},`));
  assert.equal(JSON.parse(read('.codex-plugin/plugin.json')).name, plugin.name);
  assert.equal(JSON.parse(read('.claude-plugin/marketplace.json')).plugins[0].name, plugin.name);
});

test('workflow and entry point documentation links resolve locally', () => {
  // This checks simple relative Markdown file links, not external URLs or anchors.
  for (const path of ['README.md', 'skills/prior-art/SKILL.md']) {
    for (const match of read(path).matchAll(/\]\(([^)]+)\)/g)) {
      const target = match[1].split('#')[0];
      if (!target || /^[a-z]+:/i.test(target)) continue;
      assert.ok(existsSync(resolve(root, dirname(path), target)), `${path}: missing ${target}`);
    }
  }
});
