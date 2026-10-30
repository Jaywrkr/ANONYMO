
'use server';
import {redirect} from 'next/navigation';
import {enviarAviso} from '@anonymo/pipeline';
import {exigirEstudio} from '@/lib/estudio';
export async function enviar(f:FormData){
 const quien=await exigirEstudio(),id=String(f.get('id')??''),ruta=String(f.get('ruta')??'');if(!/^[a-z0-9][a-z0-9_-]{0,80}$/.test(id))throw new Error('Proyecto no válido.');let mensaje='';
 try{if(String(f.get('confirmar')??'').trim().toLowerCase()!=='enviar')throw new Error();mensaje=(await enviarAviso(id,ruta,quien)).join(' ');}catch{mensaje='No se confirmó el envío. Revisa el destino, la conexión y el estado del aviso antes de volver a intentar.';}
 redirect(`/estudio/${id}/avisos?mensaje=${encodeURIComponent(mensaje)}`);
}
