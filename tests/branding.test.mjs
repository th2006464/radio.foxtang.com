import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const base = new URL('../', import.meta.url);
const load = file => readFile(new URL(file, base), 'utf8');
const logo = 'https://logo.foxtang.com/avatars-512/set-05/media.png';

test('header uses owned transparent circular brand logo, not RoamDial logo', async () => {
  const [html, css] = await Promise.all([load('index.html'), load('src/style.css')]);
  assert.match(html, /<button class="wordmark" id="homeButton"/);
  assert.ok(html.includes('<img class="brand-logo" src="' + logo + '"'));
  assert.ok(html.includes('<span>Radio</span>'));
  assert.ok(!html.includes('class="brand-mark"'));
  assert.ok(!html.includes('<span>RoamDial</span>'));
  assert.ok(css.includes('.brand-logo{display:block;flex-shrink:0;'));
  assert.ok(css.includes('object-fit:contain;border-radius:50%;background:transparent'));
  assert.ok(css.includes('.brand-logo{width:30px;height:30px}'));
});

test('every published page uses the same owned favicon and branded page title', async () => {
  const files = await Promise.all(['index.html','about.html','privacy.html'].map(load));
  for (const page of files) assert.ok(page.includes(logo),'favicon should match top-left Radio logo');
  assert.match(files[0], /<title>Radio · 随机一站，听见世界<\/title>/);
  assert.ok(!files[0].includes('href="/favicon.svg"'));
});
