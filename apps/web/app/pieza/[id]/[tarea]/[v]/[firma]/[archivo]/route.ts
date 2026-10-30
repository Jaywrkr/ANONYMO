import {leerPieza,leerRemotoBytes,nubeActiva,type TareaId} from '@anonymo/pipeline';
import {firmaPiezaValida} from '@/lib/sitio';
export const dynamic='force-dynamic';
export async function GET(_:Request,{params}:{params:Promise<{id:string;tarea:string;v:string;firma:string;archivo:string}>}){
 const {id,tarea,v,firma,archivo}=await params,version=Number(v),t=tarea.replace('-','.') as TareaId;
 if(!/^[a-z0-9_-]+$/.test(id)||!/^\d+-[a-z]+$/.test(tarea)||!Number.isSafeInteger(version)||version<1||!firmaPiezaValida(id,t,version,firma)||!/^[a-z0-9-]+\.svg$/.test(archivo))return new Response(null,{status:404});
 try{const b=nubeActiva()?await leerRemotoBytes(id,`piezas/${tarea}/v${version}/${archivo}`):leerPieza(id,t,version,archivo);if(!b)return new Response(null,{status:404});return new Response(new Uint8Array(b),{headers:{'content-type':'image/svg+xml','cache-control':'private, max-age=600','content-security-policy':"sandbox; default-src 'none'; style-src 'unsafe-inline'",'x-content-type-options':'nosniff','x-robots-tag':'noindex'}});}catch{return new Response(null,{status:404});}
}
