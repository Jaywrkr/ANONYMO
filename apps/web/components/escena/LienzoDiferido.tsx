"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

// three.js y el lienzo llegan en su propio paquete, después del contenido.
const Lienzo = dynamic(() => import("./Lienzo").then((m) => m.Lienzo), { ssr: false });

// El estudio, su entrada y el portal no usan 3D, salvo la oficina en grande (sistema/32): ahí no se carga three.js.
export function LienzoDiferido() {
  const ruta = usePathname() ?? "";
  if (/^\/(estudio|entrar|portal|imprimir|m|p|jay)(\/|$)/.test(ruta) && ruta !== "/estudio/oficina") return null;
  // La portada ya no lleva agentes en 3D (web/21): tampoco carga three.js.
  if (ruta === "/" || ruta === "/en") return null;
  return <Lienzo />;
}
