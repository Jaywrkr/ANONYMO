import Link from "next/link";
import { notFound } from "next/navigation";
import { agentePorId } from "@anonymo/agentes";
import { archivosSitio, existe, leerEntrega, leerProyecto, versionesSitio, type TareaId } from "@anonymo/pipeline";
import { traer } from "@/lib/nube";
import { espacio } from "@/lib/espacio";
import { exigirEstudio, serif } from "@/lib/estudio";
import { urlSitio } from "@/lib/sitio";
import { VistaWeb } from "@/components/estudio/VistaWeb";
import { Cara, hace } from "@/components/estudio/piezas";

export const dynamic = "force-dynamic";
export const metadata = { title: "La web — Estudio", robots: { index: false } };

// La web del cliente funcionando (sistema/42): cada versión que entregó el constructor, en escritorio, tablet o celular.
export default async function Web({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ v?: string }> }) {
  await exigirEstudio();
  const { id } = await params;
  if (!/^[a-z0-9_-]+$/.test(id)) notFound();
  await traer(id);
  if (!existe(id)) notFound();
  const p = leerProyecto(id);
  const versiones = versionesSitio(id);
  const { v: vCruda } = await searchParams;
  const v = versiones.includes(Number(vCruda)) ? Number(vCruda) : versiones[0];
  const tarea = (p.plan.tareas.find((t) => t.endsWith(".vector")) ?? "4.vector") as TareaId;
  const e = leerEntrega(id, tarea, v);
  const a = agentePorId("vector")!;
  const archivos = v ? archivosSitio(id, v) : [];
  const paginas = archivos.filter((x) => x.ruta.endsWith(".html")).map((x) => x.ruta);
  const base = v ? urlSitio(id, v, "").replace(/\/$/, "") : "";

  return (
    <div className="px-5 pb-20 pt-7 md:px-10 md:pt-9">
      <Link href={`/estudio/${id}`} className="inline-flex min-h-9 items-center gap-2 text-[13px] text-medio hover:text-tinta">
        <i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: espacio(id, p.marca).punto }} /> ← {p.pedido.cliente}
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-end gap-4">
          <Cara id={a.id} tam={56} flota />
          <div>
            <p className="text-[13px] text-suave">{a.nombre}{e ? ` · versión ${e.version} · ${hace(e.creado)}` : ""}</p>
            <h1 className={`${serif} mt-1 text-[clamp(34px,4.2vw,54px)] leading-[1]`}>La web</h1>
          </div>
        </div>
        {v ? (
          <div className="flex flex-wrap items-center gap-2">
            {versiones.length > 1 && (
              <nav aria-label="Versiones" className="flex flex-wrap gap-1">
                {versiones.map((n) => (
                  <Link key={n} href={`/estudio/${id}/web?v=${n}`} aria-current={n === v ? "page" : undefined}
                    className={`inline-flex min-h-9 items-center rounded-full px-3 text-[13px] ${n === v ? "bg-tinta text-white" : "bg-[#f1ede6] text-medio hover:bg-[#e9e3d9]"}`}>v{n}</Link>
                ))}
              </nav>
            )}
            <a href={`/estudio/${id}/web/zip?v=${v}`} className="inline-flex min-h-11 items-center rounded-full bg-tinta px-5 text-[13px] font-medium text-white">Descargar .zip</a>
            <Link href={`/estudio/${id}/${tarea.replace(".", "-")}`} className="inline-flex min-h-11 items-center rounded-full px-4 text-[13px] text-medio hover:text-tinta">Lo que dijo {a.nombre} →</Link>
          </div>
        ) : null}
      </div>
      {!v ? (
        <div className="mt-8 rounded-[20px] border border-dashed border-borde p-10 text-center">
          <p className={`${serif} text-[28px]`}>Todavía no hay web para ver.</p>
          <p className="mt-1 text-[14px] text-medio">{p.tareas[tarea] === "lista" ? `${a.nombre} entregó antes de que existiera la vista previa: pídele «Rehacer» o un cambio y la entrega llega como web navegable.` : `Aparece aquí cuando ${a.nombre} la construya.`}</p>
        </div>
      ) : (
        <div className="mt-6">
          <VistaWeb base={base} paginas={paginas} />
          <p className="mt-3 text-[12px] text-suave">{archivos.length} archivos · {paginas.length} página{paginas.length === 1 ? "" : "s"} · las fotos salen de los archivos del proyecto.</p>
        </div>
      )}
    </div>
  );
}
