// Una plantilla con un negocio de ejemplo (sistema/79): para verla en el estudio y para mostrarla sin datos reales.
import { notFound } from "next/navigation";
import type { PlantillaMuestra, Tono } from "@anonymo/pipeline";
import { MuestraVariante } from "@/components/muestra/MuestraVariante";
import { Asistente } from "@/components/muestra/Asistente";
import { ejemploMuestra, TONOS, VARIANTES } from "@/lib/ejemplos-muestra";

export const metadata = { title: "Plantilla de ejemplo — ANONYMO", robots: { index: false, follow: false } };

export default async function Ejemplo({ params }: { params: Promise<{ tono: string; variante: string }> }) {
  const { tono, variante } = await params;
  if (!TONOS.includes(tono as Tono) || !VARIANTES.includes(variante as PlantillaMuestra)) notFound();
  const c = ejemploMuestra(tono as Tono, variante as PlantillaMuestra);
  // El asistente de demostración también se puede probar en los ejemplos (sistema/87).
  return <><MuestraVariante c={c} /><Asistente c={c} /></>;
}
