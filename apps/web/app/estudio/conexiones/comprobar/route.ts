import {comprobarConexiones} from '@anonymo/pipeline';
import {quienEsta} from '@/lib/estudio';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function POST(){if(!await quienEsta())return new Response(null,{status:404});return Response.json({fecha:new Date().toISOString(),resultados:await comprobarConexiones()},{headers:{'cache-control':'no-store'}});}
