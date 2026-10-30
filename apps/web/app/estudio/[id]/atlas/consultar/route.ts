import {interpretarEncargo,aplicarEncargo,recordarEncargo,leerProyecto,consultarAtlas,conversacionesDe,existe} from '@anonymo/pipeline';
import {quienEsta} from '@/lib/estudio';
import {lanzar,trabajandoAhora} from '@/lib/trabajo';
import {agentePorId} from '@anonymo/agentes';
import {traer,conNube} from '@/lib/nube';
export const dynamic='force-dynamic';
export const maxDuration=120;
const activas=new Map<string,{huella:string;promesa:Promise<unknown>}>();
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const quien=await quienEsta();if(!quien)return new Response(null,{status:404});
 const {id}=await params;if(!/^[a-z0-9_-]+$/.test(id))return new Response(null,{status:404});
 let d:{pregunta?:unknown;agente?:unknown;solicitud?:unknown;modo?:unknown};
 try{const texto=await req.text();if(texto.length>16000)return Response.json({error:'La consulta es demasiado larga.'},{status:413});d=JSON.parse(texto);}catch{return Response.json({error:'No pudimos leer la consulta.'},{status:400});}
 if(typeof d.pregunta!=='string'||typeof d.agente!=='string'||typeof d.solicitud!=='string')return Response.json({error:'Faltan datos de la consulta.'},{status:400});
 const clave=id+':'+d.solicitud;
 const huella=JSON.stringify([quien,d.pregunta,d.agente,d.modo??'consultar']);
 const previa=activas.get(clave);
 if(previa&&previa.huella!==huella)return Response.json({error:'Este identificador pertenece a otra consulta.'},{status:409});
 let accion=previa?.promesa;
 if(!accion){
  accion=(async()=>{
   if(d.modo==='encargar'){
    await conNube([id],()=>interpretarEncargo(id,d.pregunta as string,d.agente as string,quien,d.solicitud as string));
    const resultado=await conNube([id],async()=>{
     const e=await aplicarEncargo(id,d.solicitud as string);
     return recordarEncargo(id,{solicitud:e.id,pregunta:d.pregunta as string,agente:d.agente as string,quien,resultado:e.resultado??'El encargo queda guardado.'});
    });
    const estado=await conNube([id],()=>leerProyecto(id).estado);
    if(estado==='en-curso'&&!await trabajandoAhora(id))await lanzar(id,new URL(req.url).origin);
    return resultado;
   }
   if(d.modo!==undefined&&d.modo!=='consultar')throw new Error('Modo no válido.');
   return conNube([id],()=>consultarAtlas(id,d.pregunta as string,quien,d.agente as string,d.solicitud as string));
  })();
  activas.set(clave,{huella,promesa:accion});
 }
 try{return Response.json(await accion,{headers:{'cache-control':'no-store'}});}catch{return Response.json({error:'No pudimos completar la consulta. Lo que ya estaba guardado se conserva.'},{status:503});}finally{activas.delete(clave);}
}

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
 if(!await quienEsta())return new Response(null,{status:404});const {id}=await params;if(!/^[a-z0-9_-]+$/.test(id))return new Response(null,{status:404});
 try{await traer(id);if(!existe(id))return new Response(null,{status:404});const p=leerProyecto(id);if(p.papelera)return new Response(null,{status:404});const agentes=[...new Set(['atlas',...p.plan.tareas.map(t=>t.split('.')[1])])].map(id=>({id,nombre:agentePorId(id)?.nombre??id}));return Response.json({id,cliente:p.pedido.cliente,mensajes:conversacionesDe(id).slice(-50),agentes},{headers:{'cache-control':'no-store'}});}catch{return Response.json({error:'No pudimos abrir la conversación.'},{status:503});}
}
