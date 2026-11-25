'use client';
// Atlas, una sola conversación para todo el estudio (sistema/106; ventana nueva en sistema/108).
// En computadora vive pegado a la derecha y la página se corre: puedes tocar un enlace y el chat sigue abierto.
// En celular es una hoja que se cierra al ir a otra página, porque taparía lo que abriste.
// Le escribes normal; entiende qué es y para quién (también si nombras a un cliente sin marca), confirma antes de
// gastar y responde corto, con botones que se pueden usar. Si vas rápido: @ cliente, / acción.
import {useEffect,useMemo,useRef,useState} from 'react';
import {flushSync} from 'react-dom';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import {ACCIONES_CAJA,AGENTES_CAJA,ORDEN_ACCIONES,accionDe,clientesDe,leerCaja,marcaEnCurso,ponerSugerencia,type ClienteCaja} from '@anonymo/pipeline/src/clientes/caja.ts';
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
/** Quién responde: el primer nombre de la línea «Faro · Guion de video · Unmake». */
const QUIEN:Record<string,string>={Faro:'faro','Imán':'iman',Atlas:'atlas'};
const quienDe=(entendi?:string)=>QUIEN[entendi?.split(' · ')[0]??'']??'atlas';
const ESCRITORIO=1024;
const enCelular=()=>typeof window!=='undefined'&&window.innerWidth<ESCRITORIO;

// Piezas de estilo, para que todo se vea igual.
const btn='inline-flex min-h-11 items-center justify-center gap-1.5 px-3 text-[13px] transition-colors md:min-h-9 disabled:opacity-45';
const btnPrincipal=`${btn} bg-[#1a1816] text-white hover:bg-black`;
const btnBorde=`${btn} border border-[#d3cac0] bg-white text-[#1a1816] hover:border-[#1a1816]`;

function Icono({d,tam=18}:{d:string;tam?:number}){return <svg aria-hidden="true" width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="square"><path d={d}/></svg>;}

/** El avance en vivo de un proyecto que quedó trabajando, en una sola línea. */
function Avance({id,irA}:{id:string;irA:()=>void}){
 const [v,setV]=useState<Vivo|null>(null),[fin,setFin]=useState(false);
 useEffect(()=>{let vivo=true,n=0;const t0=Date.now();
  const mirar=async()=>{try{const r=await fetch(`/estudio/${id}/vivo`,{cache:'no-store'});if(r.ok){const d=await r.json() as Vivo;if(!vivo)return;setV(d);const trabaja=d.vivo&&!d.vivo.fin;if(!trabaja&&n>1&&d.estado!=='en-curso'){setFin(true);return;}}}catch{}
   n++;if(vivo&&Date.now()-t0<15*60_000)setTimeout(mirar,n<3?2500:5000);};
  void mirar();return()=>{vivo=false;};},[id]);
 if(fin)return <p data-avance className="mt-2 text-[12.5px] text-medio">Listo por ahora: el proyecto quedó {v?.estado==='esperando'?'esperando tu revisión':v?.estado==='terminado'?'terminado':'en pausa'}. <Link href={`/estudio/${id}`} onClick={irA} className="underline underline-offset-2">Ver el proyecto</Link></p>;
 const w=v?.vivo&&!v.vivo.fin?v.vivo:undefined;
 return <p data-avance role="status" className="mt-2 flex items-center gap-2 text-[12.5px] text-medio"><span aria-hidden="true" className="h-2 w-2 animate-pulse bg-[#F0602A]"/>{w?`${AGENTE_NOMBRE(w.tarea)} está ${FASES[w.fase??'']??'trabajando'}${w.palabras?` · ${w.palabras} palabras`:''}`:'El equipo está en eso…'}</p>;
}

function VerTarjeta({t,copiar,copiado,irA}:{t:Tarjeta;copiar:(x:string)=>void;copiado:string;irA:()=>void}){
 return <div data-tarjeta className="border border-[#e3dcd2] bg-white">
  <div className="px-3.5 pb-3 pt-3">
   <p className="text-[13.5px] font-medium leading-snug">{t.titulo}</p>
   {t.texto&&<p className="mt-1.5 whitespace-pre-wrap break-words text-[13.5px] leading-[1.55] text-[#3d3a36]">{t.texto}</p>}
  </div>
  {!!t.botones?.length&&<div className="flex flex-wrap gap-2 border-t border-[#efe9e1] px-3.5 py-2.5">{t.botones.map((b,i)=>{const cls=i===0?btnPrincipal:btnBorde;return b.copiar!==undefined?
   <button key={i} type="button" onClick={()=>copiar(b.copiar!)} className={cls}>{copiado===b.copiar?'Copiado':b.texto}</button>:
   b.externo?<a key={i} href={b.href} target="_blank" rel="noopener noreferrer" className={cls}>{b.texto}<span aria-hidden="true">↗</span></a>:
   <Link key={i} href={b.href??'#'} onClick={irA} className={cls}>{b.texto}</Link>;})}</div>}
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
 // Fuera de un proyecto o cliente, sigue el último cliente del que se habló.
 const ultimo=[...hilo].reverse().find(m=>m.de==='atlas'&&m.cliente)?.cliente;
 const ctxSuave=!ctxProyecto&&!ctxCliente&&ultimo?ultimo:undefined;
 const clave=ctxProyecto?`p:${ctxProyecto}`:ctxCliente?`c:${ctxCliente}`:ctxSuave?`u:${ctxSuave}`:'';
 const contexto:{proyecto?:string;cliente?:string}=clave&&quitado!==clave?{proyecto:ctxProyecto,cliente:ctxCliente??ctxSuave}:{};
 const nombreCtx=ctxProyecto?proyectos.find(p=>p.id===ctxProyecto)?.nombre:(ctxCliente??ctxSuave)?datos?.clientes.find(c=>c.id===(ctxCliente??ctxSuave))?.nombre??(ctxCliente??ctxSuave):undefined;

 const cargar=()=>{setErrorCarga(false);fetch('/estudio/atlas/hablar',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then((d:Datos)=>{setDatos(d);setHilo(d.hilo);}).catch(()=>setErrorCarga(true));};
 const cerrar=()=>{voz.current?.stop();setAbierto(false);try{sessionStorage.removeItem('atlas-abierto');}catch{}requestAnimationFrame(()=>(volver.current??boton.current)?.focus());};
 const abrir=()=>{volver.current=document.activeElement as HTMLElement|null;setAbierto(true);cargar();};
 /** Al tocar un enlace del chat: en computadora el chat sigue abierto al lado; en celular se cierra para ver la página. */
 const irA=()=>{if(enCelular())cerrar();};
 useEffect(()=>{const recibir=()=>abrir();window.addEventListener('anonymo:atlas',recibir);return()=>window.removeEventListener('anonymo:atlas',recibir);});
 // En computadora, si lo dejaste abierto, sigue abierto al recargar.
 useEffect(()=>{try{if(!enCelular()&&sessionStorage.getItem('atlas-abierto')==='1'){setAbierto(true);cargar();}}catch{}},[]); // eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{try{if(abierto)sessionStorage.setItem('atlas-abierto','1');}catch{}
  // La página se corre a la izquierda mientras Atlas está abierto en computadora (globals.css).
  document.documentElement.toggleAttribute('data-atlas-abierto',abierto);
  return()=>document.documentElement.removeAttribute('data-atlas-abierto');},[abierto]);
 useEffect(()=>{if(abierto)requestAnimationFrame(()=>caja.current?.focus());},[abierto,datos]);
 useEffect(()=>{hiloRef.current?.scrollTo({top:hiloRef.current.scrollHeight});},[hilo.length,trabajando,abierto]);
 useEffect(()=>{if(!abierto)return;const medir=()=>{const vv=window.visualViewport;if(!vv||window.innerWidth>=ESCRITORIO){setVista(undefined);return;}const teclado=vv.height<window.innerHeight*.8;setVista({maxHeight:Math.max(180,vv.height-(teclado?24:112))+'px',...(teclado?{bottom:Math.max(8,window.innerHeight-vv.height-vv.offsetTop+8)}:{})});};medir();window.visualViewport?.addEventListener('resize',medir);window.addEventListener('resize',medir);return()=>{window.visualViewport?.removeEventListener('resize',medir);window.removeEventListener('resize',medir);};},[abierto]);

 // Las marcas: lo que se sugiere mientras se escribe y lo que se entendió, antes de mandar.
 const clientes=datos?.clientes??[];
 const conMarcas=/(^|\s)[#/@][^\s]/.test(texto);
 const suave=!!ctxSuave&&contexto.cliente===ctxSuave;
 const lectura=useMemo(()=>{const l=leerCaja(texto,clientes,suave?undefined:contexto.cliente);return suave&&!l.cliente&&l.accion&&ACCIONES_CAJA[l.accion].conCliente?{...l,cliente:contexto.cliente}:l;},[texto,clientes,contexto.cliente,suave]);
 const cliente=clientes.find(c=>c.id===lectura.cliente);
 const def=lectura.accion?ACCIONES_CAJA[lectura.accion]:undefined;
 const faltan=conMarcas&&def?.tarea&&cliente?cliente.tareas[def.tarea]?.faltan??[]:[];
 const enCurso=callar?undefined:marcaEnCurso(texto,cursor);
 const sugerencias:Sugerencia[]=useMemo(()=>{
  if(!enCurso)return [];const w=enCurso.palabra;
  if(enCurso.marca==='/')return ORDEN_ACCIONES.filter(a=>!w||accionDe(w)===a||a.startsWith(w.toLowerCase())).map(a=>({valor:`/${a}`,titulo:ACCIONES_CAJA[a].nombre,detalle:`${AGENTES_CAJA[ACCIONES_CAJA[a].agente].nombre} · ${ACCIONES_CAJA[a].ayuda}`}));
  // @ y # son para quién: los clientes, con su proyecto si tienen (sistema/108).
  return (w?clientesDe(w,clientes):clientes).slice(0,8).map(c=>({valor:`${enCurso.marca}${c.id}`,titulo:c.nombre,detalle:c.prospecto?'Cliente nuevo de Imán':c.proyecto?'Con proyecto en curso':'Con ficha'}));
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
 // La caja crece con lo escrito, hasta seis líneas.
 useEffect(()=>{const c=caja.current;if(!c)return;c.style.height='auto';c.style.height=Math.min(c.scrollHeight,144)+'px';},[texto,abierto]);

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
 const nombreYo=datos?.yo==='luna'?'Luna':'Jay';
 // Ideas para empezar, con nombres reales del estudio.
 const ideas=useMemo(()=>{const p=proyectos[0]?.nombre,c=clientes.find(x=>!x.prospecto)?.nombre;
  return ['¿Qué me toca hoy?',...(p?[`¿Cómo va ${p.split(/[(,]/)[0]!.trim()}?`]:[]),...(c?[`¿Qué sabes de ${c}?`]:[]),'Un guion de reel de 30 segundos'];},[proyectos,clientes]);
 const usarIdea=(t:string)=>{setTexto(t);setCursor(t.length);requestAnimationFrame(()=>{caja.current?.focus();caja.current?.setSelectionRange(t.length,t.length);});};

 return <>
  <button ref={boton} disabled={!listo} aria-busy={!listo} hidden type="button" aria-hidden="true" tabIndex={-1} aria-label="Atlas" onClick={abrir} className="hidden"/>
  <div ref={panel} id="atlas-ventana" hidden={!abierto} role="dialog" aria-modal="false" aria-label="Chat con Atlas" style={{...vista,...(vista?{maxHeight:`min(calc(100dvh - 112px), ${vista.maxHeight})`}:{}),display:abierto?'flex':'none'}} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();cerrar();}}}
   className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] left-2 right-2 z-[45] flex h-[680px] max-h-[calc(100dvh-112px)] flex-col overflow-hidden border border-[#d3cac0] bg-[#fbf9f6] text-[#1a1816] shadow-[0_24px_70px_-24px_rgba(20,15,10,.4)] lg:inset-y-0 lg:left-auto lg:right-0 lg:h-dvh lg:max-h-none lg:w-[420px] lg:border-y-0 lg:border-r-0 lg:shadow-none">

   {/* Encabezado: quién es, cómo hablas y dos acciones. */}
   <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[#e3dcd2] bg-white px-4">
    <span className="relative shrink-0"><Cara id="atlas" tam={30} titulo={false}/><span aria-hidden="true" className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 border-2 border-white bg-[#1FCF8F]"/></span>
    <div className="min-w-0 flex-1 leading-tight"><h2 id="titulo-chat-atlas" className="text-[14.5px] font-medium">Atlas</h2><p className="truncate text-[12px] text-medio">{datos?`Tu equipo · hablas como ${nombreYo}`:'Tu equipo, a una conversación'}</p></div>
    {hilo.length>0&&<button type="button" onClick={()=>setVaciar(v=>!v)} aria-expanded={vaciar} aria-label="Empezar de cero" title="Empezar de cero" className="grid h-11 w-11 md:h-10 md:w-10 place-items-center text-medio hover:bg-black/5 hover:text-[#1a1816]"><Icono d="M4 20h4L19 9l-4-4L4 16v4ZM13 7l4 4"/></button>}
    <button type="button" aria-label="Cerrar chat de Atlas" title="Cerrar (Esc)" onClick={cerrar} className="grid h-11 w-11 md:h-10 md:w-10 place-items-center text-medio hover:bg-black/5 hover:text-[#1a1816]"><Icono d="M6 6l12 12M18 6 6 18"/></button>
   </header>
   {vaciar&&<div role="alertdialog" aria-label="Empezar de cero" className="shrink-0 border-b border-[#e3dcd2] bg-white px-4 py-3 text-[13px]"><p className="leading-relaxed">Se borra solo esta conversación. Proyectos, fichas y entregas no se tocan.</p><div className="mt-2.5 flex gap-2"><button type="button" className={btnPrincipal} onClick={async()=>{setVaciar(false);const r=await fetch('/estudio/atlas/hablar',{method:'DELETE'});if(r.ok)setHilo([]);}}>Borrar la conversación</button><button type="button" className={btnBorde} onClick={()=>setVaciar(false)}>Cancelar</button></div></div>}

   {/* Lo que te toca hoy, siempre a la vista bajo el encabezado. */}
   {datos&&hoy.length>0&&<details data-hoy open={!hilo.length} className="group shrink-0 border-b border-[#e3dcd2] bg-[#f4efe9] px-4 text-[13px]">
    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden"><span aria-hidden="true" className="h-2 w-2 shrink-0 bg-[#F0602A]"/><span className="min-w-0 flex-1 truncate"><span className="font-medium">Hoy te toca · {hoy.length}</span><span className="text-medio"> — {hoy[0]!.titulo}{hoy.length>1?' y más':''}</span></span><span aria-hidden="true" className="text-medio transition-transform group-open:rotate-180">▾</span></summary>
    <ul className="max-h-48 overflow-y-auto pb-2">{hoy.map((a,i)=><li key={i}><Link href={a.href} onClick={irA} className="-mx-2 flex min-h-11 flex-col justify-center px-2 py-1.5 hover:bg-white"><span className="font-medium">{a.titulo}</span><span className="line-clamp-1 text-[12px] text-medio">{a.detalle}</span></Link></li>)}</ul>
   </details>}

   <div ref={hiloRef} role="log" aria-label="Conversación con Atlas" aria-live="polite" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
    {errorCarga&&<div role="alert" className="mb-3 border border-[#f3d2b3] bg-[#fff6ec] p-3 text-[13px]"><p>No pude abrir la conversación. Lo guardado se conserva.</p><button type="button" className={`${btnBorde} mt-2`} onClick={cargar}>Volver a intentar</button></div>}
    {!datos&&!errorCarga&&<p role="status" className="text-[13px] text-medio">Abriendo la conversación…</p>}
    {datos&&!hilo.length&&<div className="pt-2">
     <p className="text-[19px] font-medium tracking-tight">Hola, {nombreYo}.</p>
     <p className="mt-1 text-[13.5px] leading-relaxed text-medio">Pregúntame o pídeme algo, como a una persona. Antes de gastar en IA te pregunto.</p>
     <div className="mt-4 flex flex-col items-start gap-2">{ideas.map(t=><button key={t} type="button" onClick={()=>usarIdea(t)} className="border border-[#e3dcd2] bg-white px-3 py-2 text-left text-[13px] hover:border-[#1a1816]">{t}</button>)}</div>
    </div>}

    {hilo.map((m,i)=>{
     if(m.de==='yo')return <div key={m.id} className="mb-4 flex justify-end"><p className="max-w-[85%] whitespace-pre-wrap break-words bg-[#1a1816] px-3.5 py-2 text-[13.5px] leading-[1.5] text-white">{m.texto}</p></div>;
     const seguido=hilo[i-1]?.de==='atlas';
     return <article key={m.id} className="mb-5 flex min-w-0 gap-2.5">
      <span className="w-6 shrink-0 pt-0.5">{!seguido&&<Cara id={quienDe(m.entendi)} tam={24} titulo={false}/>}</span>
      <div className="min-w-0 flex-1 space-y-2">
       {m.entendi&&<p data-entendi className="font-mono text-[11px] leading-none text-medio">{m.entendi}</p>}
       {m.texto&&<p className="whitespace-pre-wrap text-[14px] leading-[1.55]">{m.texto}</p>}
       {m.tarjeta&&<VerTarjeta t={m.tarjeta} copiar={copiar} copiado={copiado} irA={irA}/>}
       {m.error&&<div data-tarjeta className="border border-[#f3d2b3] bg-[#fff6ec] px-3.5 py-3">
        <p role="alert" className="text-[13.5px] leading-[1.5]">{m.error}</p>
        {!!m.faltan?.length&&<ul className="mt-2 space-y-1">{m.faltan.map(f=><li key={f} className="flex items-baseline gap-2 text-[13px]"><span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 translate-y-[-2px] bg-[#F0602A]"/>{f}</li>)}</ul>}
        {(m.ficha||m.opciones?.length)&&<div className="mt-3 flex flex-wrap gap-2">
         {m.opciones?.map((o,k)=><button key={k} type="button" disabled={!!resueltos[m.id]||trabajando} onClick={()=>{resolver(m.id,o.texto);void mandar({eleccion:o.eleccion,etiqueta:o.texto},o.texto);}} className={btnPrincipal}>{o.texto}</button>)}
         {m.ficha&&<Link href={m.ficha} onClick={irA} className={m.opciones?.length?btnBorde:btnPrincipal}>Completar en su ficha</Link>}
        </div>}
       </div>}
       {m.opciones&&!m.error&&<div className="flex flex-wrap gap-2">{m.opciones.map((o,k)=><button key={k} type="button" disabled={!!resueltos[m.id]||trabajando} onClick={()=>{resolver(m.id,o.texto);void mandar({eleccion:o.eleccion,etiqueta:o.texto},o.texto);}} className={btnBorde}>{o.texto}</button>)}</div>}
       {m.confirmar&&(resueltos[m.id]?<p className="text-[12.5px] text-medio">{resueltos[m.id]}</p>:
        <div role="alertdialog" aria-label="Confirmar" className="border border-[#1a1816] bg-white px-3.5 py-3"><p className="text-[13.5px] leading-[1.55]">{m.confirmar.texto}</p>
         <div className="mt-3 flex gap-2"><button type="button" disabled={trabajando} onClick={()=>{resolver(m.id,'Hecho.');void mandar({eleccion:m.confirmar!.eleccion,confirmado:true},'Sí, hazlo');}} className={btnPrincipal}>Sí, hazlo</button><button type="button" onClick={()=>resolver(m.id,'Cancelado: no se gastó nada.')} className={btnBorde}>Cancelar</button></div></div>)}
       {m.seguir&&<Avance id={m.seguir} irA={irA}/>}
      </div>
     </article>;})}
    {trabajando&&<><div className="mb-4 flex justify-end"><p className="max-w-[85%] whitespace-pre-wrap break-words bg-[#1a1816] px-3.5 py-2 text-[13.5px] text-white">{enviado}</p></div>
     <div className="mb-4 flex gap-2.5"><span className="w-6 shrink-0"><Cara id="atlas" tam={24} titulo={false}/></span><p role="status" className="flex items-center gap-2 text-[12.5px] text-medio"><span aria-hidden="true" className="flex gap-1">{[0,1,2].map(k=><span key={k} className="h-1.5 w-1.5 animate-pulse bg-[#1a1816]" style={{animationDelay:`${k*180}ms`}}/>)}</span>Atlas está en eso…</p></div></>}
   </div>

   {/* Escribir: lo que se entendió arriba, la caja y los botones dentro. */}
   <form onSubmit={e=>{e.preventDefault();enviar();}} className="relative shrink-0 border-t border-[#e3dcd2] bg-white px-3 pb-[calc(12px+env(safe-area-inset-bottom))] pt-2.5 lg:pb-3">
    {sugerencias.length>0&&<div role="listbox" aria-label="Sugerencias" className="absolute bottom-full left-3 right-3 mb-1.5 max-h-64 overflow-y-auto border border-[#d3cac0] bg-white shadow-[0_12px_32px_-12px_rgba(20,15,10,.35)]">
     <p className="border-b border-[#efe9e1] px-3 py-1.5 font-mono text-[11px] text-medio">{enCurso?.marca==='/'?'Qué hacer':'Para quién'}</p>
     {sugerencias.map((s,i)=><div key={s.valor} role="option" aria-selected={i===elegida} onMouseDown={e=>{e.preventDefault();poner(s.valor);}} onMouseEnter={()=>setElegida(i)} className={`cursor-pointer px-3 py-2 text-[13px] ${i===elegida?'bg-[#f4efe9]':''}`}><span className="font-medium">{s.titulo}</span><br/><span className="text-[12px] text-medio">{s.detalle}</span></div>)}
    </div>}
    {(nombreCtx&&quitado!==clave||conMarcas&&lectura.accion&&!lectura.dudas.length)&&<div className="mb-2 flex min-h-7 flex-wrap items-center gap-1.5">
     {nombreCtx&&quitado!==clave&&<span data-contexto className="inline-flex h-7 max-w-full items-center gap-1 border border-[#e3dcd2] bg-[#f4efe9] pl-2 text-[12px]"><span className="text-medio">Sobre</span><span className="truncate font-medium">{nombreCtx}</span><button type="button" aria-label={`Quitar ${nombreCtx} del contexto`} onClick={()=>setQuitado(clave)} className="grid h-7 w-7 shrink-0 place-items-center text-medio hover:text-[#1a1816]">×</button></span>}
     {conMarcas&&lectura.accion&&!lectura.dudas.length&&<span data-entendi className="text-[12px] text-medio">{AGENTES_CAJA[ACCIONES_CAJA[lectura.accion].agente].nombre} · {ACCIONES_CAJA[lectura.accion].nombre}{cliente?<> · {cliente.nombre}</>:null}</span>}
    </div>}
    {conMarcas&&(lectura.dudas.length>0||faltan.length>0||sinQuien)&&<p data-aviso-caja role="alert" className="mb-2 border-l-2 border-[#F0602A] bg-[#fff6ec] px-2.5 py-1.5 text-[12.5px] leading-snug">{lectura.dudas[0]??(faltan.length?<>A {cliente!.nombre} le falta: {faltan.join(', ')}. <Link href={`/estudio/cliente/${cliente!.id}#saber`} onClick={irA} className="underline underline-offset-2">Completar en su ficha</Link></>:`Para «${def!.nombre}» dime para quién: escribe @ y elige el cliente.`)}</p>}
    <div className="border border-[#d3cac0] bg-white transition-colors focus-within:border-[#1a1816]">
     <label className="block"><span className="sr-only">Escríbele a Atlas</span>
      <textarea id="caja-atlas" ref={caja} rows={1} value={texto} disabled={!datos} placeholder={oye?'Te escucho…':'Escríbele a Atlas…'} onChange={e=>{setTexto(e.target.value);setCursor(e.target.selectionStart);setCallar(false);}} onSelect={e=>setCursor(e.currentTarget.selectionStart)} onKeyDown={tecla} style={{outline:'none'}} className="block max-h-36 min-h-11 w-full resize-none bg-transparent px-3 pb-1 pt-2.5 text-[16px] leading-snug placeholder:text-[#a39a92] md:text-[14px]"/>
     </label>
     <div className="flex items-center gap-1 px-1.5 pb-1.5">
      <p className="min-w-0 flex-1 truncate px-1.5 font-mono text-[11px] text-[#a39a92]">@ cliente · / acción · Enter envía</p>
      {puedeVoz&&<button type="button" onClick={dictar} aria-pressed={oye} aria-label={oye?'Dejar de dictar':'Dictar'} title={oye?'Dejar de dictar':'Dictar'} className={`grid h-11 w-11 shrink-0 place-items-center md:h-10 md:w-10 ${oye?'bg-[#F0602A] text-white':'text-medio hover:bg-black/5 hover:text-[#1a1816]'}`}><Icono d="M9 3h6v11H9zM5 11a7 7 0 0 0 14 0M12 18v3"/></button>}
      <button type="submit" disabled={trabajando||!texto.trim()||bloqueado} aria-busy={trabajando} aria-label="Enviar" title="Enviar" className="grid h-11 w-11 shrink-0 md:h-10 md:w-10 place-items-center bg-[#1a1816] text-white transition-opacity disabled:opacity-30"><Icono d="M12 19V5M6 11l6-6 6 6"/></button>
     </div>
    </div>
   </form>
  </div>
 </>;
}
