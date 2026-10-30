// Referencias privadas: selección versionada y copias inmutables, nunca archivos del sitio final.
import {createHash,randomUUID} from 'node:crypto';
import {existsSync,mkdirSync,readFileSync,renameSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {carpeta,leerProyecto,bitacora} from './almacen.ts';
import {listarArchivos,rutaArchivo} from './archivos.ts';
import {ocultarClaves} from './ia.ts';
import type {TareaId} from './tipos.ts';
export interface ReferenciaCreativa {id:string;titulo:string;ambito:'web'|'identidad';aprender:string;evitar:string;origen:string;imagen:string;tipo:'image/png'|'image/jpeg'|'image/webp';fecha:string;quien:'jay'|'luna';}
export interface EstandarCreativo {revision:number;referencias:ReferenciaCreativa[];}
const dir=(id:string)=>{if(!/^[a-z0-9_-]+$/.test(id))throw new Error('Proyecto no válido.');return join(carpeta(),id,'estandar');};
const hash=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
export function leerEstandar(id:string,revision?:number):EstandarCreativo{
 if(revision!==undefined&&(!Number.isSafeInteger(revision)||revision<1))throw new Error('Revisión no válida.');
 const ruta=join(dir(id),revision?`v${revision}.json`:'actual.json');return existsSync(ruta)?JSON.parse(readFileSync(ruta,'utf8')):{revision:0,referencias:[]};
}
function guardar(id:string,e:EstandarCreativo){mkdirSync(dir(id),{recursive:true});writeFileSync(join(dir(id),`v${e.revision}.json`),JSON.stringify(e));const tmp=join(dir(id),randomUUID()+'.tmp');writeFileSync(tmp,JSON.stringify(e));renameSync(tmp,join(dir(id),'actual.json'));}
const texto=(s:string,min:number,max:number)=>{const t=ocultarClaves(s.trim());if(t.length<min||t.length>max)throw new Error(`Completa el criterio entre ${min} y ${max} caracteres.`);return t;};
export function agregarReferencia(id:string,entrada:{titulo:string;ambito:'web'|'identidad';archivo:string;aprender:string;evitar:string;origen:string;quien:'jay'|'luna';revision:number}){
 const p=leerProyecto(id);if(p.papelera)throw new Error('El proyecto está en la papelera.');const e=leerEstandar(id);if(e.revision!==entrada.revision)throw new Error('Cambió la selección. Actualiza la página antes de guardar.');
 if(e.referencias.length>=4)throw new Error('Elige hasta cuatro referencias: conserva solo las que aportan un criterio distinto.');
 if(!['web','identidad'].includes(entrada.ambito))throw new Error('Elige web o identidad.');
 const archivo=listarArchivos(id).find(a=>a.nombre===entrada.archivo);if(!archivo||!['image/png','image/jpeg','image/webp'].includes(archivo.tipo))throw new Error('Elige una imagen PNG, JPG o WebP ya subida al proyecto.');
 const b=readFileSync(rutaArchivo(id,archivo.nombre)!);if(b.length>1024*1024||b.length<12)throw new Error('La referencia debe pesar hasta 1 MB. Usa una captura reducida.');
 const firma=archivo.tipo==='image/png'?b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):archivo.tipo==='image/jpeg'?b[0]===255&&b[1]===216&&b[2]===255:b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP';if(!firma)throw new Error('El contenido del archivo no corresponde a su tipo de imagen.');
 const imagen=hash(b),ref:ReferenciaCreativa={id:randomUUID(),titulo:texto(entrada.titulo,3,100),ambito:entrada.ambito,aprender:texto(entrada.aprender,15,700),evitar:texto(entrada.evitar,10,700),origen:texto(entrada.origen,3,400),imagen,tipo:archivo.tipo as ReferenciaCreativa['tipo'],fecha:new Date().toISOString(),quien:entrada.quien};
 if(e.referencias.some(r=>r.imagen===imagen&&r.ambito===ref.ambito))throw new Error('Esa imagen ya está seleccionada para este servicio.');
 const d=join(dir(id),'imagenes');mkdirSync(d,{recursive:true});const ruta=join(d,imagen);if(!existsSync(ruta)||hash(readFileSync(ruta))!==imagen){const temporal=ruta+'.'+randomUUID()+'.tmp';writeFileSync(temporal,b);renameSync(temporal,ruta);}
 guardar(id,{revision:e.revision+1,referencias:[...e.referencias,ref]});bitacora(id,`${entrada.quien==='jay'?'Jay':'Luna'} añadió una referencia de calidad: ${ref.titulo}.`);return ref;
}
export function retirarReferencia(id:string,clave:string,revision:number,quien:'jay'|'luna'){
 const e=leerEstandar(id);if(e.revision!==revision)throw new Error('Cambió la selección. Actualiza la página.');if(!e.referencias.some(r=>r.id===clave))throw new Error('No encontramos esa referencia.');
 guardar(id,{revision:e.revision+1,referencias:e.referencias.filter(r=>r.id!==clave)});bitacora(id,`${quien==='jay'?'Jay':'Luna'} retiró una referencia de la selección; su copia y revisiones se conservan.`);
}
export function imagenReferencia(id:string,referencia:ReferenciaCreativa){if(!/^[a-f0-9]{64}$/.test(referencia.imagen))return undefined;const p=join(dir(id),'imagenes',referencia.imagen);return existsSync(p)?readFileSync(p):undefined;}
const ambito=(t:TareaId)=>t==='3.mira'?'identidad':['4.orla','4.vector'].includes(t)?'web':undefined;
export function referenciasDe(id:string,tarea:TareaId){const e=leerEstandar(id);return e.referencias.filter(r=>r.ambito===ambito(tarea)).map(r=>({...r,revision:e.revision}));}
export function huellaReferencias(id:string,tarea:TareaId){return referenciasDe(id,tarea).map(({revision,...r})=>({...r,actual:(()=>{const b=imagenReferencia(id,r);return b?hash(b):'ausente';})()}));}
export function adjuntosReferencias(id:string,tarea:TareaId){return referenciasDe(id,tarea).map(r=>{const b=imagenReferencia(id,r);if(!b||hash(b)!==r.imagen)throw new Error('Falta la copia íntegra de la referencia '+r.titulo+'. Retira la referencia y vuelve a seleccionarla desde su archivo original.');return {...r,ruta:join(dir(id),'imagenes',r.imagen),bytes:b};});}
export const textoReferencias=(refs:ReferenciaCreativa[])=>refs.length?'# Referencias de calidad elegidas\n'+JSON.stringify(refs.map(({id,titulo,aprender,evitar,origen})=>({id:`ref-${id}`,titulo,aprender,evitar,origen})))+'\nLas imágenes son referencias para comparar criterios, no recursos autorizados para copiar ni incluir en la entrega. Explica cómo resuelves el criterio con una propuesta propia. No afirmes haber visto una referencia si su imagen no está adjunta.':'';
