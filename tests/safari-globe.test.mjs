import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { GlobeRenderer } from '../src/globe.js';
import { isAppleMobileWebKit, seedGlobeDots } from '../src/scene.js';

const load = path => readFile(new URL('../'+path, import.meta.url), 'utf8');

test('Safari on iPhone/iPad is detected for adaptive performance controls', () => {
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

test('iPhone attempts the same WebGL globe as desktop and lazily generates Canvas fallback', async () => {
 const [scene,globe]=await Promise.all([load('src/scene.js'),load('src/globe.js')]);
 assert.match(scene,/this\.mobile=isAppleMobileWebKit\(\)/);
 assert.match(scene,/new GlobeRenderer\(this\.globeCanvas\)/);
 assert.doesNotMatch(scene,/new GlobeRenderer\(this\.globeCanvas,\{disabled:this\.mobile/);
 assert.match(scene,/if\(!rendered\)this\.fallback\.draw/);
 assert.match(scene,/this\.dots=null;this\.lastKey=/);
 assert.match(scene,/if\(!this\.dots\)this\.dots=seedGlobeDots\(\)/);
 assert.match(scene,/enhance\(\)\{/);
 assert.match(globe,/gl\.texParameteri\(gl\.TEXTURE_2D,gl\.TEXTURE_MIN_FILTER,gl\.LINEAR\)/);
 assert.match(globe,/gl\.generateMipmap\(gl\.TEXTURE_2D\);gl\.texParameteri/);
});

test('mobile draw budgets and visual rhythm do not change desktop geometry', async () => {
 const [scene,css]=await Promise.all([load('src/scene.js'),load('src/style.css')]);
 assert.match(scene,/this\.mobile\?1\.3:1\.75/);
 assert.match(scene,/this\.mobile\?\(this\.globe\.ready\?33:45\)/);
 assert.match(scene,/this\.backgroundCacheKey=/);
 assert.match(scene,/radius:Math\.min\(w\*\.43,h\*\.92,1050\)/);
 assert.match(scene,/radius:Math\.min\(w\*\.46,h\*\.26,240\)/);
 assert.match(css,/\.welcome h1\{font-family:Georgia,"Songti SC"/);
});
