// Una plantilla con un negocio de ejemplo (sistema/79): para verla en el estudio y para mostrarla sin datos reales.
import "@fontsource/instrument-serif/latin-400.css";
import "@fontsource/instrument-serif/latin-400-italic.css";
import { notFound } from "next/navigation";
import type { PlantillaMuestra, Tono } from "@anonymo/pipeline";
import { MuestraVariante } from "@/components/muestra/MuestraVariante";
import { ejemploMuestra, TONOS, VARIANTES } from "@/lib/ejemplos-muestra";

export const metadata = { title: "Plantilla de ejemplo — ANONYMO", robots: { index: false, follow: false } };

export default async function Ejemplo({ params }: { params: Promise<{ tono: string; variante: string }> }) {
  const { tono, variante } = await params;
  if (!TONOS.includes(tono as Tono) || !VARIANTES.includes(variante as PlantillaMuestra)) notFound();
  return <MuestraVariante c={ejemploMuestra(tono as Tono, variante as PlantillaMuestra)} />;
}
