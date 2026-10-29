// El camino del proyecto en 5 pasos (sistema/33). Hechos en negro, el actual resaltado, los que vienen en suave.
import { PASOS, type Momento } from "@/lib/camino";

const MINI: Record<Momento["tono"], string> = {
  toca: "bg-urgente",
  otro: "bg-urgente/45",
  vivo: "bg-vivo late",
  cortado: "bg-tinta/60",
  pausa: "bg-[#cfc8bc]",
  listo: "bg-tinta",
};

/** El camino grande, con el nombre de cada paso. */
export function Camino({ m }: { m: Momento }) {
  return (
    <ol aria-label="Camino del proyecto" className="grid grid-cols-5 gap-1.5">
      {PASOS.map((p, i) => {
        const hecho = i < m.indice || m.paso === "listo";
        const actual = i === m.indice && m.paso !== "listo";
        return (
          <li key={p.id} title={p.ayuda} className="min-w-0">
            <span className={`block h-1.5 rounded-full ${hecho ? "bg-tinta" : actual ? (m.tono === "vivo" ? "bg-vivo" : m.tono === "toca" || m.tono === "otro" ? "bg-urgente" : "bg-tinta/50") : "bg-borde"}`} />
            <span className={`mt-2 flex items-center gap-1.5 text-[12px] sm:text-[13px] ${actual ? "font-medium text-tinta" : hecho ? "text-tinta" : "text-suave"}`}>
              {hecho && <span aria-hidden className="hidden sm:inline">✓</span>}
              {actual && <i aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${m.tono === "vivo" ? "late bg-vivo" : "bg-urgente"}`} />}
              <span className="truncate">{p.nombre}</span>
              <span className="sr-only">{hecho ? " · hecho" : actual ? " · ahora" : " · después"}</span>
            </span>
          </li>
        );
      })}
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
