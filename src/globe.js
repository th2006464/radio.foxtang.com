// One GPU-rendered point-cloud Earth is used in both the landing and listening views.
// NASA Blue Marble imagery is a *land mask* for tiny light points, never a visible
// photographic globe. Camera coordinates match projectGlobe() in scene.js.
const VERTEX=`#version 300 es
precision highp float;
in vec2 a_position;
void main(){gl_Position=vec4(a_position,0.,1.);}`;
const FRAGMENT=`#version 300 es
precision highp float;
out vec4 outColor;
uniform vec2 u_viewport;
uniform vec2 u_center;
uniform float u_radius;
uniform float u_lon;
uniform float u_lat;
uniform sampler2D u_earth;
uniform float u_loaded;
uniform float u_time;
uniform float u_safeAlpha;
const float PI=3.14159265359;
void main(){
 vec2 pixel=vec2(gl_FragCoord.x,u_viewport.y-gl_FragCoord.y);
 vec2 p=(pixel-u_center)/u_radius; p.y=-p.y;
 float d=dot(p,p);
 if(d>1.32) discard;
  // One luminous dot Earth, regardless of page state: the transition is camera-only.
  // Dense land-aware beads are lit by the same grazing crescent everywhere.
  if(d>1.){
   float band=1.-smoothstep(.05,.28,sqrt(d)-1.);
   vec2 c=vec2(-.73,.30);float halo=max(0.,dot(normalize(p),normalize(c)));
   float glow=pow(halo,4.)*band*.26;
   outColor=vec4(vec3(.70,.78,.69)*mix(1.,glow,u_safeAlpha),glow);return;
  }
  float z=sqrt(max(0.,1.-d));
  vec3 n=vec3(p.x,p.y,z);
  float st=sin(u_lat),ct=cos(u_lat);
  float latitude=asin(clamp(n.y*ct+n.z*st,-1.,1.));
  float longitude=atan(n.x,n.z*ct-n.y*st)+u_lon;
  vec2 uv=vec2(fract(.5+longitude/(2.*PI)),.5+latitude/PI);
  vec2 grid=uv*vec2(640.,320.);
  vec2 bead=fract(grid)-.5;
  float aa=max(.025, length(fwidth(grid))*.10);
  float dotShape=1.-smoothstep(.19,.25+aa,length(bead));
  vec3 rgb=u_loaded>.5?texture(u_earth,uv).rgb:vec3(.07,.10,.09);
  float land=smoothstep(-.08,.22,(rgb.r*.86+rgb.g*.78-rgb.b*.90));
  float m=fract(sin(dot(floor(grid),vec2(128.31,371.67)))*43758.5453);
  float scatter=.63+.37*m;
  vec3 sun=normalize(vec3(-.76,.44,.25));
  float grazing=max(dot(n,sun),0.);
  float night=.09+.91*pow(grazing,.75);
  float limb=pow(1.-z,3.8)*pow(grazing,.62);
  float light=dotShape*scatter*(.055+.52*land)*night;
  light+=dotShape*scatter*limb*.62;
  // A fine lit crescent, not a solid white ring around the whole sphere.
  light+=pow(1.-z,9.)*pow(grazing,1.75)*.65;
  light*=smoothstep(.03,.22,z);
  float shimmer=.985+.015*sin(u_time*.00031+m*12.);
  light*=shimmer;
  float alpha=clamp(light,0.,.98);
  outColor=vec4(vec3(.68,.76,.69)*mix(1.,alpha,u_safeAlpha),alpha);
}`;
function compile(gl,type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const why=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw new Error('Globe shader: '+why);}return shader;}
export class GlobeRenderer {
 constructor(canvas,{disabled=false,compositorSafe=false}={}){
  this.canvas=canvas;this.ready=false;this.textureReady=false;this.compositorSafe=Boolean(compositorSafe);
  if(disabled)return;
  let gl;try{gl=canvas.getContext('webgl2',{alpha:true,antialias:false,depth:false,stencil:false,premultipliedAlpha:this.compositorSafe,preserveDrawingBuffer:false});}catch(e){console.warn('WebGL context unavailable:',e);return;}
  if(!gl)return;
  this.gl=gl;
  try{
   const program=gl.createProgram();const v=compile(gl,gl.VERTEX_SHADER,VERTEX),f=compile(gl,gl.FRAGMENT_SHADER,FRAGMENT);
   gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);gl.deleteShader(v);gl.deleteShader(f);
   if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
   this.program=program;gl.useProgram(program);
   const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
   const loc=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
   this.uniforms={};for(const key of ['viewport','center','radius','lon','lat','earth','loaded','time','safeAlpha'])this.uniforms[key]=gl.getUniformLocation(program,'u_'+key);
   this.texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.texture);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([3,22,48,255]));
   this.ready=true;
   const image=new Image();image.decoding='async';image.onload=()=>{if(!this.ready)return;gl.bindTexture(gl.TEXTURE_2D,this.texture);try{gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);this.textureReady=true;}catch(error){console.warn('Earth texture unavailable:',error);this.ready=false;}};
   image.src='/earth.webp';
   canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.ready=false;});
  }catch(e){console.warn('WebGL globe unavailable:',e);this.ready=false;}
 }
 resize(width,height,dpr){if(!this.ready)return;this.dpr=dpr;const w=Math.round(width*dpr),h=Math.round(height*dpr);if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;this.canvas.style.width=width+'px';this.canvas.style.height=height+'px';this.gl.viewport(0,0,w,h);}}
 render(lon,lat,cx,cy,radius,time=0){if(!this.ready)return false;try{const gl=this.gl,d=this.dpr||1;gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(this.program);gl.uniform2f(this.uniforms.viewport,this.canvas.width,this.canvas.height);gl.uniform2f(this.uniforms.center,cx*d,cy*d);gl.uniform1f(this.uniforms.radius,radius*d);gl.uniform1f(this.uniforms.lon,lon*Math.PI/180);gl.uniform1f(this.uniforms.lat,lat*Math.PI/180);gl.uniform1f(this.uniforms.loaded,this.textureReady?1:0);gl.uniform1f(this.uniforms.time,time);gl.uniform1f(this.uniforms.safeAlpha,this.compositorSafe?1:0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.uniform1i(this.uniforms.earth,0);gl.drawArrays(gl.TRIANGLES,0,6);return true;}catch(error){console.warn('Globe render failure:',error);this.ready=false;return false;}}
 destroy(){this.ready=false;}
}