import Link from "next/link";
import { notFound } from "next/navigation";
import { existe, leerProyecto } from "@anonymo/pipeline";
import { traer } from "@/lib/nube";
import { espacio } from "@/lib/espacio";
import { boton, botonSuave, campo, exigirEstudio, serif } from "@/lib/estudio";
import { propuestaDe } from "@/lib/propuesta";
import { hace } from "@/components/estudio/piezas";
import { Confirmar } from "@/components/estudio/Confirmar";
import { ItemsPropuesta } from "@/components/estudio/ItemsPropuesta";
import { Enviar } from "../../nuevo/Enviar";
import { accionPropuesta } from "../../acciones";

export const dynamic = "force-dynamic";
export const metadata = { title: "Propuesta — Estudio", robots: { index: false } };

// La propuesta para el cliente (sistema/35): se edita aquí y se descarga como PDF con buen diseño.
export default async function PropuestaEstudio({ params }: { params: Promise<{ id: string }> }) {
  await exigirEstudio();
  const { id } = await params;
  if (!/^[a-z0-9_-]+$/.test(id)) notFound();
  await traer(id);
  if (!existe(id)) notFound();
  const p = leerProyecto(id);
  const { propuesta: x, guardada, enHoras } = propuestaDe(p);
  const area = (name: keyof typeof x, label: string, ayuda: string, filas = 5) => (
    <label className="grid gap-1.5">
      <span className="text-[14px] font-medium">{label}</span>
      <span className="-mt-1 text-[12px] text-suave">{ayuda}</span>
      <textarea name={name} rows={filas} defaultValue={String(x[name] ?? "")} className={`${campo} py-3 leading-relaxed`} />
    </label>
  );

  return (
    <div className="px-5 pb-20 pt-7 md:px-10 md:pt-9">
      <Link href={`/estudio/${id}`} className="inline-flex min-h-9 items-center gap-2 text-[13px] text-medio hover:text-tinta">
        <i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: espacio(id, p.marca).punto }} /> ← {p.pedido.cliente}
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] text-suave">{guardada ? `Editada ${hace(x.actualizado)}` : "Borrador armado con lo que ya sabe el equipo · todavía sin guardar"}</p>
          <h1 className={`${serif} mt-1 text-[clamp(36px,4.4vw,56px)] leading-[1]`}>La propuesta</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a href={`/imprimir/${id}/propuesta`} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center rounded-full bg-tinta px-7 text-[14px] font-medium text-white transition hover:bg-black">Ver y descargar PDF ↗</a>
          {guardada && (
            <Confirmar accion={accionPropuesta} campos={{ id, motor: "", rehacer: "1" }} disparador="Volver al borrador" claseDisparador={boton}
              titulo="¿Volver al borrador?" texto="Se pierden tus cambios y se arma de nuevo con los datos de hoy (horas, tarifa, fechas y plan de Atlas)." confirmar="Volver al borrador" />
          )}
        </div>
      </div>
      {!guardada && <p className="mt-3 max-w-2xl text-[14px] text-medio">Revisa y ajusta lo que quieras. Al guardar queda fija: si después cambian las horas o el plan, no se mueve hasta que vuelvas al borrador.</p>}

      <form action={accionPropuesta} className="mt-8 grid max-w-4xl gap-6">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="motor" value="" />
        <section className="grid gap-4 rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(26,24,22,.05)]">
          <p className={`${serif} text-[26px] leading-none`}>Portada</p>
          <label className="grid gap-1.5"><span className="text-[14px] font-medium">Título</span><input name="titulo" defaultValue={x.titulo} className={`${campo} font-serif text-[20px]`} /></label>
          {area("intro", "Saludo", "Dos líneas para abrir.", 3)}
        </section>
        <section className="grid gap-4 rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(26,24,22,.05)]">
          <p className={`${serif} text-[26px] leading-none`}>El brief</p>
          {area("quienes", "Quiénes somos", "Lo que somos y cómo trabajamos.", 6)}
          {area("entendimos", "Lo que entendimos", "Lo que pidió el cliente, en sus palabras y en las nuestras.", 6)}
          {area("haremos", "Lo que haremos", "Qué entra. Puedes usar guiones para listas.", 7)}
          {area("entregables", "Lo que recibe", "Una línea por entregable, con guion.", 6)}
          {area("tiempos", "Tiempos", "Una línea por fase.", 4)}
        </section>
        <section className="grid gap-4 rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(26,24,22,.05)]">
          <p className={`${serif} text-[26px] leading-none`}>Inversión</p>
          <ItemsPropuesta inicial={x.items} enHoras={enHoras && !guardada} />
          {area("condiciones", "Condiciones", "Pagos, rondas de cambios, lo que no incluye.", 4)}
          <label className="grid gap-1.5"><span className="text-[14px] font-medium">Validez</span><input name="validez" defaultValue={x.validez} className={campo} /></label>
        </section>
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-full bg-carta/90 p-2 shadow-[0_10px_30px_-12px_rgba(20,15,10,.35)] backdrop-blur">
          <Enviar className="inline-flex min-h-12 items-center rounded-full bg-tinta px-7 text-[14px] font-medium text-white" texto="Guardar la propuesta" trabajando="Guardando…" />
          <Link href={`/estudio/${id}?ver=numeros`} className={botonSuave}>Cambiar horas o tarifa</Link>
        </div>
      </form>
    </div>
  );
}
