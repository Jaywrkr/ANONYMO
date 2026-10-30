'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import type {MensajeAtlas} from '@anonymo/pipeline';
export function ChatAtlas({id,inicial,agentes}:{id:string;inicial:MensajeAtlas[];agentes:{id:string;nombre:string}[]}){
 const [mensajes,setMensajes]=useState(inicial),[texto,setTexto]=useState(''),[agente,setAgente]=useState('atlas'),[pendiente,setPendiente]=useState(false),[error,setError]=useState('');
 const [modo,setModo]=useState('consultar');
 const solicitud=useRef<string|null>(null),historial=useRef<HTMLDivElement>(null);
 useEffect(()=>{historial.current?.scrollTo({top:historial.current.scrollHeight,behavior:'instant'});},[mensajes]);
 const enviar=async(e:React.FormEvent)=>{e.preventDefault();if(pendiente||!texto.trim())return;setPendiente(true);setError('');solicitud.current??=crypto.randomUUID();
  try{const r=await fetch(`/estudio/${id}/atlas/consultar`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({pregunta:texto,agente,modo,solicitud:solicitud.current})});if(!r.ok)throw new Error();const m=await r.json() as MensajeAtlas;setMensajes(ms=>ms.some(x=>x.id===m.id)?ms:[...ms,m]);setTexto('');solicitud.current=null;}catch{setError('No pudimos responder. Puedes reintentar la misma consulta; conservamos el trabajo guardado.');}finally{setPendiente(false);}};
 return <section aria-label="Conversación con el equipo">
  <div ref={historial} role="log" aria-label="Historial de la conversación" tabIndex={0} className="mt-5 grid max-h-[45vh] gap-4 overflow-y-auto overscroll-contain rounded-2xl focus-visible:outline focus-visible:outline-2" aria-live="polite">{mensajes.map(m=><article key={m.id} className="min-w-0 rounded-2xl bg-white p-4 md:p-6"><p className="text-[12px] text-medio">{m.quien==='jay'?'Jay':'Luna'} preguntó a {m.agente}</p><p className="mt-2 whitespace-pre-wrap break-words text-[16px]">{m.pregunta}</p><div className="mt-4 border-t border-borde pt-4"><p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed">{m.respuesta}</p><p className="mt-3 text-[11px] text-medio">{m.modo==='ia'?'Respuesta de IA basada en registros':'Resumen de los registros'} · {new Date(m.fecha).toLocaleString('es-EC',{timeZone:'America/Guayaquil'})}</p><div className="mt-2 flex flex-wrap gap-2">{m.fuentes.map(f=><Link key={f.id} href={f.href} className="inline-flex min-h-11 items-center rounded-xl bg-[#f4f1eb] px-3 text-[12px]">{f.titulo} ↗</Link>)}</div></div></article>)}</div>
  {!mensajes.length&&<p className="mt-5 rounded-2xl bg-white p-5 text-[14px]">Pregunta qué avanzó, qué falta o qué decisión quedó registrada. Las respuestas enlazan sus fuentes.</p>}
  <form onSubmit={enviar} className="mt-5 grid gap-3 rounded-2xl bg-white p-4">
   <label className="grid gap-1 text-[13px]">Qué necesitas<select value={modo} disabled={pendiente} onChange={e=>{setModo(e.target.value);solicitud.current=null;}} className="min-h-11 rounded-xl bg-[#f4f1eb] px-3 text-[16px]"><option value="consultar">Consultar información</option><option value="encargar">Encargar una acción interna</option></select></label>
   <label className="grid gap-1 text-[13px]">Hablar con<select value={agente} disabled={pendiente} onChange={e=>{setAgente(e.target.value);solicitud.current=null;}} className="min-h-11 rounded-xl bg-[#f4f1eb] px-3 text-[16px]">{agentes.map(a=><option key={a.id} value={a.id}>{a.nombre}</option>)}</select></label>
   <label className="grid gap-1 text-[13px]">Tu consulta<textarea value={texto} onChange={e=>{setTexto(e.target.value);solicitud.current=null;}} disabled={pendiente} maxLength={modo==='encargar'?3000:4000} rows={3} required placeholder="¿Qué avanzó? ¿Por qué se eligió esta dirección?" className="min-w-0 rounded-xl bg-[#f4f1eb] p-3 text-[16px]"/></label>
   <p className="text-[12px] text-medio">{modo==='consultar'?'Consultar no modifica el proyecto.':'El encargo puede pedir ajustes, verificar, pausar, reanudar o continuar. No publica ni aprueba entregas.'}</p>
   <button disabled={pendiente} className="min-h-12 rounded-full bg-tinta px-5 text-[14px] text-white disabled:opacity-60">{pendiente?'Atendiendo tu solicitud…':modo==='consultar'?'Preguntar':'Encargar'}</button>
   {error&&<p role="alert" className="text-[13px] text-[#a3260f]">{error}</p>}
  </form>
 </section>;
}
