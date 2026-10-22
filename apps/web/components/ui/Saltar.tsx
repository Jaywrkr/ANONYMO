"use client";

import { usePathname } from "next/navigation";
import { idiomaDeRuta } from "@/lib/idioma";

// Primer Tab de cada página: saltar el menú e ir directo al contenido.
export function Saltar() {
  const en = idiomaDeRuta(usePathname()) === "en";
  return (
    <a href="#contenido" className="saltar rounded-full bg-tinta px-5 py-3 font-mono text-[12px] uppercase tracking-[0.14em] text-hueso">
      {en ? "Skip to content" : "Saltar al contenido"}
    </a>
  );
}
