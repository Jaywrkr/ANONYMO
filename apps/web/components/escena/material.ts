import * as THREE from "three";
import type { Area } from "@anonymo/agentes";

// Ruido simplex 3D (Ashima Arts, MIT).
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const vertex = /* glsl */ `
${NOISE}
uniform float uTime;
uniform float uSeed;
varying vec3 vPos;
varying vec3 vNormal;
varying vec3 vView;
void main(){
  float n = snoise(normal * 0.9 + vec3(uSeed, uTime * 0.18, -uTime * 0.12));
  vec3 p = position + normal * n * 0.035;
  vPos = p;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

// Mate, como los óvalos de tus pósters: degradado vertical que fluye, un acento que se mueve, grano fino.
const fragment = /* glsl */ `
${NOISE}
uniform float uTime;
uniform float uSeed;
uniform float uDim;
uniform vec3 uLuz;
uniform vec3 uMedio;
uniform vec3 uSombra;
uniform vec3 uAcento;
uniform vec3 uFondo;
varying vec3 vPos;
varying vec3 vNormal;
varying vec3 vView;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec3 n = normalize(vNormal);
  float flow = snoise(vPos * 0.85 + vec3(uSeed * 1.7, uTime * 0.12, uTime * 0.08));
  float t = clamp(vPos.y * 0.42 + 0.5 + vPos.x * 0.12 + flow * 0.18, 0.0, 1.0);
  vec3 c = mix(uSombra, uMedio, smoothstep(0.0, 0.62, t));
  c = mix(c, uLuz, smoothstep(0.58, 1.0, t));
  float a = smoothstep(0.1, 0.85, snoise(vPos * 1.1 + vec3(-uTime * 0.1, uSeed, uTime * 0.14)));
  c = mix(c, uAcento, a * 0.42);
  float light = dot(n, normalize(vec3(-0.45, 0.75, 0.6))) * 0.5 + 0.5;
  c *= mix(0.82, 1.04, light);
  float rim = pow(1.0 - max(dot(n, vView), 0.0), 2.4);
  c = mix(c, uLuz, rim * 0.28);
  vec3 grey = vec3(dot(c, vec3(0.299, 0.587, 0.114)));
  c = mix(c, mix(grey, uFondo, 0.55), uDim);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
  gl_FragColor.rgb += (hash(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5) * 0.07;
}`;

export function crearMaterialEsfera(area: Area, seed: number) {
  return new THREE.ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: {
      uTime: { value: 0 },
      uSeed: { value: seed },
      uDim: { value: 0 },
      uLuz: { value: new THREE.Color(area.luz) },
      uMedio: { value: new THREE.Color(area.medio) },
      uSombra: { value: new THREE.Color(area.sombra) },
      uAcento: { value: new THREE.Color(area.acento) },
      uFondo: { value: new THREE.Color("#efede8") },
    },
  });
}
