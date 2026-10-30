// Pruebas acotadas de conexión. No exponen claves ni usan datos de proyectos.
import {rpcVersionado} from './versionado.ts';
import {sinPensar,textoDe} from './ia.ts';
export interface ConexionProbada {id:string;nombre:string;estado:'listo'|'falta'|'fallo'|'apagado';detalle:string;}
export async function comprobarConexiones(f:typeof fetch=fetch):Promise<ConexionProbada[]>{
 const tareas:Promise<ConexionProbada>[]=[];
 tareas.push((async()=>{
  if(!process.env.ANTHROPIC_API_KEY)return {id:'ia',nombre:'Conexión de IA',estado:'falta',detalle:'Falta configurar la conexión privada del proveedor en este despliegue.'};
  try{const modelo=process.env.ANTHROPIC_MODEL??'claude-sonnet-5-5';const r=await f(`${process.env.ANTHROPIC_BASE_URL??'https://api.anthropic.com'}/v1/messages`,{method:'POST',headers:{'content-type':'application/json','anthropic-version':'2023-06-01','x-api-key':process.env.ANTHROPIC_API_KEY},body:JSON.stringify({model:modelo,max_tokens:64,...sinPensar(modelo),system:'Comprobación de conexión ANONYMO. Responde exclusivamente LISTO.',messages:[{role:'user',content:'Confirma la conexión.'}]}),signal:AbortSignal.timeout(30000)});
   if(!r.ok)return {id:'ia',nombre:'Conexión de IA',estado:'fallo',detalle:`El proveedor rechazó la prueba (HTTP ${r.status}). Revisa la conexión y el modelo configurado.`};
   const d=await r.json() as Parameters<typeof textoDe>[0];if(textoDe(d).trim()!=='LISTO')throw new Error();return {id:'ia',nombre:'Conexión de IA',estado:'listo',detalle:'El modelo configurado respondió a la prueba breve. Esto comprueba conexión, no calidad creativa.'};
  }catch{return {id:'ia',nombre:'Conexión de IA',estado:'fallo',detalle:'No se completó la prueba del proveedor. El trabajo y sus versiones se conservan.'};}
 })());
 tareas.push((async()=>{
  if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_KEY)return {id:'almacen',nombre:'Almacén privado',estado:'falta',detalle:'Falta configurar el almacén privado en este despliegue.'};
  try{const bucket=process.env.SUPABASE_BUCKET??'proyectos';const r=await f(`${process.env.SUPABASE_URL.replace(/\/$/,'')}/storage/v1/bucket/${encodeURIComponent(bucket)}`,{headers:{authorization:`Bearer ${process.env.SUPABASE_SERVICE_KEY}`,apikey:process.env.SUPABASE_SERVICE_KEY},signal:AbortSignal.timeout(15000)});
   if(!r.ok)return {id:'almacen',nombre:'Almacén privado',estado:'fallo',detalle:`El almacén rechazó la consulta de configuración (HTTP ${r.status}).`};
   const d=await r.json() as {id?:unknown;name?:unknown;public?:unknown};if((d.id!==bucket&&d.name!==bucket)||d.public!==false)return {id:'almacen',nombre:'Almacén privado',estado:'fallo',detalle:'No se confirmó que el contenedor configurado sea privado. Revisa sus permisos.'};
   return {id:'almacen',nombre:'Almacén privado',estado:'listo',detalle:'El contenedor respondió y está configurado como privado. No se leyeron ni modificaron proyectos.'};
  }catch{return {id:'almacen',nombre:'Almacén privado',estado:'fallo',detalle:'No se pudo comprobar la configuración del almacén.'};}
 })());
 tareas.push(comprobarPiloto(f));return Promise.all(tareas);
}

/** Solo consulta capacidades y permisos del esquema, nunca estados ni nombres de clientes. */
async function comprobarPiloto(f:typeof fetch):Promise<ConexionProbada>{
 const base={id:'ejecucion',nombre:'Guardado y reservas del piloto'};
 if(process.env.ANONYMO_ALMACEN_VERSIONADO!=='1')return {...base,estado:'apagado',detalle:'Piloto desactivado en este despliegue. El almacenamiento habitual sigue activo; no se ha comprobado el esquema del piloto.'};
 const seleccion=process.env.ANONYMO_PROYECTOS_VERSIONADOS?.split(',').map(s=>s.trim());
 if(!seleccion?.length||seleccion.some(s=>!/^[a-z0-9][a-z0-9_-]{0,80}$/.test(s)))return {...base,estado:'fallo',detalle:'El piloto requiere una selección explícita de proyectos de ensayo. Revisa la configuración antes de utilizarlo.'};
 if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_KEY)return {...base,estado:'falta',detalle:'Falta la conexión privada para consultar el esquema del piloto.'};
 try{const r=await rpcVersionado<{protocolo?:unknown;seguridad?:unknown}>('anonymo_preparacion',{},f);
 if(r?.protocolo!==1||r.seguridad!==true)return {...base,estado:'fallo',detalle:'No se confirmó la versión del esquema o sus permisos privados. No actives proyectos reales.'};
 return {...base,estado:'listo',detalle:'El esquema esperado respondió y sus permisos comprobados son privados. El piloto está limitado a la selección configurada. Esta consulta no prueba escrituras, recuperación, avisos ni calidad creativa: falta el ensayo completo.'};
 }catch{return {...base,estado:'fallo',detalle:'No se pudo comprobar el esquema del piloto. Revisa la conexión y aplica la versión correspondiente de ambos archivos SQL en el entorno de ensayo.'};}
}
