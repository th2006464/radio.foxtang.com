import test from 'node:test';
import assert from 'node:assert/strict';
import { Universe } from '../src/scene.js';

function canvas() {
 const handlers = new Map();
 return {
  handlers, style:{}, hidden:false,
  addEventListener:(type,cb)=>handlers.set(type,cb),
  setPointerCapture:()=>{},
  getContext:(name)=>name==='webgl2'?null:({setTransform:()=>{},clearRect:()=>{}}),
  emit:(type,evt={})=>{const h=handlers.get(type);assert.ok(h,`listener ${type}`);h(evt);},
 };
}
function withScene(run, reducedMotion=false){
 const globals=['document','window','matchMedia','innerWidth','innerHeight','devicePixelRatio','requestAnimationFrame','cancelAnimationFrame'];
 const previous=Object.fromEntries(globals.map(k=>[k,globalThis[k]]));
 const globeCanvas=canvas(), markersCanvas=canvas(), universeCanvas=canvas();
 const tooltip={hidden:true,style:{}};
 const entries={globeCanvas,markersCanvas,mapTip:tooltip};
 Object.assign(globalThis,{
  innerWidth:390,innerHeight:844,devicePixelRatio:1,
  matchMedia:()=>({matches:reducedMotion}),
  requestAnimationFrame:()=>42,cancelAnimationFrame:()=>{},
  window:{addEventListener:()=>{},removeEventListener:()=>{}},
  document:{getElementById:key=>entries[key]},
 });
 try {
  let selected=0;
  const scene=new Universe(universeCanvas,()=>selected++);
  try {run(scene,universeCanvas,()=>selected);} finally {scene.destroy();}
 } finally {
  for(const name of globals){if(previous[name]===undefined)delete globalThis[name];else globalThis[name]=previous[name];}
 }
}
const event=(x,y,t=0)=>({clientX:x,clientY:y,timeStamp:t,pointerId:1});

test('intro globe touch drag rotates the visible globe, adds decaying inertia, never opens explorer',()=>withScene((scene,canvas,selected)=>{
 const {cx,cy}=scene.introBounds(),initial=scene.introRotation;
 canvas.emit('pointerdown',event(cx,cy,0));
 canvas.emit('pointermove',event(cx+60,cy+22,20));
 assert.ok(scene.introRotation<initial-15,'horizontal drag updates intro longitude');
 assert.ok(scene.introTilt>14,'vertical drag updates intro latitude');
 assert.equal(scene.panX,0,'drag should not pan the hidden sky');
 assert.equal(scene.landing,true);
 canvas.emit('pointerup',event(cx+60,cy+22,25));
 const beforeInertia=scene.introRotation,speed=scene.introVelocityX;
 assert.ok(speed<0,'intro keeps release speed');
 scene.drawLanding(41,16);
 assert.ok(scene.introRotation<beforeInertia,'globe keeps turning after release');
 assert.ok(Math.abs(scene.introVelocityX)<Math.abs(speed),'inertia slows down');
 assert.equal(selected(),0,'gesture never chooses a station');
}));

test('single tap on intro globe has no navigation or station selection',()=>withScene((scene,canvas,selected)=>{
 const {cx,cy}=scene.introBounds(),original=scene.introRotation;
 canvas.emit('pointerdown',event(cx,cy,0));
 canvas.emit('pointerup',event(cx,cy,15));
 assert.equal(scene.introRotation,original);
 assert.equal(scene.introVelocityX,0);
 assert.equal(scene.landing,true);
 assert.equal(selected(),0);
 canvas.emit('pointerdown',event(4,4,25));
 assert.equal(scene.pointer,null,'outside globe is not captured');
}));

test('reduced-motion preference preserves manual drag without inertia',()=>withScene((scene,canvas)=>{
 const {cx,cy}=scene.introBounds();
 canvas.emit('pointerdown',event(cx,cy,0));
 canvas.emit('pointermove',event(cx+30,cy,16));
 canvas.emit('pointerup',event(cx+30,cy,17));
 const stopped=scene.introRotation;
 scene.drawLanding(33,16);
 assert.equal(scene.introRotation,stopped);
 assert.equal(scene.introVelocityX,0);
},true));
