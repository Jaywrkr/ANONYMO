import Link from "next/link";
import {ControlCalidad} from "@/components/estudio/ControlCalidad";
import { notFound } from "next/navigation";
import { agentePorId } from "@anonymo/agentes";
import { archivosSitio, existe, leerEntrega, leerMiWeb, leerProyecto, ORDEN_PLANES, PLANES, versionesSitio, type TareaId } from "@anonymo/pipeline";
import { accionWebEnVivo } from "./acciones";
import { traer } from "@/lib/nube";
import { espacio } from "@/lib/espacio";
import { exigirEstudio, serif } from "@/lib/estudio";
import { urlSitio } from "@/lib/sitio";
import { VistaWeb } from "@/components/estudio/VistaWeb";
import { Cara, hace } from "@/components/estudio/piezas";

export const dynamic = "force-dynamic";
export const metadata = { title: "La web — Estudio", robots: { index: false } };

// La web del cliente funcionando (sistema/42): cada versión que entregó el constructor, en escritorio, tablet o celular.
export default async function Web({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ v?: string; ok?: string; error?: string }> }) {
  await exigirEstudio();
  const { id } = await params;
  if (!/^[a-z0-9_-]+$/.test(id)) notFound();
  await traer(id);
  if (!existe(id)) notFound();
  const p = leerProyecto(id);
  const versiones = versionesSitio(id);
  const { v: vCruda, ok, error } = await searchParams;
  const vivo = leerMiWeb(id);
  const v = versiones.includes(Number(vCruda)) ? Number(vCruda) : versiones[0];
  const tarea = (p.plan.tareas.find((t) => t.endsWith(".vector")) ?? "4.vector") as TareaId;
  const e = leerEntrega(id, tarea, v);
  const a = agentePorId("vector")!;
  const archivos = v ? archivosSitio(id, v) : [];
  const paginas = archivos.filter((x) => x.ruta.endsWith(".html")).map((x) => x.ruta);
  const base = v ? urlSitio(id, v, "").replace(/\/$/, "") : "";

  return (
    <div className="px-5 pb-20 pt-7 md:px-10 md:pt-9">
      <Link href={`/estudio/${id}`} className="inline-flex min-h-11 md:min-h-9 items-center gap-2 text-[13px] text-medio hover:text-tinta">
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
                    className={`inline-flex min-h-11 md:min-h-9 items-center rounded-full px-3 text-[13px] ${n === v ? "bg-tinta text-white" : "bg-[#f1ede6] text-medio hover:bg-[#e9e3d9]"}`}>v{n}</Link>
                ))}
              </nav>
            )}
            <a href={`/estudio/${id}/web/zip?v=${v}`} className="inline-flex min-h-11 items-center rounded-full bg-tinta px-5 text-[13px] font-medium text-white">Descargar .zip</a>
            <Link href={`/estudio/${id}/${tarea.replace(".", "-")}`} className="inline-flex min-h-11 items-center rounded-full px-4 text-[13px] text-medio hover:text-tinta">Lo que dijo {a.nombre} →</Link>
          </div>
        ) : null}
      </div>
      {versiones.length > 0 && (
        <section id="en-vivo" aria-label="Su web en vivo" data-en-vivo className="mt-6 scroll-mt-6 rounded-[20px] bg-white p-5 shadow-[0_0_0_1px_rgba(26,24,22,.06)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-xl">
              <p className="text-[15px] font-medium">Su web en vivo</p>
              <p className="mt-1 text-[13.5px] text-medio">{vivo?.activa
                ? <>En línea con la versión {vivo.base}{vivo.base !== versiones[0] ? ` (hay una v${versiones[0]} más nueva)` : ""}. Plan {PLANES[vivo.plan].nombre}: {PLANES[vivo.plan].editaCliente ? "el cliente la cambia él mismo desde «Mi web» en su portal." : "los cambios los hacen ustedes."}</>
                : "Al ponerla en vivo, la versión más nueva queda en una dirección pública y el cliente puede cambiarla desde su portal, según su plan. Nada sale hasta que toques el botón."}</p>
              {vivo?.activa && <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px]"><a href={`/w/${id}/index.html`} target="_blank" rel="noopener" data-ver-en-vivo className="underline underline-offset-2">Abrir su web ↗</a>{p.portal && <a href={`/portal/${id}/mi-web?t=${p.portal.token}`} target="_blank" rel="noopener" className="underline underline-offset-2">Su «Mi web» ↗</a>}</p>}
            </div>
            <form action={accionWebEnVivo} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={id} />
              <label className="sr-only" htmlFor="plan-web">Plan mensual</label>
              <select id="plan-web" name="plan" defaultValue={vivo?.plan ?? "cuidado"} className="min-h-11 rounded-full bg-[#f1ede6] px-4 text-[13px]">
                {ORDEN_PLANES.map((k) => <option key={k} value={k}>{PLANES[k].nombre} · USD {PLANES[k].precio}/mes</option>)}
              </select>
              {vivo?.activa ? (
                <>
                  <button name="accion" value="plan" data-trabajando="Cambiando el plan…" className="inline-flex min-h-11 items-center rounded-full bg-[#f1ede6] px-4 text-[13px]">Cambiar plan</button>
                  {vivo.base !== versiones[0] && <button name="accion" value="nueva" data-trabajando="Pasando a la versión nueva…" className="inline-flex min-h-11 items-center rounded-full bg-tinta px-4 text-[13px] text-white">Usar la v{versiones[0]}</button>}
                  <button name="accion" value="apagar" data-trabajando="Sacando de línea…" className="inline-flex min-h-11 items-center rounded-full px-4 text-[13px] text-[#a33a0b]">Sacar de línea</button>
                </>
              ) : (
                <button name="accion" value="activar" data-trabajando="Poniendo en vivo…" className="inline-flex min-h-11 items-center rounded-full bg-tinta px-5 text-[13px] font-medium text-white">Poner en vivo</button>
              )}
            </form>
          </div>
          {(ok || error) && <p role={error ? "alert" : "status"} className={`mt-3 text-[13.5px] ${error ? "text-[#a33a0b]" : "text-[#17714a]"}`}>{error ?? ok}</p>}
          {vivo && vivo.historia.length > 0 && (
            <details className="mt-3"><summary className="min-h-11 cursor-pointer content-center text-[13px] text-medio">Lo último que cambió</summary>
              <ul className="mt-1 grid gap-1 text-[13px] text-medio">{[...vivo.historia].reverse().slice(0, 8).map((h, i) => <li key={i}>{new Date(h.cuando).toLocaleString("es-EC", { timeZone: "America/Guayaquil", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })} · {h.quien === "cliente" ? "El cliente" : h.quien === "luna" ? "Luna" : "Jay"}: {h.que}</li>)}</ul>
            </details>
          )}
        </section>
      )}
      {e && <ControlCalidad p={p} e={e}/>}
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
