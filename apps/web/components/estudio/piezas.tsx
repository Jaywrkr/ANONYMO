// Piezas del estudio (sistema/32). Sin estado: sirven en páginas del servidor y del navegador.
import { FASES, agentePorId } from "@anonymo/agentes";
import { caraSvg } from "@/lib/caras";

/** Un agente con su color, sus ojos y su distintivo. */
export function Cara({ id, tam = 32, apagado = false, flota = false, className = "", titulo = true }: { id: string; tam?: number; apagado?: boolean; flota?: boolean; className?: string; titulo?: boolean }) {
  const a = agentePorId(id);
  if (!a) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={caraSvg(id, apagado)}
      alt=""
      title={titulo ? `${a.nombre} · ${a.rol}` : undefined}
      width={tam}
      height={Math.round(tam * 1.083)}
      draggable={false}
      className={`inline-block shrink-0 select-none ${flota ? "flota" : ""} ${className}`}
      style={{ width: tam, height: Math.round(tam * 1.083) }}
    />
  );
}

/** Varias caras encimadas, como avatares. */
export function Caras({ ids, tam = 22, max = 4 }: { ids: string[]; tam?: number; max?: number }) {
  const unicos = [...new Set(ids)];
  const resto = unicos.length - max;
  return (
    <span className="inline-flex items-center" aria-label={unicos.map((i) => agentePorId(i)?.nombre).filter(Boolean).join(", ")}>
      {unicos.slice(0, max).map((i, n) => <Cara key={i} id={i} tam={tam} className={n ? "-ml-[6px]" : ""} />)}
      {resto > 0 && <span className="ml-1 text-[11px] text-suave">+{resto}</span>}
    </span>
  );
}

export type EstadoFase = "hecha" | "actual" | "revisar" | "pendiente";

/** Las fases como pastillas: hechas en negro, la que espera tu revisión en naranja, la que corre con un punto vivo. */
export function Fases({ fases, estado, compacta = false }: { fases: { n: number; estado: EstadoFase }[]; estado?: string; compacta?: boolean }) {
  return (
    <ol className={`flex flex-wrap items-center ${compacta ? "gap-1" : "gap-1.5"}`} aria-label="Fases del proyecto">
      {fases.map((f) => {
        const nombre = FASES.find((x) => x.n === f.n)?.nombre ?? `Fase ${f.n}`;
        const clase =
          f.estado === "hecha" ? "bg-tinta text-white" :
          f.estado === "revisar" ? "bg-urgente text-white" :
          f.estado === "actual" ? "bg-white text-tinta shadow-[inset_0_0_0_1px_var(--color-tinta)]" :
          "text-suave shadow-[inset_0_0_0_1px_var(--color-borde)]";
        const que = f.estado === "revisar" ? "espera tu revisión" : f.estado === "hecha" ? "hecha" : f.estado === "actual" ? "en curso" : "por venir";
        return (
          <li key={f.n} title={`${nombre} · ${que}`} className={`inline-flex items-center gap-1.5 rounded-full ${compacta ? "h-6 px-2 text-[11px]" : "h-8 px-3 text-[13px]"} ${clase}`}>
            {f.estado === "hecha" && <span aria-hidden>✓</span>}
            {f.estado === "actual" && estado === "en-curso" && <i aria-hidden className="late h-1.5 w-1.5 rounded-full bg-vivo" />}
            <span>{compacta ? nombre.split(" ")[0] : nombre}</span>
            <span className="sr-only"> · {que}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Estado de cada fase a partir del proyecto. */
export function estadosDeFases(p: { estado: string; faseActual: number; plan: { fases: number[] }; tareas: Record<string, string> }): { n: number; estado: EstadoFase }[] {
  return p.plan.fases.map((n) => {
    const tareas = Object.entries(p.tareas).filter(([t]) => t.startsWith(`${n}.`));
    const todas = tareas.length > 0 && tareas.every(([, e]) => e === "lista");
    if (p.estado === "listo" || (todas && n < p.faseActual)) return { n, estado: "hecha" as const };
    if (n === p.faseActual && p.estado === "esperando") return { n, estado: "revisar" as const };
    if (n === p.faseActual && p.estado !== "plan") return { n, estado: "actual" as const };
    return { n, estado: "pendiente" as const };
  });
}

/** Barra fina de avance. */
export function Avance({ valor, color = "var(--color-tinta)", vivo = false }: { valor: number; color?: string; vivo?: boolean }) {
  const v = Math.max(0, Math.min(1, valor));
  return (
    <span className="relative block h-[3px] w-full overflow-hidden rounded-full bg-borde" role="img" aria-label={`${Math.round(v * 100)}%`}>
      <i className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700" style={{ width: `${v * 100}%`, background: color }} />
      {vivo && <i className="avanza absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/80 to-transparent" />}
    </span>
  );
}

/** "recién", "hace 5 min", "hace 2 h", "ayer", "12 oct". */
export function hace(fecha: string | number, ahora = Date.now()) {
  const t = typeof fecha === "number" ? fecha : Date.parse(fecha.replace(" ", "T") + (fecha.length <= 16 ? ":00Z" : ""));
  if (!Number.isFinite(t)) return "";
  const s = Math.max(0, (ahora - t) / 1000);
  if (s < 60) return "recién";
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  if (s < 172800) return "ayer";
  return new Date(t).toLocaleDateString("es-EC", { day: "numeric", month: "short", timeZone: "America/Guayaquil" });
}

/** Saludo según la hora en Cuenca. */
export function saludo(nombre: string, ahora = new Date()) {
  const h = Number(ahora.toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "America/Guayaquil" })) % 24;
  return `${h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches"}, ${nombre}.`;
}

export function fechaLarga(ahora = new Date()) {
  const f = ahora.toLocaleDateString("es-EC", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Guayaquil" });
  return f.charAt(0).toUpperCase() + f.slice(1);
}
