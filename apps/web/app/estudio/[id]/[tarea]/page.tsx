import Link from "next/link";
import { notFound } from "next/navigation";
import { AREAS, agentePorId, FASES } from "@anonymo/agentes";
import { contarCambios, diferencias, existe, leerEntrega, leerProyecto, versiones, type TareaId } from "@anonymo/pipeline";
import { traer } from "@/lib/nube";
import { espacio } from "@/lib/espacio";
import { boton, botonLleno, etiqueta, exigirEstudio, serif } from "@/lib/estudio";
import { html } from "@/lib/markdown";
import { Cara, hace } from "@/components/estudio/piezas";
import { Confirmar } from "@/components/estudio/Confirmar";
import { accionCambiar, accionRestaurar } from "../../acciones";
import { Enviar } from "../../nuevo/Enviar";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const metadata = { title: "Entrega — Estudio", robots: { index: false } };

type Props = { params: Promise<{ id: string; tarea: string }>; searchParams: Promise<{ v?: string; comparar?: string }> };

// Una entrega, como se lee una página: el agente a un lado, su trabajo al centro, las versiones arriba.
export default async function EntregaEstudio({ params, searchParams }: Props) {
  await exigirEstudio();
  const { id, tarea } = await params;
  if (!/^[a-z0-9_-]+$/.test(id)) notFound();
  await traer(id);
  const { v, comparar } = await searchParams;
  const t = tarea.replace("-", ".") as TareaId;
  if (!existe(id)) notFound();
  const p = leerProyecto(id);
  const a = agentePorId(t.split(".")[1]);
  if (!a || !p.plan.tareas.includes(t)) notFound();
  const actual = leerEntrega(id, t);
  const anteriores = versiones(id, t);
  const e = v ? leerEntrega(id, t, Number(v)) ?? actual : actual;
  const contra = comparar ? leerEntrega(id, t, Number(comparar)) : undefined;
  const diff = contra && actual ? diferencias(contra.contenido, actual.contenido) : undefined;
  const base = `/estudio/${id}/${tarea}`;
  const fase = FASES.find((f) => f.n === Number(t.split(".")[0]))!;
  const area = AREAS[a.area];
  const pastilla = (activa: boolean) => `inline-flex min-h-9 items-center rounded-full px-3 text-[13px] transition ${activa ? "bg-tinta text-white" : "bg-[#f1ede6] text-medio hover:bg-[#e9e3d9]"}`;

  return (
    <div className="px-5 pb-16 pt-7 md:px-10 md:pt-9">
      <Link href={`/estudio/${id}`} className="inline-flex min-h-9 items-center gap-2 text-[13px] text-medio hover:text-tinta">
        <i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: espacio(id, p.marca).punto }} /> ← {p.pedido.cliente}
      </Link>
      <div className="mt-4 grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="grid place-items-center rounded-[20px] py-6" style={{ background: `radial-gradient(80% 70% at 50% 35%, ${(a.tono ?? area).luz}, #fbf9f6 80%)` }}>
            <Cara id={a.id} tam={130} flota />
          </div>
          <p className="mt-4 text-[12px]" style={{ color: area.texto ?? area.sombra }}>{area.nombre} · fase {String(fase.n).padStart(2, "0")} {fase.nombre}</p>
          <p className={`${serif} text-[44px] leading-none`}>{a.nombre}</p>
          <p className="mt-1 text-[14px] text-medio">{a.rol}</p>
          {e?.dice && <p className={`${serif} mt-5 text-[22px] leading-[1.15]`}>“{e.dice}”</p>}
          {e?.necesita && e.necesita !== "—" && <p className="mt-4 text-[14px]"><span className={etiqueta}>Necesita</span><br />{e.necesita}</p>}
          {e && <p className="mt-4 text-[12px] text-suave">v{e.version} · {e.modo === "real" ? "con IA" : e.modo === "manual" ? "a mano" : "simulada"} · {hace(e.creado)}</p>}
        </aside>

        <article className="min-w-0 max-w-[74ch]">
          <h1 className={`${serif} text-[clamp(38px,4.6vw,64px)] leading-[0.98]`}>{e?.titulo ?? "Sin entrega todavía"}</h1>
          {e && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <a href={`/imprimir/${id}/${tarea}${v ? `?v=${v}` : ""}`} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[#f1ede6] px-4 text-[13px] text-medio transition hover:bg-[#e9e3d9] hover:text-tinta">Exportar · PDF o texto ↗</a>
            </div>
          )}
          {e?.datos?.cortada && !v ? (
            <form action={accionCambiar} className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-[#fff4e8] p-4 shadow-[inset_0_0_0_1px_rgba(255,90,31,.2)]">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="motor" value="" />
              <input type="hidden" name="agente" value={a.id} />
              <input type="hidden" name="nota" value="Tu entrega anterior quedó cortada antes de terminar. Entrégala completa, con todas sus secciones, más concisa si hace falta, y cierra con el bloque final." />
              <span className="min-w-0 flex-1 text-[14px] text-[#8a3a0c]">Esta entrega quedó cortada: a {a.nombre} se le acabó el espacio antes de terminar.</span>
              <Enviar className="inline-flex min-h-10 items-center rounded-full bg-tinta px-5 text-[13px] font-medium text-white" texto="Que la complete" trabajando={`${a.nombre} la completa…`} proyecto={id} largo />
            </form>
          ) : null}
          {!e && <p className="mt-3 text-[16px] text-medio">{a.nombre} todavía no trabajó en esto. Aparece aquí cuando el equipo llegue a la fase {fase.nombre}.</p>}
          {actual && anteriores.length > 0 && (
            <nav aria-label="Versiones" className="mt-5 flex flex-wrap items-center gap-1.5">
              <a href={base} aria-current={!v && !comparar ? "page" : undefined} className={pastilla(!v && !comparar)}>v{actual.version} · actual</a>
              {anteriores.map((n) => (
                <span key={n} className="inline-flex items-center gap-0.5">
                  <a href={`${base}?v=${n}`} aria-current={v === String(n) ? "page" : undefined} className={pastilla(v === String(n))}>v{n}</a>
                  <a href={`${base}?comparar=${n}`} className={`inline-flex min-h-9 items-center px-2 text-[12px] underline underline-offset-4 ${comparar === String(n) ? "text-tinta" : "text-suave"}`}>comparar</a>
                </span>
              ))}
            </nav>
          )}
          {v && actual && Number(v) !== actual.version && (
            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-[0_0_0_1px_var(--color-borde)]">
              <span className="text-[14px]">Estás viendo la v{v}. La actual es la v{actual.version}.</span>
              <Confirmar
                accion={accionRestaurar}
                campos={{ id, tarea: t, v }}
                disparador="Volver a esta versión"
                claseDisparador={botonLleno}
                titulo={`¿Volver a la v${v}?`}
                texto={`Se guarda como una versión nueva; la v${actual.version} queda en el historial. Lo que dependía de esta entrega puede necesitar revisión.`}
                confirmar="Volver a esta versión"
              />
              <a href={base} className={boton}>Ver la actual</a>
            </div>
          )}
          {diff ? (
            <div className="mt-8">
              <p className="text-[13px] text-medio">v{comparar} → v{actual!.version} · <span className="text-[#126b43]">+{contarCambios(diff).agregadas}</span> <span className="text-[#a3260f]">−{contarCambios(diff).quitadas}</span> líneas</p>
              <pre className="mt-3 overflow-x-auto rounded-2xl bg-white p-4 font-mono text-[13px] leading-6 shadow-[0_0_0_1px_var(--color-borde)]">
                {diff.map((l, i) => (
                  <div key={i} className={l.tipo === "agregada" ? "bg-[#e7f5ec] text-[#0b4a1f]" : l.tipo === "quitada" ? "bg-[#fde8e4] text-[#7a1a0c] line-through decoration-1" : "text-suave"}>
                    {l.tipo === "agregada" ? "+ " : l.tipo === "quitada" ? "− " : "  "}{l.texto || " "}
                  </div>
                ))}
              </pre>
            </div>
          ) : (
            e && <div className="entrega mt-8" dangerouslySetInnerHTML={{ __html: html(e.datos?.cortada ? e.contenido.replace(/\n+> ⚠️[\s\S]*$/, "") : e.contenido) }} />
          )}
        </article>
      </div>
    </div>
  );
}
