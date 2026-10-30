'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {SeguimientoMovil} from './SeguimientoMovil';
export interface FichaMovil {
 actualizado:string;id:string;nombre:string;fase:string;texto:string;accion:string;href:string;toca:boolean;estado:string;generadas:number;total:number;
 entregas:{titulo:string;resumen:string;href:string;calidad:string}[];
}
const normal=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function InicioMovil({proyectos,nombre,error,avisos=[],pendientes=0}:{proyectos:FichaMovil[];nombre:string;error:string;avisos?:{href:string;titulo:string;detalle:string}[];pendientes?:number}){
 const [q,setQ]=useState('');
 const [filtro,setFiltro]=useState('todos');
 useEffect(()=>{const cambiar=()=>{if(location.hash==='#te-toca')setFiltro('revisar');};cambiar();addEventListener('hashchange',cambiar);return()=>removeEventListener('hashchange',cambiar);},[]);
 const encontrados=proyectos.filter(p=>(filtro==='todos'||(filtro==='revisar'?p.toca:p.estado==='en-curso'))&&normal([p.nombre,p.texto,...p.entregas.map(e=>e.titulo+' '+e.resumen)].join(' ')).includes(normal(q)));
 return <div className="px-4 pb-8 pt-6 lg:hidden" data-testid="inicio-movil">
  <p className="text-[13px] text-medio">{nombre} · tu estudio</p>
  <h1 className="mt-1 font-serif text-[38px] leading-none">Lo que está avanzando.</h1>
  <div className="mt-3"><SeguimientoMovil/></div>
  <form role="search" action="/estudio/biblioteca" className="sticky top-2 z-10 mt-5 flex min-w-0 items-center gap-2 rounded-2xl bg-white p-2 shadow-sm">
   <label className="min-w-0 flex-1"><span className="sr-only">Buscar proyectos y entregas</span><input name="q" value={q} onChange={e=>setQ(e.target.value)} placeholder="Busca un cliente, una idea, una entrega…" className="w-full rounded-xl bg-transparent px-2 py-3 text-[16px] outline-none"/></label>
   <button className="min-h-11 rounded-xl bg-tinta px-3 text-[13px] text-white">Buscar todo</button>
  </form>
  <div role="group" aria-label="Ver proyectos" className="mt-4 flex flex-wrap gap-2">{[['todos','Todos'],['revisar','Por revisar'],['trabajo','En marcha']].map(([id,t])=><button key={id} type="button" aria-pressed={filtro===id} onClick={()=>setFiltro(id)} className={`min-h-11 rounded-full px-4 text-[13px] ${filtro===id?'bg-tinta text-white':'bg-white text-tinta'}`}>{t}{id==='revisar'?` · ${pendientes}`:''}</button>)}</div>
  {error&&<p role="alert" className="mt-4 rounded-xl bg-[#fde8e4] p-4 text-[14px]">No pudimos actualizar los proyectos. Vuelve a intentarlo en un momento.</p>}
  {filtro!=="trabajo"&&avisos.filter(a=>a.href.includes("?ver=cliente")||a.href==="/estudio#te-toca").filter(a=>normal(a.titulo+" "+a.detalle).includes(normal(q))).map((a,i)=><Link key={a.href+i} href={a.href==="/estudio#te-toca"?"/estudio?vista=completa#te-toca":a.href} className="mt-4 block rounded-2xl border border-urgente/30 bg-white p-4 text-[14px]"><strong>{a.titulo}</strong><span className="mt-1 block text-medio">{a.detalle}</span></Link>)}
  <div className="mt-5 grid gap-4">{encontrados.map(p=><article key={p.id} className="min-w-0 rounded-[22px] bg-white p-5 shadow-sm">
   <div className="flex items-center gap-2 text-[12px] text-medio"><i className={`h-2 w-2 rounded-full ${p.estado==='en-curso'?'late bg-vivo':p.toca?'bg-urgente':'bg-suave'}`}/>{p.fase}</div>
   <Link href={`/estudio/${p.id}`} className="mt-2 block break-words font-serif text-[31px] leading-tight">{p.nombre}</Link>
   <p className="mt-2 text-[14px] leading-snug">{p.texto}</p>
   <p className="mt-2 text-[12px] text-medio">Actualizado {new Date(p.actualizado).toLocaleString("es-EC",{timeZone:"America/Guayaquil",day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</p>
   <p className="mt-1 text-[12px] text-medio">{p.generadas} de {p.total} entregas generadas · la calidad se revisa por separado</p>
   <Link href={p.href} className="mt-4 inline-flex min-h-11 items-center rounded-full bg-tinta px-5 text-[14px] text-white">{p.accion} →</Link>
   {p.entregas.length>0&&<div className="mt-4 grid gap-3 border-t border-borde pt-4"><p className="text-[12px] text-medio">Últimos avances</p>{p.entregas.slice(0,2).map(e=><Link href={e.href} key={e.href} className="block min-w-0 rounded-xl bg-[#f6f3ee] p-3"><strong className="block text-[14px]">{e.titulo}</strong><span className="mt-1 block text-[12px] text-medio">{e.calidad}</span><span className="mt-1 line-clamp-2 block text-[13px]">{e.resumen}</span></Link>)}</div>}
   <Link href={`/estudio/${p.id}/atlas`} className="mt-2 flex min-h-11 items-center text-[13px] underline">Preguntar a Atlas</Link>
   <Link href={`/estudio/${p.id}/calidad`} className="mt-2 flex min-h-11 items-center text-[13px] underline">Requisitos y comprobaciones</Link>
  </article>)}</div>
  {!encontrados.length&&<p className="py-8 text-[14px] text-medio">{q?'No hay coincidencias en este resumen. Usa «Buscar todo» para buscar dentro de las entregas.':'No hay proyectos en este grupo.'}</p>}
 </div>;
}
