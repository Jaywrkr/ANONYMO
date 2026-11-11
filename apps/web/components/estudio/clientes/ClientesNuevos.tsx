"use client";

// El escritorio de Imán (sistema/66): buscar, revisar webs, filtrar, escribir por WhatsApp y llevar el seguimiento.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Espera } from "@/components/estudio/video/Espera";
import type { VistaLista, VistaProspecto } from "@/lib/clientes";
import { armarTanda, diaCuenca } from "@/lib/tanda";
import { AhoraMismo } from "./AhoraMismo";
import { AvisosCelular } from "./AvisosCelular";

const ESTADOS: [VistaProspecto["estado"], string][] = [
  ["nuevo", "Nuevo"], ["contactado", "Contactado"], ["respondio", "Respondió"], ["reunion", "Reunión"], ["cliente", "Cliente"], ["descartado", "Descartado"],
];
const TIPO_WEB: Record<string, string> = { sin: "Sin web", social: "Solo redes", rota: "Web rota", ok: "Web propia", pendiente: "Por revisar" };

interface Grupo { id: string; nombre: string; busquedas: string[] }
interface Trabajo { titulo: string; texto: string; avance?: number; desde: number }

const caja = "rounded-2xl bg-white p-4 shadow-[0_0_0_1px_rgba(26,24,22,.06)]";
const chip = (on: boolean) => `min-h-10 rounded-full px-4 text-[13px] transition ${on ? "bg-tinta text-white" : "bg-white text-medio shadow-[inset_0_0_0_1px_var(--color-borde)] hover:text-tinta"}`;
const selector = "min-h-10 rounded-full bg-white px-3 text-[13px] shadow-[inset_0_0_0_1px_var(--color-borde)]";
const botonChico = "inline-flex min-h-9 items-center rounded-full bg-white px-3 text-[13px] shadow-[inset_0_0_0_1px_var(--color-borde)] transition hover:shadow-[inset_0_0_0_1px_rgba(26,24,22,.35)] disabled:opacity-50";

async function pedir<T>(url: string, metodo: string, cuerpo?: unknown): Promise<T> {
  const r = await fetch(url, { method: metodo, headers: { "content-type": "application/json" }, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
  const j = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (!r.ok) throw new Error(j.error ?? `No se pudo (${r.status}). Vuelve a intentarlo.`);
  return j;
}

export function ClientesNuevos({ inicial, hayClave, grupos, ciudades, tope, clavePublica }: { inicial: VistaLista; hayClave: boolean; grupos: Grupo[]; ciudades: string[]; tope: number; clavePublica?: string }) {
  const [listo, setListo] = useState(false);
  const [lista, setLista] = useState(inicial.prospectos);
  const [firma, setFirma] = useState(inicial.firma);
  const [firmaEditada, setFirmaEditada] = useState(inicial.firma);
  const [numero, setNumero] = useState(inicial.numero);
  const [numeroEditado, setNumeroEditado] = useState(inicial.numero);
  const [ciudad, setCiudad] = useState(ciudades[0] ?? "Cuenca");
  const [elegidos, setElegidos] = useState(grupos.map((g) => g.id));
  const [otras, setOtras] = useState("");
  const [mas, setMas] = useState(false);
  const [trabajo, setTrabajo] = useState<Trabajo | null>(null);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [filtro, setFiltro] = useState({ web: "todas", estado: inicial.prospectos.length ? "tanda" : "activos", minimo: 0, celular: false, texto: "" });
  // Hasta que la página está lista, los botones no responden: nunca un clic sin respuesta.
  useEffect(() => setListo(true), []);

  const pendientes = lista.filter((p) => !p.revisada).length;

  async function revisarTodo(base: { titulo: string; previo?: string }) {
    let quedan = Infinity;
    let total = 0;
    const desde = Date.now();
    while (quedan > 0) {
      setTrabajo({ titulo: base.titulo, texto: `Imán revisa las webs${quedan !== Infinity ? ` (quedan ${quedan})` : ""}`, desde });
      const j = await pedir<VistaLista & { revisadas: number; quedan: number }>("/estudio/clientes/revisar", "POST");
      setLista(j.prospectos);
      total += j.revisadas;
      quedan = j.revisadas ? j.quedan : 0;
    }
    return total;
  }

  async function buscar() {
    if (trabajo) return;
    setAviso(null);
    const busquedas = [...grupos.filter((g) => elegidos.includes(g.id)).flatMap((g) => g.busquedas), ...otras.split(",").map((s) => s.trim()).filter(Boolean)];
    if (!busquedas.length) return setAviso({ ok: false, texto: "Elige al menos un rubro o escribe una búsqueda." });
    const desde = Date.now();
    let nuevos = 0;
    try {
      for (let i = 0; i < busquedas.length; i++) {
        setTrabajo({ titulo: "Imán está buscando", texto: `Buscando «${busquedas[i]}» en ${ciudad}`, avance: i / busquedas.length, desde });
        const j = await pedir<VistaLista & { nuevos: number }>("/estudio/clientes/buscar", "POST", { busqueda: busquedas[i], ciudad, paginas: mas ? 3 : 1 });
        nuevos += j.nuevos;
        setLista(j.prospectos);
      }
      const revisadas = await revisarTodo({ titulo: "Imán está revisando" });
      setAviso({ ok: true, texto: `Listo: ${nuevos} ${nuevos === 1 ? "negocio nuevo" : "negocios nuevos"}${revisadas ? ` y ${revisadas} webs revisadas` : ""}.` });
    } catch (e) {
      setAviso({ ok: false, texto: (e as Error).message });
    } finally {
      setTrabajo(null);
    }
  }

  async function terminarRevision() {
    if (trabajo) return;
    setAviso(null);
    try {
      const n = await revisarTodo({ titulo: "Imán está revisando" });
      setAviso({ ok: true, texto: `Listo: ${n} webs revisadas.` });
    } catch (e) {
      setAviso({ ok: false, texto: (e as Error).message });
    } finally {
      setTrabajo(null);
    }
  }

  async function guardarFirma() {
    if (trabajo || firmaEditada.trim() === firma) return;
    setAviso(null);
    setTrabajo({ titulo: "Guardando la firma", texto: "Rearmando los mensajes", desde: Date.now() });
    try {
      const j = await pedir<VistaLista>("/estudio/clientes/ajustes", "PATCH", { firma: firmaEditada });
      setFirma(j.firma);
      setFirmaEditada(j.firma);
      setLista(j.prospectos);
      setAviso({ ok: true, texto: "Firma guardada. Los mensajes ya la usan." });
    } catch (e) {
      setAviso({ ok: false, texto: (e as Error).message });
    } finally {
      setTrabajo(null);
    }
  }

  async function guardarNumero() {
    if (trabajo || numeroEditado.trim() === numero) return;
    setAviso(null);
    setTrabajo({ titulo: "Guardando el número", texto: "Las muestras llevan a este WhatsApp", desde: Date.now() });
    try {
      const j = await pedir<VistaLista>("/estudio/clientes/ajustes", "PATCH", { numero: numeroEditado });
      setNumero(j.numero);
      setNumeroEditado(j.numero);
      setAviso({ ok: true, texto: j.numero ? "Número guardado. «Quiero esta web» en las muestras escribe a este WhatsApp." : "Número quitado." });
    } catch (e) {
      setAviso({ ok: false, texto: (e as Error).message });
    } finally {
      setTrabajo(null);
    }
  }

  const reemplazar = (p: VistaProspecto) => setLista((l) => l.map((x) => (x.id === p.id ? p : x)));

  // La tanda de hoy (sistema/71): Imán propone a quién escribir hoy, sin pasar del tope diario.
  const { hoy, enviadosHoy, quedan, propuestos } = useMemo(() => armarTanda(lista, tope), [lista, tope]);
  const tanda = useMemo(() => new Set(propuestos.map((p) => p.id)), [propuestos]);
  const diaDe = diaCuenca;

  const vista = useMemo(() => lista
    .filter((p) => {
      if (filtro.web === "sin" && p.tipoWeb !== "sin") return false;
      if (filtro.web === "social" && p.tipoWeb !== "social") return false;
      if (filtro.web === "rota" && p.tipoWeb !== "rota") return false;
      if (filtro.web === "mejorable" && !(p.tipoWeb === "ok" && p.motivos.length)) return false;
      if (filtro.estado === "tanda" && !(tanda.has(p.id) || diaDe(p.contactado) === hoy)) return false;
      if (filtro.estado === "activos" && (p.estado === "descartado" || p.estado === "cliente")) return false;
      if (!["activos", "todos", "tanda"].includes(filtro.estado) && p.estado !== filtro.estado) return false;
      if (p.puntaje < filtro.minimo) return false;
      if (filtro.celular && !p.celular) return false;
      if (filtro.texto && !`${p.nombre} ${p.rubro} ${p.direccion}`.toLowerCase().includes(filtro.texto.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => b.puntaje - a.puntaje || (b.resenas ?? 0) - (a.resenas ?? 0)), [lista, filtro, tanda, hoy]);

  const cuenta = {
    total: lista.length,
    sinWeb: lista.filter((p) => ["sin", "social", "rota"].includes(p.tipoWeb)).length,
    contactados: lista.filter((p) => p.estado !== "nuevo" && p.estado !== "descartado").length,
    clientes: lista.filter((p) => p.estado === "cliente").length,
  };

  function exportar() {
    const filas = [["Negocio", "Rubro", "Ciudad", "Puntaje", "Qué falla", "Estrellas", "Reseñas", "Teléfono", "Web", "Mapa", "Estado", "Notas"]];
    for (const p of vista) filas.push([p.nombre, p.rubro, p.ciudad, String(p.puntaje), p.motivos.join(" | "), String(p.estrellas ?? ""), String(p.resenas), p.telefono ?? "", p.web ?? "", p.mapa ?? "", p.estado, p.notas]);
    const csv = filas.map((f) => f.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = `clientes-nuevos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <div className="mt-7 grid gap-6">
      {trabajo && <Espera titulo={trabajo.titulo} texto={trabajo.texto} avance={trabajo.avance} desde={trabajo.desde} estimado={60} aviso="Puedes esperar aquí. Cada búsqueda tarda unos segundos y luego Imán revisa las webs." />}

      {!hayClave && (
        <p role="alert" className="rounded-2xl bg-[#fff6ee] p-4 text-[14px] text-[#8a3a0c]">
          Falta la clave de Google Maps. Jay la pone en Vercel como <code className="font-mono">GOOGLE_PLACES_API_KEY</code> (Places API nueva) y vuelve a desplegar. Mientras tanto puedes ver y trabajar la lista guardada.
        </p>
      )}

      <section className={`${caja} grid gap-4`} aria-label="Buscar negocios">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-medium">Dónde</span>
          <select value={ciudad} onChange={(e) => setCiudad(e.target.value)} className={selector} aria-label="Ciudad">
            {ciudades.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Rubros">
          {grupos.map((g) => (
            <button key={g.id} type="button" disabled={!listo} aria-pressed={elegidos.includes(g.id)} title={g.busquedas.join(", ")}
              onClick={() => setElegidos((s) => (s.includes(g.id) ? s.filter((x) => x !== g.id) : [...s, g.id]))} className={chip(elegidos.includes(g.id))}>
              {g.nombre}
            </button>
          ))}
        </div>
        <input value={otras} onChange={(e) => setOtras(e.target.value)} placeholder="Otras búsquedas, separadas por coma (veterinaria, óptica…)"
          className="min-h-11 w-full rounded-xl bg-hueso/60 px-3 text-[14px] outline-none focus:bg-white focus:shadow-[inset_0_0_0_1px_var(--color-borde)]" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-[13px] text-medio">
            <input type="checkbox" checked={mas} onChange={(e) => setMas(e.target.checked)} /> Más resultados (hasta 60 por búsqueda; gasta 3 veces más de Google)
          </label>
          <button type="button" onClick={buscar} disabled={!listo || !hayClave || !!trabajo}
            className="inline-flex min-h-12 items-center rounded-full bg-tinta px-7 text-[14px] font-medium text-white transition hover:bg-black disabled:opacity-40">
            {!listo ? "Cargando…" : "Que Imán busque →"}
          </button>
        </div>
      </section>

      <AhoraMismo inicial={inicial.prospectos} />

      {aviso && <p role="status" className={`rounded-2xl p-4 text-[14px] ${aviso.ok ? "bg-[#e6f6ee] text-[#17714a]" : "bg-[#fde8e4] text-[#8a1c0c]"}`}>{aviso.texto}</p>}

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Resumen">
        {[[cuenta.total, "negocios"], [cuenta.sinWeb, "sin web real"], [cuenta.contactados, "contactados"], [cuenta.clientes, "clientes"]].map(([n, t]) => (
          <div key={t} className="rounded-2xl bg-white px-4 py-3 shadow-[0_0_0_1px_rgba(26,24,22,.06)]">
            <p className="text-[24px] font-medium leading-none">{n}</p>
            <p className="mt-1 text-[12px] text-suave">{t}</p>
          </div>
        ))}
      </section>

      {pendientes > 0 && (
        <p className="flex flex-wrap items-center gap-3 text-[13px] text-medio">
          Faltan {pendientes} webs por revisar.
          <button type="button" onClick={terminarRevision} disabled={!listo || !!trabajo} className={botonChico}>Revisarlas ahora</button>
        </p>
      )}

      {lista.length > 0 && (
        <section aria-label="La tanda de hoy" className="flex flex-wrap items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_0_0_1px_rgba(26,24,22,.06)]">
          <p className="min-w-0 flex-1 text-[14px]">
            <span className="font-medium">La tanda de hoy: {enviadosHoy} de {tope} enviados.</span>{" "}
            <span className="text-medio">{quedan ? `Imán te propone ${tanda.size} ${tanda.size === 1 ? "negocio" : "negocios"} con celular y buena oportunidad.` : "Llegaste al tope de hoy: mañana sigue la tanda."}</span>
          </p>
          {quedan > 0 && tanda.size > 0 && (
            <Link href="/estudio/clientes/tanda" className="inline-flex min-h-11 items-center rounded-full bg-[#25d366] px-5 text-[14px] font-medium text-black">Empezar la tanda →</Link>
          )}
          <p className="w-full text-[12px] text-suave">Más de {tope} mensajes nuevos al día desde un número puede hacer que WhatsApp lo bloquee. Cada mensaje lleva el enlace a su muestra.</p>
        </section>
      )}

      <section className="flex flex-wrap items-center gap-2" aria-label="Filtros">
        <select value={filtro.web} onChange={(e) => setFiltro({ ...filtro, web: e.target.value })} className={selector} aria-label="Tipo de web">
          <option value="todas">Todas las webs</option>
          <option value="sin">Sin web</option>
          <option value="social">Solo redes</option>
          <option value="rota">Web rota</option>
          <option value="mejorable">Web mejorable</option>
        </select>
        <select value={filtro.estado} onChange={(e) => setFiltro({ ...filtro, estado: e.target.value })} className={selector} aria-label="Estado">
          <option value="tanda">La tanda de hoy</option>
          <option value="activos">Por trabajar</option>
          <option value="todos">Todos</option>
          {ESTADOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
        </select>
        <select value={filtro.minimo} onChange={(e) => setFiltro({ ...filtro, minimo: Number(e.target.value) })} className={selector} aria-label="Puntaje mínimo">
          <option value={0}>Cualquier puntaje</option>
          <option value={50}>50 o más</option>
          <option value={70}>70 o más</option>
          <option value={85}>85 o más</option>
        </select>
        <label className="flex min-h-10 items-center gap-2 px-2 text-[13px] text-medio">
          <input type="checkbox" checked={filtro.celular} onChange={(e) => setFiltro({ ...filtro, celular: e.target.checked })} /> Solo con celular
        </label>
        <input value={filtro.texto} onChange={(e) => setFiltro({ ...filtro, texto: e.target.value })} placeholder="Buscar en la lista" aria-label="Buscar en la lista"
          className="min-h-10 min-w-[160px] flex-1 rounded-full bg-white px-4 text-[13px] shadow-[inset_0_0_0_1px_var(--color-borde)] outline-none" />
      </section>

      <ul className="grid gap-3" aria-label="Negocios">
        {!vista.length && <li className="py-10 text-center text-[14px] text-medio">{lista.length ? "Nada con estos filtros." : "Elige rubros y dile a Imán que busque."}</li>}
        {vista.map((p) => <Tarjeta key={p.id} p={p} listo={listo} alCambiar={reemplazar} tope={p.estado === "nuevo" && quedan === 0 ? tope : undefined} />)}
      </ul>

      <section className={`${caja} grid gap-3`} aria-label="Ajustes">
        <label className="grid gap-2">
          <span className="text-[13px] font-medium">Firma de los mensajes</span>
          <input value={firmaEditada} onChange={(e) => setFirmaEditada(e.target.value)} maxLength={120}
            className="min-h-11 rounded-xl bg-hueso/60 px-3 text-[14px] outline-none focus:bg-white focus:shadow-[inset_0_0_0_1px_var(--color-borde)]" />
        </label>
        <label className="grid gap-2">
          <span className="text-[13px] font-medium">WhatsApp de ANONYMO</span>
          <input value={numeroEditado} onChange={(e) => setNumeroEditado(e.target.value)} maxLength={20} inputMode="tel" placeholder="099 123 4567"
            className="min-h-11 rounded-xl bg-hueso/60 px-3 text-[14px] outline-none focus:bg-white focus:shadow-[inset_0_0_0_1px_var(--color-borde)]" />
          <span className="text-[12px] text-suave">El número aparte desde el que escribes. Quien toca «Quiero esta web» en su muestra te escribe aquí.</span>
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={guardarNumero} disabled={!listo || !!trabajo || numeroEditado.trim() === numero} className={botonChico}>Guardar número</button>
          <button type="button" onClick={guardarFirma} disabled={!listo || !!trabajo || firmaEditada.trim() === firma} className={botonChico}>Guardar firma</button>
          <button type="button" onClick={exportar} disabled={!listo || !vista.length} className={botonChico}>Bajar la lista (CSV)</button>
        </div>
        <AvisosCelular clavePublica={clavePublica} />
        <p className="text-[12px] text-suave">La lista vive en la nube privada del estudio: Jay y Luna ven la misma.</p>
      </section>
    </div>
  );
}

function Tarjeta({ p, listo, alCambiar, tope }: { p: VistaProspecto; listo: boolean; alCambiar: (p: VistaProspecto) => void; tope?: number }) {
  const [abierta, setAbierta] = useState(false);
  const [guardando, setGuardando] = useState("");
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null);
  const [mensaje, setMensaje] = useState(p.mensaje);
  const [notas, setNotas] = useState(p.notas);
  const [copiado, setCopiado] = useState(false);
  useEffect(() => setMensaje(p.mensaje), [p.mensaje]);
  useEffect(() => setNotas(p.notas), [p.notas]);

  async function cambiar(cuerpo: Record<string, unknown>, texto: string, hecho: string) {
    setGuardando(texto);
    setResultado(null);
    try {
      const j = await pedir<{ prospecto: VistaProspecto }>(`/estudio/clientes/${encodeURIComponent(p.id)}`, "PATCH", cuerpo);
      alCambiar(j.prospecto);
      setResultado({ ok: true, texto: hecho });
      return true;
    } catch (e) {
      setResultado({ ok: false, texto: (e as Error).message });
      return false;
    } finally {
      setGuardando("");
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(p.mensaje);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1600);
    } catch {
      setResultado({ ok: false, texto: "No se pudo copiar. Ábrelo en «Más» y cópialo a mano." });
    }
  }

  const ocupado = !listo || !!guardando;
  const pendiente = !p.revisada;
  const color = p.puntaje >= 85 ? "bg-[#ff4d2e] text-white" : p.puntaje >= 60 ? "bg-[#fff1d6] text-[#8a5a00]" : "bg-hueso text-medio";

  return (
    <li className={`rounded-2xl bg-white p-4 shadow-[0_0_0_1px_rgba(26,24,22,.06)] ${p.estado === "descartado" ? "opacity-50" : ""} ${p.estado === "cliente" ? "shadow-[0_0_0_2px_#17714a]" : ""}`} aria-busy={!!guardando}>
      <div className="flex gap-4">
        <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-[20px] font-medium ${pendiente ? "bg-hueso text-suave" : color}`} aria-label={pendiente ? "Puntaje pendiente" : `Puntaje ${p.puntaje} de 100`}>
          {pendiente ? "…" : p.puntaje}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-medium">{p.nombre}</p>
          <p className="text-[13px] text-suave">{p.rubro} · {p.ciudad}{p.estrellas ? ` · ★ ${p.estrellas} (${p.resenas})` : " · sin reseñas"}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {pendiente ? <span className="rounded-md bg-hueso px-2 py-0.5 text-[11px] text-suave">Revisando la web…</span> : (
              <>
                {p.tipoWeb === "ok" && !p.motivos.length && <span className="rounded-md bg-hueso px-2 py-0.5 text-[11px] text-medio">{TIPO_WEB.ok}, sin problemas claros</span>}
                {p.motivos.map((m) => <span key={m} className="rounded-md bg-hueso px-2 py-0.5 text-[11px] text-medio">{m}</span>)}
                {p.buenaFama && <span className="rounded-md bg-[#fff1d6] px-2 py-0.5 text-[11px] text-[#8a5a00]">Muy buena fama</span>}
                {p.quiere ? <span className="rounded-md bg-[#ff4d2e] px-2 py-0.5 text-[11px] text-white">Quiere su web</span>
                  : p.vistas > 0 && <span className="rounded-md bg-[#e6f6ee] px-2 py-0.5 text-[11px] text-[#17714a]">Vio su muestra {p.vistas === 1 ? "1 vez" : `${p.vistas} veces`}</span>}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {tope ? <span className="inline-flex min-h-9 items-center rounded-full bg-hueso px-3 text-[13px] text-medio" title="Mañana sigue la tanda">Tope de hoy: {tope} enviados</span> : p.whatsapp ? (
          <a href={p.whatsapp} target="_blank" rel="noreferrer" aria-disabled={ocupado}
            onClick={() => { if (p.estado === "nuevo") void cambiar({ estado: "contactado" }, "Marcando como contactado", "Marcado como contactado."); }}
            className="inline-flex min-h-9 items-center rounded-full bg-[#25d366] px-4 text-[13px] font-medium text-black">
            WhatsApp{p.celular ? "" : " (número fijo)"}
          </a>
        ) : <span className="inline-flex min-h-9 items-center rounded-full bg-hueso px-3 text-[13px] text-suave">Sin teléfono</span>}
        <button type="button" onClick={copiar} disabled={ocupado} className={botonChico}>{copiado ? "Copiado ✓" : "Copiar mensaje"}</button>
        <a href={p.muestra} target="_blank" rel="noreferrer" className={botonChico}>Su muestra ↗</a>
        {p.mapa && <a href={p.mapa} target="_blank" rel="noreferrer" className={botonChico}>Mapa</a>}
        {p.web && <a href={p.web} target="_blank" rel="noreferrer" className={botonChico}>Su web</a>}
        <select value={p.estado} disabled={ocupado} aria-label="Estado"
          onChange={(e) => void cambiar({ estado: e.target.value }, "Guardando el estado", `Ahora está en «${ESTADOS.find(([v]) => v === e.target.value)?.[1]}».`)} className={selector}>
          {ESTADOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
        </select>
        {p.proyecto ? <Link href={p.proyecto} className={botonChico}>Ver el proyecto →</Link> : <Link href={p.pedido} className={botonChico}>Convertir en pedido →</Link>}
        {p.ficha && <Link href={p.ficha} className={botonChico}>Ficha del cliente</Link>}
        <button type="button" onClick={() => setAbierta(!abierta)} aria-expanded={abierta} className="inline-flex min-h-9 items-center px-2 text-[13px] text-medio underline-offset-4 hover:underline">{abierta ? "Cerrar" : "Más"}</button>
      </div>

      {(guardando || resultado) && (
        <p role="status" className={`mt-2 text-[13px] ${guardando ? "text-medio" : resultado?.ok ? "text-[#17714a]" : "text-[#a33a0b]"}`}>
          {guardando ? `${guardando}…` : resultado?.texto}
        </p>
      )}

      {abierta && (
        <div className="mt-4 grid gap-3 border-t border-borde pt-4">
          <label className="grid gap-1.5">
            <span className="text-[12px] text-suave">Mensaje{p.mensajePropio ? " · escrito a mano" : " · lo arma Imán"}</span>
            <textarea rows={6} value={mensaje} onChange={(e) => setMensaje(e.target.value)} disabled={ocupado} className="rounded-xl bg-hueso/60 p-3 text-[14px] outline-none focus:bg-white focus:shadow-[inset_0_0_0_1px_var(--color-borde)]" />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={ocupado || mensaje === p.mensaje} onClick={() => void cambiar({ mensaje }, "Guardando el mensaje", "Mensaje guardado.")} className={botonChico}>Guardar mensaje</button>
            {p.mensajePropio && <button type="button" disabled={ocupado} onClick={() => void cambiar({ mensaje: null }, "Volviendo al mensaje de Imán", "Volvió al mensaje de Imán.")} className={botonChico}>Volver al de Imán</button>}
          </div>
          <label className="grid gap-1.5">
            <span className="text-[12px] text-suave">Notas</span>
            <textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} disabled={ocupado} className="rounded-xl bg-hueso/60 p-3 text-[14px] outline-none focus:bg-white focus:shadow-[inset_0_0_0_1px_var(--color-borde)]" />
          </label>
          <div>
            <button type="button" disabled={ocupado || notas === p.notas} onClick={() => void cambiar({ notas }, "Guardando las notas", "Notas guardadas.")} className={botonChico}>Guardar notas</button>
          </div>
          <div className="rounded-xl bg-hueso/50 px-3 py-2 text-[13px]">
            <p className="text-[12px] text-suave">Lo que Sonda vio en su web</p>
            {p.sonda && (p.sonda.descripcion || p.sonda.secciones.length || p.sonda.redes.length) ? (
              <ul className="mt-1 grid gap-0.5">
                {p.sonda.descripcion && <li>Se describe como: «{p.sonda.descripcion}»</li>}
                {p.sonda.secciones.length > 0 && <li>Habla de: {p.sonda.secciones.join(" · ")}</li>}
                {p.sonda.redes.length > 0 && <li>Redes: {p.sonda.redes.map((r) => r.replace(/^https?:\/\/(www\.)?/, "")).join(" · ")}</li>}
              </ul>
            ) : <p className="mt-1 text-medio">{p.tipoWeb === "ok" ? "Su web no dice mucho de sí misma." : "No tiene una web propia que leer."}</p>}
          </div>
          <p className="text-[12px] text-suave">{[p.direccion, p.telefono, p.detalleWeb].filter(Boolean).join(" · ")}</p>
        </div>
      )}
    </li>
  );
}
