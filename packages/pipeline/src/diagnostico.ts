// Pruebas acotadas de conexión. No exponen claves ni usan datos de proyectos.
import {sinPensar,textoDe} from './ia.ts';
export interface ConexionProbada {id:string;nombre:string;estado:'listo'|'falta'|'fallo';detalle:string;}
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
 })());return Promise.all(tareas);
}
