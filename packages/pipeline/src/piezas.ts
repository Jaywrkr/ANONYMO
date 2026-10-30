// Identidad como archivos vectoriales reales, aislados del código del estudio.
import {existsSync,mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {carpeta} from './almacen.ts';
import {leerArchivosSitio} from './sitio.ts';
import type {TareaId} from './tipos.ts';
export const PEDIDO_MARCA=['# Entrega vectorial de identidad','Entrega archivos SVG editables en bloques ```svg archivo:logo-principal.svg, logo-monocromo.svg y simbolo.svg. Incluye tres exploraciones visuales distintas como ruta-1.svg, ruta-2.svg y ruta-3.svg y explica sus diferencias antes de los archivos. Los archivos finales son propuestas sujetas a revisión, no marcas registradas.','SVG autocontenido con viewBox válido, geometría real, sin scripts, eventos, imágenes raster, referencias externas, HTML ni entidades. Mantén el vector simple y editable. No simules una imagen dentro de SVG.','Prueba concepto, proporciones, una tinta, tamaños pequeños y fondos claros/oscuros. Explica tipografía, licencias, colores, aplicaciones y límites pendientes. No inventes comprobaciones legales ni licencias. Toda decisión debe responder al pedido.'].join('\n');
export function validarSvg(texto:string):string|undefined{
 if(Buffer.byteLength(texto)>150000||!/^\s*(?:<\?xml[^>]*>\s*)?<svg\b/i.test(texto)||!/<\/svg>\s*$/i.test(texto))return 'El archivo debe ser SVG completo y de hasta 150 KB.';
 if(/<!DOCTYPE|<!ENTITY|<\s*(script|foreignObject|image|iframe|object|embed)\b|\bon[a-z]+\s*=|@import/i.test(texto))return 'El SVG contiene código, imágenes o recursos externos.';
 for(const m of texto.matchAll(/(?:href\s*=\s*["']([^"']*)["']|url\(\s*([^)]*)\))/gi)){const valor=(m[1]??m[2]).trim().replace(/^["']|["']$/g,'');if(!valor.startsWith('#'))return 'El SVG contiene recursos externos.';}
 const v=texto.match(/\bviewBox\s*=\s*["']([^"']+)["']/i)?.[1].trim().split(/[ ,]+/).map(Number);
 if(!v||v.length!==4||!v.every(Number.isFinite)||v[2]<=0||v[3]<=0)return 'Falta un viewBox válido.';
 if(!/<(?:path|text|circle|ellipse|rect|polygon|polyline|line)\b/i.test(texto))return 'Falta geometría o texto vectorial.';
 return undefined;
}
const dir=(id:string,t:TareaId,v:number)=>{if(!/^[a-z0-9_-]+$/.test(id)||!/^\d+\.[a-z]+$/.test(t)||!Number.isSafeInteger(v)||v<1)throw new Error('Pieza no válida.');return join(carpeta(),id,'piezas',t.replace('.','-'),`v${v}`);};
export function leerPiezas(texto:string):Record<string,string>{return Object.fromEntries(Object.entries(leerArchivosSitio(texto)).filter(([r])=>/^[a-z0-9-]+\.svg$/.test(r)));}
export function guardarPiezas(id:string,t:TareaId,v:number,archivos:Record<string,string>){const d=dir(id,t,v);mkdirSync(d,{recursive:true});for(const [r,c]of Object.entries(archivos)){if(!/^[a-z0-9-]+\.svg$/.test(r))throw new Error('Nombre de vector no válido.');writeFileSync(join(d,r),c);}}
export function archivosPiezas(id:string,t:TareaId,v:number){const d=dir(id,t,v);return existsSync(d)?readdirSync(d).filter(r=>/^[a-z0-9-]+\.svg$/.test(r)).sort():[];}
export function leerPieza(id:string,t:TareaId,v:number,r:string):Buffer|undefined{if(!/^[a-z0-9-]+\.svg$/.test(r))return;const p=join(dir(id,t,v),r);return existsSync(p)?readFileSync(p):undefined;}
