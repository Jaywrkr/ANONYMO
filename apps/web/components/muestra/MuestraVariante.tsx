// La muestra completa: la franja que dice que es una idea, y la variante que le toca (rehechas en sistema/84).
import "@fontsource-variable/bricolage-grotesque/wdth.css";
import "@fontsource-variable/fraunces/soft.css";
import "@fontsource-variable/fraunces/soft-italic.css";
import type { ContenidoMuestra } from "@anonymo/pipeline";
import { PALETAS } from "./estilos";
import { EstilosMuestra } from "./Cielo";
import { Serena } from "./Serena";
import { Grafica } from "./Grafica";

/** `fotos`: las direcciones de las fotos que subió el negocio (sistema/82). Sin fotos, un cielo de color hace de imagen. */
export function MuestraVariante({ c, fotos = [] }: { c: ContenidoMuestra; fotos?: string[] }) {
  const k = PALETAS[c.plantilla][c.tono];
  return (
    <div className="font-sans" data-plantilla={c.plantilla}>
      <EstilosMuestra />
      <p className="px-5 py-2 text-center text-[12px] leading-snug" style={{ background: k.tinta, color: k.fondo }}>
        Idea de web para {c.nombre}, hecha por ANONYMO. {c.horarioReal ? "Los textos son de ejemplo." : "Los textos y el horario son de ejemplo."}
      </p>
      {c.plantilla === "grafico" ? <Grafica c={c} k={k} fotos={fotos} /> : <Serena c={c} k={k} fotos={fotos} />}
    </div>
  );
}
