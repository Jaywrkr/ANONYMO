// Departamento de video (sistema/62): Luna sube un video y recibe el resultado. Aquí está la lista y la subida.
import Link from "next/link";
import { listarVideos, MAX_VIDEO, type TrabajoVideo } from "@anonymo/pipeline";
import { exigirEstudio, serif } from "@/lib/estudio";
import { SubirVideo } from "@/components/estudio/video/SubirVideo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Video — Estudio", robots: { index: false } };

const ESTADO: Record<TrabajoVideo["estado"], string> = { subiendo: "Sin terminar de subir", subido: "Por escuchar", analizado: "Listo para editar", error: "Con un problema" };
const fecha = (iso: string) => new Date(iso).toLocaleString("es-EC", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Guayaquil" });

export default async function Pagina({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  await exigirEstudio();
  const { cliente } = await searchParams;
  let videos: TrabajoVideo[] = [];
  let falla = "";
  try { videos = await listarVideos(); } catch (e) { falla = (e as Error).message; }
  return (
    <div className="px-5 py-7 md:px-10">
      <h1 className={`${serif} text-[40px] leading-none`}>Video.</h1>
      <p className="mt-3 max-w-2xl text-[15px] text-medio">Sube un video de alguien hablando o haciendo algo. Lo escuchamos para quitar los silencios, lo dividimos en partes que puedes quitar con un toque, Atlas hace lo que le pidas y lo entregamos en 9:16, 1:1 o 16:9.</p>
      <p className="mt-3"><Link href="/estudio/video/marcas" className="inline-flex min-h-11 items-center rounded-full bg-white px-4 text-[13px] shadow-[inset_0_0_0_1px_var(--color-borde)]">Marcas: logo, colores y música de cada cliente →</Link></p>
      <SubirVideo maxMb={Math.round(MAX_VIDEO / 1024 / 1024)} cliente={cliente?.slice(0, 80)} />
      <h2 className="mt-10 text-[13px] text-suave">Videos</h2>
      {falla && <p role="alert" className="mt-2 text-[14px] text-[#a33a0b]">No se pudo leer la lista: {falla}</p>}
      {!videos.length && !falla && <p className="mt-2 text-[14px] text-medio">Todavía no hay videos.</p>}
      <ul className="mt-2 grid gap-2">
        {videos.map((v) => (
          <li key={v.id}>
            <Link href={`/estudio/video/${v.id}`} className="flex min-h-14 items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_0_0_1px_rgba(26,24,22,.06)] transition hover:shadow-[0_0_0_1px_rgba(26,24,22,.2)]">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium">{v.nombre}</span>
                <span className="block text-[12px] text-suave">{[v.cliente, v.duracion ? `${Math.round(v.duracion)} s` : "", fecha(v.actualizado)].filter(Boolean).join(" · ")}</span>
              </span>
              <span className={`shrink-0 rounded-full px-3 py-1 text-[12px] ${v.estado === "error" ? "bg-[#fff1ea] text-[#a33a0b]" : v.resultados.length ? "bg-[#e6f6ee] text-[#17714a]" : "bg-hueso text-medio"}`}>
                {v.resultados.length ? `${v.resultados.length} ${v.resultados.length === 1 ? "formato listo" : "formatos listos"}` : ESTADO[v.estado]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
