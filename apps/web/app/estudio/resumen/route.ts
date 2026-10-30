import {createHash} from 'node:crypto';
import {quienEsta} from '@/lib/estudio';
import {resumenProyectos} from '@/lib/nube';
export const dynamic='force-dynamic';
export async function GET(){
  if(!await quienEsta())return new Response(null,{status:404});
  try{
    const todos=await resumenProyectos(true);
    const firma=createHash('sha256').update(JSON.stringify(todos.map(p=>[p.pedido.id,p.actualizado,p.estado,p.controlPendiente,p.revision]))).digest('hex');
    return Response.json({firma},{headers:{'cache-control':'no-store'}});
  }catch{return new Response(null,{status:503});}
}
