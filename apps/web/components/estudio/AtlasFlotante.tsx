'use client';
// Atlas, una sola conversación para todo el estudio (sistema/106).
// Le escribes normal; él entiende qué es y para quién, pregunta una sola cosa si hace falta, confirma antes de gastar
// y responde con tarjetas que se pueden usar. Arriba, lo que te toca hoy. Cada uno (Jay, Luna) tiene su conversación.
// Si vas rápido: / acciones, # cliente, @ quién lo hace. En celular se abre desde la barra de abajo.
import {useEffect,useMemo,useRef,useState} from 'react';
import {flushSync} from 'react-dom';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import {ACCIONES_CAJA,AGENTES_CAJA,ORDEN_ACCIONES,ORDEN_AGENTES,accionDe,agenteDe,clientesDe,leerCaja,marcaEnCurso,ponerSugerencia,type ClienteCaja} from '@anonymo/pipeline/src/clientes/caja.ts';
import type {MensajeHilo,Eleccion} from '@/lib/atlas-hilo';
import type {Tarjeta} from '@/lib/caja';
import {Cara} from './piezas';

interface ClienteDatos extends ClienteCaja {tareas:Record<string,{listo:boolean;faltan:string[]}>;prospecto:boolean;proyecto?:string}
interface Datos {yo:'jay'|'luna';hilo:MensajeHilo[];hoy:{titulo:string;detalle:string;href:string}[];clientes:ClienteDatos[];proyectos:{id:string;cliente:string;estado:string}[]}
interface Sugerencia {valor:string;titulo:string;detalle:string}
interface Vivo {estado:string;vivo?:{tarea?:string;fase?:string;palabras?:number;fin?:string}}

const FASES:Record<string,string>={preparando:'preparando',esperando:'esperando a la IA',pensando:'pensando',buscando:'buscando',escribiendo:'escribiendo',revisando:'revisando'};
const AGENTE_NOMBRE=(tarea?:string)=>{const a=tarea?.split('.')[1];return a?a[0].toUpperCase()+a.slice(1):'El equipo';};
const nuevoId=()=>(globalThis.crypto?.randomUUID?.()??String(Date.now())+Math.random().toString(16).slice(2));

/** El avance en vivo de un proyecto que quedó trabajando, en una sola línea. */
function Avance({id}:{id:string}){
 const [v,setV]=useState<Vivo|null>(null),[fin,setFin]=useState(false);
 useEffect(()=>{let vivo=true,n=0;const t0=Date.now();
  const mirar=async()=>{try{const r=await fetch(`/estudio/${id}/vivo`,{cache:'no-store'});if(r.ok){const d=await r.json() as Vivo;if(!vivo)return;setV(d);const trabaja=d.vivo&&!d.vivo.fin;if(!trabaja&&n>1&&d.estado!=='en-curso'){setFin(true);return;}}}catch{}
   n++;if(vivo&&Date.now()-t0<15*60_000)setTimeout(mirar,n<3?2500:5000);};
  void mirar();return()=>{vivo=false;};},[id]);
 if(fin)return <p data-avance className="mt-2 text-[12px] text-medio">Listo por ahora: el proyecto quedó {v?.estado==='esperando'?'esperando tu revisión':v?.estado==='terminado'?'terminado':'en pausa'}. <Link href={`/estudio/${id}`} className="underline">Ver el proyecto</Link></p>;
 const w=v?.vivo&&!v.vivo.fin?v.vivo:undefined;
 return <p data-avance role="status" className="mt-2 flex items-center gap-2 text-[12px] text-medio"><span aria-hidden="true" className="h-2 w-2 animate-pulse bg-[#F0602A]"/>{w?`${AGENTE_NOMBRE(w.tarea)} está ${FASES[w.fase??'']??'trabajando'}${w.palabras?` · ${w.palabras} palabras`:''}`:'El equipo está en eso…'}</p>;
}

function VerTarjeta({t,copiar,copiado,cerrar}:{t:Tarjeta;copiar:(x:string)=>void;copiado:string;cerrar:()=>void}){
 return <div data-tarjeta className="mt-1 border border-black/12 bg-white p-3">
  <p className="text-[13.5px] font-medium">{t.titulo}</p>
  {t.texto&&<p className="mt-1.5 whitespace-pre-wrap break-words text-[13.5px] leading-relaxed text-[#3d3a36]">{t.texto}</p>}
  {!!t.botones?.length&&<div className="mt-2.5 flex flex-wrap gap-2">{t.botones.map((b,i)=>b.copiar!==undefined?
   <button key={i} type="button" onClick={()=>copiar(b.copiar!)} className="min-h-11 border border-black/20 px-3 text-[12.5px] md:min-h-9">{copiado===b.copiar?'Copiado':b.texto}</button>:
   b.externo?<a key={i} href={b.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center border border-black/20 px-3 text-[12.5px] md:min-h-9">{b.texto} ↗</a>:
   <Link key={i} href={b.href??'#'} onClick={cerrar} className="inline-flex min-h-11 items-center border border-black/20 px-3 text-[12.5px] md:min-h-9">{b.texto}</Link>)}</div>}
 </div>;
}

export function AtlasFlotante({proyectos}:{proyectos:{id:string;nombre:string}[]}){
 const ruta=usePathname();
 const [abierto,setAbierto]=useState(false),[listo,setListo]=useState(false),[datos,setDatos]=useState<Datos|null>(null),[errorCarga,setErrorCarga]=useState(false);
 const [hilo,setHilo]=useState<MensajeHilo[]>([]),[texto,setTexto]=useState(''),[cursor,setCursor]=useState(0),[elegida,setElegida]=useState(0),[callar,setCallar]=useState(false);
 const [trabajando,setTrabajando]=useState(false),[enviado,setEnviado]=useState(''),[resueltos,setResueltos]=useState<Record<string,string>>({}),[copiado,setCopiado]=useState('');
 const [quitado,setQuitado]=useState(''),[vaciar,setVaciar]=useState(false),[oye,setOye]=useState(false),[vista,setVista]=useState<{maxHeight:string;bottom?:number}|undefined>();
 const boton=useRef<HTMLButtonElement>(null),panel=useRef<HTMLDivElement>(null),caja=useRef<HTMLTextAreaElement>(null),hiloRef=useRef<HTMLDivElement>(null),volver=useRef<HTMLElement|null>(null);
 const voz=useRef<{stop:()=>void}|null>(null);
 useEffect(()=>setListo(true),[]);

 // El contexto sale de la página: un proyecto (/estudio/<id>…) o un cliente (/estudio/cliente/<id>). Se quita con un toque.
 const partes=ruta.split('/');
 const ctxProyecto=partes[1]==='estudio'&&proyectos.some(p=>p.id===partes[2])?partes[2]:undefined;
 const ctxCliente=partes[2]==='cliente'&&partes[3]?partes[3]:undefined;
 // Fuera de un proyecto o cliente, sigue el último cliente del que se habló (como antes en la caja).
 const ultimo=[...hilo].reverse().find(m=>m.de==='atlas'&&m.cliente)?.cliente;
 const ctxSuave=!ctxProyecto&&!ctxCliente&&ultimo?ultimo:undefined;
 const clave=ctxProyecto?`p:${ctxProyecto}`:ctxCliente?`c:${ctxCliente}`:ctxSuave?`u:${ctxSuave}`:'';
 const contexto:{proyecto?:string;cliente?:string}=clave&&quitado!==clave?{proyecto:ctxProyecto,cliente:ctxCliente??ctxSuave}:{};
 const nombreCtx=ctxProyecto?proyectos.find(p=>p.id===ctxProyecto)?.nombre:(ctxCliente??ctxSuave)?datos?.clientes.find(c=>c.id===(ctxCliente??ctxSuave))?.nombre??(ctxCliente??ctxSuave):undefined;

 const cargar=()=>{setErrorCarga(false);fetch('/estudio/atlas/hablar',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then((d:Datos)=>{setDatos(d);setHilo(d.hilo);}).catch(()=>setErrorCarga(true));};
 const cerrar=()=>{voz.current?.stop();setAbierto(false);requestAnimationFrame(()=>(volver.current??boton.current)?.focus());};
 const abrir=()=>{volver.current=document.activeElement as HTMLElement|null;setAbierto(true);cargar();};
 useEffect(()=>{const recibir=()=>abrir();window.addEventListener('anonymo:atlas',recibir);return()=>window.removeEventListener('anonymo:atlas',recibir);});
 useEffect(()=>{if(abierto)requestAnimationFrame(()=>caja.current?.focus());},[abierto,datos]);
 useEffect(()=>{hiloRef.current?.scrollTo({top:hiloRef.current.scrollHeight});},[hilo.length,trabajando,abierto]);
 useEffect(()=>{if(!abierto)return;const medir=()=>{const vv=window.visualViewport;if(!vv||window.innerWidth>=1024){setVista(undefined);return;}const teclado=vv.height<window.innerHeight*.8;setVista({maxHeight:Math.max(180,vv.height-(teclado?24:112))+'px',...(teclado?{bottom:Math.max(8,window.innerHeight-vv.height-vv.offsetTop+8)}:{})});};medir();window.visualViewport?.addEventListener('resize',medir);window.addEventListener('resize',medir);return()=>{window.visualViewport?.removeEventListener('resize',medir);window.removeEventListener('resize',medir);};},[abierto]);

 // Las marcas: lo que se sugiere mientras se escribe y lo que se entendió, antes de mandar.
 const clientes=datos?.clientes??[];
 const conMarcas=/(^|\s)[#/@][^\s]/.test(texto);
 // El último cliente del que se habló solo se usa si la acción necesita un cliente; el de la página, siempre.
 const suave=!!ctxSuave&&contexto.cliente===ctxSuave;
 const lectura=useMemo(()=>{const l=leerCaja(texto,clientes,suave?undefined:contexto.cliente);return suave&&!l.cliente&&l.accion&&ACCIONES_CAJA[l.accion].conCliente?{...l,cliente:contexto.cliente}:l;},[texto,clientes,contexto.cliente,suave]);
 const cliente=clientes.find(c=>c.id===lectura.cliente);
 const def=lectura.accion?ACCIONES_CAJA[lectura.accion]:undefined;
 const faltan=conMarcas&&def?.tarea&&cliente?cliente.tareas[def.tarea]?.faltan??[]:[];
 const enCurso=callar?undefined:marcaEnCurso(texto,cursor);
 const sugerencias:Sugerencia[]=useMemo(()=>{
  if(!enCurso)return [];const w=enCurso.palabra;
  if(enCurso.marca==='@')return ORDEN_AGENTES.filter(a=>!w||agenteDe(w)===a||a.startsWith(w.toLowerCase())).map(a=>({valor:`@${AGENTES_CAJA[a].nombre}`,titulo:AGENTES_CAJA[a].nombre,detalle:AGENTES_CAJA[a].rol}));
  if(enCurso.marca==='/')return ORDEN_ACCIONES.filter(a=>!w||accionDe(w)===a||a.startsWith(w.toLowerCase())).map(a=>({valor:`/${a}`,titulo:ACCIONES_CAJA[a].nombre,detalle:`${AGENTES_CAJA[ACCIONES_CAJA[a].agente].nombre} · ${ACCIONES_CAJA[a].ayuda}`}));
  return (w?clientesDe(w,clientes):clientes).slice(0,8).map(c=>({valor:`#${c.id}`,titulo:c.nombre,detalle:c.prospecto?'Cliente nuevo de Imán':c.proyecto?'Con proyecto':'Con ficha'}));
 },[enCurso?.marca,enCurso?.palabra,clientes]); // eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>setElegida(0),[enCurso?.marca,enCurso?.palabra]);
 const poner=(valor:string)=>{const r=ponerSugerencia(texto,cursor,valor);flushSync(()=>{setTexto(r.texto);setCursor(r.cursor);});caja.current?.focus();caja.current?.setSelectionRange(r.cursor,r.cursor);};
 const sinQuien=!!def?.conCliente&&!cliente&&!contexto.proyecto;
 const bloqueado=conMarcas&&(lectura.dudas.length>0||faltan.length>0||sinQuien);

 async function mandar(cuerpo:{texto?:string;eleccion?:Eleccion;confirmado?:boolean;etiqueta?:string},muestra:string,limpiar=false){
  if(trabajando)return;setTrabajando(true);setEnviado(muestra);
  try{
   const r=await fetch('/estudio/atlas/hablar',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:nuevoId(),contexto:{...contexto,suave},...cuerpo})});
   const d=await r.json().catch(()=>({error:'No hubo respuesta.'}));
   if(!r.ok||!d.mensajes)throw new Error(d.error??'No hubo respuesta.');
   setHilo(h=>[...h,...d.mensajes]);
   if(limpiar){setTexto('');setCursor(0);}
  }catch(e){setHilo(h=>[...h,{id:nuevoId(),fecha:new Date().toISOString(),de:'yo',texto:muestra},{id:nuevoId(),fecha:new Date().toISOString(),de:'atlas',error:`${(e as Error).message||'No hubo conexión.'} Lo escrito sigue en la caja: vuelve a intentar.`}]);}
  finally{setTrabajando(false);setEnviado('');requestAnimationFrame(()=>caja.current?.focus());}
 }
 const enviar=()=>{const t=texto.trim();if(!t||bloqueado)return;void mandar({texto:t},t,true);};
 const tecla=(e:React.KeyboardEvent<HTMLTextAreaElement>)=>{
  // Si lo escrito ya es justo la sugerencia («/muestra» completo), Enter manda en vez de volver a ponerla.
  const completa=!!enCurso&&sugerencias.some(x=>x.valor.toLowerCase()===(enCurso.marca+enCurso.palabra).toLowerCase());
  if(sugerencias.length&&!(completa&&e.key==='Enter')){
   if(e.key==='ArrowDown'){e.preventDefault();setElegida(i=>(i+1)%sugerencias.length);return;}
   if(e.key==='ArrowUp'){e.preventDefault();setElegida(i=>(i-1+sugerencias.length)%sugerencias.length);return;}
   if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();poner(sugerencias[elegida]!.valor);return;}
   if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setCallar(true);return;}
  }
  if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();enviar();}
 };
 const copiar=async(t:string)=>{try{await navigator.clipboard.writeText(t);setCopiado(t);setTimeout(()=>setCopiado(''),2000);}catch{setCopiado('');}};

 // Dictar: el reconocimiento de voz del navegador, si lo tiene (Chrome, Safari). Si no, el botón no aparece.
 const [puedeVoz,setPuedeVoz]=useState(false);
 useEffect(()=>{const w=window as unknown as {SpeechRecognition?:unknown;webkitSpeechRecognition?:unknown};setPuedeVoz(!!(w.SpeechRecognition||w.webkitSpeechRecognition));},[]);
 const dictar=()=>{
  if(oye){voz.current?.stop();return;}
  const w=window as unknown as Record<string,new()=>{lang:string;interimResults:boolean;continuous:boolean;onresult:(e:{results:ArrayLike<ArrayLike<{transcript:string}>&{isFinal:boolean}>})=>void;onend:()=>void;onerror:()=>void;start:()=>void;stop:()=>void}>;
  const R=w.SpeechRecognition??w.webkitSpeechRecognition;if(!R)return;
  const r=new R();r.lang='es-EC';r.interimResults=true;r.continuous=false;const base=texto?texto.trimEnd()+' ':'';
  r.onresult=e=>{let t='';for(let i=0;i<e.results.length;i++)t+=e.results[i]![0]!.transcript;setTexto(base+t);setCursor((base+t).length);};
  r.onend=()=>{setOye(false);voz.current=null;caja.current?.focus();};r.onerror=()=>{setOye(false);voz.current=null;};
  voz.current=r;setOye(true);r.start();
 };

 const resolver=(id:string,como:string)=>setResueltos(r=>({...r,[id]:como}));
 const hoy=datos?.hoy??[];
 const chip='inline-flex min-h-8 items-center gap-1 border border-black/15 bg-white px-2 text-[12px]';

 return <>
  <button ref={boton} disabled={!listo} aria-busy={!listo} hidden type="button" aria-hidden="true" tabIndex={-1} aria-label="Atlas" onClick={abrir} className="hidden"/>
  <div ref={panel} id="atlas-ventana" hidden={!abierto} role="dialog" aria-modal="false" aria-label="Chat con Atlas" style={{...vista,...(vista?{maxHeight:`min(calc(100dvh - 112px), ${vista.maxHeight})`}:{}),display:abierto?'flex':'none'}} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();cerrar();}}} className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] left-3 right-3 z-[45] flex h-[680px] max-h-[calc(100dvh-112px)] flex-col overflow-hidden border border-black/15 bg-[#f8f5ef] text-[#1a1816] shadow-[0_20px_80px_-20px_rgba(20,15,10,.45)] lg:bottom-6 lg:left-auto lg:right-6 lg:w-[420px] lg:max-h-[calc(100dvh-48px)]">
   <header className="flex shrink-0 items-center gap-2.5 border-b border-black/10 px-4 py-2.5">
    <Cara id="atlas" tam={34} titulo={false}/>
    <div className="min-w-0 flex-1"><h2 className="text-[15px] font-medium">Atlas</h2><p className="truncate text-[11.5px] text-medio">{datos?`Hablas como ${datos.yo==='jay'?'Jay':'Luna'}`:'Tu equipo, a una conversación.'}</p></div>
    {hilo.length>0&&<button type="button" onClick={()=>setVaciar(v=>!v)} aria-expanded={vaciar} className="min-h-11 px-2 text-[12px] text-medio underline-offset-4 hover:underline">Empezar de cero</button>}
    <button type="button" aria-label="Cerrar chat de Atlas" onClick={cerrar} className="grid h-11 w-11 place-items-center text-xl hover:bg-black/5">×</button>
   </header>
   {vaciar&&<div role="alertdialog" aria-label="Empezar de cero" className="shrink-0 border-b border-black/10 bg-white px-4 py-3 text-[13px]"><p>Se borra solo esta conversación. Los proyectos, las fichas y lo que hizo el equipo no se tocan.</p><div className="mt-2 flex gap-2"><button type="button" className="min-h-11 bg-[#1a1816] px-3 text-white" onClick={async()=>{setVaciar(false);const r=await fetch('/estudio/atlas/hablar',{method:'DELETE'});if(r.ok)setHilo([]);}}>Borrar la conversación</button><button type="button" className="min-h-11 border border-black/20 px-3" onClick={()=>setVaciar(false)}>Cancelar</button></div></div>}

   {/* Lo primero que dice Atlas: lo que te toca hoy, siempre a la vista bajo el encabezado (sistema/106). */}
   {datos&&hoy.length>0&&<details data-hoy open={!hilo.length} className="shrink-0 border-b border-black/10 bg-white px-4 text-[13px]">
    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden"><span><span className="font-medium">Hoy te toca · {hoy.length}</span><span className="text-medio"> — {hoy[0]!.titulo}{hoy.length>1?' y más':''}</span></span><span aria-hidden="true" className="text-medio">▾</span></summary>
    <ul className="max-h-48 overflow-y-auto pb-2">{hoy.map((a,i)=><li key={i} className="border-t border-black/8"><Link href={a.href} onClick={cerrar} className="flex min-h-11 flex-col justify-center py-1.5"><span className="font-medium">{a.titulo}</span><span className="line-clamp-1 text-[12px] text-medio">{a.detalle}</span></Link></li>)}</ul>
   </details>}
   <div ref={hiloRef} role="log" aria-label="Conversación con Atlas" aria-live="polite" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
    {errorCarga&&<div role="alert" className="mb-3 text-[13px]"><p>No pude abrir la conversación. Lo guardado se conserva.</p><button type="button" className="min-h-11 underline" onClick={cargar}>Volver a intentar</button></div>}
    {!datos&&!errorCarga&&<p role="status" className="text-[13px] text-medio">Abriendo la conversación…</p>}
    {datos&&!hilo.length&&<div className="text-[13.5px] leading-relaxed text-medio">
     <p className="text-[15px] text-[#1a1816]">Escríbeme normal, como a una persona.</p>
     <p className="mt-2">«¿Cómo va la web de Clínica Sonrisa?» · «que el botón diga Agenda tu cita» · «un reel para el día de la madre» · «¿qué sabes de Café Lento?» · «¿qué me toca hoy?»</p>
     <p className="mt-2">Antes de gastar te pregunto. Si vas rápido: / para la acción, # para el cliente y @ para quién lo hace: Faro, Imán o Atlas.</p>
    </div>}
    {hilo.map(m=>m.de==='yo'?
     <p key={m.id} className="mb-3 ml-auto w-fit max-w-[88%] whitespace-pre-wrap break-words bg-[#e9e2d5] px-3 py-2 text-[13.5px]">{m.texto}</p>:
     <article key={m.id} className="mb-4 min-w-0">
      {m.entendi&&<p data-entendi className="mb-1 text-[11.5px] text-medio">{m.entendi}</p>}
      {m.texto&&<p className="whitespace-pre-wrap text-[13.5px] leading-relaxed">{m.texto}</p>}
      {m.opciones&&<div className="mt-2 flex flex-wrap gap-2">{m.opciones.map((o,i)=><button key={i} type="button" disabled={!!resueltos[m.id]||trabajando} onClick={()=>{resolver(m.id,o.texto);void mandar({eleccion:o.eleccion,etiqueta:o.texto},o.texto);}} className="min-h-11 border border-black/25 bg-white px-3 text-[13px] disabled:opacity-50 md:min-h-9">{o.texto}</button>)}</div>}
      {m.tarjeta&&<VerTarjeta t={m.tarjeta} copiar={copiar} copiado={copiado} cerrar={cerrar}/>}
      {m.confirmar&&(resueltos[m.id]?<p className="mt-1 text-[12px] text-medio">{resueltos[m.id]}</p>:
       <div role="alertdialog" aria-label="Confirmar" className="mt-1 border border-[#FFB21A] bg-white p-3"><p className="text-[13.5px] leading-relaxed">{m.confirmar.texto}</p>
        <div className="mt-2.5 flex gap-2"><button type="button" disabled={trabajando} onClick={()=>{resolver(m.id,'Hecho.');void mandar({eleccion:m.confirmar!.eleccion,confirmado:true},'Sí, hazlo');}} className="min-h-11 bg-[#1a1816] px-4 text-[13px] text-white md:min-h-9">Sí, hazlo</button><button type="button" onClick={()=>resolver(m.id,'Cancelado: no se gastó nada.')} className="min-h-11 border border-black/20 px-4 text-[13px] md:min-h-9">Cancelar</button></div></div>)}
      {m.error&&<div data-tarjeta className="mt-1"><p role="alert" className="text-[13px] text-[#a3260f]">{m.error}</p>{m.ficha&&<Link href={m.ficha} onClick={cerrar} className="inline-flex min-h-11 items-center text-[12.5px] underline">Completar en su ficha</Link>}</div>}
      {m.seguir&&<Avance id={m.seguir}/>}
     </article>)}
    {trabajando&&<><p className="mb-3 ml-auto w-fit max-w-[88%] whitespace-pre-wrap break-words bg-[#e9e2d5] px-3 py-2 text-[13.5px]">{enviado}</p><p role="status" className="mb-3 flex items-center gap-2 text-[12.5px] text-medio"><span aria-hidden="true" className="h-2 w-2 animate-pulse bg-[#1a1816]"/>Atlas está en eso…</p></>}
   </div>

   <form onSubmit={e=>{e.preventDefault();enviar();}} className="relative shrink-0 border-t border-black/10 bg-[#f8f5ef] px-3 pb-3 pt-2">
    {sugerencias.length>0&&<div role="listbox" aria-label="Sugerencias" className="absolute bottom-full left-3 right-3 mb-1 max-h-60 overflow-y-auto border border-black/15 bg-white shadow-lg">{sugerencias.map((s,i)=><div key={s.valor} role="option" aria-selected={i===elegida} onMouseDown={e=>{e.preventDefault();poner(s.valor);}} className={`cursor-pointer px-3 py-2 text-[13px] ${i===elegida?'bg-black/5':''}`}><span className="font-medium">{s.titulo}</span><br/><span className="text-[12px] text-medio">{s.detalle}</span></div>)}</div>}
    <div className="mb-1.5 flex min-h-8 flex-wrap items-center gap-1.5">
     {nombreCtx&&quitado!==clave&&<span className={chip} data-contexto>{nombreCtx}<button type="button" aria-label={`Quitar ${nombreCtx} del contexto`} onClick={()=>setQuitado(clave)} className="-mr-1 grid h-7 w-7 place-items-center">×</button></span>}
     {conMarcas&&lectura.accion&&!lectura.dudas.length&&<span data-entendi className="text-[11.5px] text-medio">Hace {AGENTES_CAJA[ACCIONES_CAJA[lectura.accion].agente].nombre} · {ACCIONES_CAJA[lectura.accion].nombre}{cliente?<> · Para {cliente.nombre}</>:null}</span>}
     {!conMarcas&&!nombreCtx&&<span className="text-[11.5px] text-medio">/ acciones · # cliente</span>}
    </div>
    {conMarcas&&(lectura.dudas.length>0||faltan.length>0||sinQuien)&&<p data-aviso-caja role="alert" className="mb-1.5 text-[12px] text-[#a3260f]">{lectura.dudas[0]??(faltan.length?<>A {cliente!.nombre} le falta: {faltan.join(', ')}. <Link href={`/estudio/cliente/${cliente!.id}#saber`} onClick={cerrar} className="underline">Completar en su ficha</Link></>:`Para «${def!.nombre}» dime para quién: escribe # y elige el cliente.`)}</p>}
    <div className="flex items-end gap-1.5 border border-black/20 bg-white p-1.5 focus-within:border-black/60">
     <label className="min-w-0 flex-1"><span className="sr-only">Escríbele a Atlas</span>
      <textarea id="caja-atlas" ref={caja} rows={1} value={texto} disabled={!datos} placeholder={oye?'Te escucho…':'Escríbele a Atlas…'} onChange={e=>{setTexto(e.target.value);setCursor(e.target.selectionStart);setCallar(false);}} onSelect={e=>setCursor(e.currentTarget.selectionStart)} onKeyDown={tecla} style={{outline:'none'}} className="block max-h-36 min-h-10 w-full resize-none bg-transparent px-2 py-2 text-[16px] leading-snug md:text-[14px]"/>
     </label>
     {puedeVoz&&<button type="button" onClick={dictar} aria-pressed={oye} aria-label={oye?'Dejar de dictar':'Dictar'} className={`grid h-11 w-11 shrink-0 place-items-center ${oye?'bg-[#F0602A] text-white':'text-medio hover:bg-black/5'}`}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="9" y="3" width="6" height="11"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></button>}
     <button type="submit" disabled={trabajando||!texto.trim()||bloqueado} aria-busy={trabajando} className="min-h-11 shrink-0 bg-[#1a1816] px-4 text-[13px] text-white disabled:opacity-40">{trabajando?'…':'Enviar'}</button>
    </div>
   </form>
  </div>
 </>;
}
