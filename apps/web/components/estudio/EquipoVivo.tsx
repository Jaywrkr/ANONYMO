"use client";

// El equipo de un proyecto, en vivo (sistema/32): cada agente con su cara y en qué está.
// Mientras un botón deja trabajar al equipo (o el proyecto quedó en curso) consulta el estado cada 3 s.
import { leerTrabajo } from "@/app/estudio/nuevo/Enviar";
import Link from "next/link";
import { useEffect, useState } from "react";
import { agentePorId } from "@anonymo/agentes";
import { caraSvg } from "@/lib/caras";
import { estadoTarea, TEXTO_ESTADO, type ProyectoOficina } from "@/lib/oficina";

const PUNTO: Record<string, string> = { trabajando: "bg-vivo", revisar: "bg-urgente", cola: "bg-[#cfc8bc]", listo: "bg-tinta", libre: "bg-[#e5e0d7]" };
const TEXTO: Record<string, string> = { ...TEXTO_ESTADO, listo: "Entregó", cola: "Por empezar" };

export function EquipoVivo({ inicial, entregas }: { inicial: ProyectoOficina; entregas: Record<string, string> }) {
  const [p, setP] = useState(inicial);
  const [trabajando, setTrabajando] = useState(false);
  useEffect(() => setP(inicial), [inicial]);
  useEffect(() => {
    const f = (e: Event) => setTrabajando(leerTrabajo(e).activo);
    addEventListener("anonymo:trabajando", f);
    return () => removeEventListener("anonymo:trabajando", f);
  }, []);
  const enCurso = p.estado === "en-curso";
  useEffect(() => {
    if (!(trabajando || enCurso)) return;
    let sigue = true;
    const consultar = async () => {
      try {
        const r = await fetch(`/estudio/${p.id}/vivo`, { cache: "no-store" });
        if (r.ok && sigue) setP((await r.json()) as ProyectoOficina);
      } catch {}
    };
    consultar();
    const t = setInterval(consultar, 3000);
    return () => { sigue = false; clearInterval(t); };
  }, [p.id, trabajando, enCurso]);

  const tareas = Object.keys(p.tareas).sort((a, b) => Number(a.split(".")[0]) - Number(b.split(".")[0]));
  const vivos = tareas.filter((t) => estadoTarea(p, t) === "trabajando").length;
  return (
    <div className="tarjeta p-5">
      <p className="flex items-center gap-2 text-[12px] text-suave">
        <i className={`h-1.5 w-1.5 rounded-full ${vivos || trabajando ? "late bg-vivo" : "bg-suave"}`} />
        {vivos ? `${vivos} trabajando ahora` : trabajando ? "El equipo está arrancando…" : "El equipo de este proyecto"}
        {(trabajando || enCurso) && <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.12em]">En vivo</span>}
      </p>
      <ul className="mt-3 grid gap-1">
        {tareas.map((t) => {
          const id = t.split(".")[1];
          const a = agentePorId(id);
          if (!a) return null;
          const est = estadoTarea(p, t);
          return (
            <li key={t}>
              <Link href={`/estudio/${p.id}/${t.replace(".", "-")}`} className="flex min-h-11 items-center gap-3 rounded-xl px-1.5 py-1 transition hover:bg-[#f6f3ee]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={caraSvg(id, est === "cola")} alt="" width={30} height={32} className={est === "trabajando" ? "flota" : ""} />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block text-[14px] font-medium">{a.nombre}</span>
                  <span className="block truncate text-[12px] text-suave">{entregas[t] ?? a.rol}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-[12px] text-medio">
                  <i className={`h-2 w-2 rounded-full ${PUNTO[est]} ${est === "trabajando" ? "late" : ""}`} />
                  {TEXTO[est]}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
