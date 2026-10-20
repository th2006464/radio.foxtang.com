import { GlobeRenderer } from './globe.js';
// Canvas starfield and station markers, plus WebGL point-earth and orthographic globe.
// Coordinates in earth mode only come from actual Radio Browser geo data.
export function hash(value) { let h = 2166136261; for (const c of String(value)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
export function randomFrom(seed) { let s = seed >>> 0; return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 4294967296; }; }
export function stationGenre(station) { const s = String(station.tags || '').toLowerCase(); if (/jazz|soul|blues|funk/.test(s)) return 1; if (/rock|metal|punk|alternative/.test(s)) return 2; if (/classic|opera|instrumental|piano/.test(s)) return 3; if (/techno|dance|electro|trance|house/.test(s)) return 4; if (/news|talk|sport|politic/.test(s)) return 5; return 0; }
export function projectGlobe(lat,lon,rotation,tilt=0) {
 const la=lat*Math.PI/180, dl=(lon-rotation)*Math.PI/180, t=tilt*Math.PI/180;
 const sinLa=Math.sin(la),cosLa=Math.cos(la),cosDl=Math.cos(dl);
 const z=sinLa*Math.sin(t)+cosLa*cosDl*Math.cos(t);
 return {x:cosLa*Math.sin(dl),y:-(sinLa*Math.cos(t)-cosLa*cosDl*Math.sin(t)),visible:z>0.001,z};
}
export function nearestLongitude(current,target){return current+((((target-current)%360)+540)%360)-180;}
export function formatCoordinates(lat,lon){if(!Number.isFinite(lat)||!Number.isFinite(lon))return '';return `${Math.abs(lat).toFixed(2)}°${lat>=0?'N':'S'} · ${Math.abs(lon).toFixed(2)}°${lon>=0?'E':'W'}`;}
const clusters = [ [-.04,-.07],[-.49,-.27],[.37,-.3],[-.44,.36],[.39,.3],[.04,.4] ];
const palette = ['162,172,255','227,168,223','152,193,255','190,222,244','196,176,250','132,220,204'];
const continents = [
[[-168,68],[-146,70],[-137,61],[-126,57],[-123,49],[-130,47],[-124,41],[-117,32],[-111,31],[-105,24],[-98,19],[-91,18],[-86,22],[-81,25],[-81,30],[-75,36],[-72,43],[-66,45],[-60,52],[-81,58],[-94,71],[-109,72],[-129,69],[-153,72]],
[[-82,12],[-73,11],[-65,10],[-59,7],[-51,4],[-48,-2],[-42,-9],[-37,-12],[-38,-20],[-47,-24],[-50,-30],[-54,-34],[-69,-55],[-74,-45],[-71,-28],[-78,-14],[-81,-4]],
[[-10,36],[-17,28],[-16,15],[-16,6],[-10,0],[9,-1],[13,-13],[19,-23],[20,-34],[30,-35],[35,-27],[40,-13],[51,-10],[45,12],[35,21],[31,32],[19,37],[12,37],[9,34]],
[[-11,36],[-10,44],[-5,44],[0,49],[-7,53],[-10,58],[-5,59],[11,54],[17,57],[24,55],[30,60],[28,70],[37,72],[50,71],[60,75],[82,73],[104,77],[121,70],[137,63],[142,56],[152,59],[164,56],[163,47],[141,41],[131,35],[124,30],[120,22],[110,13],[104,1],[101,-4],[110,-7],[117,2],[119,16],[123,21],[129,34],[141,40],[149,47],[154,48],[146,38],[135,35],[126,36],[119,30],[113,22],[105,17],[98,17],[89,22],[80,8],[75,10],[70,23],[59,25],[54,30],[43,29],[40,38],[33,42],[29,40],[25,42],[18,41],[12,45],[7,43],[0,42]],
[[112,-11],[113,-22],[123,-34],[135,-38],[147,-39],[153,-27],[148,-18],[138,-13],[128,-12]],
[[-53,60],[-43,59],[-39,65],[-41,80],[-55,83],[-60,74]],
[[46,-13],[50,-16],[48,-25],[43,-26],[44,-17]],
[[130,31],[137,35],[141,45],[146,43]],
[[-8,50],[-5,54],[-7,58],[-11,55]],
[[167,-35],[174,-41],[178,-39],[171,-34]]
];
// Canvas2D safety net for browsers without WebGL2. Same bundled Earth imagery.
class PointGlobeFallback {
 constructor(){
  this.dots=null;this.lastKey='';this.cache=null;
  if(typeof Image==='undefined'||typeof document==='undefined'||typeof document.createElement!=='function')return;
  this.cache=document.createElement('canvas');this.ctx=this.cache.getContext('2d');
  if(!this.ctx)return;
  const im=new Image();im.onload=()=>{
   try{
    const sample=document.createElement('canvas');sample.width=768;sample.height=384;
    const c=sample.getContext('2d',{willReadFrequently:true});if(!c)return;
    c.drawImage(im,0,0,sample.width,sample.height);
    const rgba=c.getImageData(0,0,sample.width,sample.height).data;
    const dots=[];
    for(let y=2;y<sample.height-2;y+=3){const lat=(.5-y/sample.height)*Math.PI;
     for(let x=2;x<sample.width;x+=3){const offset=(y*sample.width+x)*4;
      const r=rgba[offset],g=rgba[offset+1],b=rgba[offset+2];
      const signal=r*.86+g*.78-b*.9;
      const salt=((x*73+y*137)%101)/101;
      const level=signal>32?(salt>.90?3:2):signal>13?1:0;
      if(level===0&&salt>.15)continue;
      const jitterX=(((x*41+y*79)%17)-8)*.18,jitterY=(((x*67+y*31)%19)-9)*.14;
      const jitterLat=(.5-(y+jitterY)/sample.height)*Math.PI;
      dots.push({lon:((x+jitterX)/sample.width-.5)*Math.PI*2,sin:Math.sin(jitterLat),cos:Math.cos(jitterLat),level});
     }
    }
    this.dots=dots;this.lastKey='';
   }catch{/* Keep background visible if texture decoding fails. */}
  };
  im.src='/earth.webp';
 }
 draw(ctx,rotation,tilt,cx,cy,radius,w,h){
  if(!this.dots?.length||!this.ctx)return false;
  const key=[Math.round(rotation*1.7),Math.round(tilt*1.7),Math.round(radius/2),Math.round(cx/2),Math.round(cy/2),w,h].join(':');
  if(this.cache.width!==w||this.cache.height!==h){this.cache.width=w;this.cache.height=h;this.lastKey='';}
  if(this.lastKey!==key){
   const c=this.ctx;c.clearRect(0,0,w,h);
   const longitude=rotation*Math.PI/180,t=tilt*Math.PI/180,sinTilt=Math.sin(t),cosTilt=Math.cos(t);
   const paths=[new Path2D(),new Path2D(),new Path2D(),new Path2D()];
   const dotSize=radius>500?1.65:1.05;
   for(const d of this.dots){const shift=d.lon-longitude;
    const sn=Math.sin(shift),cs=Math.cos(shift),z=d.sin*sinTilt+d.cos*cs*cosTilt;
    if(z<0.01)continue;
    const px=cx+d.cos*sn*radius,py=cy-(d.sin*cosTilt-d.cos*cs*sinTilt)*radius;
    if(px<0||px>w||py<0||py>h)continue;
    paths[d.level].rect(px,py,dotSize,dotSize);
   }
   const colors=['rgba(144,165,156,.11)','rgba(141,169,155,.32)','rgba(203,219,194,.66)','rgba(255,245,222,.95)'];
   for(let i=0;i<paths.length;i++){c.fillStyle=colors[i];c.fill(paths[i]);}
   c.beginPath();c.arc(cx,cy,radius,0,Math.PI*2);
   c.strokeStyle='rgba(182,210,188,.12)';c.lineWidth=2;c.stroke();
   c.save();c.globalCompositeOperation='screen';const halo=c.createRadialGradient(cx-radius*.3,cy-radius*.35,radius*.5,cx,cy,radius*1.18);
   halo.addColorStop(0,'rgba(218,230,205,0)');halo.addColorStop(.75,'rgba(218,230,205,0)');halo.addColorStop(.90,'rgba(196,215,190,.035)');halo.addColorStop(1,'rgba(196,215,190,0)');
   c.fillStyle=halo;c.fillRect(Math.max(0,cx-radius*1.2),Math.max(0,cy-radius*1.2),radius*2.4,radius*2.4);c.restore();
   this.lastKey=key;
  }
  ctx.drawImage(this.cache,0,0,w,h);return true;
 }
}

export class Universe {
 constructor(canvas,onSelect){
  this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.onSelect=onSelect;
  this.stations=[];this.stars=[];this.points=[];this.active='';this.view='sky';this.panX=0;this.panY=0;this.zoom=1;this.rotation=-15;this.tilt=10;
  this.landing=true;this.introRotation=104;this.introTilt=14;this.introVelocityX=0;this.introVelocityY=0;this.width=1;this.height=1;this.last=0;this.running=true;this.reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  this.bg=this.makeStars(1100);this.pointer=null;this.dragged=false;this.target=null;this.globeTransition=null;this.landingStation=null;this.introGoal=null;
  this.globeCanvas=document.getElementById('globeCanvas');this.markerCanvas=document.getElementById('markersCanvas');this.markerCtx=this.markerCanvas.getContext('2d');
  this.globe=new GlobeRenderer(this.globeCanvas);this.fallback=new PointGlobeFallback();this.tooltip=document.getElementById('mapTip');
  this.resize=()=>this.setSize();window.addEventListener('resize',this.resize);this.bind();this.setSize();this.setView('sky');
  this.frame=requestAnimationFrame(this.animate);
 }
 makeStars(n){const r=randomFrom(149734);return Array.from({length:n},()=>({x:r(),y:r(),size:r()*.95+.1,alpha:r()*.6+.15,phase:r()*6.3}));}
 setSize(){this.width=innerWidth;this.height=innerHeight;const dpr=Math.min(devicePixelRatio||1,1.75);this.dpr=dpr;
  for(const canvas of [this.canvas,this.markerCanvas]){canvas.width=Math.round(this.width*dpr);canvas.height=Math.round(this.height*dpr);canvas.style.width=this.width+'px';canvas.style.height=this.height+'px';}
  this.ctx.setTransform(dpr,0,0,dpr,0,0);this.markerCtx.setTransform(dpr,0,0,dpr,0,0);this.globe.resize(this.width,this.height,dpr);
 }
 setStations(stations){this.stations=stations.slice(0,4500);this.stars=this.stations.slice(0,3200).map((s,i)=>{const r=randomFrom(hash(s.stationuuid||s.name||i));const genre=stationGenre(s),center=clusters[genre],a=r()*Math.PI*2;
  const radius=.07+Math.pow(r(),.55)*.29;return {station:s,x:center[0]+Math.cos(a)*radius*1.38,y:center[1]+Math.sin(a)*radius*.82,size:.7+r()*1.45,genre,phase:r()*6.28};});}
 setLanding(enabled){
  const next=!!enabled;
  if(next!==this.landing){
   if(next){
    // Returning from Earth preserves the same planet orientation on the intro.
    if(this.view==='earth'){this.introRotation=this.rotation;this.introTilt=this.tilt;}
    this.globeTransition=null;
   }else{
    // Preserve the exact globe pose the visitor spun by hand on the landing page.
    this.rotation=this.introRotation;this.tilt=this.introTilt;this.zoom=1;
    this.target=null;
    this.globeTransition={start:null,duration:780};
   }
  }
  this.landing=next;this.introVelocityX=0;this.introVelocityY=0;this.pointer=null;this.dragged=false;
  this.globeCanvas.hidden=!this.landing&&this.view!=='earth';this.markerCanvas.hidden=!this.landing&&this.view!=='earth';this.lastGpuKey=null;
 }
 setView(view){this.view=view==='earth'?'earth':'sky';if(this.view==='sky')this.globeTransition=null;this.globeCanvas.hidden=!this.landing&&this.view!=='earth';this.markerCanvas.hidden=!this.landing&&this.view!=='earth';this.lastGpuKey=null;this.tooltip.hidden=true;
  if(this.view==='earth'&&this.active){const selected=this.selectedStation||this.stations.find(s=>s.stationuuid===this.active);if(selected)this.focus(selected);}}
 setLandingStation(station){
  const valid=station&&Number.isFinite(station.geo_lat)&&Number.isFinite(station.geo_long)?station:null;
  if(this.landingStation?.stationuuid===valid?.stationuuid)return;
  this.landingStation=valid;
  if(valid&&this.landing&&!this.reduce)this.introGoal={rotation:nearestLongitude(this.introRotation,valid.geo_long),tilt:Math.max(-68,Math.min(68,valid.geo_lat))};
  else this.introGoal=null;
 }
 select(station){this.selectedStation=station;this.active=station?.stationuuid||'';if(this.view==='earth'&&station)this.focus(station);}
 focus(station){if(!Number.isFinite(station?.geo_lat)||!Number.isFinite(station?.geo_long))return false;
  this.target={rotation:nearestLongitude(this.rotation,station.geo_long),tilt:Math.max(-75,Math.min(75,station.geo_lat)),zoom:Math.max(this.zoom,1.25)};return true;}
 zoomBy(factor){const start=this.target?.zoom??this.zoom;this.target={rotation:this.target?.rotation??this.rotation,tilt:this.target?.tilt??this.tilt,zoom:Math.max(.65,Math.min(3.5,start*factor))};}
 reset(){this.target=null;this.panX=0;this.panY=0;this.zoom=1;this.rotation=-15;this.tilt=10;}
 closest(x,y,range=19){let found=null,best=range*range;for(const p of this.points){const d=(p.x-x)**2+(p.y-y)**2;if(d<best){best=d;found=p;}}return found;}
 introBounds(){const w=this.width,h=this.height;return w>740?{cx:w*.52,cy:h*.46,radius:Math.min(w*.43,h*.92,1050)}:{cx:w*.51,cy:Math.min(h*.448,315),radius:Math.min(w*.414,h*.245,210)};}
 introHit(x,y){const {cx,cy,radius}=this.introBounds();return (x-cx)**2+(y-cy)**2<=(radius*1.08)**2;}
 moveTooltip(e){if(this.landing){this.tooltip.hidden=true;this.canvas.style.cursor=this.introHit(e.clientX,e.clientY)?'grab':'default';return;}
  if(this.view!=='earth'||this.dragged||this.pointer){this.tooltip.hidden=true;return;}
  const found=this.closest(e.clientX,e.clientY,17);this.tooltip.hidden=!found;this.canvas.style.cursor=found?'pointer':'grab';if(found){this.tooltip.textContent=[found.station.name,found.station.state,found.station.country].filter(Boolean).join(' · ');this.tooltip.style.left=Math.min(this.width-230,e.clientX+18)+'px';this.tooltip.style.top=Math.max(100,e.clientY-45)+'px';}}
 bind(){const c=this.canvas;
  c.addEventListener('pointerdown',e=>{
   if(this.pointer||this.landing&&!this.introHit(e.clientX,e.clientY))return;
   this.pointer={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,lastTime:e.timeStamp||0,mode:this.landing?'intro':'explore'};
   this.dragged=false;this.target=null;this.tooltip.hidden=true;
   if(this.landing){this.introGoal=null;this.introVelocityX=0;this.introVelocityY=0;c.style.cursor='grabbing';}
   c.setPointerCapture?.(e.pointerId);
  });
  c.addEventListener('pointermove',e=>{
   if(!this.pointer){this.moveTooltip(e);return;}
   if(e.pointerId!==this.pointer.id)return;
   const dx=e.clientX-this.pointer.lastX,dy=e.clientY-this.pointer.lastY;
   if(Math.hypot(e.clientX-this.pointer.x,e.clientY-this.pointer.y)>5)this.dragged=true;
   if(this.dragged){
    if(this.pointer.mode==='intro'){
     const ms=Math.max(8,Math.min(64,(e.timeStamp||0)-this.pointer.lastTime||16));
     const lonStep=-dx*.34,latStep=dy*.28;
     this.introRotation+=lonStep;
     this.introTilt=Math.max(-78,Math.min(78,this.introTilt+latStep));
     if(!this.reduce){this.introVelocityX=Math.max(-.17,Math.min(.17,lonStep/ms));this.introVelocityY=Math.max(-.13,Math.min(.13,latStep/ms));}
    }else if(this.view==='sky'){this.panX+=dx;this.panY+=dy;}
    else{this.rotation-=dx*.3/Math.sqrt(this.zoom);this.tilt=Math.max(-82,Math.min(82,this.tilt+dy*.3/Math.sqrt(this.zoom)));}
   }
   this.pointer.lastX=e.clientX;this.pointer.lastY=e.clientY;this.pointer.lastTime=e.timeStamp||this.pointer.lastTime;
  });
  c.addEventListener('pointerup',e=>{
   if(!this.pointer||e.pointerId!==this.pointer.id)return;
   // Tapping the intro globe never opens the explorer: only the explicit CTA does.
   if(this.pointer.mode!=='intro'&&!this.dragged){const hit=this.closest(e.clientX,e.clientY,20);if(hit)this.onSelect(hit.station);}
   if(this.pointer.mode==='intro'&&!this.dragged){this.introVelocityX=0;this.introVelocityY=0;}
   this.pointer=null;this.dragged=false;this.moveTooltip(e);
  });
  c.addEventListener('pointercancel',()=>{this.pointer=null;this.dragged=false;this.introVelocityX=0;this.introVelocityY=0;this.canvas.style.cursor='grab';});
  c.addEventListener('pointerleave',()=>{this.tooltip.hidden=true;});
  c.addEventListener('wheel',e=>{if(this.landing)return;e.preventDefault();this.zoomBy(e.deltaY>0?.88:1.14);},{passive:false});
 }
 drawBackground(t){const c=this.ctx,w=this.width,h=this.height;c.fillStyle=this.landing?'#101f1d':'#101e1b';c.fillRect(0,0,w,h);
  const gradient=c.createRadialGradient(w*.47,h*.46,0,w*.5,h*.5,Math.max(w,h)*.72);gradient.addColorStop(0,this.landing?'#172723':'#192c24');gradient.addColorStop(.55,this.landing?'#0f211d':'#101d1b');gradient.addColorStop(1,'#081512');c.fillStyle=gradient;c.fillRect(0,0,w,h);
  for(const s of this.bg){const alpha=this.reduce?1:.88+Math.sin(t*.00053+s.phase)*.12;c.fillStyle=`rgba(203,219,202,${s.alpha*alpha*(this.landing?.32:.72)})`;c.fillRect(s.x*w,s.y*h,s.size,s.size);}}
 drawNebula(){const c=this.ctx,w=this.width,h=this.height,scale=Math.min(w,h)*.65*this.zoom;
  for(let i=0;i<clusters.length;i++){const a=clusters[i],ox=w/2+this.panX+a[0]*scale*1.35,oy=h/2+this.panY+a[1]*scale,r=scale*.35;
   c.save();c.translate(ox,oy);c.scale(1,.65);const g=c.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,`rgba(${palette[i]},.062)`);g.addColorStop(.4,`rgba(${palette[i]},.026)`);g.addColorStop(1,`rgba(${palette[i]},0)`);
   c.fillStyle=g;c.beginPath();c.arc(0,0,r,0,6.283);c.fill();c.restore();}}
 drawSky(t){const c=this.ctx,w=this.width,h=this.height;this.drawNebula();const scale=Math.min(w,h)*.65*this.zoom,centerX=w/2+this.panX,centerY=h/2+this.panY;this.points=[];
  for(const p of this.stars){const x=centerX+p.x*scale*1.35,y=centerY+p.y*scale;if(x<0||x>w||y<70||y>h-35)continue;const active=p.station.stationuuid===this.active;
   const twinkle=this.reduce?1:.82+Math.sin(t*.0012+p.phase)*.18,r=(active?3.5:p.size)*Math.min(1.55,Math.sqrt(this.zoom));
   if(active){c.strokeStyle='rgba(190,202,255,.7)';c.lineWidth=1;c.beginPath();c.arc(x,y,16+2*Math.sin(t*.002),0,6.283);c.stroke();}
   c.fillStyle=`rgba(${palette[p.genre]},${active?1:Math.min(.94,twinkle*.76)})`;c.beginPath();c.arc(x,y,r,0,6.283);c.fill();this.points.push({x,y,station:p.station});}}
 drawLanding(t,dt){const {cx,cy,radius}=this.introBounds();
  if(!this.pointer||this.pointer.mode!=='intro'){
   if(!this.reduce){
    if(this.introGoal){const k=1-Math.exp(-dt/570);this.introRotation+=(this.introGoal.rotation-this.introRotation)*k;this.introTilt+=(this.introGoal.tilt-this.introTilt)*k;if(Math.abs(this.introRotation-this.introGoal.rotation)<.04&&Math.abs(this.introTilt-this.introGoal.tilt)<.04)this.introGoal=null;}
    const moving=Math.abs(this.introVelocityX)+Math.abs(this.introVelocityY)>.00012;
    if(moving){
     this.introRotation+=this.introVelocityX*dt;
     this.introTilt=Math.max(-78,Math.min(78,this.introTilt+this.introVelocityY*dt));
     const friction=Math.exp(-dt/510);this.introVelocityX*=friction;this.introVelocityY*=friction;
    }else{this.introVelocityX=0;this.introVelocityY=0;if(!this.introGoal)this.introRotation+=dt*.00185;}
   }
  }
  const rendered=this.globe.render(this.introRotation,this.introTilt,cx,cy,radius,t);
  if(!rendered)this.fallback.draw(this.ctx,this.introRotation,this.introTilt,cx,cy,radius,this.width,this.height);
  this.points=[];
  const c=this.markerCtx;c.clearRect(0,0,this.width,this.height);
  const station=this.landingStation;
  if(this.width>740&&station){
   const p=projectGlobe(station.geo_lat,station.geo_long,this.introRotation,this.introTilt);
   if(p.visible){const x=cx+p.x*radius,y=cy+p.y*radius;
    if(x>=65&&x<this.width-295&&y>80&&y<this.height-80){
     c.beginPath();c.arc(x,y,24,0,Math.PI*2);c.strokeStyle='rgba(238,247,235,.66)';c.lineWidth=1.3;c.stroke();
     c.beginPath();c.arc(x,y,5,0,Math.PI*2);c.fillStyle='#fa6d4e';c.fill();
     c.fillStyle='#f76e50';c.font='600 13px -apple-system, BlinkMacSystemFont, sans-serif';c.fillText('●  '+(document.documentElement.lang==='zh-CN'?'已锁定':'TUNED'),x+38,y-9);
     c.fillStyle='rgba(249,250,241,.94)';c.font='600 18px -apple-system, BlinkMacSystemFont, sans-serif';c.fillText(station.name.slice(0,36),x+38,y+18);
    }
   }
  }
 }
 drawEarth(t){
  const w=this.width,h=this.height;
  // A camera dolly over the SAME WebGL point-cloud globe, never a texture swap.
  const endRadius=(w>740?Math.min(w*.53,h*1.13,1150):Math.min(Math.max(w*.56,245),h*.62))*this.zoom;
  let cx=w/2,cy=h*.48,radius=endRadius;
  if(this.globeTransition){
   const fly=this.globeTransition;
   if(fly.start===null)fly.start=t;
   const fraction=Math.max(0,Math.min(1,(t-fly.start)/fly.duration));
   const eased=1-Math.pow(1-fraction,3);
   const origin=this.introBounds();
   cx=origin.cx+(cx-origin.cx)*eased;
   cy=origin.cy+(cy-origin.cy)*eased;
   radius=origin.radius+(endRadius-origin.radius)*eased;
   if(fraction>=1)this.globeTransition=null;
  }
  const gpuKey=[this.rotation.toFixed(4),this.tilt.toFixed(4),radius.toFixed(3),cx.toFixed(2),cy.toFixed(2),this.globe.textureReady,this.width,this.height].join(':');
  const changed=gpuKey!==this.lastGpuKey;this.lastGpuKey=gpuKey;
  const rendered=this.globe.ready?(changed?this.globe.render(this.rotation,this.tilt,cx,cy,radius,t):true):false;
  const c=this.markerCtx;c.clearRect(0,0,w,h);this.points=[];
  if(!rendered&&!this.fallback.draw(this.ctx,this.rotation,this.tilt,cx,cy,radius,w,h)){c.beginPath();c.arc(cx,cy,radius,0,Math.PI*2);c.fillStyle='#12241f';c.fill();c.strokeStyle='rgba(199,215,197,.35)';c.stroke();}
  const groupPath=new Path2D(),activePts=[];
  for(const s of [...this.stations,...(this.selectedStation&&!this.stations.some(st=>st.stationuuid===this.selectedStation.stationuuid)?[this.selectedStation]:[])]){if(!Number.isFinite(s.geo_lat)||!Number.isFinite(s.geo_long))continue;
   const p=projectGlobe(s.geo_lat,s.geo_long,this.rotation,this.tilt);if(!p.visible)continue;
   const x=cx+p.x*radius,y=cy+p.y*radius;if(x<0||x>w||y<0||y>h)continue;
   const active=s.stationuuid===this.active;
   if(active){activePts.push({x,y,station:s});continue;}
   groupPath.moveTo(x+Math.min(2,1.1+.5*this.zoom),y);groupPath.arc(x,y,Math.min(2,1.1+.5*this.zoom),0,6.283);
   this.points.push({x,y,station:s});
  }
  c.fillStyle='rgba(203,223,204,.82)';c.fill(groupPath);
  for(const p of activePts){const {x,y,station}=p;const pulse=this.reduce?0:Math.sin(t*.003)*4;
    const halo=c.createRadialGradient(x,y,1,x,y,28);halo.addColorStop(0,'rgba(255,202,163,.67)');halo.addColorStop(1,'rgba(255,202,163,0)');c.fillStyle=halo;c.beginPath();c.arc(x,y,28,0,6.283);c.fill();
    c.lineWidth=1.5;c.strokeStyle='rgba(255,216,176,.9)';c.beginPath();c.arc(x,y,15+pulse,0,6.283);c.stroke();
    c.fillStyle='#ffe9ca';c.beginPath();c.arc(x,y,4.5,0,6.283);c.fill();
    const label=[station.state,station.country].filter(Boolean).join(', ')||station.country||station.name;
    const labelX=Math.max(15,Math.min(w-205,x+19)),labelY=Math.max(95,Math.min(h-65,y-24));
    c.font='600 12px system-ui';const labelWidth=Math.min(210,c.measureText(label).width+26);
    c.fillStyle='rgba(10,24,21,.87)';c.strokeStyle='rgba(238,210,180,.55)';c.lineWidth=1;c.beginPath();c.roundRect(labelX,labelY,labelWidth,34,7);c.fill();c.stroke();
    c.fillStyle='#f8f1df';c.fillText(label.slice(0,32),labelX+12,labelY+22,labelWidth-20);
    this.points.push(p);
  }
 }
 animate=(t)=>{if(!this.running)return;
  const frameInterval=this.landing||this.view==='earth'&&!this.reduce&&(this.globeTransition||this.target||(this.pointer&&this.dragged))?16:32;
  if(t-this.last>=frameInterval){const dt=Math.min(64,Math.max(1,t-this.last));this.last=t;
   if(this.target){const k=this.reduce?1:1-Math.exp(-dt/430);this.rotation+=(this.target.rotation-this.rotation)*k;this.tilt+=(this.target.tilt-this.tilt)*k;this.zoom+=(this.target.zoom-this.zoom)*k;
    if(Math.abs(this.rotation-this.target.rotation)<.03&&Math.abs(this.tilt-this.target.tilt)<.03&&Math.abs(this.zoom-this.target.zoom)<.003)this.target=null;}
   this.drawBackground(t);if(this.landing)this.drawLanding(t,dt);else if(this.view==='earth')this.drawEarth(t);else this.drawSky(t);
  }
  this.frame=requestAnimationFrame(this.animate);
 };
 destroy(){this.running=false;cancelAnimationFrame(this.frame);window.removeEventListener('resize',this.resize);this.globe.destroy();}
}