// Un video en el departamento de video (sistema/62): vista previa, partes, Atlas y video final.
import Link from "next/link";
import { notFound } from "next/navigation";
import { idFicha, idVideoValido, leerGuion, leerVideo, listarKits } from "@anonymo/pipeline";
import { exigirEstudio, serif } from "@/lib/estudio";
import { kitParaVista } from "@/lib/video";
import { EditorVideo } from "@/components/estudio/video/EditorVideo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Video — Estudio", robots: { index: false } };

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  await exigirEstudio();
  const { id } = await params;
  if (!idVideoValido(id)) notFound();
  const t = await leerVideo(id);
  if (!t) notFound();
  const kits = (await listarKits().catch(() => [])).map(kitParaVista);
  const guion = t.guion ? await leerGuion(t.guion).catch(() => undefined) : undefined;
  return (
    <div className="px-5 py-7 md:px-10">
      <Link href="/estudio/video" className="inline-flex min-h-11 items-center text-[13px] text-medio hover:text-tinta">← Videos</Link>
      <h1 className={`${serif} text-[34px] leading-tight md:text-[40px]`}>{t.nombre}</h1>
      <p className="mt-1 text-[13px] text-suave">{[t.cliente, t.duracion ? `${Math.round(t.duracion)} s` : "", t.ancho && t.alto ? `${t.ancho}×${t.alto}` : ""].filter(Boolean).join(" · ")}</p>
      {/* De dónde viene (sistema/71): el guion de Faro que lee Corte y la ficha del cliente. */}
      {(guion || t.cliente) && <p className="mt-1 flex flex-wrap gap-3 text-[13px]">
        {guion && <span>Grabado con el guion de Faro «{guion.titulo}» · Corte lo lee al editar</span>}
        {t.cliente && <Link href={`/estudio/cliente/${idFicha(t.cliente)}`} className="underline">Ficha de {t.cliente}</Link>}
      </p>}
      <EditorVideo key={`${t.analisis?.partes.length ?? 0}-${t.estado}-${t.ocupado?.desde ?? ""}`} inicial={t} atlas={!!process.env.ANTHROPIC_API_KEY} kits={kits} />
    </div>
  );
}
