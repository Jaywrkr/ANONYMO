"use client";

// El equipo de un proyecto, en vivo (sistema/32, /36): cada agente con su cara y en qué está.
// El que trabaja muestra qué hace (pensando, buscando, escribiendo), cuántas palabras lleva y su última señal.
// Si deja de dar señales, dice «Se detuvo» y ofrece continuar: nunca un reloj que cuenta en vano.
import { leerTrabajo } from "@/app/estudio/nuevo/Enviar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { agentePorId } from "@anonymo/agentes";
import { caraSvg } from "@/lib/caras";
import { estadoTarea, TEXTO_ESTADO, type ProyectoOficina } from "@/lib/oficina";
import { accionSeguir } from "@/app/estudio/acciones";

const PUNTO: Record<string, string> = { trabajando: "bg-vivo", revisar: "bg-urgente", cola: "bg-[#cfc8bc]", listo: "bg-tinta", libre: "bg-[#e5e0d7]", detenido: "bg-[#a3260f]" };
const TEXTO: Record<string, string> = { ...TEXTO_ESTADO, listo: "Entregó", cola: "Por empezar", detenido: "Se detuvo" };
const HACE: Record<string, string> = { preparando: "preparando", esperando: "esperando respuesta de la IA", pensando: "pensando", buscando: "buscando en la web", escribiendo: "escribiendo" };

type Vivo = { vuelta: string; tarea?: string; fase?: string; palabras?: number; latido: string; desde: string; fin?: string; ia?: string };
type ConTiempos = ProyectoOficina & {
  inicios?: Record<string, string>; vueltas?: Record<string, string>; estimados?: Record<string, number>;
  revision?: { tarea: string }; error?: { mensaje: string; tarea?: string }; actualizado?: string; vivo?: Vivo;
};
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;
/** Sin señal por más de esto, la vuelta se da por muerta (igual que el servidor). */
const SIN_SENAL = 75_000;
const VUELTA_MUERTA = 330_000;

export function EquipoVivo({ inicial, entregas }: { inicial: ConTiempos; entregas: Record<string, string> }) {
  const router = useRouter();
  const [p, setP] = useState<ConTiempos>(inicial);
  // 0 hasta montar: el reloj solo se pinta en el navegador (si no, el servidor y el navegador no coinciden).
  const [ahora, setAhora] = useState(0);
  const [trabajando, setTrabajando] = useState(false);
  const firma = useRef(`${inicial.estado}:${inicial.revision?.tarea ?? ""}:${Object.values(inicial.tareas).filter((e) => e === "lista").length}`);
  useEffect(() => setP(inicial), [inicial]);
  useEffect(() => {
    const f = (e: Event) => setTrabajando(leerTrabajo(e).activo);
    addEventListener("anonymo:trabajando", f);
    return () => removeEventListener("anonymo:trabajando", f);
  }, []);
  const enCurso = p.estado === "en-curso";
  useEffect(() => {
    setAhora(Date.now());
    const reloj = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(reloj);
  }, []);
  useEffect(() => {
    if (!(trabajando || enCurso)) return;
    let sigue = true;
    const consultar = async () => {
      try {
        const r = await fetch(`/estudio/${p.id}/vivo`, { cache: "no-store" });
        if (!r.ok || !sigue) return;
        const q = (await r.json()) as ConTiempos;
        setP(q);
        // Algo cambió de verdad (entregó, terminó, se detuvo): se refresca la página para que «Ahora» lo muestre.
        const nueva = `${q.estado}:${q.revision?.tarea ?? ""}:${Object.values(q.tareas).filter((e) => e === "lista").length}`;
        if (nueva !== firma.current) { firma.current = nueva; router.refresh(); }
      } catch {}
    };
    consultar();
    const t = setInterval(consultar, 3000);
    return () => { sigue = false; clearInterval(t); };
  }, [p.id, trabajando, enCurso, router]);

  const tareas = Object.keys(p.tareas).sort((a, b) => Number(a.split(".")[0]) - Number(b.split(".")[0]));
  // Una tarea en curso está viva si su vuelta es reciente y (cuando hay señal) la señal también.
  const viva = (t: string) => {
    if (!ahora) return true;
    const v = p.vueltas?.[t] ?? p.inicios?.[t];
    if (!v || ahora - Date.parse(v) > VUELTA_MUERTA) return false;
    if (p.vivo && !p.vivo.fin && p.vivo.tarea === t) return ahora - Date.parse(p.vivo.latido) < SIN_SENAL;
    return true;
  };
  const estado = (t: string) => {
    const e = estadoTarea(p, t);
    return e === "trabajando" && !viva(t) ? "detenido" : e;
  };
  const vivos = tareas.filter((t) => estado(t) === "trabajando").length;
  const detenido = tareas.some((t) => estado(t) === "detenido");
  return (
    <div className="tarjeta p-5">
      <p className="flex items-center gap-2 text-[12px] text-suave">
        <i className={`h-1.5 w-1.5 rounded-full ${vivos || trabajando ? "late bg-vivo" : detenido ? "bg-[#a3260f]" : "bg-suave"}`} />
        {vivos ? `${vivos} trabajando ahora` : detenido ? "El equipo se detuvo" : trabajando ? "El equipo está arrancando…" : "El equipo de este proyecto"}
        {(trabajando || enCurso) && <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.12em]">En vivo</span>}
      </p>
      <ul className="mt-3 grid gap-1">
        {tareas.map((t) => {
          const id = t.split(".")[1];
          const a = agentePorId(id);
          if (!a) return null;
          const est = estado(t);
          const senal = p.vivo && p.vivo.tarea === t && !p.vivo.fin ? p.vivo : undefined;
          return (
            <li key={t}>
              <Link href={`/estudio/${p.id}/${t.replace(".", "-")}`} className={`flex min-h-11 items-center gap-3 rounded-xl px-1.5 py-1 transition hover:bg-[#f6f3ee] ${est === "detenido" ? "bg-[#fdf1ee]" : ""}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={caraSvg(id, est === "cola")} alt="" width={30} height={32} className={est === "trabajando" ? "flota" : ""} />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block text-[14px] font-medium">{a.nombre}</span>
                  <span className="block truncate text-[12px] text-suave">
                    {est === "trabajando" && senal?.fase
                      ? `${HACE[senal.fase] ?? senal.fase}${senal.fase === "esperando" && ahora ? ` · ${mmss(Math.round((ahora - Date.parse(senal.ia ?? senal.desde)) / 1000))}` : ""}${senal.palabras ? ` · ${senal.palabras.toLocaleString("es-EC")} palabras` : ""}`
                      : est === "detenido" ? "Sin señal: no está trabajando." : entregas[t] ?? a.rol}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1 text-[12px] text-medio">
                  <span className={`flex items-center gap-1.5 ${est === "detenido" ? "text-[#a3260f]" : ""}`}><i className={`h-2 w-2 rounded-full ${PUNTO[est]} ${est === "trabajando" ? "late" : ""}`} />{TEXTO[est]}</span>
                  {est === "trabajando" && ahora > 0 && p.inicios?.[t] && (() => {
                    const lleva = Math.round((ahora - Date.parse(p.inicios![t])) / 1000);
                    const suele = p.estimados?.[t] ?? 120;
                    const hace = senal ? Math.max(0, Math.round((ahora - Date.parse(senal.latido)) / 1000)) : undefined;
                    return (
                      <span className="flex items-center gap-1.5 font-mono text-[10px] text-suave" title={`Suele tardar unos ${Math.max(1, Math.round(suele / 60))} min`}>
                        {hace !== undefined && <span className="text-vivo">señal hace {hace} s ·</span>}
                        <span className="block h-[3px] w-14 overflow-hidden rounded-full bg-borde"><i className="block h-full rounded-full bg-vivo" style={{ width: `${Math.min(95, (lleva / suele) * 100)}%` }} /></span>
                        {mmss(lleva)}
                      </span>
                    );
                  })()}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {detenido && enCurso && (
        <form action={accionSeguir} className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-[#fdf1ee] p-3">
          <input type="hidden" name="id" value={p.id} />
          <input type="hidden" name="motor" value="" />
          <span className="min-w-0 flex-1 text-[13px] text-[#8a1c0c]">Lo terminado está guardado. Continuar retoma desde donde quedó.</span>
          <button className="inline-flex min-h-10 items-center rounded-full bg-tinta px-5 text-[13px] font-medium text-white">Continuar</button>
        </form>
      )}
    </div>
  );
}
