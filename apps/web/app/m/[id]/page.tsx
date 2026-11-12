// La muestra de un prospecto (sistema/72): una idea de su web, hecha por ANONYMO con lo que ya se sabe del negocio.
// Es pública (llega por WhatsApp), no se indexa y no muestra nada interno: ni puntaje, ni notas, ni lo que falla en su web.
import "@fontsource/instrument-serif/latin-400.css";
import "@fontsource/instrument-serif/latin-400-italic.css";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buscarPorMuestra, contenidoMuestra, idMuestraValido, leerProspectos, numeroInternacional, OFERTA, precio } from "@anonymo/pipeline";
import { MuestraVariante } from "@/components/muestra/MuestraVariante";
import { portalActivo } from "@/lib/estudio";
import { Visto } from "./Visto";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

async function cargar(id: string) {
  if (!portalActivo() || !idMuestraValido(id)) return undefined;
  const l = await leerProspectos();
  const p = buscarPorMuestra(l.prospectos, id);
  if (!p || p.estado === "descartado") return undefined;
  return { c: contenidoMuestra(p), numero: numeroInternacional(l.numero) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const d = await cargar(id).catch(() => undefined);
  if (!d) return { title: "Muestra", robots: { index: false, follow: false } };
  // Es lo que se ve en la vista previa de WhatsApp.
  return {
    title: `Idea de web para ${d.c.nombre}`,
    description: "Una muestra hecha por ANONYMO. Ábrela para verla en tu celular.",
    robots: { index: false, follow: false },
    openGraph: { title: `Idea de web para ${d.c.nombre}`, description: "Una muestra hecha por ANONYMO. Ábrela para verla en tu celular.", siteName: "ANONYMO" },
  };
}

export default async function Muestra({ params }: Props) {
  const { id } = await params;
  const d = await cargar(id);
  if (!d) notFound();
  const { c, numero } = d;
  return (
    <>
      <MuestraVariante c={c} />
      <Visto id={id} nombre={c.nombre} numero={numero} oferta={{ dias: OFERTA.web.dias, precio: precio(OFERTA.web.precio) }} />
    </>
  );
}
