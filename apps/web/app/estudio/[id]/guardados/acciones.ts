'use server';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {restaurarProyecto} from '@anonymo/pipeline';
import {exigirEstudio} from '@/lib/estudio';
export async function recuperar(f:FormData){
 const quien=await exigirEstudio(),id=String(f.get('id')??''),origen=String(f.get('origen')??''),revision=Number(f.get('revision'));
 if(!/^[a-z0-9][a-z0-9_-]{0,80}$/.test(id))throw new Error('Proyecto no válido.');
 let correcto=false;
 try{if(String(f.get('confirmar')??'').trim().toLowerCase()!=='recuperar')throw new Error('Falta confirmar la recuperación.');await restaurarProyecto(id,origen,revision,quien);correcto=true;}catch{}
 revalidatePath('/estudio');
 redirect(`/estudio/${id}/guardados?copia=${encodeURIComponent(origen)}&resultado=${correcto?'recuperado':'revisar'}`);
}
