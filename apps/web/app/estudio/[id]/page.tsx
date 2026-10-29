import Link from "next/link";
import { notFound } from "next/navigation";
import { FASES, PEDIDOS, agentePorId } from "@anonymo/agentes";
import { contratoPorId, dependientes, repartir, esImagen, existe, listarArchivos, leerBitacora, leerEntrega, leerNota, leerProyecto, nombreTarea, type TareaId, calendario, sumar, PRECIOS, plantillaPorId, presupuestoVivo, responsable, nubeActiva } from "@anonymo/pipeline";
import { Calendario } from "@/components/estudio/Calendario";
import { PlanAtlas } from "@/components/estudio/PlanAtlas";
import { EquipoVivo } from "@/components/estudio/EquipoVivo";
import { Enviar } from "../nuevo/Enviar";
import { Avance, Cara, Caras, Fases, estadosDeFases, hace } from "@/components/estudio/piezas";
import { Confirmar } from "@/components/estudio/Confirmar";
import { ZonaArchivos } from "@/components/estudio/ZonaArchivos";
import { sesionConfigurada } from "@/lib/sesion";
import { traer } from "@/lib/nube";
import { espacio } from "@/lib/espacio";
import { boton, botonLleno, botonSuave, campo, ESTADO_PROYECTO, etiqueta, exigirEstudio, serif } from "@/lib/estudio";
import { accionAPapelera, accionSacarDePapelera, accionAprobar, accionCambiar, accionDescartarPendiente, accionMandarCliente, accionParar, accionPausas, accionPortal, accionReanudar, accionResponder, accionResponsable, accionSeguir, accionSubir, accionVerReparto } from "../acciones";

export const dynamic = "force-dynamic";
// Las acciones que hacen trabajar a los agentes pueden tardar: hasta 5 minutos en línea.
export const maxDuration = 300;
export const metadata = { title: "Proyecto — Estudio", robots: { index: false } };

type Ver = "" | "entregas" | "cliente" | "archivos" | "numeros" | "ajustes";
const FILTROS: { id: Ver; nombre: string }[] = [
  { id: "", nombre: "Todo" },
  { id: "entregas", nombre: "Entregas" },
  { id: "cliente", nombre: "Del cliente" },
  { id: "archivos", nombre: "Archivos" },
  { id: "numeros", nombre: "Números y tiempos" },
  { id: "ajustes", nombre: "Ajustes" },
];

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ vista?: string; pendiente?: string; ver?: string }> };

const ESTADO_TAREA: Record<string, string> = { lista: "Lista", "en-curso": "Trabajando", "por-empezar": "Por empezar", rehacer: "Por rehacer" };
const CHIP_TAREA: Record<string, string> = { lista: "bg-[#e7f5ec] text-[#126b43]", "en-curso": "bg-vivo text-white", "por-empezar": "bg-[#f1ede6] text-suave", rehacer: "bg-[#fff1e6] text-[#b2450f]" };

export default async function ProyectoEstudio({ params, searchParams }: Props) {
  const yo = await exigirEstudio();
  const conClaves = sesionConfigurada();
  const { id } = await params;
  if (!/^[a-z0-9_-]+$/.test(id)) notFound();
  await traer(id);
  const { vista, pendiente, ver: verCrudo } = await searchParams;
  if (!existe(id)) notFound();
  const ver = (FILTROS.some((f) => f.id === verCrudo) ? verCrudo : "") as Ver;
  const p = leerProyecto(id);
  const e = espacio(id);
  const nota = leerNota(leerEntrega(id, "6.trofeo"));
  const deFase = (f: number) => p.plan.tareas.filter((t) => t.startsWith(`${f}.`)) as TareaId[];
  const actuales = deFase(p.faseActual);
  // Vista previa del reparto de un comentario del cliente.
  const decision = vista ? await repartir(vista, p.plan) : undefined;
  const reparto = decision?.tareas ?? [];
  const arrastra = vista ? dependientes(reparto, p.plan.tareas) : [];
  const conTarea = [...new Set(p.plan.tareas.map((t) => t.split(".")[1]))];
  const comunes = (
    <>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="motor" value="" />
    </>
  );

  const leToca = responsable(p, p.faseActual);
  const nombre = (s: string) => (s === "luna" ? "Luna" : "Jay");
  const enLinea = nubeActiva();
  const b = presupuestoVivo(p);
  const costo = sumar(p);
  const archivos = listarArchivos(id);
  const hechas = Object.values(p.tareas).filter((x) => x === "lista").length;
  const entregasDe = Object.fromEntries(p.plan.tareas.map((t) => [t, contratoPorId(t)?.entrega ?? ""]));
  const conversacion = [
    ...(p.notasCliente ?? []).map((n) => ({ fecha: n.fecha, texto: n.texto, quien: n.quien, a: n.tareas.map(nombreTarea).join(", "), pendiente: false })),
    ...(p.pendientesCliente ?? []).map((n) => ({ fecha: n.fecha, texto: n.texto, quien: "cliente" as const, a: "", pendiente: true })),
  ].sort((x, y) => x.fecha.localeCompare(y.fecha));
  const muestra = (f: Ver) => ver === "" || ver === f;
  const plantilla = plantillaPorId(p.pedido.plantilla);

  return (
    <div className="px-5 pb-16 pt-7 md:px-10 md:pt-9">
      {/* Encabezado del espacio */}
      <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-[13px] text-suave">
            <i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: e.punto }} />
            {PEDIDOS[p.pedido.tipo].nombre}{plantilla ? ` · ${plantilla.nombre}` : ""} · {p.papelera ? "En la papelera" : ESTADO_PROYECTO[p.estado]}
          </p>
          <h1 className={`${serif} mt-1 text-[clamp(42px,5.4vw,72px)] leading-[0.95]`}>{p.pedido.cliente}</h1>
        </div>
        <div className="flex items-end gap-6">
          {nota && <div><p className={etiqueta}>Jurado</p><p className={`${serif} text-[44px] leading-none`}>{String(nota.final).replace(".", ",")}</p></div>}
          <div className="w-[150px]">
            <p className="text-[12px] text-suave">{hechas} de {p.plan.tareas.length} entregas</p>
            <div className="mt-2"><Avance valor={hechas / Math.max(1, p.plan.tareas.length)} color={e.punto} vivo={p.estado === "en-curso"} /></div>
          </div>
        </div>
      </div>
      <div className="mt-4"><Fases fases={estadosDeFases(p)} estado={p.estado} /></div>

      {p.papelera && (
        <div role="alert" className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#fde8e4] p-5">
          <p className="text-[15px] text-[#8a1c0c]">Está en la papelera desde {hace(p.papelera.fecha)}: no aparece ni trabaja.</p>
          <Confirmar accion={accionSacarDePapelera} campos={{ id }} disparador="Restaurar" claseDisparador={botonLleno} titulo="¿Restaurar el proyecto?" texto={`«${p.pedido.cliente}» vuelve al estudio tal como estaba.`} confirmar="Restaurar" />
        </div>
      )}

      {/* La caja del espacio: lo que dijo el cliente va a quien corresponde. */}
      <div id="cliente" className="mt-7 scroll-mt-6">
        {vista ? (
          <form action={accionMandarCliente} className="grid gap-4 rounded-[20px] bg-white p-5 shadow-[0_0_0_1px_rgba(26,24,22,.06),0_18px_44px_-24px_rgba(40,30,20,.3)] md:p-6">
            {comunes}
            <input type="hidden" name="texto" value={vista} />
            {pendiente && <><input type="hidden" name="pendiente" value={pendiente} /><input type="hidden" name="origen" value="cliente" /></>}
            <div className="flex items-start gap-3">
              <Cara id="atlas" tam={36} flota />
              <div className="min-w-0">
                <p className={`${serif} text-[26px] leading-[1.1]`}>“{vista}”</p>
                {decision && <p className="mt-2 text-[14px] text-medio">{decision.como === "ia" ? "Atlas (con IA): " : "Atlas (por palabras clave): "}{decision.razon}</p>}
              </div>
            </div>
            <fieldset>
              <legend className={etiqueta}>Se lo manda a · puedes cambiarlo</legend>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {conTarea.map((a) => (
                  <label key={a} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-[#f6f3ee] py-1 pl-1.5 pr-3 text-[14px] transition has-[:checked]:bg-tinta has-[:checked]:text-white">
                    <input type="checkbox" name="agentes" value={a} defaultChecked={reparto.some((t) => t.endsWith(`.${a}`))} className="sr-only" />
                    <Cara id={a} tam={26} titulo={false} /> {agentePorId(a)?.nombre}
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="text-[13px] text-medio">Con este reparto se rehacen {arrastra.length} tarea{arrastra.length === 1 ? "" : "s"}{arrastra.length ? `: ${arrastra.map(nombreTarea).join(", ")}` : ""}.</p>
            <div className="flex flex-wrap items-center gap-2">
              <Enviar className={botonLleno} texto="Mandar al equipo" trabajando="El equipo está rehaciendo…" />
              <Link href={`/estudio/${id}`} className={botonSuave}>Cancelar</Link>
            </div>
          </form>
        ) : (
          <form action={accionVerReparto} className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-borde pb-5 focus-within:border-tinta/40">
            {comunes}
            <Cara id="atlas" tam={34} flota titulo={false} />
            <label className="min-w-[220px] flex-1">
              <span className="sr-only">Lo que dijo el cliente</span>
              <input id="atlas" name="texto" required autoComplete="off" placeholder="Pega lo que dijo el cliente o pide un cambio…" className="w-full bg-transparent font-serif text-[clamp(24px,2.8vw,32px)] italic leading-tight sin-anillo outline-none placeholder:text-[#b3ab9f]" />
            </label>
            <button className="inline-flex min-h-11 items-center gap-2 rounded-full bg-tinta px-4 text-[13px] font-medium text-white transition hover:bg-black">Ver a quién va →</button>
          </form>
        )}
      </div>

      <nav aria-label="Filtrar" className="mt-4 flex flex-wrap gap-1.5">
        {FILTROS.map((f) => (
          <Link key={f.id} href={f.id ? `/estudio/${id}?ver=${f.id}` : `/estudio/${id}`} aria-current={ver === f.id ? "page" : undefined}
            className={`inline-flex min-h-9 items-center rounded-full px-3.5 text-[13px] transition ${ver === f.id ? "bg-tinta text-white" : "bg-[#f1ede6] text-medio hover:bg-[#e9e3d9]"}`}>
            {f.nombre}
          </Link>
        ))}
      </nav>

      {/* AHORA: lo único que hay que decidir en este momento. */}
      {ver === "" && !p.papelera && (
        <div className="mt-7">
          {p.estado === "plan" && <PlanAtlas p={p} conIA={!!process.env.ANTHROPIC_API_KEY} />}
          {p.estado === "esperando" && (
            <section aria-label="Te toca" className="overflow-hidden rounded-[20px] bg-white shadow-[0_0_0_1px_rgba(26,24,22,.06),0_18px_44px_-24px_rgba(40,30,20,.3)]">
              <div className="bg-tinta p-6 text-white md:p-8">
                <p className="flex items-center gap-2 text-[12px] text-white/60">
                  <i className="late h-1.5 w-1.5 rounded-full bg-urgente" />
                  {leToca === yo ? "Te toca" : `Le toca a ${nombre(leToca)}`} · {p.esperaJurado ? "el jurado no llegó a 7 después de dos rondas" : `terminó ${FASES.find((x) => x.n === p.faseActual)?.nombre}`}
                </p>
                <p className={`${serif} mt-2 text-[clamp(28px,3.2vw,40px)] leading-[1.05]`}>Revisa lo que entregaron y decide.</p>
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {actuales.map((t) => {
                    const a = agentePorId(t.split(".")[1])!;
                    return (
                      <li key={t}>
                        <Link href={`/estudio/${id}/${t.replace(".", "-")}`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/10 py-1 pl-1.5 pr-4 text-[14px] transition hover:bg-white/20">
                          <Cara id={a.id} tam={28} titulo={false} /> {a.nombre} · {contratoPorId(t)?.entrega} →
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="grid gap-6 p-6 md:grid-cols-2 md:p-8">
                <form action={accionAprobar} className="grid content-start gap-2">
                  {comunes}
                  {conClaves ? <input type="hidden" name="quien" value={yo} /> : (
                    <select name="quien" className={campo} defaultValue={leToca} aria-label="Quién decide"><option value="jay">Decide Jay</option><option value="luna">Decide Luna</option></select>
                  )}
                  {leToca !== yo && conClaves && <input type="hidden" name="forzar" value="1" />}
                  <label className="sr-only" htmlFor="nota-aprobar">Nota para el equipo</label>
                  <input id="nota-aprobar" name="nota" placeholder="Nota para el equipo (opcional)" className={campo} />
                  <div><Enviar className={`${botonLleno} min-h-12 px-7 text-[14px]`} texto={p.esperaJurado ? "Aceptar y cerrar" : "Aprobar y seguir"} trabajando="El equipo está trabajando… no cierres la página" /></div>
                  {leToca !== yo && <p className="text-[13px] text-medio">Esta fase la aprueba {nombre(leToca)}; si apruebas tú, queda a tu nombre.</p>}
                </form>
                <form action={accionCambiar} className="grid content-start gap-2">
                  {comunes}
                  <input type="hidden" name="quien" value={yo} />
                  <label className="sr-only" htmlFor="nota-cambio">Qué hay que cambiar</label>
                  <textarea id="nota-cambio" name="nota" rows={3} required placeholder="Qué hay que cambiar: «más elegante», «menos texto»…" className={campo} />
                  <select name="agente" className={campo} defaultValue="" aria-label="A quién">
                    <option value="">A toda la fase</option>
                    {actuales.map((t) => <option key={t} value={t.split(".")[1]}>Solo a {agentePorId(t.split(".")[1])?.nombre}</option>)}
                  </select>
                  <div><Enviar className={boton} texto="Pedir cambios" trabajando="Rehaciendo…" /></div>
                </form>
              </div>
            </section>
          )}
          {p.estado === "en-curso" && (
            <form action={accionSeguir} className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(26,24,22,.06)]">
              {comunes}
              <div>
                <p className={`${serif} text-[30px] leading-none`}>El equipo quedó a medias.</p>
                <p className="mt-1 text-[14px] text-medio">Pasa si se cortó por tiempo. Lo que ya terminaron está guardado: sigue desde ahí.</p>
              </div>
              <Enviar className={botonLleno} texto="Seguir" trabajando="El equipo está trabajando…" />
            </form>
          )}
          {p.estado === "parado" && (
            <form action={accionReanudar} className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(26,24,22,.06)]">
              {comunes}
              <div>
                <p className={`${serif} text-[30px] leading-none`}>Proyecto parado.</p>
                <p className="mt-1 text-[14px] text-medio">Nadie trabaja en él. Al reanudar, vuelve a esperar tu decisión.</p>
              </div>
              <button className={botonLleno}>Reanudar</button>
            </form>
          )}
          {p.estado === "listo" && (
            <div className="flex flex-wrap items-center gap-4 rounded-[20px] bg-[#e7f5ec] p-6">
              <Cara id="trofeo" tam={52} flota />
              <div>
                <p className={`${serif} text-[30px] leading-none`}>Proyecto listo.</p>
                <p className="mt-1 text-[14px] text-medio">Todas las fases aprobadas{nota ? ` · nota del jurado ${String(nota.final).replace(".", ",")}` : ""}.</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mamposteria mt-7">
        {muestra("") && ver === "" && <EquipoVivo inicial={{ id, nombre: p.pedido.cliente, estado: p.estado, faseActual: p.faseActual, tareas: p.tareas }} entregas={entregasDe} />}

        {/* Entregas: cada una firmada por su agente. */}
        {muestra("entregas") && p.plan.fases.flatMap((f) => deFase(f).map((t) => {
          const c = contratoPorId(t)!;
          const a = agentePorId(c.agente)!;
          const en = leerEntrega(id, t);
          const est = p.tareas[t];
          return (
            <Link key={t} href={`/estudio/${id}/${t.replace(".", "-")}`} className={`tarjeta block ${est === "por-empezar" ? "opacity-70" : ""}`}>
              <span className="block p-5">
                <span className="flex items-center gap-2 text-[12px] text-suave">
                  <span>{String(f).padStart(2, "0")} · {FASES.find((x) => x.n === f)?.nombre}</span>
                  <span className={`ml-auto inline-flex h-6 items-center rounded-full px-2.5 text-[11px] ${CHIP_TAREA[est]}`}>{ESTADO_TAREA[est]}</span>
                </span>
                <span className={`${serif} mt-2 block text-[24px] leading-[1.08]`}>{c.entrega}</span>
                {en?.dice && <span className="mt-2 line-clamp-4 block text-[14px] leading-snug text-medio">“{en.dice}”</span>}
                {en?.necesita && en.necesita !== "—" && <span className="mt-2 line-clamp-2 block text-[12px] text-suave">Necesita: {en.necesita}</span>}
              </span>
              <span className="flex items-center gap-2 border-t border-[#f2eee8] px-4 py-2.5 text-[12px] text-suave">
                <Cara id={a.id} tam={20} apagado={est === "por-empezar"} titulo={false} /> {a.nombre} · aprueba {nombre(responsable(p, f))}
                {en && <span className="ml-auto font-mono text-[10px]">v{en.version} · {hace(en.creado)}</span>}
              </span>
            </Link>
          );
        }))}

        {/* Lo que dijo el cliente. */}
        {muestra("cliente") && conversacion.map((m) => (
          <div key={m.fecha + m.texto} className={`tarjeta p-5 ${m.pendiente ? "bg-[#fff4e8]" : m.quien === "cliente" ? "bg-[#fffaf1]" : "bg-white"}`}>
            <p className={`${serif} text-[22px] leading-[1.15]`}>“{m.texto}”</p>
            <p className="mt-3 text-[12px] text-suave">
              {m.quien === "cliente" ? p.pedido.cliente : `Lo anotó ${nombre(m.quien)}`} · {hace(m.fecha)}{m.pendiente ? " · desde su portal, sin mandar al equipo" : ""}
            </p>
            {m.a && <p className="mt-1 text-[12px] text-medio">→ {m.a}</p>}
            {m.pendiente && (
              <div className="mt-3 flex flex-wrap items-center gap-1">
                <form action={accionVerReparto}>{comunes}<input type="hidden" name="texto" value={m.texto} /><input type="hidden" name="pendiente" value={m.fecha} /><button className={botonLleno}>Revisar y mandar</button></form>
                <Confirmar accion={accionDescartarPendiente} campos={{ id, motor: "", pendiente: m.fecha }} disparador="Descartar" titulo="¿Descartar el comentario?" texto="Sale de la lista y no llega al equipo." confirmar="Descartar" />
              </div>
            )}
          </div>
        ))}
        {ver === "cliente" && conversacion.length === 0 && (
          <div className="tarjeta p-5"><p className={`${serif} text-[22px] leading-tight`}>Todavía no hay nada del cliente.</p><p className="mt-1 text-[13px] text-medio">Lo que te diga por WhatsApp, llamada o en persona, pégalo arriba: Atlas lo manda a quien corresponde.</p></div>
        )}

        {muestra("cliente") && p.plan.preguntas.length > 0 && p.estado !== "plan" && (
          <form action={accionResponder} className="tarjeta grid gap-3 p-5">
            {comunes}
            <input type="hidden" name="quien" value={yo} />
            <p className={`${serif} text-[24px] leading-tight`}>Lo que falta saber del cliente</p>
            {p.plan.preguntas.map((q, i) => (
              <label key={q} className="grid gap-1.5 text-[14px]">
                {q}
                <input name={`r${i}`} className={campo} placeholder="Lo que dijo el cliente" />
              </label>
            ))}
            <div><button className={boton}>Anotar respuestas</button></div>
          </form>
        )}
        {muestra("cliente") && (p.pedido.contexto?.respuestas ?? []).length > 0 && (
          <div className="tarjeta p-5">
            <p className="text-[12px] text-suave">Respuestas del cliente</p>
            <ul className="mt-2 grid gap-3 text-[14px]">
              {p.pedido.contexto!.respuestas!.map((r) => <li key={r.pregunta}><span className="text-suave">{r.pregunta}</span><br />{r.respuesta}</li>)}
            </ul>
          </div>
        )}
        {muestra("cliente") && (
          <details className="tarjeta group p-5" open={ver === "cliente"}>
            <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 text-[12px] text-suave">
              Lo que contaron al empezar <span className="ml-auto transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed">{p.pedido.descripcion}</p>
          </details>
        )}

        {/* Archivos del cliente. */}
        {muestra("archivos") && (
          <div className="tarjeta p-5">
            <p className="text-[12px] text-suave">Archivos del cliente · {archivos.length}</p>
            {archivos.length > 0 && (
              <ul className="mt-3 grid grid-cols-3 gap-1.5">
                {archivos.map((a) => (
                  <li key={a.nombre}>
                    <a href={`/estudio/${id}/archivos/${encodeURIComponent(a.nombre)}`} target="_blank" rel="noreferrer" className="block" title={a.nota ?? a.nombre}>
                      {esImagen(a.nombre) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`/estudio/${id}/archivos/${encodeURIComponent(a.nombre)}`} alt={a.nota ?? a.nombre} loading="lazy" className="aspect-square w-full rounded-lg bg-[#f4f1eb] object-cover" />
                      ) : (
                        <span className="flex aspect-square w-full items-center justify-center rounded-lg bg-[#f4f1eb] p-2 text-center font-mono text-[10px] break-all">{a.nombre}</span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <form action={accionSubir} className="mt-3 grid gap-2">
              {comunes}
              <ZonaArchivos limiteMB={enLinea ? 4 : undefined} />
              <label className="sr-only" htmlFor="nota-archivos">Qué es</label>
              <input id="nota-archivos" name="nota" placeholder="Qué es (ej.: fotos del consultorio)" className={campo} />
              <div><Enviar className={boton} texto="Subir" trabajando="Subiendo…" /></div>
            </form>
          </div>
        )}

        {/* Portal del cliente. */}
        {(ver === "" || ver === "ajustes") && (
          <div className="tarjeta p-5">
            <p className="text-[12px] text-suave">Portal del cliente</p>
            {p.portal ? (
              <>
                <a href={`/portal/${id}?t=${p.portal.token}`} target="_blank" rel="noreferrer" className={`${serif} mt-1 block text-[24px] leading-tight underline decoration-borde underline-offset-4 hover:decoration-tinta`}>Abrir su portal ↗</a>
                <p className="mt-2 text-[13px] text-medio">Copia el enlace y mándaselo: ve sus entregas (sin precios internos ni la nota del jurado), aprueba fases y comenta.</p>
                <div className="mt-2">
                  <Confirmar accion={accionPortal} campos={{ id, motor: "", nuevo: "1" }} disparador="Cambiar enlace" titulo="¿Cambiar el enlace?" texto="El enlace que ya tiene el cliente deja de funcionar. Tendrás que mandarle el nuevo." confirmar="Cambiar enlace" />
                </div>
              </>
            ) : (
              <form action={accionPortal} className="mt-2">{comunes}<p className="mb-3 text-[13px] text-medio">Un enlace privado para que el cliente vea sus entregas y comente.</p><button className={boton}>Crear enlace para el cliente</button></form>
            )}
          </div>
        )}

        {/* Números y tiempos. */}
        {muestra("numeros") && (
          <div className="tarjeta p-5">
            <p className="text-[12px] text-suave">Gasto en IA</p>
            <p className={`${serif} text-[48px] leading-none`}>${costo.real.toFixed(2)}</p>
            <ul className="mt-3 grid gap-1 text-[13px]">
              {costo.tareas.slice(0, ver === "numeros" ? 40 : 6).map((t) => <li key={t.tarea} className="flex justify-between gap-3"><span className="truncate">{nombreTarea(t.tarea)}{t.veces > 1 ? ` ×${t.veces}` : ""}</span><span className="text-medio">${t.usd.toFixed(3)}</span></li>)}
            </ul>
            <p className="mt-2 text-[11px] text-suave">Por millón de tokens: entrada {PRECIOS.entrada} · salida {PRECIOS.salida}.</p>
            <div className="mt-4 border-t border-[#f2eee8] pt-3 text-[13px]">
              <p className="font-medium">Presupuesto vivo</p>
              <p className="text-medio">Base de Ledger: {b.base ?? "sin definir"} h · cambios por cobrar: +{b.extra} h{b.precio !== undefined ? ` · US$ ${b.precio.toLocaleString("es-EC")}` : b.tarifa ? "" : " · pon TARIFA_HORA para ver el precio"}</p>
              {b.ajustes.length > 0 && <ul className="mt-1 grid gap-1">{b.ajustes.map((a) => <li key={a.fecha + a.tarea}>+{a.horas} h {nombreTarea(a.tarea as TareaId)} <span className="text-suave">· {a.motivo}</span></li>)}</ul>}
            </div>
          </div>
        )}
        {muestra("numeros") && calendario(p).length > 0 && (
          <div className="tarjeta p-5">
            <p className="mb-3 text-[12px] text-suave">Calendario</p>
            <Calendario tramos={calendario(p)} />
          </div>
        )}
        {(ver === "numeros" || ver === "ajustes") && (
          <div className="tarjeta p-5">
            <p className="text-[12px] text-suave">Bitácora</p>
            <ul className="mt-2 grid gap-1.5 text-[13px] text-medio">{leerBitacora(id, 30).map((l, i) => <li key={i}>{l}</li>)}</ul>
          </div>
        )}

        {/* Ajustes. */}
        {ver === "ajustes" && (
          <>
            <form action={accionPausas} className="tarjeta grid gap-2 p-5">
              {comunes}
              <label className="grid gap-1.5">
                <span className={`${serif} text-[22px] leading-tight`}>Dónde se detiene para que revisen</span>
                <span className="text-[13px] text-medio">Ahora: {p.plan.pausas.length ? `al terminar ${p.plan.pausas.map((f) => FASES.find((x) => x.n === f)?.nombre).join(", ")}` : "solo al final"}.</span>
                <select name="pausas" className={campo} defaultValue="clave">
                  <option value="clave">Donde propone Atlas</option>
                  <option value="cada-fase">En cada fase</option>
                  <option value="nunca">Solo al final</option>
                  {p.plan.fases.map((f) => <option key={f} value={String(f)}>Solo en {FASES.find((x) => x.n === f)?.nombre}</option>)}
                </select>
              </label>
              <div><Enviar className={boton} texto="Guardar" trabajando="Guardando…" /></div>
              <p className="text-[12px] text-suave">Si el equipo tiene trabajo pendiente, sigue hasta la nueva pausa.</p>
            </form>

            <div className="tarjeta grid gap-2 p-5">
              <p className={`${serif} text-[22px] leading-tight`}>Quién aprueba cada fase</p>
              {p.plan.fases.map((f) => (
                <form key={f} action={accionResponsable} className="flex min-h-11 items-center justify-between gap-2 border-t border-[#f2eee8] pt-2 text-[14px]">
                  {comunes}
                  <input type="hidden" name="fase" value={f} />
                  <label htmlFor={`socio-${f}`}>{FASES.find((x) => x.n === f)?.nombre}</label>
                  <span className="flex items-center gap-1">
                    <select id={`socio-${f}`} name="socio" defaultValue={responsable(p, f)} className="min-h-9 rounded-full bg-[#f1ede6] px-3 text-[13px] outline-none">
                      <option value="jay">Jay</option><option value="luna">Luna</option>
                    </select>
                    <button className={botonSuave}>Guardar</button>
                  </span>
                </form>
              ))}
            </div>

            <div className="tarjeta grid gap-2 p-5 text-[14px]">
              <p className={`${serif} text-[22px] leading-tight`}>PDF</p>
              {enLinea ? (
                <p className="text-medio">Todavía se arma desde tu máquina: <code className="rounded bg-[#f4f1eb] px-1.5 py-0.5 font-mono text-[12px]">npm run pipeline -- pdf {id}</code></p>
              ) : (
                <p className="flex flex-wrap gap-2"><a href={`/estudio/${id}/pdf`} className={boton}>Para el cliente ↓</a><a href={`/estudio/${id}/pdf?internas=1`} className={boton}>Interno ↓</a></p>
              )}
            </div>

            <div className="tarjeta grid gap-3 p-5">
              <p className={`${serif} text-[22px] leading-tight`}>Parar o quitar</p>
              <div className="flex flex-wrap gap-1">
                {p.estado !== "parado" && p.estado !== "listo" && (
                  <Confirmar accion={accionParar} campos={{ id, motor: "" }} disparador="Parar el proyecto" claseDisparador={boton} titulo="¿Parar el proyecto?" texto="El equipo deja de trabajar en él hasta que lo reanudes. No se pierde nada." confirmar="Parar" />
                )}
                {!p.papelera && (
                  <Confirmar accion={accionAPapelera} campos={{ id }} disparador="Mandar a la papelera" claseDisparador={`${boton} !text-[#a3260f]`} titulo="¿Mandar a la papelera?" texto={`«${p.pedido.cliente}» deja de aparecer y de trabajar. Lo puedes restaurar desde la papelera durante 30 días; después se borra solo.`} confirmar="Mandar a la papelera" peligro />
                )}
              </div>
            </div>
          </>
        )}
        {ver === "" && (
          <Link href={`/estudio/${id}?ver=ajustes`} className="tarjeta flex items-center gap-3 p-5">
            <Caras ids={["tempo", "ledger"]} tam={24} />
            <span className="text-[14px]">Pausas, quién aprueba, PDF, parar o papelera</span>
            <span className="ml-auto text-suave">→</span>
          </Link>
        )}
      </div>
    </div>
  );
}
