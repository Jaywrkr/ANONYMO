"use client";

// Guiones de Faro (sistema/71): se pide el video, Faro escribe el guion, Luna o Jay lo aprueban, se graba y Corte edita.
// Cada guion muestra quién hizo cada paso.
import { useEffect, useState } from "react";
import Link from "next/link";
import { Espera } from "./Espera";
import type { Guion } from "@anonymo/pipeline";

const NOMBRE: Record<string, string> = { jay: "Jay", luna: "Luna", atlas: "Atlas", faro: "Faro", corte: "Corte" };
const ESTADO: Record<Guion["estado"], { texto: string; clase: string }> = {
  borrador: { texto: "Por aprobar", clase: "bg-[#fff1d6] text-[#8a5a00]" },
  aprobado: { texto: "Listo para grabar", clase: "bg-[#eef3ff] text-[#2342a8]" },
  grabado: { texto: "Grabado", clase: "bg-[#e6f6ee] text-[#17714a]" },
};
const campo = "w-full rounded-xl bg-hueso/60 px-3 py-2.5 text-[14px] outline-none focus:bg-white focus:shadow-[inset_0_0_0_1px_var(--color-borde)]";
const botonChico = "inline-flex min-h-10 items-center rounded-full bg-white px-4 text-[13px] shadow-[inset_0_0_0_1px_var(--color-borde)] transition hover:shadow-[inset_0_0_0_1px_rgba(26,24,22,.35)] disabled:opacity-50";

async function pedir<T>(url: string, metodo: string, cuerpo: unknown): Promise<T> {
  const r = await fetch(url, { method: metodo, headers: { "content-type": "application/json" }, body: JSON.stringify(cuerpo) });
  const j = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (!r.ok) throw new Error(j.error ?? `No se pudo (${r.status}).`);
  return j;
}

export function Guiones({ inicial, clienteInicial = "" }: { inicial: Guion[]; clienteInicial?: string }) {
  const [listo, setListo] = useState(false);
  const [guiones, setGuiones] = useState(inicial);
  const [pedido, setPedido] = useState("");
  const [cliente, setCliente] = useState(clienteInicial);
  const [segundos, setSegundos] = useState(30);
  const [espera, setEspera] = useState<{ titulo: string; texto: string; desde: number } | null>(null);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [abierto, setAbierto] = useState<string | null>(inicial[0]?.estado === "borrador" ? inicial[0].id : null);
  useEffect(() => setListo(true), []);

  async function escribir() {
    if (espera) return;
    setAviso(null);
    setEspera({ titulo: "Faro está escribiendo el guion", texto: "Atlas le pasó tu pedido", desde: Date.now() });
    try {
      const { guion } = await pedir<{ guion: Guion }>("/estudio/video/guiones", "POST", { pedido, cliente, segundos });
      setGuiones((g) => [guion, ...g]);
      setAbierto(guion.id);
      setPedido("");
      setAviso({ ok: true, texto: `Faro escribió «${guion.titulo}». Revísalo y apruébalo para grabar.` });
    } catch (e) {
      setAviso({ ok: false, texto: (e as Error).message });
    } finally {
      setEspera(null);
    }
  }

  async function aprobar(id: string) {
    if (espera) return;
    setAviso(null);
    setEspera({ titulo: "Aprobando el guion", texto: "Guardando quién lo aprobó", desde: Date.now() });
    try {
      const { guion } = await pedir<{ guion: Guion }>(`/estudio/video/guiones/${id}`, "PATCH", { accion: "aprobar" });
      setGuiones((g) => g.map((x) => (x.id === id ? guion : x)));
      setAviso({ ok: true, texto: "Guion aprobado: queda listo para grabar." });
    } catch (e) {
      setAviso({ ok: false, texto: (e as Error).message });
    } finally {
      setEspera(null);
    }
  }

  return (
    <section className="mt-10" aria-labelledby="titulo-guiones">
      {espera && <Espera titulo={espera.titulo} texto={espera.texto} desde={espera.desde} estimado={40} />}
      <h2 id="titulo-guiones" className="text-[13px] text-suave">Guiones · Faro escribe antes de grabar</h2>
      <div className="mt-2 grid gap-3 rounded-[22px] bg-white p-5 shadow-[0_0_0_1px_rgba(26,24,22,.06)] md:p-6">
        <label className="grid gap-1.5 text-[13px] font-medium">¿De qué es el video?
          <textarea rows={3} value={pedido} onChange={(e) => setPedido(e.target.value)} maxLength={2000} placeholder="Por ejemplo: un reel para el lanzamiento de ANONYMO, que muestre que somos una agencia con agentes de IA" className={campo} />
        </label>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <label className="grid gap-1.5 text-[13px] font-medium"><span>Cliente <span className="font-normal text-suave">· opcional</span></span>
            <input value={cliente} onChange={(e) => setCliente(e.target.value)} maxLength={80} className={campo} />
          </label>
          <label className="grid gap-1.5 text-[13px] font-medium">Duración
            <select value={segundos} onChange={(e) => setSegundos(Number(e.target.value))} className={campo}>
              {[15, 30, 60, 90].map((s) => <option key={s} value={s}>{s} segundos</option>)}
            </select>
          </label>
        </div>
        <div>
          <button type="button" onClick={escribir} disabled={!listo || !!espera || pedido.trim().length < 10}
            className="inline-flex min-h-11 items-center rounded-full bg-tinta px-6 text-[14px] font-medium text-white transition hover:bg-black disabled:opacity-40">
            {listo ? "Que Faro escriba el guion" : "Cargando…"}
          </button>
        </div>
      </div>

      {aviso && <p role="status" className={`mt-3 rounded-2xl p-4 text-[14px] ${aviso.ok ? "bg-[#e6f6ee] text-[#17714a]" : "bg-[#fde8e4] text-[#8a1c0c]"}`}>{aviso.texto}</p>}

      <ul className="mt-3 grid gap-2" aria-label="Guiones">
        {guiones.map((g) => (
          <li key={g.id} className="rounded-2xl bg-white p-4 shadow-[0_0_0_1px_rgba(26,24,22,.06)]">
            <button type="button" onClick={() => setAbierto(abierto === g.id ? null : g.id)} aria-expanded={abierto === g.id} className="flex w-full items-center gap-3 text-left">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium">{g.titulo}</span>
                <span className="block text-[12px] text-suave">{[g.cliente, `${g.segundos} s`].filter(Boolean).join(" · ")}</span>
              </span>
              <span className={`shrink-0 rounded-full px-3 py-1 text-[12px] ${ESTADO[g.estado].clase}`}>{ESTADO[g.estado].texto}</span>
            </button>
            {abierto === g.id && (
              <div className="mt-4 grid gap-4 border-t border-borde pt-4 text-[14px]">
                <div>
                  <p className="text-[12px] text-suave">Gancho · los primeros 3 segundos</p>
                  <p className="mt-1 font-medium">{g.gancho}</p>
                </div>
                <ol className="grid gap-2">
                  {g.partes.map((p, i) => (
                    <li key={i} className="grid gap-0.5 rounded-xl bg-hueso/50 px-3 py-2">
                      <span>{i + 1}. {p.texto}</span>
                      <span className="text-[12px] text-medio">Toma: {p.toma}</span>
                    </li>
                  ))}
                </ol>
                <p><span className="text-[12px] text-suave">Cierre · </span>{g.cierre}</p>
                <div>
                  <p className="text-[12px] text-suave">Lista de rodaje</p>
                  <ul className="mt-1 list-disc pl-5 text-[13px] text-medio">{g.tomas.map((t, i) => <li key={i}>{t}</li>)}</ul>
                </div>
                <p className="text-[12px] text-suave" aria-label="Quién hizo cada paso">
                  {g.historia.map((h) => `${NOMBRE[h.quien] ?? h.quien}: ${h.que.toLowerCase()}`).join(" · ")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {g.estado === "borrador" && <button type="button" onClick={() => aprobar(g.id)} disabled={!listo || !!espera} className={botonChico}>Aprobar el guion</button>}
                  {g.estado === "aprobado" && <Link href={`/estudio/video?${new URLSearchParams({ guion: g.id, ...(g.cliente ? { cliente: g.cliente } : {}) })}#subir`} className={botonChico}>Ya lo grabé: subir el video</Link>}
                  {g.video && <Link href={`/estudio/video/${g.video}`} className={botonChico}>Ver el video →</Link>}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
