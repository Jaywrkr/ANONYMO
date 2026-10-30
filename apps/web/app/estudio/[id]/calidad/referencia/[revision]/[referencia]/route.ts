import {createHash} from 'node:crypto';
import {leerEstandar,imagenReferencia} from '@anonymo/pipeline';
import {quienEsta} from '@/lib/estudio';
import {traer} from '@/lib/nube';
export const dynamic='force-dynamic';
export async function GET(_:Request,{params}:{params:Promise<{id:string;revision:string;referencia:string}>}){
 if(!await quienEsta())return new Response(null,{status:404});const {id,revision,referencia}=await params,n=Number(revision);if(!/^[a-z0-9_-]+$/.test(id)||!Number.isSafeInteger(n)||n<1||!/^[a-f0-9-]{36}$/.test(referencia))return new Response(null,{status:404});
 try{await traer(id);const r=leerEstandar(id,n).referencias.find(r=>r.id===referencia);if(!r)return new Response(null,{status:404});const b=imagenReferencia(id,r);if(!b||createHash('sha256').update(b).digest('hex')!==r.imagen)return new Response(null,{status:404});return new Response(new Uint8Array(b),{headers:{'content-type':r.tipo,'cache-control':'private, no-store','content-security-policy':"sandbox; default-src 'none'",'x-content-type-options':'nosniff','x-robots-tag':'noindex'}});}catch{return new Response(null,{status:404});}
}
