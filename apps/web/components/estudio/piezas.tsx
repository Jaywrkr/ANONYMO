// Piezas de la interfaz del estudio (sistema/31). Sin estado: sirven en páginas del servidor y del navegador.
import Link from "next/link";
import { AREAS, FASES, agentePorId } from "@anonymo/agentes";

/** La cara de un agente en 2D: el mismo óvalo con degradado y dos ojos de la versión 3D. */
export function Ficha({ id, tam = 36, apagado = false, className = "" }: { id: string; tam?: number; apagado?: boolean; className?: string }) {
  const a = agentePorId(id);
  if (!a) return null;
  const area = AREAS[a.area];
  return (
    <span
      aria-hidden
      title={a.nombre}
      className={`relative inline-block shrink-0 rounded-[48%] ${className}`}
      style={{
        width: tam,
        height: tam * 1.08,
        background: apagado ? "radial-gradient(circle at 35% 30%, #fff, #d9d4cb 70%)" : `radial-gradient(circle at 35% 30%, ${area.luz}, ${area.medio} 62%, ${area.sombra})`,
        boxShadow: "inset -2px -3px 6px rgba(0,0,0,.12)",
      }}
    >
      <i className="absolute rounded-full bg-tinta" style={{ width: tam * 0.1, height: tam * 0.1, left: "36%", top: "44%" }} />
      <i className="absolute rounded-full bg-tinta" style={{ width: tam * 0.1, height: tam * 0.1, left: "56%", top: "44%" }} />
    </span>
  );
}

export type EstadoFase = "hecha" | "actual" | "revisar" | "pendiente";

/** Las fases del proyecto como un camino: hechas, la actual y las que faltan. */
export function LineaFases({ fases, estado, compacta = false }: { fases: { n: number; estado: EstadoFase }[]; estado?: string; compacta?: boolean }) {
  return (
    <ol className={`flex items-center ${compacta ? "gap-1" : "gap-2"}`} aria-label="Fases del proyecto">
      {fases.map((f, i) => {
        const nombre = FASES.find((x) => x.n === f.n)?.nombre ?? `Fase ${f.n}`;
        const clase =
          f.estado === "hecha" ? "bg-tinta text-hueso border-tinta" :
          f.estado === "revisar" ? "bg-[#ffd43d] text-tinta border-[#e0b400]" :
          f.estado === "actual" ? "bg-hueso text-tinta border-tinta" : "bg-transparent text-gris border-linea";
        return (
          <li key={f.n} className="flex items-center gap-1">
            {i > 0 && <span aria-hidden className={`h-px ${compacta ? "w-2" : "w-5"} ${f.estado === "pendiente" ? "bg-linea" : "bg-tinta"}`} />}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border ${compacta ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-[13px]"} ${clase}`}
              title={`${nombre}${f.estado === "revisar" ? " · espera revisión" : f.estado === "hecha" ? " · hecha" : f.estado === "actual" ? " · en curso" : ""}`}
            >
              {f.estado === "hecha" ? <span aria-hidden>✓</span> : f.estado === "revisar" ? <span aria-hidden>!</span> : f.estado === "actual" && estado === "en-curso" ? <i className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#2bb673]" /> : null}
              {compacta ? String(f.n).padStart(2, "0") : nombre}
            </span>
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

/** Anillo de avance. */
export function Anillo({ valor, tam = 44, grosor = 4, etiqueta }: { valor: number; tam?: number; grosor?: number; etiqueta?: string }) {
  const r = (tam - grosor) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, valor));
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: tam, height: tam }} role="img" aria-label={etiqueta ?? `${Math.round(v * 100)}%`}>
      <svg width={tam} height={tam} className="-rotate-90">
        <circle cx={tam / 2} cy={tam / 2} r={r} fill="none" stroke="var(--color-linea)" strokeWidth={grosor} />
        <circle cx={tam / 2} cy={tam / 2} r={r} fill="none" stroke="var(--color-tinta)" strokeWidth={grosor} strokeDasharray={c} strokeDashoffset={c * (1 - v)} strokeLinecap="round" />
      </svg>
      <span className="absolute font-mono text-[10px]">{Math.round(v * 100)}</span>
    </span>
  );
}

/** Una cifra grande con su nombre y, si se quiere, a dónde lleva. */
export function Cifra({ valor, nombre, detalle, href, tono }: { valor: string | number; nombre: string; detalle?: string; href?: string; tono?: "alerta" | "bien" }) {
  const fondo = tono === "alerta" ? "bg-[#fff1c2]" : tono === "bien" ? "bg-[#e3f5e1]" : "bg-papel";
  const cuerpo = (
    <>
      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-gris">{nombre}</span>
      <span className="display mt-1 block text-[clamp(36px,4vw,52px)] leading-none">{valor}</span>
      {detalle && <span className="mt-1 block text-[13px] text-gris">{detalle}</span>}
    </>
  );
  return href ? (
    <Link href={href} className={`block rounded-3xl p-5 transition-transform hover:-translate-y-0.5 ${fondo}`}>{cuerpo}</Link>
  ) : (
    <div className={`rounded-3xl p-5 ${fondo}`}>{cuerpo}</div>
  );
}

/** "hace 5 min", "hace 2 h", "ayer", "12 oct". */
export function hace(fecha: string | number, ahora = Date.now()) {
  const t = typeof fecha === "number" ? fecha : Date.parse(fecha.replace(" ", "T") + (fecha.length <= 16 ? ":00Z" : ""));
  if (!Number.isFinite(t)) return "";
  const s = Math.max(0, (ahora - t) / 1000);
  if (s < 60) return "recién";
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  if (s < 172800) return "ayer";
  return new Date(t).toLocaleDateString("es-EC", { day: "numeric", month: "short" });
}
