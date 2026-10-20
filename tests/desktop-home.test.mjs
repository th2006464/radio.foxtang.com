import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const load=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const [html,app,css,scene]=await Promise.all(['index.html','src/app.js','src/style.css','src/scene.js'].map(load));
test('no poem or Tao Yuanming quote appears in published page or translations',()=>{
 for(const word of ['缘溪行','桃花源记','Tao Yuanming','The Peach Blossom Spring','Follow the stream']){
  assert.ok(!html.includes(word),`HTML retains ${word}`);
  assert.ok(!app.includes(word),`i18n retains ${word}`);
 }
 assert.ok(!html.includes('header-quote'));
});
test('return visit hero uses authentic saved station metadata, no fixed fake station',()=>{
 for(const id of ['heroTitle','heroEyebrow','heroPlace','heroDetails','heroSubtitle','startButton','exploreButton'])assert.ok(html.includes(`id="${id}"`));
 for(const phrase of ["lastStation:normalizeStation(safeRead('rf_last',null))","$('heroTitle').textContent=s.name","placeOf(s)","state.lastStation=s","scene.setLandingStation(s)","const last=lastPlayable();if(last){tune(last);return;}"]) assert.ok(app.includes(phrase),phrase);
 assert.ok(!html.includes('Radio En Construction'));
 assert.ok(!app.includes('Radio En Construction'));
 assert.ok(app.includes('欢迎回来 · 上次听到'));
 assert.ok(app.includes('或者随机听一站'));
});
test('desktop landing globe is larger than mobile and shares the earth renderer',()=>{
 assert.ok(scene.includes("return w>740?{cx:w*.52,cy:h*.46,radius:Math.min(w*.43,h*.92,1050)}"));
 assert.ok(scene.includes('this.globe.render(this.introRotation,this.introTilt,cx,cy,radius,t)'));
 assert.ok(scene.includes('const station=this.landingStation'));
 assert.ok(css.includes('@media (min-width:741px)'));
 assert.ok(css.includes('.hero-buttons{width:auto;flex-direction:row'));
 assert.ok(css.includes('body.returning .welcome h1'));
});
test('Foxtang identity remains and actual station coordinate provenance is honest',()=>{
 assert.ok(html.includes('<span>Foxtang Radio</span>'));
 assert.ok(html.includes('logo.foxtang.com/portraits/default-blue-transparent.png'));
 assert.ok(html.includes('电台坐标来自 Radio Browser'));
 assert.ok(!html.includes('地理数据来自'));
});
