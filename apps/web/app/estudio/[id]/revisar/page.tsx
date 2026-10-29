import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AREAS, agentePorId } from "@anonymo/agentes";
import { contratoPorId, existe, leerEntrega, leerProyecto, responsable, type TareaId } from "@anonymo/pipeline";
import { traer } from "@/lib/nube";
import { espacio } from "@/lib/espacio";
import { momento, nombreFase, nombreSocio } from "@/lib/camino";
import { sesionConfigurada } from "@/lib/sesion";
import { boton, botonLleno, campo, exigirEstudio, serif } from "@/lib/estudio";
import { html } from "@/lib/markdown";
import { Cara } from "@/components/estudio/piezas";
import { Enviar } from "../../nuevo/Enviar";
import { accionAprobar, accionCambiar } from "../../acciones";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
export const metadata = { title: "Revisión — Estudio", robots: { index: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ n?: string }> };

// La revisión guiada (sistema/33): se lee cada entrega de la fase, una por una, y al final se decide.
export default async function Revisar({ params, searchParams }: Props) {
  const yo = await exigirEstudio();
  const { id } = await params;
  if (!/^[a-z0-9_-]+$/.test(id)) notFound();
  await traer(id);
  if (!existe(id)) notFound();
  const p = leerProyecto(id);
  // Modo paso a paso (sistema/36): se revisa una entrega a la vez, en su propia página.
  if (p.estado === "esperando" && p.revision && !p.esperaJurado) redirect(`/estudio/${id}/${p.revision.tarea.replace(".", "-")}#decidir`);
  if (p.estado !== "esperando") redirect(`/estudio/${id}`);
  const tareas = p.plan.tareas.filter((t) => t.startsWith(`${p.faseActual}.`)) as TareaId[];
  const total = tareas.length;
  const n = Math.min(total, Math.max(0, Number((await searchParams).n) || 0));
  const decidir = n >= total;
  const leToca = responsable(p, p.faseActual);
  const m = momento(p, yo, leToca);
  const e = espacio(id, p.marca);
  const base = `/estudio/${id}/revisar`;
  const fase = nombreFase(p.faseActual);
  const conClaves = sesionConfigurada();
  const comunes = <><input type="hidden" name="id" value={id} /><input type="hidden" name="motor" value="" /></>;
  const t = tareas[n];
  const a = t ? agentePorId(t.split(".")[1]) : undefined;
  const en = t ? leerEntrega(id, t) : undefined;

  return (
    <div className="flex min-h-[calc(100dvh-16px)] flex-col">
      {/* Arriba: dónde estás y cuánto falta. */}
      <div className="sticky top-0 z-20 rounded-t-[18px] border-b border-borde bg-carta/95 px-5 py-4 backdrop-blur md:px-10">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link href={`/estudio/${id}`} className="inline-flex min-h-9 items-center gap-2 text-[13px] text-medio hover:text-tinta">
            <i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: e.punto }} /> ← {p.pedido.cliente}
          </Link>
          <p className="text-[13px]"><span className="font-medium">Revisión de {fase}</span> <span className="text-suave">· {leToca === yo ? "te toca a ti" : `la aprueba ${nombreSocio(leToca)}`}</span></p>
          <ol aria-label="Pasos de la revisión" className="ml-auto flex flex-wrap items-center gap-1">
            {tareas.map((x, i) => {
              const ag = agentePorId(x.split(".")[1])!;
              return (
                <li key={x}>
                  <Link href={`${base}?n=${i}`} aria-current={i === n ? "step" : undefined} title={`${ag.nombre} · ${contratoPorId(x)?.entrega}`}
                    className={`inline-flex min-h-9 items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-[12px] transition ${i === n ? "bg-tinta text-white" : i < n ? "bg-[#e7f5ec] text-[#126b43]" : "bg-[#f1ede6] text-medio hover:bg-[#e9e3d9]"}`}>
                    <Cara id={ag.id} tam={22} titulo={false} /> {i < n ? "✓ " : ""}{ag.nombre}
                  </Link>
                </li>
              );
            })}
            <li>
              <Link href={`${base}?n=${total}`} aria-current={decidir ? "step" : undefined} className={`inline-flex min-h-9 items-center rounded-full px-3 text-[12px] font-medium transition ${decidir ? "bg-urgente text-white" : "bg-[#f1ede6] text-medio hover:bg-[#e9e3d9]"}`}>Decidir</Link>
            </li>
          </ol>
        </div>
      </div>

      {!decidir && a && t ? (
        <>
          <div className="grid flex-1 gap-10 px-5 pb-10 pt-8 md:px-10 lg:grid-cols-[240px_minmax(0,1fr)]">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="grid place-items-center rounded-[20px] py-5" style={{ background: `radial-gradient(80% 70% at 50% 35%, ${(a.tono ?? AREAS[a.area]).luz}, #fbf9f6 80%)` }}>
                <Cara id={a.id} tam={104} flota />
              </div>
              <p className="mt-3 text-[12px] text-suave">{n + 1} de {total} · {a.rol}</p>
              <p className={`${serif} text-[38px] leading-none`}>{a.nombre}</p>
              {en?.dice && <p className={`${serif} mt-4 text-[20px] leading-[1.2]`}>“{en.dice}”</p>}
              {en?.necesita && en.necesita !== "—" && (
                <div className="mt-4 rounded-xl bg-[#fff6ec] p-3 text-[13px]"><span className="font-medium">Necesita:</span> {en.necesita}</div>
              )}
            </aside>
            <article className="min-w-0 max-w-[74ch]">
              <p className="text-[13px] text-suave">Entrega de {a.nombre}</p>
              <h1 className={`${serif} text-[clamp(34px,4vw,56px)] leading-[0.98]`}>{en?.titulo ?? contratoPorId(t)?.entrega}</h1>
              {en ? <div className="entrega mt-6" dangerouslySetInnerHTML={{ __html: html(en.contenido) }} /> : <p className="mt-4 text-medio">Esta entrega todavía no está.</p>}
            </article>
          </div>

          {/* Abajo: anterior, pedir un cambio a este agente, siguiente. */}
          <div className="sticky bottom-0 z-20 rounded-b-[18px] border-t border-borde bg-carta/95 px-5 py-3 backdrop-blur md:px-10">
            <div className="flex flex-wrap items-center gap-2">
              {n > 0 ? <Link href={`${base}?n=${n - 1}`} className={boton}>← Anterior</Link> : <span />}
              <details className="group relative ml-auto">
                <summary className={`${boton} cursor-pointer list-none`}>Pedir un cambio a {a.nombre}</summary>
                <form action={accionCambiar} className="absolute bottom-[calc(100%+8px)] right-0 grid w-[min(380px,calc(100vw-40px))] gap-2 rounded-[18px] bg-white p-4 shadow-[0_0_0_1px_rgba(26,24,22,.06),0_18px_44px_-14px_rgba(20,15,10,.35)]">
                  {comunes}
                  <input type="hidden" name="quien" value={yo} />
                  <input type="hidden" name="agente" value={a.id} />
                  <label className="text-[13px] font-medium" htmlFor="cambio-uno">¿Qué tiene que cambiar {a.nombre}?</label>
                  <textarea id="cambio-uno" name="nota" rows={3} required className={campo} placeholder="Ej.: más cálido, menos texto, otra paleta…" />
                  <p className="text-[12px] text-suave">Lo rehace solo {a.nombre} (y lo que dependa de su entrega). Después vuelves a revisar.</p>
                  <Enviar className={botonLleno} texto={`Pedir el cambio`} trabajando={`${a.nombre} está rehaciendo…`} proyecto={id} />
                </form>
              </details>
              <Link href={`${base}?n=${n + 1}`} className={botonLleno}>{n + 1 < total ? "Siguiente →" : "Ir a decidir →"}</Link>
            </div>
          </div>
        </>
      ) : (
        <div className="mx-auto grid w-full max-w-[880px] flex-1 content-start gap-6 px-5 py-10 md:px-10">
          <div>
            <p className="text-[13px] text-suave">Último paso de la revisión</p>
            <h1 className={`${serif} text-[clamp(36px,4.4vw,56px)] leading-[1]`}>¿Cómo quedó {fase}?</h1>
            <p className="mt-2 text-[15px] text-medio">{m.despues}</p>
          </div>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {tareas.map((x, i) => {
              const ag = agentePorId(x.split(".")[1])!;
              const ent = leerEntrega(id, x);
              return (
                <li key={x}>
                  <Link href={`${base}?n=${i}`} className="flex min-h-14 items-center gap-3 rounded-[14px] bg-white p-3 shadow-[0_0_0_1px_rgba(26,24,22,.05)] transition hover:-translate-y-0.5">
                    <Cara id={ag.id} tam={30} titulo={false} />
                    <span className="min-w-0 flex-1 leading-tight"><span className="block truncate text-[14px] font-medium">{ent?.titulo ?? contratoPorId(x)?.entrega}</span><span className="block text-[12px] text-suave">{ag.nombre} · volver a leer</span></span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="grid items-start gap-4 md:grid-cols-2">
            <form action={accionAprobar} className="grid content-start gap-3 rounded-[20px] bg-tinta p-6 text-white">
              {comunes}
              {conClaves ? <input type="hidden" name="quien" value={yo} /> : (
                <select name="quien" defaultValue={leToca} aria-label="Quién decide" className="min-h-11 rounded-xl bg-white/10 px-3 text-[14px] outline-none"><option value="jay">Decide Jay</option><option value="luna">Decide Luna</option></select>
              )}
              {leToca !== yo && conClaves && <input type="hidden" name="forzar" value="1" />}
              <p className={`${serif} text-[28px] leading-none`}>Está bien</p>
              <p className="text-[13px] text-white/70">{p.esperaJurado ? "Se acepta así y el proyecto se cierra." : m.despues}{leToca !== yo ? ` Esta fase la aprueba ${nombreSocio(leToca)}; si apruebas tú, queda a tu nombre.` : ""}</p>
              <label className="sr-only" htmlFor="nota-ok">Nota para el equipo</label>
              <input id="nota-ok" name="nota" placeholder="Nota para el equipo (opcional)" className="min-h-11 rounded-xl bg-white/10 px-3.5 text-[14px] text-white outline-none placeholder:text-white/40 focus:bg-white/15" />
              <Enviar className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-[14px] font-medium text-tinta" texto={p.esperaJurado ? "Aceptar y cerrar" : "Aprobar y seguir"} trabajando="El equipo está trabajando…" proyecto={id} />
            </form>
            <form action={accionCambiar} className="grid content-start gap-3 rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(26,24,22,.06)]">
              {comunes}
              <input type="hidden" name="quien" value={yo} />
              <p className={`${serif} text-[28px] leading-none`}>Hay que cambiar algo</p>
              <p className="text-[13px] text-medio">Se rehace y vuelves a revisar. No avanza a la siguiente fase.</p>
              <label className="sr-only" htmlFor="nota-cambio">Qué hay que cambiar</label>
              <textarea id="nota-cambio" name="nota" rows={3} required placeholder="Qué hay que cambiar: «más elegante», «menos texto»…" className={campo} />
              <select name="agente" defaultValue="" aria-label="A quién" className={campo}>
                <option value="">A todos los de esta fase</option>
                {tareas.map((x) => <option key={x} value={x.split(".")[1]}>Solo a {agentePorId(x.split(".")[1])?.nombre}</option>)}
              </select>
              <Enviar className={boton} texto="Pedir cambios" trabajando="El equipo está rehaciendo…" proyecto={id} />
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
