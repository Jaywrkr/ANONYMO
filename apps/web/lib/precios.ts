// Precios por fase para la web pública (web/12). Sin tarifa publicada, se explica cómo se cotiza.
import { rangoPrecio } from "@anonymo/agentes";
import type { Idioma } from "./idioma";

const tarifa = () => Number(process.env.NEXT_PUBLIC_TARIFA ?? "") || 0;

export function precioFase(n: number, idioma: Idioma): { texto: string; publicado: boolean } {
  const t = tarifa();
  if (!t) return { texto: idioma === "en" ? "Quoted in phase 01" : "Se cotiza en la fase 01", publicado: false };
  const [a, b] = rangoPrecio(n, t);
  const f = (x: number) => `$${x.toLocaleString(idioma === "en" ? "en-US" : "es-EC")}`;
  return { texto: n === 7 ? (idioma === "en" ? `From ${f(a)}/month` : `Desde ${f(a)}/mes`) : `${f(a)} – ${f(b)}`, publicado: true };
}
