import Link from 'next/link';
import { revisionVigente, estadoEntrega, TEXTO_CALIDAD, type Entrega, type Proyecto } from '@anonymo/pipeline';

export function ControlCalidad({p,e,detalle=false}: {p:Proyecto;e:Entrega;detalle?:boolean}) {
  const estado = estadoEntrega(p,e);
  const q = e.calidad;
  const vigente = revisionVigente(p,e);
  return <section aria-label={`Calidad de ${e.titulo}`} className="my-4 min-w-0 rounded-2xl border border-current/15 p-4 text-[13px]">
    <div className="flex flex-wrap items-center gap-2"><strong>{TEXTO_CALIDAD[estado]}</strong><span>· versión {e.version}</span>{q?.nota !== undefined && <span>· {vigente?"revisión":"revisión anterior"} {q.nota}/10</span>}</div>
    <p className="mt-2 break-words">{vigente && q ? q.resumen : q ? 'Hace falta revisar de nuevo esta versión con los controles actuales.' : 'Esta entrega aún no tiene comprobaciones registradas.'}</p>
    {!detalle && <Link className="mt-2 inline-flex min-h-11 items-center underline" href={`/estudio/${p.pedido.id}/calidad#${e.tarea.replace('.','-')}`}>Ver requisitos y comprobaciones →</Link>}
    {detalle && q && <>
      {q.comprobaciones.some(c=>c.estado!=="cumple") && <ul className="mt-3 grid gap-3">{q.comprobaciones.filter(c=>c.estado!=="cumple").map((c,i)=><li key={c.id+i}><strong>{c.estado==='falla'?'Cambiar':'Pendiente'} · {c.texto}</strong><p className="mt-1 break-words opacity-80">{c.evidencia}</p></li>)}</ul>}
      {!vigente&&q.capturas.length>0&&<p className="mt-3 font-medium">Capturas de la revisión anterior</p>}
      {q.capturas.length>0 && <div className="mt-4 grid grid-cols-2 gap-3">{q.capturas.map(c=><a key={c.ruta} href={`/estudio/${p.pedido.id}/calidad/archivo/${c.ruta}`} target="_blank" rel="noreferrer" className="min-w-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/estudio/${p.pedido.id}/calidad/archivo/${c.ruta}`} alt={`${c.pagina} a ${c.ancho} píxeles`} loading="lazy" className="h-44 w-full rounded-lg border bg-[#f6f3ee] object-contain object-top" />
        <span className="mt-1 block break-words">{c.pagina} · {c.ancho}px ↗</span>
      </a>)}</div>}
      <details className="mt-3"><summary className="min-h-11 cursor-pointer">{vigente?"Comprobaciones superadas":"Comprobaciones de la revisión anterior"} · {q.comprobaciones.filter(c=>c.estado==="cumple").length}</summary><ul className="mt-2 grid gap-3">{q.comprobaciones.filter(c=>c.estado==="cumple").map((c,i)=><li key={c.id+i}><strong>{c.texto}</strong><p className="mt-1 break-words opacity-80">{c.evidencia}</p></li>)}</ul></details>
      {!!q.referencias?.length&&<details className="mt-3"><summary className="min-h-11 cursor-pointer">Referencias usadas · {q.referencias.length}</summary>{q.referencias.map(r=><a key={r.id} href={`/estudio/${p.pedido.id}/calidad/referencia/${r.revision}/${r.id}`} target="_blank" rel="noreferrer" className="mt-3 block min-h-11 underline">{r.titulo} · selección {r.revision} ↗</a>)}</details>}
      <details className="mt-3"><summary className="min-h-11 cursor-pointer">Identificación y revisiones anteriores</summary><p className="break-all">Versión {q.version} · {new Date(q.fecha).toLocaleString("es-EC",{timeZone:"America/Guayaquil"})}<br/>Archivo: {q.huella}<br/>Requisitos: {q.contexto}</p>{q.historial?.map((h,i)=><p key={i} className="mt-2">{h.fecha} · {TEXTO_CALIDAD[h.estado]} · {h.resumen}</p>)}</details>
    </>}
  </section>;
}
