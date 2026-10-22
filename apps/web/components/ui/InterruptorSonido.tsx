"use client";

import { usePathname } from "next/navigation";
import { cambiarSonido, useSonido } from "@/lib/sonido";
import { idiomaDeRuta } from "@/lib/idioma";

export function InterruptorSonido() {
  const activo = useSonido();
  const en = idiomaDeRuta(usePathname()) === "en";
  return (
    <button onClick={() => cambiarSonido(!activo)} aria-pressed={activo} className="uppercase hover:text-tinta">
      {en ? (activo ? "Sound: on" : "Sound: off") : activo ? "Sonido: encendido" : "Sonido: apagado"}
    </button>
  );
}
