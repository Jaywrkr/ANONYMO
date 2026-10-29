"use client";

// La oficina con su panel: tocas a un agente y ves en qué está. En vivo, se actualiza mientras el equipo trabaja.
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AGENTES, AREAS } from "@anonymo/agentes";
import { puestos as calcular, TEXTO_ESTADO, type EstadoAgente, type ProyectoOficina } from "@/lib/oficina";
import { sin3D } from "@/lib/calidad";

const OficinaEscena = dynamic(() => import("./OficinaEscena"), { ssr: false });

const COLOR_ESTADO: Record<EstadoAgente, string> = {
  trabajando: "#2bb673",
  revisar: "#ffb800",
  cola: "#9a948b",
  listo: "#5fb4ff",
  libre: "#d9d3c8",
};

const etiqueta = "font-mono text-[11px] uppercase tracking-[0.14em] text-gris";

/** Lista simple del equipo: para lectores de pantalla, celulares sin 3D y como respaldo. */
function Lista({ p, onElegir }: { p: ReturnType<typeof calcular>; onElegir: (id: string) => void }) {
  return (
    <ul className="grid grid-cols-2 gap-1 sm:grid-cols-3">
      {AGENTES.map((a) => (
        <li key={a.id}>
          <button onClick={() => onElegir(a.id)} className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[14px] hover:bg-papel">
            <i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLOR_ESTADO[p[a.id].estado] }} aria-hidden />
            <span className="flex-1">{a.nombre}</span>
            <span className="text-[12px] text-gris">{p[a.id].estado === "libre" ? "" : TEXTO_ESTADO[p[a.id].estado]}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function Oficina({ proyectos, vivo, alto = "h-[300px] sm:h-[440px] lg:h-[min(62vh,620px)]" }: { proyectos: ProyectoOficina[]; vivo?: string; alto?: string }) {
  const [datos, setDatos] = useState(proyectos);
  const capa = useRef<HTMLDivElement>(null);
  const [elegido, setElegido] = useState("");
  const [con3D, setCon3D] = useState(true);
  const [trabajando, setTrabajando] = useState(false);
  useEffect(() => setDatos(proyectos), [proyectos]);
  useEffect(() => setCon3D(!sin3D()), []);

  // Mientras un botón deja trabajar al equipo (o el proyecto quedó a medias), se consulta el estado cada 3 s.
  useEffect(() => {
    const f = (e: Event) => setTrabajando(!!(e as CustomEvent<boolean>).detail);
    addEventListener("anonymo:trabajando", f);
    return () => removeEventListener("anonymo:trabajando", f);
  }, []);
  const enCurso = datos.some((d) => d.estado === "en-curso");
  useEffect(() => {
    if (!vivo || !(trabajando || enCurso)) return;
    let vivoAun = true;
    const consultar = async () => {
      try {
        const r = await fetch(`/estudio/${vivo}/vivo`, { cache: "no-store" });
        if (r.ok && vivoAun) {
          const d = (await r.json()) as ProyectoOficina;
          setDatos((xs) => xs.map((x) => (x.id === d.id ? d : x)));
        }
      } catch {}
    };
    consultar();
    const t = setInterval(consultar, 3000);
    return () => { vivoAun = false; clearInterval(t); };
  }, [vivo, trabajando, enCurso]);

  const p = useMemo(() => calcular(datos), [datos]);
  const conteo = useMemo(() => {
    const c: Partial<Record<EstadoAgente, number>> = {};
    for (const v of Object.values(p)) c[v.estado] = (c[v.estado] ?? 0) + 1;
    return c;
  }, [p]);
  const a = AGENTES.find((x) => x.id === elegido);
  const puesto = a ? p[a.id] : undefined;

  return (
    <div className="relative">
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        {(["trabajando", "revisar", "cola", "listo"] as EstadoAgente[]).map((e) => (
          <span key={e} className="flex items-center gap-2 text-[13px]">
            <i className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR_ESTADO[e] }} aria-hidden />
            {TEXTO_ESTADO[e]} <span className="text-gris">{conteo[e] ?? 0}</span>
          </span>
        ))}
        {(trabajando || enCurso) && vivo && <span className={`${etiqueta} ml-auto animate-pulse`}>En vivo</span>}
      </div>

      {con3D ? (
        <div className={`relative w-full overflow-hidden rounded-3xl bg-[#e9e3d8] ${alto}`}>
          <OficinaEscena puestos={p} elegido={elegido} onElegir={setElegido} className="absolute inset-0" capa={capa as React.RefObject<HTMLElement>} />
          <div ref={capa} className="pointer-events-none absolute inset-0 overflow-hidden" />
        </div>
      ) : (
        <Lista p={p} onElegir={setElegido} />
      )}
      <details className="mt-3">
        <summary className={`${etiqueta} cursor-pointer`}>Ver el equipo en lista</summary>
        <div className="mt-2"><Lista p={p} onElegir={setElegido} /></div>
      </details>

      {a && puesto && (
        <aside aria-label={`Panel de ${a.nombre}`} className="absolute right-3 top-14 z-30 w-[min(320px,calc(100%-24px))] rounded-3xl border border-linea bg-hueso/95 p-5 shadow-xl backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={etiqueta} style={{ color: AREAS[a.area].sombra }}>{AREAS[a.area].nombre}</p>
              <p className="display mt-1 text-4xl leading-none">{a.nombre}</p>
              <p className="mt-1 text-[14px] text-gris">{a.rol}</p>
            </div>
            <button onClick={() => setElegido("")} aria-label="Cerrar" className="h-9 w-9 rounded-full border border-linea text-lg leading-none">×</button>
          </div>
          <p className="mt-3 flex items-center gap-2 text-[14px]">
            <i className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR_ESTADO[puesto.estado] }} aria-hidden />
            {TEXTO_ESTADO[puesto.estado]}
          </p>
          {puesto.trabajos.length > 0 ? (
            <ul className="mt-3 grid gap-1">
              {puesto.trabajos.slice(0, 6).map((t) => (
                <li key={t.proyecto + t.tarea}>
                  <Link href={`/estudio/${t.proyecto}/${t.tarea.replace(".", "-")}`} className="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-[14px] hover:bg-papel">
                    <span className="truncate">{t.nombre}</span>
                    <span className="shrink-0 text-[12px] text-gris">{TEXTO_ESTADO[t.estado]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[14px] text-gris">“{a.frase}”</p>
          )}
        </aside>
      )}
    </div>
  );
}
