"use client";

// La caja única de Atlas (sistema/95): pedir cosas escribiendo, como en un chat.
// @ elige quién lo hace, # para qué cliente, / qué se hace. Antes de hacer nada muestra lo que entendió;
// si usa IA pregunta primero; si al cliente le falta algo, lo dice y lleva a su ficha. El resultado llega como tarjeta.
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ACCIONES_CAJA, AGENTES_CAJA, ORDEN_ACCIONES, ORDEN_AGENTES, accionDe, agenteDe, clientesDe, leerCaja, marcaEnCurso, ponerSugerencia,
  type ClienteCaja,
} from "@anonymo/pipeline/src/clientes/caja.ts";
import type { Tarjeta } from "@/lib/caja";

interface ClienteDatos extends ClienteCaja { tareas: Record<string, { listo: boolean; faltan: string[] }>; prospecto: boolean; proyecto?: string; web: boolean }
interface Entrada { id: number; pedido: string; tarjeta?: Tarjeta; error?: string; ficha?: string }
interface Sugerencia { valor: string; titulo: string; detalle: string }

const CLAVE = "anonymo-caja-cliente";

export function CajaAtlas({ abrirProyecto }: { abrirProyecto: (id: string) => void }) {
  const [clientes, setClientes] = useState<ClienteDatos[] | null>(null);
  const [errorCarga, setErrorCarga] = useState(false);
  const [texto, setTexto] = useState("");
  const [cursor, setCursor] = useState(0);
  const [elegida, setElegida] = useState(0);
  const [contexto, setContexto] = useState<string | undefined>();
  const [trabajando, setTrabajando] = useState(false);
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [historial, setHistorial] = useState<Entrada[]>([]);
  const [copiado, setCopiado] = useState("");
  // Escape cierra las sugerencias hasta que se vuelva a escribir.
  const [callar, setCallar] = useState(false);
  const caja = useRef<HTMLTextAreaElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  const hilo = useRef<HTMLDivElement>(null);
  // Como en un chat: lo último abajo, junto a la caja.
  useEffect(() => { hilo.current?.scrollTo({ top: hilo.current.scrollHeight }); }, [historial.length]);

  useEffect(() => {
    try { setContexto(sessionStorage.getItem(CLAVE) ?? undefined); } catch { /* sin almacenamiento */ }
    fetch("/estudio/atlas/caja", { cache: "no-store" }).then((r) => (r.ok ? r.json() : Promise.reject())).then((d) => setClientes(d.clientes)).catch(() => setErrorCarga(true));
  }, []);

  const lectura = useMemo(() => leerCaja(texto, clientes ?? [], contexto), [texto, clientes, contexto]);
  const cliente = clientes?.find((c) => c.id === lectura.cliente);
  const def = lectura.accion ? ACCIONES_CAJA[lectura.accion] : undefined;
  const faltan = def?.tarea && cliente ? cliente.tareas[def.tarea]?.faltan ?? [] : [];

  // Lo que se sugiere mientras se escribe una marca.
  const enCurso = callar ? undefined : marcaEnCurso(texto, cursor);
  const sugerencias: Sugerencia[] = useMemo(() => {
    if (!enCurso) return [];
    const w = enCurso.palabra;
    if (enCurso.marca === "@") return ORDEN_AGENTES.filter((a) => !w || agenteDe(w) === a || a.startsWith(w.toLowerCase())).map((a) => ({ valor: `@${AGENTES_CAJA[a].nombre}`, titulo: AGENTES_CAJA[a].nombre, detalle: AGENTES_CAJA[a].rol }));
    if (enCurso.marca === "/") return ORDEN_ACCIONES.filter((a) => !w || accionDe(w) === a || a.startsWith(w.toLowerCase())).map((a) => ({ valor: `/${a}`, titulo: ACCIONES_CAJA[a].nombre, detalle: `${AGENTES_CAJA[ACCIONES_CAJA[a].agente].nombre} · ${ACCIONES_CAJA[a].pronto ? "todavía no" : ACCIONES_CAJA[a].ayuda}` }));
    return (w ? clientesDe(w, clientes ?? []) : clientes ?? []).slice(0, 8).map((c) => ({ valor: `#${c.id}`, titulo: c.nombre, detalle: c.prospecto ? "Cliente nuevo de Imán" : c.proyecto ? "Con proyecto" : "Con ficha" }));
  }, [enCurso?.marca, enCurso?.palabra, clientes]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setElegida(0), [enCurso?.marca, enCurso?.palabra]);

  function poner(valor: string) {
    const r = ponerSugerencia(texto, cursor, valor);
    setTexto(r.texto);
    requestAnimationFrame(() => { caja.current?.focus(); caja.current?.setSelectionRange(r.cursor, r.cursor); setCursor(r.cursor); });
  }

  function agregar(e: Omit<Entrada, "id">) {
    setHistorial((h) => [...h, { ...e, id: Date.now() }].slice(-12));
  }

  async function enviar(confirmado = false) {
    if (trabajando || !lectura.accion || lectura.dudas.length) return;
    setTrabajando(true);
    setConfirmar(null);
    const pedido = texto.trim();
    try {
      const r = await fetch("/estudio/atlas/caja", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ accion: lectura.accion, cliente: lectura.cliente, texto: lectura.texto, confirmado }) });
      const d = await r.json().catch(() => ({ error: "No hubo respuesta. Vuelve a intentar." }));
      if (d.confirmar) { setConfirmar(d.confirmar); return; }
      if (!r.ok || d.error) { agregar({ pedido, error: d.error ?? "No se pudo hacer.", ficha: d.ficha }); return; }
      agregar({ pedido, tarjeta: d.tarjeta });
      // El cliente queda como contexto para lo siguiente; el texto se limpia.
      if (lectura.cliente) { setContexto(lectura.cliente); try { sessionStorage.setItem(CLAVE, lectura.cliente); } catch { /* */ } }
      setTexto("");
      setCursor(0);
    } catch {
      agregar({ pedido, error: "No hubo conexión. Lo escrito sigue en la caja: vuelve a intentar." });
    } finally {
      setTrabajando(false);
      requestAnimationFrame(() => caja.current?.focus());
    }
  }

  function tecla(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (sugerencias.length) {
      if (e.key === "ArrowDown") { e.preventDefault(); setElegida((i) => (i + 1) % sugerencias.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setElegida((i) => (i - 1 + sugerencias.length) % sugerencias.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); poner(sugerencias[elegida]!.valor); return; }
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setCallar(true); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void enviar(); }
  }

  async function copiar(t: string) {
    try { await navigator.clipboard.writeText(t); setCopiado(t); window.setTimeout(() => setCopiado(""), 2000); } catch { setCopiado(""); }
  }

  const quitarContexto = () => { setContexto(undefined); try { sessionStorage.removeItem(CLAVE); } catch { /* */ } };
  const chip = "inline-flex min-h-7 items-center gap-1 rounded-full bg-white px-2.5 text-[12px] shadow-[inset_0_0_0_1px_rgba(26,24,22,.12)]";
  const listo = !!lectura.accion && !lectura.dudas.length && !def?.pronto && !(def?.conCliente && !cliente) && !faltan.length;
  const boton = !lectura.accion ? "Enviar" : def?.gasta ? `Pedirle a ${AGENTES_CAJA[def.agente].nombre}` : "Hacerlo";

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-caja-atlas>
      {/* Lo hecho, en orden, como en un chat */}
      <div ref={hilo} className="min-h-0 flex-1 overflow-y-auto px-4 py-3" aria-live="polite">
        {!historial.length && (
          <div className="text-[13.5px] leading-relaxed text-medio">
            <p className="text-[#1a1816]">Pide lo que necesites, en tus palabras.</p>
            <ul className="mt-2 grid gap-1">
              <li><b className="font-medium text-[#1a1816]">@</b> quién lo hace: Faro, Imán o Atlas</li>
              <li><b className="font-medium text-[#1a1816]">#</b> para qué cliente</li>
              <li><b className="font-medium text-[#1a1816]">/</b> qué hacer: guion, muestra, mensaje, datos, pedido…</li>
            </ul>
            <p className="mt-3">Ejemplo: <button type="button" className="text-left underline underline-offset-2" onClick={() => { setTexto("@Faro un reel de por qué una web propia vende más que solo Instagram"); caja.current?.focus(); }}>@Faro un reel de por qué una web propia vende más que solo Instagram</button></p>
          </div>
        )}
        <ul className="grid gap-3">
          {historial.map((e) => (
            <li key={e.id} data-tarjeta className="grid gap-2">
              <p className="ml-auto max-w-[88%] whitespace-pre-wrap rounded-[16px] rounded-br-[5px] bg-[#1a1816] px-3 py-2 text-[13.5px] text-white">{e.pedido}</p>
              {e.error ? (
                <div role="alert" className="rounded-2xl bg-[#fdebe5] p-3 text-[13.5px] text-[#7a2410]">
                  <p>{e.error}</p>
                  {e.ficha && <Link href={e.ficha} className="mt-1 inline-flex min-h-11 items-center font-medium underline underline-offset-2">Completar en su ficha</Link>}
                </div>
              ) : e.tarjeta && (
                <div className="rounded-2xl bg-white p-3.5 shadow-[0_0_0_1px_rgba(26,24,22,.06),0_6px_18px_-12px_rgba(40,30,20,.25)]">
                  <p className="text-[14px] font-medium">{e.tarjeta.titulo}</p>
                  {e.tarjeta.texto && <p className="mt-1.5 max-h-56 overflow-y-auto whitespace-pre-wrap text-[13.5px] leading-snug text-[#3d3a35]">{e.tarjeta.texto}</p>}
                  {!!e.tarjeta.botones?.length && (
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {e.tarjeta.botones.map((b) => {
                        const cls = "inline-flex min-h-11 items-center rounded-full px-4 text-[13px] shadow-[inset_0_0_0_1px_rgba(26,24,22,.18)] hover:bg-black/5";
                        if (b.copiar) return <button key={b.texto} type="button" className={cls} onClick={() => void copiar(b.copiar!)}>{copiado === b.copiar ? "Copiado" : b.texto}</button>;
                        if (b.proyecto) return <button key={b.texto} type="button" className={cls} onClick={() => abrirProyecto(b.proyecto!)}>{b.texto}</button>;
                        return b.externo
                          ? <a key={b.texto} href={b.href} target="_blank" rel="noreferrer" className={cls}>{b.texto} ↗</a>
                          : <Link key={b.texto} href={b.href!} className={cls}>{b.texto}</Link>;
                      })}
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* La caja */}
      <div className="relative shrink-0 border-t border-black/10 p-3">
        {sugerencias.length > 0 && (
          <div ref={lista} id="caja-sugerencias" role="listbox" aria-label="Sugerencias" className="absolute bottom-full left-3 right-3 mb-2 max-h-64 overflow-y-auto rounded-2xl bg-white p-1.5 shadow-[0_0_0_1px_rgba(26,24,22,.08),0_16px_40px_-12px_rgba(40,30,20,.35)]">
            {sugerencias.map((s, i) => (
              <button key={s.valor} id={`caja-sug-${i}`} type="button" role="option" aria-selected={i === elegida} onMouseDown={(e) => { e.preventDefault(); poner(s.valor); }}
                className={`flex min-h-11 w-full items-baseline justify-between gap-3 rounded-xl px-3 py-2 text-left ${i === elegida ? "bg-[#f1ece3]" : ""}`}>
                <span className="text-[14px]">{s.titulo}</span><span className="min-w-0 truncate text-[12px] text-medio">{s.detalle}</span>
              </button>
            ))}
          </div>
        )}
        {/* Lo que entendió, antes de hacer nada */}
        <div className="mb-2 flex flex-wrap items-center gap-1.5" data-entendi>
          {lectura.accion && <span className={chip}><span className="text-medio">Hace</span> {AGENTES_CAJA[lectura.agente!].nombre} · {def!.nombre}{lectura.como === "palabras" ? " (por lo que escribiste)" : ""}</span>}
          {cliente && (
            <span className={chip}><span className="text-medio">Para</span> {cliente.nombre}
              {!texto.includes("#") && cliente.id === contexto && <button type="button" aria-label={`Quitar a ${cliente.nombre}`} onClick={quitarContexto} className="-mr-1 grid h-6 w-6 place-items-center rounded-full text-[14px] hover:bg-black/5">×</button>}
            </span>
          )}
          {!lectura.accion && !texto.trim() && clientes && <span className="text-[12px] text-medio">Escribe @, # o /</span>}
          {!lectura.accion && texto.trim() && !enCurso && <span className="text-[12px] text-medio">No sé qué hacer con eso todavía. Escribe / para elegir.</span>}
        </div>
        {(lectura.dudas.length > 0 || faltan.length > 0 || def?.pronto || (def?.conCliente && !cliente)) && (
          <div role="status" className="mb-2 rounded-xl bg-[#fff6e5] px-3 py-2 text-[12.5px] leading-snug text-[#6b4a07]" data-aviso-caja>
            {lectura.dudas.map((d) => <p key={d}>{d}</p>)}
            {def?.pronto && <p>«{def.nombre}» todavía no se puede pedir desde aquí.</p>}
            {def?.conCliente && !cliente && !lectura.dudas.length && <p>Dime para quién: escribe # y elige el cliente.</p>}
            {faltan.length > 0 && cliente && <p>A {cliente.nombre} le falta: {faltan.join(", ")}. <Link href={`/estudio/cliente/${cliente.id}#saber`} className="font-medium underline underline-offset-2">Completar en su ficha</Link></p>}
          </div>
        )}
        {confirmar && (
          <div role="alertdialog" aria-label="Confirmar" className="mb-2 rounded-xl bg-white p-3 text-[13px] shadow-[inset_0_0_0_1px_rgba(26,24,22,.12)]">
            <p>{confirmar}</p>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => void enviar(true)} disabled={trabajando} className="min-h-11 rounded-full bg-[#1a1816] px-4 text-white disabled:opacity-60">Sí, hazlo</button>
              <button type="button" onClick={() => setConfirmar(null)} className="min-h-11 rounded-full px-4 shadow-[inset_0_0_0_1px_rgba(26,24,22,.18)]">Cancelar</button>
            </div>
          </div>
        )}
        {errorCarga && <p role="alert" className="mb-2 text-[12.5px] text-[#7a2410]">No pude cargar los clientes. Puedes pedir un guion sin cliente; para lo demás, recarga la página.</p>}
        <div className="flex items-end gap-2">
          <label htmlFor="caja-atlas" className="sr-only">Pídele algo a tu equipo</label>
          <textarea
            id="caja-atlas" ref={caja} rows={2} value={texto} maxLength={1300} disabled={trabajando}
            placeholder={clientes ? "Ej.: @Faro #cliente un reel sobre…" : "Cargando clientes…"}
            role="combobox" aria-expanded={sugerencias.length > 0} aria-controls="caja-sugerencias" aria-activedescendant={sugerencias.length ? `caja-sug-${elegida}` : undefined} aria-autocomplete="list"
            onChange={(e) => { setTexto(e.target.value); setCursor(e.target.selectionStart); setConfirmar(null); setCallar(false); }}
            onSelect={(e) => setCursor((e.target as HTMLTextAreaElement).selectionStart)}
            onKeyDown={tecla}
            className="min-h-12 min-w-0 flex-1 resize-none rounded-2xl bg-white px-3.5 py-2.5 text-[16px] leading-snug outline-none shadow-[inset_0_0_0_1px_rgba(26,24,22,.14)] focus:shadow-[inset_0_0_0_1.5px_#1a1816] disabled:opacity-60"
          />
          <button type="button" onClick={() => void enviar()} disabled={!listo || trabajando} aria-busy={trabajando}
            className="min-h-12 shrink-0 rounded-2xl bg-[#1a1816] px-4 text-[13.5px] text-white disabled:opacity-40">
            {trabajando ? "Trabajando…" : boton}
          </button>
        </div>
      </div>
    </div>
  );
}
