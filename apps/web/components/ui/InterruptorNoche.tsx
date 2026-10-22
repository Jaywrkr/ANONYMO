"use client";

import { usePathname } from "next/navigation";
import { cambiarModo, useModoNoche, type ModoNoche } from "@/lib/noche";
import { idiomaDeRuta } from "@/lib/idioma";

const SIGUIENTE: Record<ModoNoche, ModoNoche> = { auto: "noche", noche: "dia", dia: "auto" };

// Un botón que rota: automático (hora de Cuenca) → noche → día.
export function InterruptorNoche() {
  const modo = useModoNoche();
  const en = idiomaDeRuta(usePathname()) === "en";
  const texto = en
    ? { auto: "Auto (Cuenca time)", noche: "Night", dia: "Day" }[modo]
    : { auto: "Auto (hora de Cuenca)", noche: "Noche", dia: "Día" }[modo];
  return (
    <button onClick={() => cambiarModo(SIGUIENTE[modo])} className="uppercase hover:text-tinta" aria-label={`${en ? "Light" : "Luz"}: ${texto}`}>
      {en ? "Light" : "Luz"}: {texto}
    </button>
  );
}
