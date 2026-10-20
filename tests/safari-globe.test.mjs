import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { GlobeRenderer } from '../src/globe.js';
import { isAppleMobileWebKit, seedGlobeDots } from '../src/scene.js';

const load = path => readFile(new URL('../'+path, import.meta.url), 'utf8');

test('Safari on iPhone/iPad including desktop UA iPad uses Canvas2D instead of failing WebGL', () => {
 assert.equal(isAppleMobileWebKit('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15'), true);
 assert.equal(isAppleMobileWebKit('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15'), true);
 assert.equal(isAppleMobileWebKit('Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/605.1.15', 'MacIntel', 5), true);
 assert.equal(isAppleMobileWebKit('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/144', 'Win32', 0), false);
});

test('Safari fallback never requests an unsupported graphics context and has globe dots before any image response', () => {
 let calls=0;
 const renderer=new GlobeRenderer({getContext(){calls++;throw Error('disabled');}},{disabled:true});
 assert.equal(calls,0);assert.equal(renderer.ready,false);
 const dots=seedGlobeDots();assert.ok(dots.length>1000, `initial fallback dots: ${dots.length}`);
 assert.ok(dots.some(p=>p.level===2), 'land features visible from bootstrap geometry');
 assert.ok(dots.every(p=>Number.isFinite(p.lon)&&Number.isFinite(p.sin)&&Number.isFinite(p.cos)));
});

test('WebGL context exception becomes safe fallback rather than aborting page startup', () => {
 const original=console.warn;console.warn=()=>{};
 try{const renderer=new GlobeRenderer({getContext(){throw Error('GPU off');}});assert.equal(renderer.ready,false);}
 finally{console.warn=original;}
});

test('Earth-only UI has no star-mode switch, and entry always enters same globe material', async () => {
 const [html,app,scene]=await Promise.all(['index.html','src/app.js','src/scene.js'].map(load));
 assert.doesNotMatch(html, /id="skyView"|id="globeView"|电台星图|先逛逛星图/);
 assert.doesNotMatch(app, /setSceneView\(|setView\('sky'\)|Explore the sky|先逛逛星图/);
 assert.doesNotMatch(scene, /drawSky\(|drawNebula\(|setView\('sky'\)|this\.view='sky'/);
 assert.match(scene, /this\.globe\.render\(this\.introRotation,this\.introTilt/);
 assert.match(scene, /this\.globe\.ready\?\(changed\?this\.globe\.render/);
});
