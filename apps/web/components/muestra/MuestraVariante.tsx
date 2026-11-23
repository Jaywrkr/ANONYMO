// La muestra completa: la franja que dice que es una idea, y la variante que le toca (rehechas en sistema/84).
import "@fontsource-variable/bricolage-grotesque/wdth.css";
import "@fontsource-variable/fraunces/soft.css";
import "@fontsource-variable/fraunces/soft-italic.css";
import "@fontsource-variable/sora/wght.css";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import type { ReactNode } from "react";
import type { ContenidoMuestra } from "@anonymo/pipeline";
import { kVars, varsDe } from "./colores";
import { EstilosMuestra } from "./Cielo";
import { Serena } from "./Serena";
import { Grafica } from "./Grafica";
import { Mosaico } from "./Mosaico";
import { Revista } from "./Revista";
import { Noche } from "./Noche";
import { Saludo } from "./Saludo";

const VARIANTE = { grafico: Grafica, sereno: Serena, mosaico: Mosaico, revista: Revista, noche: Noche } as const;

/** `fotos`: las direcciones de las fotos que subió el negocio (sistema/82). Sin fotos, un cielo de color hace de imagen. */
/** `saludo`: la cortina de entrada con su nombre (sistema/87). Solo en la muestra de verdad, no en los ejemplos del estudio. */
export function MuestraVariante({ c, fotos = [], saludo = false, barra }: { c: ContenidoMuestra; fotos?: string[]; saludo?: boolean; barra?: ReactNode }) {
  // Los colores van como variables (sistema/94): así el negocio puede cambiar su color y toda la página cambia al instante.
  const k = kVars;
  const Variante = VARIANTE[c.plantilla];
  return (
    <div className="font-sans" data-plantilla={c.plantilla} data-muestra style={varsDe(c.paleta)}>
      <EstilosMuestra />
      {saludo && <Saludo c={c} k={k} />}
      <p className="px-5 py-2 text-center text-[12px] leading-snug" style={{ background: "#141414", color: "#f4f4f2" }}>
        {/* Que es un boceto se dice una sola vez (sistema/94). Quién la hizo lleva a la página de Jay (sistema/90). */}
        Así podría verse la web de {c.nombre}. Es un boceto: los textos, las fotos y los colores finales los definimos contigo. Hecho por <a href="/jay" target="_blank" rel="noreferrer" className="underline underline-offset-2">Jay Jaramillo</a>, de Unmake.{c.horarioReal ? "" : " El horario es de ejemplo."}
      </p>
      {barra}
      <Variante c={c} k={k} fotos={fotos} />
    </div>
  );
}
