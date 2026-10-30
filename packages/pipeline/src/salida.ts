// Salida del piloto: el evento solo es enviable cuando su archivo pertenece al índice confirmado.
import {randomUUID,createHash} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {carpeta} from './almacen.ts';
import {indiceActual,bytesVersionados,rpcVersionado,versionadoActivo} from './versionado.ts';
import type {AvisoProyecto} from './avisos.ts';
type Canal='correo'|'webhook';
interface Evento {id:string;fecha:string;aviso:AvisoProyecto;canales:{canal:Canal;config:string}[];}
const huella=(s:string)=>createHash('sha256').update(s).digest('hex');
function destino(canal:Canal){return canal==='correo'?JSON.stringify({conexion:huella(process.env.RESEND_API_KEY??''),de:process.env.AVISOS_DE??'Anonymo <avisos@resend.dev>',a:process.env.AVISOS_CORREO?.split(',').map(s=>s.trim()).filter(Boolean)}):process.env.AVISOS_WEBHOOK??'';}
export function prepararAviso(a:AvisoProyecto){
 if(!/^[a-z0-9][a-z0-9_-]{0,80}$/.test(a.proyecto))throw new Error('Proyecto no válido.');
 const aviso:AvisoProyecto={proyecto:a.proyecto,cliente:a.cliente.slice(0,140),tipo:a.tipo,titulo:a.titulo.slice(0,240),texto:a.texto.slice(0,4000),enlace:a.enlace?.slice(0,2048)};
 const id=randomUUID(),fecha=new Date().toISOString(),canales:Evento['canales']=[];
 if(process.env.RESEND_API_KEY&&process.env.AVISOS_CORREO)canales.push({canal:'correo',config:huella(destino('correo'))});
 if(process.env.AVISOS_WEBHOOK&&process.env.ANONYMO_WEBHOOK_IDEMPOTENTE==='1')canales.push({canal:'webhook',config:huella(destino('webhook'))});
 const base=join(carpeta(),a.proyecto,'avisos-cola');mkdirSync(base,{recursive:true});
 writeFileSync(join(base,`${fecha.replace(/\D/g,'')}_${id}.json`),JSON.stringify({id,fecha,aviso,canales} satisfies Evento));return id;
}
async function leerEvento(id:string,ruta:string,f:typeof fetch){
 if(!versionadoActivo(id)||!/^avisos-cola\/\d{17}_[a-f0-9-]{36}\.json$/.test(ruta))throw new Error('Aviso no válido.');
 const indice=await indiceActual(id,f),entrada=indice?.archivos[ruta];if(!entrada||entrada.bytes>32000)throw new Error('El aviso no pertenece a una revisión confirmada.');
 const evento=JSON.parse((await bytesVersionados(id,entrada,f)).toString('utf8')) as Evento;
 if(evento.aviso?.proyecto!==id||!ruta.endsWith('_'+evento.id+'.json')||!Array.isArray(evento.canales)||evento.canales.length>2||evento.canales.some(c=>!['correo','webhook'].includes(c.canal)||!/^[a-f0-9]{64}$/.test(c.config)))throw new Error('Aviso guardado no válido.');
 return {evento,entrada};
}
export async function avisosPendientes(id:string,antes?:string,f:typeof fetch=fetch){
 const indice=await indiceActual(id,f);if(!indice)return {avisos:[],siguiente:undefined};
 const rutas=Object.keys(indice.archivos).filter(r=>r.startsWith('avisos-cola/')&&(!antes||r<antes)).sort().reverse(),pagina=rutas.slice(0,20);
 const estados=pagina.length?await rpcVersionado<{evento:string;canal:string;estado:string;intentos:number}[]>('anonymo_avisos_estado',{p_proyecto:id},f):[];
 const nombreDestino=(canal:Canal)=>{if(canal==='correo')return process.env.AVISOS_CORREO??'';try{return new URL(process.env.AVISOS_WEBHOOK??'').hostname;}catch{return 'Destino sin comprobar';}};
 const avisos=await Promise.all(pagina.map(async ruta=>{const {evento}=await leerEvento(id,ruta,f);return {ruta,id:evento.id,fecha:evento.fecha,titulo:evento.aviso.titulo,texto:evento.aviso.texto,canales:evento.canales.map(c=>({canal:c.canal,destino:c.config===huella(destino(c.canal))?nombreDestino(c.canal):'El destino cambió; requiere revisión',coincide:c.config===huella(destino(c.canal)),estado:estados.find(e=>e.evento===evento.id&&e.canal===c.canal)?.estado??'pendiente'}))};}));
 return {avisos,siguiente:rutas.length>20?pagina.at(-1):undefined};
}
/** Solo se llama por una acción explícita del estudio. No hay envíos automáticos en esta versión. */
export async function enviarAviso(id:string,ruta:string,quien:'jay'|'luna',f:typeof fetch=fetch){
 if(process.env.ANONYMO_AVISOS_VERSIONADOS!=='1')throw new Error('El envío de avisos del piloto está desactivado.');
 const {evento,entrada}=await leerEvento(id,ruta,f),resultados:string[]=[];
 for(const c of evento.canales){
  if(c.canal==='webhook'&&process.env.ANONYMO_WEBHOOK_IDEMPOTENTE!=='1')throw new Error('El receptor de webhook debe aceptar claves de deduplicación.');
  if(huella(destino(c.canal))!==c.config)throw new Error('Cambió el destino o la conexión configurada. Revisa este aviso antes de enviarlo.');
  if(c.canal==='correo'&&!process.env.RESEND_API_KEY)throw new Error('Falta la conexión privada del correo.');
  const propietario=randomUUID(),tomado=await rpcVersionado<boolean>('anonymo_reservar_aviso',{p_proyecto:id,p_evento:evento.id,p_ruta:ruta,p_huella:entrada.sha256,p_canal:c.canal,p_config:c.config,p_propietario:propietario,p_quien:quien},f);
  if(tomado!==true){resultados.push('Ya enviado, en proceso o pendiente de revisión.');continue;}
  let correcto=false;
  try{
   const clave=`anonymo/${id}/${evento.id}/${c.canal}`,a=evento.aviso;
   const r=c.canal==='correo'?await f('https://api.resend.com/emails',{method:'POST',headers:{authorization:`Bearer ${process.env.RESEND_API_KEY}`,'content-type':'application/json','Idempotency-Key':clave},body:JSON.stringify({from:process.env.AVISOS_DE??'Anonymo <avisos@resend.dev>',to:process.env.AVISOS_CORREO!.split(',').map(s=>s.trim()).filter(Boolean),subject:`${a.cliente} · ${a.titulo}`,text:`${a.titulo}\n\n${a.texto}\n\n${a.enlace??''}`}),signal:AbortSignal.timeout(10000)}):await f(process.env.AVISOS_WEBHOOK!,{method:'POST',headers:{'content-type':'application/json','Idempotency-Key':clave},body:JSON.stringify({...a,id:evento.id}),signal:AbortSignal.timeout(10000)});
   correcto=r.ok;if(correcto&&c.canal==='correo'){const d=await r.json();correcto=typeof d.id==='string'&&!!d.id;}
  }catch{}
  const confirmado=await rpcVersionado<boolean>('anonymo_cerrar_aviso',{p_proyecto:id,p_evento:evento.id,p_canal:c.canal,p_propietario:propietario,p_correcto:correcto},f);
  resultados.push(confirmado===true&&correcto?'Envío confirmado.':'Envío sin confirmar. Revisa su estado antes de reintentar.');
 }
 return resultados;
}
