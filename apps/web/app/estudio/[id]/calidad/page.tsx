import Link from 'next/link';
import {notFound} from 'next/navigation';
import {leerEstandar,listarArchivos,condicionesDe, existe, leerProyecto, leerEntrega, requisitosDe, contratoPorId} from '@anonymo/pipeline';
import {exigirEstudio,serif,campo,boton} from '@/lib/estudio';
import {traer} from '@/lib/nube';
import {ControlCalidad} from '@/components/estudio/ControlCalidad';
import {Enviar} from '../../nuevo/Enviar';
import {accionReferencia,accionRetirarReferencia,accionCondiciones,accionVerificar} from '../../acciones';
import {SeguimientoMovil} from '@/components/estudio/SeguimientoMovil';

export const dynamic='force-dynamic';
export const metadata={title:'Requisitos y calidad — Estudio',robots:{index:false}};
export default async function Calidad({params}:{params:Promise<{id:string}>}) {
  await exigirEstudio();
  const {id}=await params;
  if(!/^[a-z0-9_-]+$/.test(id)) notFound();
  await traer(id);
  if(!existe(id)) notFound();
  const p=leerProyecto(id),estandar=leerEstandar(id),imagenes=listarArchivos(id).filter(a=>["image/png","image/jpeg","image/webp"].includes(a.tipo));
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
    <details className="mt-4 rounded-2xl bg-white p-4"><summary className="min-h-11 cursor-pointer font-medium">Referencias de calidad · {estandar.referencias.length}</summary><p className="my-3 text-[13px] text-medio">Elige hasta cuatro imágenes y explica qué criterio aportan. El productor y el revisor reciben las mismas copias. Son referencias, no recursos para copiar ni una garantía de calidad.</p>
     <div className="grid gap-4 sm:grid-cols-2">{estandar.referencias.map(r=><article key={r.id} className="min-w-0 rounded-xl border border-borde p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/estudio/${id}/calidad/referencia/${estandar.revision}/${r.id}`} alt={r.titulo} className="h-40 w-full rounded-lg object-contain"/><strong className="mt-2 block text-[14px]">{r.titulo}</strong><p className="mt-1 break-words text-[13px]">Aprender: {r.aprender}</p><p className="mt-1 break-words text-[13px]">Evitar: {r.evitar}</p><p className="mt-1 break-words text-[12px] text-medio">Origen: {r.origen} · {r.ambito}</p><form action={accionRetirarReferencia}><input type="hidden" name="id" value={id}/><input type="hidden" name="revision" value={estandar.revision}/><input type="hidden" name="referencia" value={r.id}/><Enviar texto="Retirar de la selección" trabajando="Actualizando selección…" className="min-h-11 text-[12px] underline" proyecto={id}/></form>
     </article>)}</div>
     {imagenes.length>0&&estandar.referencias.length<4?<form action={accionReferencia} className="mt-4 grid gap-3 text-[14px]"><input type="hidden" name="id" value={id}/><input type="hidden" name="revision" value={estandar.revision}/><label className="grid gap-1">Nombre de la referencia<input name="titulo" required minLength={3} maxLength={100} className={campo}/></label><label className="grid gap-1">Servicio<select name="ambito" className={campo}><option value="web">Web</option><option value="identidad">Logo e identidad</option></select></label><label className="grid gap-1">Imagen del proyecto (hasta 1 MB)<select name="archivo" className={campo}>{imagenes.map(a=><option key={a.nombre} value={a.nombre}>{a.nombre}</option>)}</select></label><label className="grid gap-1">Qué debe aportar al diseño<textarea name="aprender" required minLength={15} maxLength={700} rows={2} className={campo}/></label><label className="grid gap-1">Qué debemos evitar<textarea name="evitar" required minLength={10} maxLength={700} rows={2} className={campo}/></label><label className="grid gap-1">Origen de la referencia<input name="origen" required minLength={3} maxLength={400} className={campo}/></label><Enviar texto="Guardar referencia" trabajando="Guardando su copia y criterio…" proyecto={id} className={boton}/></form>:!imagenes.length&&<p className="mt-3 text-[13px]">Sube una captura PNG, JPG o WebP de hasta 1 MB en los archivos del proyecto para seleccionarla aquí.</p>}
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
