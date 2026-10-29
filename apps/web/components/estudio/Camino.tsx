// El camino del proyecto en 5 pasos (sistema/33). Hechos en negro, el actual resaltado, los que vienen en suave.
import { PASOS, nombreFase, type Momento, type ProyectoCamino } from "@/lib/camino";

const MINI: Record<Momento["tono"], string> = {
  toca: "bg-urgente",
  otro: "bg-urgente/45",
  vivo: "bg-vivo late",
  cortado: "bg-tinta/60",
  pausa: "bg-[#cfc8bc]",
  listo: "bg-tinta",
};

/** Qué pasa en el paso actual, en dos palabras. */
const ESTADO: Record<Momento["tono"], string> = {
  vivo: "trabajando", toca: "te toca revisar", otro: "revisa tu socio", cortado: "se detuvo", pausa: "en pausa", listo: "listo",
};

/**
 * El camino grande (sistema/44): Pedido, Plan, cada fase del plan con su avance, y Listo.
 * Así se ve en qué fase va y si ahora trabajan o te toca a ti (en «un agente a la vez» se alternan todo el rato).
 */
export function Camino({ m, p }: { m: Momento; p: ProyectoCamino }) {
  const fases = p.plan.fases;
  const enPlan = m.paso === "pedido" || m.paso === "plan";
  const pasos = [
    { id: "pedido", nombre: "Pedido", ayuda: "Contaste lo que quiere el cliente.", hecho: true, actual: false, detalle: "" },
    { id: "plan", nombre: "Plan", ayuda: "Atlas decide quién trabaja.", hecho: !enPlan, actual: enPlan, detalle: enPlan ? "te toca aprobar" : "" },
    ...fases.map((f) => {
      const ts = p.plan.tareas.filter((t) => t.startsWith(`${f}.`));
      const listas = ts.filter((t) => p.tareas[t] === "lista").length;
      const actual = !enPlan && m.paso !== "listo" && f === p.faseActual;
      const hecho = m.paso === "listo" || (!enPlan && f < p.faseActual && listas === ts.length);
      return { id: `f${f}`, nombre: nombreFase(f), ayuda: `${ts.length} entrega${ts.length === 1 ? "" : "s"} en esta fase.`, hecho, actual,
        detalle: actual ? `${ESTADO[m.tono]} · ${listas}/${ts.length}` : hecho ? "" : `${ts.length} entrega${ts.length === 1 ? "" : "s"}` };
    }),
    { id: "listo", nombre: "Listo", ayuda: "Todas las fases aprobadas.", hecho: m.paso === "listo", actual: false, detalle: "" },
  ];
  const color = m.tono === "vivo" ? "bg-vivo" : m.tono === "toca" || m.tono === "otro" ? "bg-urgente" : "bg-tinta/50";
  return (
    <ol aria-label="Camino del proyecto" className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${pasos.length}, minmax(0, 1fr))` }}>
      {pasos.map((x) => (
        <li key={x.id} title={x.ayuda} className="min-w-0">
          <span className={`block h-1.5 rounded-full ${x.hecho ? "bg-tinta" : x.actual ? color : "bg-borde"}`} />
          <span className={`mt-2 flex items-center gap-1.5 text-[12px] sm:text-[13px] ${x.actual ? "font-medium text-tinta" : x.hecho ? "text-tinta" : "text-suave"}`}>
            {x.hecho && <span aria-hidden className="hidden sm:inline">✓</span>}
            {x.actual && <i aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${m.tono === "vivo" ? "late bg-vivo" : m.tono === "toca" || m.tono === "otro" ? "bg-urgente" : "bg-tinta/50"}`} />}
            <span className="truncate">{x.nombre}</span>
          </span>
          {x.detalle && <span className={`mt-0.5 block truncate text-[11px] ${x.actual ? "text-medio" : "text-suave"}`}>{x.detalle}</span>}
          <span className="sr-only">{x.hecho ? " · hecho" : x.actual ? " · ahora" : " · después"}</span>
        </li>
      ))}
    </ol>
  );
}

/** El camino en chico, para las filas del inicio. */
export function CaminoMini({ m }: { m: Momento }) {
  return (
    <span className="flex items-center gap-1" role="img" aria-label={`Paso ${m.indice + 1} de 5: ${PASOS[m.indice].nombre}`}>
      {PASOS.map((p, i) => {
        const hecho = i < m.indice || m.paso === "listo";
        const actual = i === m.indice && m.paso !== "listo";
        return <i key={p.id} title={p.nombre} className={`block h-1.5 rounded-full transition-all ${actual ? `w-6 ${MINI[m.tono]}` : `w-3 ${hecho ? "bg-tinta" : "bg-borde"}`}`} />;
      })}
      <span className="ml-1.5 text-[12px] text-suave">{PASOS[m.indice].nombre}</span>
    </span>
  );
}
