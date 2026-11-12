"use client";

// La tanda de celular (sistema/72): un negocio por pantalla, con su muestra y el mensaje listo.
// Enviar abre WhatsApp y lo marca como contactado; Saltar lo deja para el final; Descartar lo saca de la lista.
import { useMemo, useState } from "react";
import Link from "next/link";
import type { VistaProspecto } from "@/lib/clientes";
import { armarTanda } from "@/lib/tanda";
import { AhoraMismo } from "./AhoraMismo";
import { AvisosCelular } from "./AvisosCelular";
import { colorOportunidad } from "./ClientesNuevos";

async function patch(id: string, cuerpo: Record<string, unknown>) {
  const r = await fetch(`/estudio/clientes/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(cuerpo) });
  const j = (await r.json().catch(() => ({}))) as { prospecto?: VistaProspecto; error?: string };
  if (!r.ok || !j.prospecto) throw new Error(j.error ?? `No se pudo (${r.status}). Vuelve a intentarlo.`);
  return j.prospecto;
}

export function Tanda({ inicial, tope, clavePublica }: { inicial: VistaProspecto[]; tope: number; clavePublica?: string }) {
  const [lista, setLista] = useState(inicial);
  const [cola, setCola] = useState(() => armarTanda(inicial, tope).propuestos.map((p) => p.id));
  const [guardando, setGuardando] = useState("");
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [verTodo, setVerTodo] = useState(false);
  const { enviadosHoy, quedan } = useMemo(() => armarTanda(lista, tope), [lista, tope]);
  const actual = lista.find((p) => p.id === cola[0]);
  const ocupado = !!guardando;

  const reemplazar = (p: VistaProspecto) => setLista((l) => l.map((x) => (x.id === p.id ? p : x)));
  const siguiente = () => { setCola((c) => c.slice(1)); setVerTodo(false); };

  async function marcar(estado: "contactado" | "descartado", hecho: string) {
    if (!actual || ocupado) return;
    setGuardando(estado === "contactado" ? "Marcando como enviado" : "Descartando");
    setAviso(null);
    try {
      reemplazar(await patch(actual.id, { estado }));
      setAviso({ ok: true, texto: hecho });
      siguiente();
    } catch (e) {
      setAviso({ ok: false, texto: (e as Error).message });
    } finally {
      setGuardando("");
    }
  }

  function saltar() {
    if (!actual || ocupado) return;
    setCola((c) => [...c.slice(1), c[0]!]);
    setVerTodo(false);
    setAviso({ ok: true, texto: `${actual.nombre} queda para el final.` });
  }

  const lleno = quedan === 0;
  return (
    <div className="mx-auto grid max-w-xl gap-4 pb-40">
      <AhoraMismo inicial={inicial} />
      <div className="grid gap-2">
        <p className="text-[14px]"><span className="font-medium">{enviadosHoy} de {tope}</span> <span className="text-medio">enviados hoy{actual ? ` · quedan ${cola.length} en la tanda` : ""}</span></p>
        <div className="h-2.5 overflow-hidden rounded-full bg-[#d9d4cb]" aria-hidden><div className="h-full rounded-full bg-[#25d366] transition-all" style={{ width: `${Math.min(100, (enviadosHoy / tope) * 100)}%` }} /></div>
      </div>
      <AvisosCelular clavePublica={clavePublica} compacto />

      {aviso && <p role="status" className={`rounded-2xl px-4 py-3 text-[14px] ${aviso.ok ? "bg-[#e6f6ee] text-[#17714a]" : "bg-[#fde8e4] text-[#8a1c0c]"}`}>{aviso.texto}</p>}

      {!actual || lleno ? (
        <section aria-label="Tanda terminada" className="rounded-3xl bg-white p-8 text-center shadow-[0_0_0_1px_rgba(26,24,22,.06)]">
          <p className="text-[22px] font-medium">{lleno ? `Llegaste a los ${tope} de hoy.` : enviadosHoy ? "Tanda lista por hoy." : "No hay a quién escribir."}</p>
          <p className="mt-2 text-[14px] text-medio">{lleno ? "Mañana sigue: así WhatsApp no bloquea el número." : enviadosHoy ? "Cuando alguien abra su muestra, aparece arriba y te suena el celular." : "Dile a Imán que busque más negocios."}</p>
          <Link href="/estudio/clientes/nuevos" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-tinta px-6 text-[14px] font-medium text-white">Volver a Clientes nuevos</Link>
        </section>
      ) : (
        <article aria-label={`Negocio: ${actual.nombre}`} aria-busy={ocupado} className="grid gap-4 rounded-3xl bg-white p-5 shadow-[0_0_0_1px_rgba(26,24,22,.06)]">
          <div className="flex gap-4">
            <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-[20px] font-medium ${colorOportunidad(actual.puntaje)}`} aria-label={`Oportunidad ${actual.puntaje} de 100`}><span className="grid place-items-center leading-none">{actual.puntaje}<span className="mt-1 text-[9px] font-normal opacity-75">oportunidad</span></span></div>
            <div className="min-w-0">
              <h2 className="text-[20px] font-medium leading-tight">{actual.nombre}</h2>
              <p className="text-[13px] text-suave">{actual.rubro} · {actual.ciudad}{actual.estrellas ? ` · ★ ${actual.estrellas} (${actual.resenas})` : ""}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {actual.motivos.map((m) => <span key={m} className="rounded-md bg-hueso px-2 py-0.5 text-[12px] text-medio">{m}</span>)}
            {actual.buenaFama && <span className="rounded-md bg-[#fff1d6] px-2 py-0.5 text-[12px] text-[#8a5a00]">Muy buena fama</span>}
          </div>
          <a href={actual.muestra} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-2xl bg-hueso/70 px-4 py-3 text-[14px]">
            <span><span className="font-medium">Su muestra</span> <span className="text-medio">· va en el mensaje</span></span><span aria-hidden>↗</span>
          </a>
          <div className="rounded-2xl bg-hueso/40 p-4">
            <p className="text-[12px] text-suave">El mensaje</p>
            <p className={`mt-1 whitespace-pre-line text-[14px] leading-relaxed ${verTodo ? "" : "line-clamp-4"}`}>{actual.mensaje}</p>
            <button type="button" onClick={() => setVerTodo(!verTodo)} className="mt-1 text-[13px] text-medio underline underline-offset-4">{verTodo ? "Ver menos" : "Ver todo"}</button>
          </div>
        </article>
      )}

      {actual && !lleno && (
        <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-30 px-4 lg:bottom-6">
          <div className="mx-auto grid max-w-xl gap-2 rounded-3xl bg-white/95 p-3 shadow-[0_12px_40px_rgba(26,24,22,.18)] backdrop-blur">
            {guardando && <p role="status" className="text-center text-[13px] text-medio">{guardando}…</p>}
            <a href={actual.whatsapp} target="_blank" rel="noreferrer" aria-disabled={ocupado}
              onClick={(e) => { if (ocupado) { e.preventDefault(); return; } void marcar("contactado", `Enviado a ${actual.nombre}. Sigue el próximo.`); }}
              className={`inline-flex min-h-14 items-center justify-center rounded-2xl bg-[#25d366] text-[16px] font-medium text-black ${ocupado ? "pointer-events-none opacity-60" : ""}`}>
              Enviar por WhatsApp
            </a>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={saltar} disabled={ocupado} className="min-h-11 rounded-2xl bg-hueso text-[14px] disabled:opacity-50">Saltar</button>
              <button type="button" onClick={() => void marcar("descartado", `${actual.nombre} quedó descartado.`)} disabled={ocupado} className="min-h-11 rounded-2xl bg-hueso text-[14px] text-[#a33a0b] disabled:opacity-50">Descartar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
