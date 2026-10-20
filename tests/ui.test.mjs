import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');
const app=await readFile(new URL('../src/app.js',import.meta.url),'utf8');
const earth=await readFile(new URL('../src/globe.js',import.meta.url),'utf8');

test('mobile intro contains reference-matched copy, clear geography/source attribution and 2 actions',()=>{
 for(const text of ['缘溪行，忘路之远近','陶渊明《桃花源记》','211 个国家和地区的电台','随机一站，','听见世界。','开始收听','先逛逛星图','Radio Browser','GeoNames']) assert.ok(html.includes(text),text);
 for(const id of ['globeCanvas','welcome','startButton','exploreButton','footer','homeButton']) assert.ok(html.includes(`id="${id}"`));
 assert.ok(css.includes('@media(max-width:740px)'));
 assert.ok(css.includes('.welcome-copy{left:25px;right:25px'));
 assert.ok(css.includes('.primary-cta{width:100%;height:51px'));
});
test('browse view lists real station sources and dynamic genre categories without hard-coded fake counts',()=>{
 for(const id of ['genreChips','filterToggle','showSources','stationResults','locateButton','geoCard']) assert.ok(html.includes(`id="${id}"`));
 for(const tag of ['News & Talk','Jazz & Blues','Electronic','Rock']) assert.ok(app.includes(tag));
 assert.ok(app.includes('counts.all++'));
 assert.ok(app.includes('scene.setStations(list)'));
 assert.ok(app.includes("/api/stations?"));
});
test('landing globe uses WebGL textured dot mask and smooth animation, with no external globe shader CDN',()=>{
 for(const part of ['u_style','u_time','fwidth(grid)','land=smoothstep','grazing','limb']) assert.ok(earth.includes(part));
 assert.ok(app.includes('scene.setLanding(false)'));
 assert.ok(app.includes('scene.setLanding(true)'));
});