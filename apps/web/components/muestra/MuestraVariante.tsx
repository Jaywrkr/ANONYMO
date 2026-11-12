// La muestra completa (sistema/79): la franja que dice que es una idea, y la variante que le toca.
import type { ContenidoMuestra } from "@anonymo/pipeline";
import { PALETAS } from "./estilos";
import { Serena } from "./Serena";
import { Grafica } from "./Grafica";

export function MuestraVariante({ c }: { c: ContenidoMuestra }) {
  const k = PALETAS[c.plantilla][c.tono];
  return (
    <div className="font-sans" data-plantilla={c.plantilla}>
      <p className="px-5 py-2 text-center text-[12px]" style={{ background: k.tinta, color: k.fondo }}>
        Idea de web para {c.nombre}, hecha por ANONYMO. Los textos y el horario son de ejemplo.
      </p>
      {c.plantilla === "grafico" ? <Grafica c={c} k={k} /> : <Serena c={c} k={k} />}
    </div>
  );
}
