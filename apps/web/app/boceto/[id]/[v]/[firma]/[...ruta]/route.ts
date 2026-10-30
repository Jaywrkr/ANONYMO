import {leerImagenDireccion,leerRemotoBytes,nubeActiva,TIPOS_SITIO} from '@anonymo/pipeline';
import {firmaBocetoValida} from '@/lib/sitio';
export const dynamic='force-dynamic';
export async function GET(_:Request,{params}:{params:Promise<{id:string;v:string;firma:string;ruta:string[]}>}){
 const {id,v,firma,ruta}=await params;const version=Number(v),r=ruta.join('/');
 if(!/^[a-z0-9_-]+$/.test(id)||!Number.isSafeInteger(version)||version<1||!firmaBocetoValida(id,version,firma)||!/^img\/[^/]+\.(png|jpe?g|webp|gif|svg)$/i.test(r))return new Response(null,{status:404});
 try{
  const b=nubeActiva()?await leerRemotoBytes(id,`bocetos/v${version}/${r}`):leerImagenDireccion(id,version,r);
  if(!b)return new Response(null,{status:404});
  return new Response(new Uint8Array(b),{headers:{'content-type':TIPOS_SITIO[r.split('.').at(-1)!.toLowerCase()]??'application/octet-stream','cache-control':'private, max-age=600','content-security-policy':"default-src 'none'; sandbox",'x-content-type-options':'nosniff','x-robots-tag':'noindex'}});
 }catch{return new Response(null,{status:503});}
}
