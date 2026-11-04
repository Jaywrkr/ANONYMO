import Link from 'next/link';
import {notFound} from 'next/navigation';
import {historialVersionado,guardadoVersionado,indiceActual,compararIndices,bytesVersionados,versionadoActivo} from '@anonymo/pipeline';
import {exigirEstudio,serif,boton} from '@/lib/estudio';
import {Confirmar} from '@/components/estudio/Confirmar';
import {recuperar} from './acciones';
export const dynamic='force-dynamic';
export const maxDuration=300;
export const metadata={title:'Avances guardados — Estudio',robots:{index:false}};
export default async function Guardados({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{copia?:string;resultado?:string}>}){
 await exigirEstudio();const {id}=await params;if(!/^[a-z0-9][a-z0-9_-]{0,80}$/.test(id)||!versionadoActivo(id))notFound();
 const {copia,resultado}=await searchParams;if(copia&&!/^[a-f0-9-]{36}$/.test(copia))notFound();const [historial,actual]=await Promise.all([historialVersionado(id),indiceActual(id)]);if(!actual)notFound();
 const elegida=copia?await guardadoVersionado(id,copia):null;if(copia&&!elegida)notFound();
 const cambios=elegida?compararIndices(actual,elegida):[],p=JSON.parse((await bytesVersionados(id,actual.archivos['estado.json'])).toString('utf8'));
 return <main className="mx-auto grid max-w-3xl gap-6 px-5 py-10">
  <Link className={boton} href={`/estudio/${id}`}>Volver al proyecto</Link><h1 className={`${serif} text-4xl`}>Avances guardados</h1>
  <p className="text-medio">Revisa un avance o vuelve a una copia anterior. La recuperación crea una revisión nueva, deja el proyecto en pausa y exige volver a verificar las entregas.</p>
  {resultado&&<p role={resultado==='recuperado'?'status':'alert'} className="rounded-xl bg-white p-4">{resultado==='recuperado'?'Copia recuperada. El proyecto sigue en pausa; revisa las entregas antes de continuar.':'No se confirmó la recuperación. Puede que el proyecto haya cambiado o siga trabajando. Revisa la comparación y su estado antes de volver a intentar.'}</p>}
  {elegida&&<section aria-label="Comparación de la copia" className="grid gap-4 rounded-2xl bg-white p-5">
   <h2 className={`${serif} text-2xl`}>Antes de recuperar</h2><p className="break-all text-sm">Copia de {new Date(elegida.creado).toLocaleString('es-EC',{timeZone:'America/Guayaquil'})} · revisión actual {actual.revision}</p>
   <p className="text-sm">{cambios.length} archivos con cambios. Los gastos, comentarios y enlace privado actuales se conservan. Las aprobaciones se retiran; el contenido, requisitos y archivos vuelven a la copia seleccionada. Las versiones posteriores permanecen en el historial.</p>
   <ul className="grid max-h-72 gap-2 overflow-y-auto break-all text-sm">{cambios.map(c=><li key={c.ruta}>{c.cambio==='recuperar'?'Recuperar':c.cambio==='retirar'?'Retirar de la revisión visible':'Cambiar'} · {c.ruta}</li>)}</ul>
   <p className="text-xs text-medio">La recuperación también actualiza el estado, la bitácora y las revisiones de calidad. No publica archivos ni envía avisos externos.</p>
   {p.estado==='parado'&&!p.papelera?<Confirmar accion={recuperar} campos={{id,origen:elegida.id,revision:String(actual.revision)}} disparador="Recuperar esta copia" titulo="¿Recuperar esta copia?" texto="El proyecto quedará en pausa. El contenido y los requisitos volverán a esta copia, sin aprobaciones vigentes. Conservaremos el historial, los gastos y los comentarios actuales." confirmar="Recuperar y dejar en pausa" palabra="recuperar"/>:<p role="status">Pausa el proyecto desde su página antes de recuperar esta copia.</p>}
  </section>}
  {!historial.length&&<p>No hay copias guardadas.</p>}
  {historial.map(a=><section key={a.id} className="grid gap-3 rounded-2xl bg-white p-5"><h2 className="text-lg">{a.estado==='publicado'?`Revisión ${a.revision}`:a.estado==='conflicto'?'El pedido cambió':'La vuelta perdió su turno'}</h2><p className="text-sm text-medio">{new Date(a.creado).toLocaleString('es-EC',{timeZone:'America/Guayaquil'})}</p><Link className={boton} href={`/estudio/${id}/guardados?copia=${a.id}`}>Comparar esta copia</Link>{elegida?.id===a.id&&<details><summary className="cursor-pointer py-2">Descargar archivos de esta copia</summary><ul className="grid gap-2 break-all text-sm">{Object.keys(elegida.archivos).sort().map(r=><li key={r}><a className="underline" href={`/estudio/${id}/guardados/${a.id}?archivo=${encodeURIComponent(r)}`}>{r}</a></li>)}</ul></details>}</section>)}
  <p className="text-xs text-medio">Se muestran las últimas cincuenta copias y avances. Las descargas contienen información privada del proyecto.</p>
 </main>;
}
