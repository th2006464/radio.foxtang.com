// GPU-backed textured globe. NASA Blue Marble Next Generation imagery is bundled locally.
// Camera coordinates match projectGlobe() in scene.js.
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
const float PI=3.14159265359;
void main(){
 vec2 pixel=vec2(gl_FragCoord.x,u_viewport.y-gl_FragCoord.y);
 vec2 p=(pixel-u_center)/u_radius; p.y=-p.y;
 float d=dot(p,p);
 if(d>1.21) discard;
 if(d>1.){
   float a=pow(max(0.,1.-(sqrt(d)-1.)/.1),2.)*.19;
   outColor=vec4(.21,.47,.8,a);return;
 }
 float z=sqrt(max(0.,1.-d));
 vec3 viewN=vec3(p.x,p.y,z);
 float st=sin(u_lat),ct=cos(u_lat);
 float latitude=asin(clamp(viewN.y*ct+viewN.z*st,-1.,1.));
 float longitude=atan(viewN.x,viewN.z*ct-viewN.y*st)+u_lon;
 vec2 uv=vec2(fract(.5+longitude/(2.*PI)),.5+latitude/PI);
 vec3 albedo=u_loaded>.5?texture(u_earth,uv).rgb:vec3(.015,.08,.17);
 vec3 light=normalize(vec3(-.48,.46,.86));
 float diffuse=max(dot(viewN,light),0.);
 float shade=.31+diffuse*.86;
 vec3 color=albedo*shade;
 // Oceanic highlights, subtle atmospheric rim and reflected light.
 float ocean=1.-smoothstep(.085,.16,albedo.r-albedo.b*.36);
 float spec=pow(max(dot(reflect(-light,viewN),vec3(0.,0.,1.)),0.),34.)*.16*ocean;
 color+=vec3(.15,.33,.5)*spec;
 color+=vec3(.085,.17,.24)*pow(1.-z,3.)*.8;
 float alpha=smoothstep(0.,.018,1.-sqrt(d));
 outColor=vec4(color,alpha);
}`;
function compile(gl,type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const why=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw new Error('Globe shader: '+why);}return shader;}
export class GlobeRenderer {
 constructor(canvas){
  this.canvas=canvas;this.ready=false;this.textureReady=false;
  const gl=canvas.getContext('webgl2',{alpha:true,antialias:false,depth:false,stencil:false,premultipliedAlpha:false,preserveDrawingBuffer:false,powerPreference:'high-performance'});
  if(!gl)return;
  this.gl=gl;
  try{
   const program=gl.createProgram();const v=compile(gl,gl.VERTEX_SHADER,VERTEX),f=compile(gl,gl.FRAGMENT_SHADER,FRAGMENT);
   gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);gl.deleteShader(v);gl.deleteShader(f);
   if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
   this.program=program;gl.useProgram(program);
   const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
   const loc=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
   this.uniforms={};for(const key of ['viewport','center','radius','lon','lat','earth','loaded'])this.uniforms[key]=gl.getUniformLocation(program,'u_'+key);
   this.texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.texture);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([3,22,48,255]));
   this.ready=true;
   const image=new Image();image.decoding='async';image.onload=()=>{if(!this.ready)return;gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image);gl.generateMipmap(gl.TEXTURE_2D);this.textureReady=true;};
   image.src='/earth.webp';
   canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.ready=false;});
  }catch(e){console.warn('WebGL globe unavailable:',e);this.ready=false;}
 }
 resize(width,height,dpr){if(!this.ready)return;this.dpr=dpr;const w=Math.round(width*dpr),h=Math.round(height*dpr);if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;this.canvas.style.width=width+'px';this.canvas.style.height=height+'px';this.gl.viewport(0,0,w,h);}}
 render(lon,lat,cx,cy,radius){if(!this.ready)return false;const gl=this.gl,d=this.dpr||1;gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(this.program);gl.uniform2f(this.uniforms.viewport,this.canvas.width,this.canvas.height);gl.uniform2f(this.uniforms.center,cx*d,cy*d);gl.uniform1f(this.uniforms.radius,radius*d);gl.uniform1f(this.uniforms.lon,lon*Math.PI/180);gl.uniform1f(this.uniforms.lat,lat*Math.PI/180);gl.uniform1f(this.uniforms.loaded,this.textureReady?1:0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.uniform1i(this.uniforms.earth,0);gl.drawArrays(gl.TRIANGLES,0,6);return true;}
 destroy(){this.ready=false;}
}
