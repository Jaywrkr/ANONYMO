import Link from 'next/link';
import { revisionVigente, estadoEntrega, TEXTO_CALIDAD, disciplinaBanco, disciplinaDe, type Entrega, type Proyecto } from '@anonymo/pipeline';
import { accionCompararBanco } from '@/app/estudio/acciones';
import { Enviar } from '@/app/estudio/nuevo/Enviar';

export function ControlCalidad({p,e,detalle=false}: {p:Proyecto;e:Entrega;detalle?:boolean}) {
  const estado = estadoEntrega(p,e);
  const q = e.calidad;
  const vigente = revisionVigente(p,e);
  return <section aria-label={`Calidad de ${e.titulo}`} className="my-4 min-w-0 rounded-2xl border border-current/15 p-4 text-[13px]">
    <div className="flex flex-wrap items-center gap-2"><strong>{TEXTO_CALIDAD[estado]}</strong><span>· versión {e.version}</span>{q?.nota !== undefined && <span>· {vigente?"revisión":"revisión anterior"} {q.nota}/10</span>}{q?.notaCalibrada !== undefined && <span title="La nota del juez corregida con su calibración contra el banco de referencias">· calibrada {q.notaCalibrada}/10</span>}{e.banco && e.banco.version===e.version && <span>· contra piezas de 9: {e.banco.gana} gana · {e.banco.empata} empata · {e.banco.pierde} pierde</span>}</div>
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
    {detalle && <Banco p={p} e={e}/>}
  </section>;
}

/** Comparación a ciegas contra piezas premiadas del banco (sistema/55). */
function Banco({p,e}:{p:Proyecto;e:Entrega}) {
  if(!disciplinaBanco(disciplinaDe(e.tarea))||e.modo==='simulado')return null;
  const b=e.banco, vigente=b&&b.version===e.version;
  return <div className="mt-4 rounded-xl bg-current/[0.04] p-3">
    <p className="font-medium">Comparación a ciegas con el banco</p>
    {b?<>
      <p className="mt-1">{vigente?'':'De la versión '+b.version+' · '}Contra {b.contra.length} piezas premiadas: <strong>{b.gana} gana · {b.empata} empata · {b.pierde} pierde</strong>{b.notaCalibrada!==undefined?` · nota calibrada ${b.notaCalibrada}/10`:''}.</p>
      {b.arreglos.length>0&&<><p className="mt-2">Los 3 arreglos que más la acercan a un 10:</p><ol className="mt-1 grid list-decimal gap-1 pl-5">{b.arreglos.map(x=><li key={x} className="break-words">{x}</li>)}</ol></>}
      <details className="mt-2"><summary className="min-h-11 cursor-pointer">Cada comparación</summary><ul className="mt-1 grid gap-2">{b.contra.map(c=><li key={c.ref}><strong>{c.resultado==='gana'?'Gana':c.resultado==='empata'?'Empata':'Pierde'}</strong> contra {c.nombre} ({c.autor}, {c.nota}{c.premio?` · ${c.premio}`:''}). <span className="opacity-80">{c.porque}</span></li>)}</ul></details>
    </>:<p className="mt-1 opacity-80">El juez compara esta entrega con 3 a 5 piezas premiadas del mismo tipo, sin saber cuál es la nuestra.</p>}
    <form action={accionCompararBanco} className="mt-2"><input type="hidden" name="id" value={p.pedido.id}/><input type="hidden" name="tarea" value={e.tarea}/><Enviar texto={vigente?'Comparar de nuevo':'Comparar con el banco'} trabajando="Comparando a ciegas… (1 a 2 minutos)" proyecto={p.pedido.id} className="inline-flex min-h-11 items-center rounded-full border border-current/20 px-4"/></form>
  </div>;
}
