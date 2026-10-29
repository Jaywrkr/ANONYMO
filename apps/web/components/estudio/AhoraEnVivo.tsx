"use client";

// Qué está haciendo el agente ahora mismo, en el panel «Ahora» (sistema/42): fase, palabras y cuánto lleva.
// Así se sabe que hay que esperar, y por qué. Se actualiza cada 3 s.
import { useEffect, useState } from "react";
import { agentePorId } from "@anonymo/agentes";

type Vivo = { tarea?: string; fase?: string; palabras?: number; latido: string; desde: string; ia?: string; fin?: string };
const FASE: Record<string, string> = { preparando: "preparándose", esperando: "esperando respuesta de la IA", pensando: "pensando", buscando: "buscando en la web", escribiendo: "escribiendo" };
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

export function AhoraEnVivo({ id }: { id: string }) {
  const [v, setV] = useState<Vivo | undefined>();
  const [ahora, setAhora] = useState(0);
  useEffect(() => {
    let sigue = true;
    const leer = async () => {
      try {
        const r = await fetch(`/estudio/${id}/vivo`, { cache: "no-store" });
        if (r.ok && sigue) setV(((await r.json()) as { vivo?: Vivo }).vivo);
      } catch {}
    };
    leer();
    const a = setInterval(leer, 3000);
    const b = setInterval(() => setAhora(Date.now()), 1000);
    setAhora(Date.now());
    return () => { sigue = false; clearInterval(a); clearInterval(b); };
  }, [id]);
  if (!v || v.fin || !ahora) return null;
  const quien = v.tarea ? agentePorId(v.tarea.split(".")[1])?.nombre : "El equipo";
  const lleva = Math.round((ahora - Date.parse(v.desde)) / 1000);
  const espera = v.fase === "esperando" || (v.fase === "pensando" && v.ia) ? Math.round((ahora - Date.parse(v.ia ?? v.desde)) / 1000) : 0;
  return (
    <div role="status" aria-live="polite" className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-[#f6f3ee] px-4 py-3 text-[13px]">
      <i className="late h-2 w-2 rounded-full bg-vivo" />
      <span className="font-medium">{quien} · {FASE[v.fase ?? ""] ?? "trabajando"}</span>
      {v.palabras ? <span className="text-medio">{v.palabras.toLocaleString("es-EC")} palabras</span> : null}
      {espera > 20 ? <span className="text-medio">la IA no habla hace {mmss(espera)}</span> : null}
      <span className="ml-auto font-mono text-[12px] text-suave">vuelta {mmss(lleva)}</span>
      <span className="basis-full text-[12px] text-suave">Está trabajando: no hace falta tocar nada. Puedes seguir mirando y te avisamos cuando termine.</span>
    </div>
  );
}
