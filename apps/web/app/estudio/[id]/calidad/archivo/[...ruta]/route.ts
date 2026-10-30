import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {carpeta,leerRemotoBytes,nubeActiva} from '@anonymo/pipeline';
import {quienEsta} from '@/lib/estudio';
export const dynamic='force-dynamic';
export async function GET(_:Request,{params}:{params:Promise<{id:string;ruta:string[]}>}) {
  if(!await quienEsta()) return new Response(null,{status:404});
  const {id,ruta}=await params;
  const r=ruta.join('/');
  if(!/^[a-z0-9_-]+$/.test(id)||!/^calidad\/[0-9]+-[a-z]+\/v[1-9][0-9]*\/[1-9][0-9]*-(390|1440)(-[0-9a-f]{12})?\.jpg$/.test(r)) return new Response(null,{status:404});
  try {
    const b=nubeActiva()?await leerRemotoBytes(id,r):readFileSync(join(carpeta(),id,r));
    if(!b) return new Response(null,{status:404});
    return new Response(new Uint8Array(b),{headers:{'content-type':'image/jpeg','cache-control':'private, no-store','x-content-type-options':'nosniff'}});
  } catch {return new Response(null,{status:404});}
}
