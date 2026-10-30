import Link from 'next/link';
import {notFound} from 'next/navigation';
import {condicionesDe, existe, leerProyecto, leerEntrega, requisitosDe, contratoPorId} from '@anonymo/pipeline';
import {exigirEstudio,serif,campo,boton} from '@/lib/estudio';
import {traer} from '@/lib/nube';
import {ControlCalidad} from '@/components/estudio/ControlCalidad';
import {Enviar} from '../../nuevo/Enviar';
import {accionCondiciones,accionVerificar} from '../../acciones';
import {SeguimientoMovil} from '@/components/estudio/SeguimientoMovil';

export const dynamic='force-dynamic';
export const metadata={title:'Requisitos y calidad — Estudio',robots:{index:false}};
export default async function Calidad({params}:{params:Promise<{id:string}>}) {
  await exigirEstudio();
  const {id}=await params;
  if(!/^[a-z0-9_-]+$/.test(id)) notFound();
  await traer(id);
  if(!existe(id)) notFound();
  const p=leerProyecto(id);
  return <div className="px-5 py-7 md:px-10">
    <SeguimientoMovil siempre />
    <Link href={`/estudio/${id}`} className="inline-flex min-h-11 items-center text-[14px]">← {p.pedido.cliente}</Link>
    <h1 className={`${serif} mt-3 text-[38px] leading-none`}>Requisitos y calidad</h1>
    <p className="mt-3 max-w-2xl text-[14px] text-medio">Generar una pieza, verificarla y aprobarla son pasos distintos. Una revisión incompleta no cuenta como aprobada.</p>
    {p.controlPendiente && <p role="status" className="mt-4 rounded-xl bg-white p-4">Revisión pendiente de {contratoPorId(p.controlPendiente.tarea)?.entrega}, versión {p.controlPendiente.version}. Esta página se actualiza sola.</p>}
    <details className="mt-6 rounded-2xl bg-white p-4" open={p.estado==='plan'}><summary className="min-h-11 cursor-pointer font-medium">Lo que debe cumplir este proyecto · {requisitosDe(p).length}</summary>
      <ul className="mt-3 grid gap-3 text-[14px]">{requisitosDe(p).map((r,i)=><li key={r.id+i}><span className="text-suave">{r.fuente}{r.tarea?` · ${contratoPorId(r.tarea)?.entrega}`:''}</span><p>{r.texto}</p></li>)}</ul>
    </details>
    <details className="mt-4 rounded-2xl bg-white p-4"><summary className="min-h-11 cursor-pointer font-medium">Añadir o ajustar condiciones de aceptación</summary>
      <p className="my-3 text-[13px] text-medio">Una condición concreta por línea. Se conservan el pedido y las respuestas originales. Cambiar condiciones deja pendientes las revisiones afectadas.</p>
      <form action={accionCondiciones} className="grid gap-3">
        <input type="hidden" name="id" value={id}/>
        <input type="hidden" name="tarea" value=""/>
        <label className="grid gap-2 text-[14px]">Condiciones para todo el proyecto<textarea name="condiciones" rows={4} defaultValue={(p.requisitos??[]).filter(r=>!r.tarea).map(r=>r.texto).join('\n')} className={campo}/></label>
        <Enviar texto="Guardar condiciones" trabajando="Guardando…" className={boton} proyecto={id}/>
      </form>
    </details>
    <div className="mt-7 grid gap-6">{p.plan.tareas.map(t=>{
      const e=leerEntrega(id,t);
      return <article key={t} id={t.replace('.','-')} className="min-w-0 scroll-mt-4 rounded-2xl bg-white p-4 md:p-6">
        <h2 className={`${serif} text-[27px]`}>{contratoPorId(t)?.entrega}</h2>
        <details className="mt-2 text-[13px]"><summary className="min-h-11 cursor-pointer">Condiciones de esta entrega</summary><ul className="list-inside list-disc">{condicionesDe(p,t).map((c,i)=><li key={c.id+i}>{c.texto}</li>)}</ul></details>
        {e?<><ControlCalidad p={p} e={e} detalle/><div className="flex flex-wrap gap-2"><Link href={`/estudio/${id}/${t.replace('.','-')}`} className={boton}>Abrir entrega</Link>{p.estado!=='en-curso'&&<form action={accionVerificar}><input type="hidden" name="id" value={id}/><input type="hidden" name="tarea" value={t}/><Enviar texto="Verificar esta versión" trabajando="Preparando revisión…" className={boton} proyecto={id}/></form>}</div></>:<p className="text-[14px] text-medio">Todavía no se ha generado.</p>}
        <details className="mt-3 text-[13px]"><summary className="min-h-11 cursor-pointer">Condiciones adicionales solo para esta entrega</summary><form action={accionCondiciones} className="grid gap-2"><input type="hidden" name="id" value={id}/><input type="hidden" name="tarea" value={t}/><textarea aria-label={`Condiciones de ${contratoPorId(t)?.entrega}`} name="condiciones" rows={3} defaultValue={(p.requisitos??[]).filter(r=>r.tarea===t).map(r=>r.texto).join('\n')} className={campo}/><Enviar texto="Guardar condiciones de la entrega" trabajando="Guardando…" className={boton} proyecto={id}/></form></details>
      </article>;
    })}</div>
  </div>;
}
