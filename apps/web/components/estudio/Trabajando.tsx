"use client";

// Mientras el equipo trabaja (sistema/33): un aviso que dice qué pasa, quién está en qué y cuánto lleva.
// Se puede achicar a una píldora para seguir mirando el estudio en la misma pestaña.
import { useEffect, useState } from "react";
import { agentePorId } from "@anonymo/agentes";
import { caraSvg } from "@/lib/caras";
import { leerTrabajo, type Trabajo } from "@/app/estudio/nuevo/Enviar";

interface Vivo { tareas: Record<string, string> }

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function Trabajando() {
  const [t, setT] = useState<Trabajo>({ activo: false });
  const [desde, setDesde] = useState(0);
  const [ahora, setAhora] = useState(0);
  const [chico, setChico] = useState(false);
  const [vivo, setVivo] = useState<Vivo | null>(null);

  useEffect(() => {
    const f = (e: Event) => {
      const x = leerTrabajo(e);
      if (!x.largo) return;
      setT(x);
      if (x.activo) { setDesde(Date.now()); setAhora(Date.now()); setChico(false); setVivo(null); }
    };
    addEventListener("anonymo:trabajando", f);
    return () => removeEventListener("anonymo:trabajando", f);
  }, []);

  // Reloj y estado en vivo del proyecto.
  useEffect(() => {
    if (!t.activo) return;
    const reloj = setInterval(() => setAhora(Date.now()), 1000);
    let sigue = true;
    const consultar = async () => {
      if (!t.proyecto) return;
      try {
        const r = await fetch(`/estudio/${t.proyecto}/vivo`, { cache: "no-store" });
        if (r.ok && sigue) setVivo(await r.json());
      } catch {}
    };
    consultar();
    const sondeo = setInterval(consultar, 3000);
    // Cerrar la pestaña corta el trabajo: el navegador avisa antes.
    const antes = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    addEventListener("beforeunload", antes);
    return () => { sigue = false; clearInterval(reloj); clearInterval(sondeo); removeEventListener("beforeunload", antes); };
  }, [t.activo, t.proyecto]);

  if (!t.activo) return null;
  const seg = Math.max(0, Math.round((ahora - desde) / 1000));
  const tareas = Object.entries(vivo?.tareas ?? {});
  const enCurso = tareas.filter(([, e]) => e === "en-curso").map(([x]) => x.split(".")[1]);
  const hechas = tareas.filter(([, e]) => e === "lista").length;
  const quien = enCurso.length ? enCurso : ["atlas"];

  if (chico) {
    return (
      <button type="button" onClick={() => setChico(false)} className="fixed bottom-4 right-4 z-[70] flex min-h-12 items-center gap-3 rounded-full bg-tinta py-2 pl-2 pr-5 text-[13px] text-white shadow-[0_18px_44px_-14px_rgba(20,15,10,.5)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={caraSvg(quien[0])} alt="" width={30} height={32} className="flota" />
        <span>{t.texto ?? "El equipo está trabajando…"}</span>
        <span className="font-mono text-[11px] text-white/60">{mmss(seg)}</span>
      </button>
    );
  }

  return (
    <div role="status" aria-live="polite" className="fixed inset-0 z-[70] grid place-items-center bg-tinta/25 p-4 backdrop-blur-[3px]">
      <div className="dialogo w-[min(460px,100%)] rounded-[24px] bg-carta p-7 text-center shadow-[0_0_0_1px_rgba(26,24,22,.06),0_30px_80px_-20px_rgba(20,15,10,.45)]">
        <div className="flex items-end justify-center gap-2">
          {quien.slice(0, 4).map((id, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={id} src={caraSvg(id)} alt="" width={64} height={69} className="flota" style={{ animationDelay: `${i * 0.25}s` }} />
          ))}
        </div>
        <p className="mt-5 font-serif text-[30px] leading-[1.05]">{t.texto ?? "El equipo está trabajando…"}</p>
        <p className="mt-2 text-[14px] text-medio">
          {enCurso.length
            ? `Ahora: ${enCurso.map((i) => agentePorId(i)?.nombre).join(", ")}${tareas.length ? ` · ${hechas} de ${tareas.length} entregas listas` : ""}`
            : "Preparando el trabajo…"}
        </p>
        <div className="mx-auto mt-5 h-[3px] w-48 overflow-hidden rounded-full bg-borde"><i className="avanza block h-full w-1/3 rounded-full bg-tinta" /></div>
        <p className="mt-3 font-mono text-[12px] text-suave">{mmss(seg)}</p>
        <p className="mx-auto mt-4 max-w-sm text-[13px] leading-relaxed text-medio">
          Puede tardar unos minutos. Deja esta pestaña abierta: si se corta, lo terminado queda guardado y puedes continuar.
        </p>
        <button type="button" onClick={() => setChico(true)} className="mt-5 inline-flex min-h-11 items-center rounded-full bg-white px-5 text-[13px] font-medium shadow-[inset_0_0_0_1px_var(--color-borde)]">Achicar y seguir mirando</button>
      </div>
    </div>
  );
}
