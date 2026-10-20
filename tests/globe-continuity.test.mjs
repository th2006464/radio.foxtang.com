import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Universe} from '../src/scene.js';

const shader=await readFile(new URL('../src/globe.js',import.meta.url),'utf8');
const app=await readFile(new URL('../src/app.js',import.meta.url),'utf8');

function withGlobe(run){
 const saved=new Map();
 for(const key of ['document','window','matchMedia','innerWidth','innerHeight','devicePixelRatio','requestAnimationFrame','cancelAnimationFrame','Path2D'])saved.set(key,globalThis[key]);
 const noop=()=>{};
 const ctx={setTransform:noop,clearRect:noop,fill:noop,stroke:noop,beginPath:noop,arc:noop,roundRect:noop,fillText:noop,moveTo:noop,
   createRadialGradient:()=>({addColorStop:noop}),measureText:()=>({width:70})};
 const canvas=()=>({getContext:(name)=>name==='webgl2'?null:ctx,style:{},hidden:false,addEventListener:noop,setPointerCapture:noop});
 const globeCanvas=canvas(),markerCanvas=canvas(),main=canvas(),tooltip={hidden:true,style:{}};
 Object.assign(globalThis,{innerWidth:390,innerHeight:844,devicePixelRatio:1,
  requestAnimationFrame:()=>123,cancelAnimationFrame:noop,matchMedia:()=>({matches:false}),
  window:{addEventListener:noop,removeEventListener:noop},
  document:{getElementById:(id)=>({globeCanvas,markersCanvas:markerCanvas,mapTip:tooltip})[id]},
  Path2D:class{moveTo(){}arc(){}}});
 try{
  const scene=new Universe(main,noop);
  const calls=[];
  scene.globe.ready=true;
  scene.globe.render=(...args)=>{calls.push(args);return true;};
  try{run(scene,calls);}finally{scene.destroy();}
 }finally{
  for(const [key,value] of saved){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
 }
}

test('globe shader has just one land-masked luminous material, never a satellite-photo mode',()=>{
 assert.match(shader,/land=smoothstep/);
 assert.match(shader,/dotShape=1\.-smoothstep/);
 assert.doesNotMatch(shader,/u_style|uniform float u_style|Oceanic highlights|vec3 albedo=/);
 assert.match(shader,/render\(lon,lat,cx,cy,radius,time=0\)/);
});

test('entering Earth reuses identical globe orientation and shape, only camera dolly changes',()=>withGlobe((scene,calls)=>{
 scene.introRotation=137;scene.introTilt=24;
 scene.drawLanding(100,0);
 const first=calls.at(-1);
 scene.setLanding(false);
 scene.setView('earth');
 assert.equal(scene.rotation,137);
 assert.equal(scene.tilt,24);
 assert.equal(scene.globeCanvas.hidden,false);
 scene.drawEarth(110);
 const entry=calls.at(-1);
 assert.deepEqual(entry.slice(0,5),first.slice(0,5),'first exploration frame retains exact position, scale and orientation');
 scene.drawEarth(510);
 const middle=calls.at(-1);
 assert.ok(middle[4]>entry[4],'camera dolly smoothly enlarges same globe');
 scene.drawEarth(910);
 assert.equal(scene.globeTransition,null);
 assert.ok(calls.at(-1)[4]>middle[4],'dolly continues toward expanded Earth');
 assert.equal(calls.at(-1).length,6,'same renderer signature for both Earth states');
}));

test('returning to intro keeps the explored geographic hemisphere',()=>withGlobe((scene)=>{
 scene.setLanding(false);scene.setView('earth');
 scene.rotation=248;scene.tilt=-18;
 scene.setLanding(true);
 assert.equal(scene.introRotation,248);
 assert.equal(scene.introTilt,-18);
 assert.equal(scene.globeTransition,null);
 assert.equal(scene.globeCanvas.hidden,false);
}));

test('start listening always opens the same globe even when radio station lacks coordinates',()=>{
 assert.ok(app.includes("scene.select(s);state.started=true;enterExplore();setSceneView('earth');"));
 assert.ok(app.includes("$('exploreButton').addEventListener('click',()=>{enterExplore();setSceneView('sky');})"));
});