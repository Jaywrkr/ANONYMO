import Link from "next/link";
import { notFound } from "next/navigation";
import { FASES, PEDIDOS, agentePorId } from "@anonymo/agentes";
import { contratoPorId, dependientes, repartir, esImagen, existe, listarArchivos, leerBitacora, leerEntrega, leerNota, leerProyecto, nombreTarea, type TareaId, calendario, sumar, PRECIOS, plantillaPorId, presupuestoVivo, responsable, nubeActiva, modoDe, versionesSitio } from "@anonymo/pipeline";
import { Calendario } from "@/components/estudio/Calendario";
import { PlanAtlas } from "@/components/estudio/PlanAtlas";
import { EquipoVivo } from "@/components/estudio/EquipoVivo";
import { Camino } from "@/components/estudio/Camino";
import { Copiar } from "@/components/estudio/Copiar";
import { Enviar } from "../nuevo/Enviar";
import { Cara, Caras, hace } from "@/components/estudio/piezas";
import { Confirmar } from "@/components/estudio/Confirmar";
import { ZonaArchivos } from "@/components/estudio/ZonaArchivos";
import { sesionConfigurada } from "@/lib/sesion";
import { traer } from "@/lib/nube";
import { espacio } from "@/lib/espacio";
import { momento, nombreFase, nombreSocio } from "@/lib/camino";
import { segundosEstimados } from "@/lib/duracion";
import { MarcaEditor } from "@/components/estudio/MarcaEditor";
import { RevisarAgente } from "@/components/estudio/RevisarAgente";
import { OpcionesModo } from "@/components/estudio/OpcionesModo";
import { FuentesDirecciones, Maqueta } from "@/components/estudio/Maqueta";
import { MiniWeb } from "@/components/estudio/MiniWeb";
import { urlSitio } from "@/lib/sitio";
import { leerVivo, vivoActivo } from "@/lib/trabajo";
import { AhoraEnVivo } from "@/components/estudio/AhoraEnVivo";
import { dinero } from "@/lib/propuesta";
import { boton, botonLleno, botonSuave, campo, ESTADO_PROYECTO, exigirEstudio, serif } from "@/lib/estudio";
import { accionAPapelera, accionCambiar, accionPresupuesto, accionSacarDePapelera, accionDescartarPendiente, accionMandarCliente, accionParar, accionModo, accionPausas, accionPortal, accionReanudar, accionResponder, accionResponsable, accionSeguir, accionSubir, accionVerReparto } from "../acciones";

export const dynamic = "force-dynamic";
// Las acciones que hacen trabajar a los agentes pueden tardar: hasta 5 minutos en línea.
export const maxDuration = 300;
export const metadata = { title: "Proyecto — Estudio", robots: { index: false } };

type Ver = "" | "entregas" | "cliente" | "archivos" | "marca" | "numeros" | "ajustes";
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ vista?: string; pendiente?: string; ver?: string }> };

const ESTADO_TAREA: Record<string, string> = { lista: "Lista", "en-curso": "Trabajando", "por-empezar": "Por empezar", rehacer: "Corrigiendo" };
const CHIP_TAREA: Record<string, string> = { lista: "bg-[#e7f5ec] text-[#126b43]", "en-curso": "bg-vivo text-white", "por-empezar": "bg-[#f1ede6] text-suave", rehacer: "bg-[#fff1e6] text-[#b2450f]" };
const tarjeta = "rounded-[18px] bg-white p-5 shadow-[0_0_0_1px_rgba(26,24,22,.05),0_6px_18px_-12px_rgba(40,30,20,.2)]";

export default async function ProyectoEstudio({ params, searchParams }: Props) {
  const yo = await exigirEstudio();
  const conClaves = sesionConfigurada();
  const { id } = await params;
  if (!/^[a-z0-9_-]+$/.test(id)) notFound();
  await traer(id);
  const { vista, pendiente, ver: verCrudo } = await searchParams;
  if (!existe(id)) notFound();
  const p = leerProyecto(id);
  const e = espacio(id, p.marca);
  const leToca = responsable(p, p.faseActual);
  // La señal de la vuelta que está trabajando (si hay): manda sobre lo que diga el estado (sistema/42).
  const senal = leerVivo(id);
  const ocupado = p.estado === "en-curso" && vivoActivo(senal) ? senal : undefined;
  const m = momento(p, yo, leToca, Date.now(), ocupado);
  const quienTrabaja = ocupado?.tarea ? agentePorId(ocupado.tarea.split(".")[1])?.nombre ?? "El equipo" : "El equipo";
  const nota = leerNota(leerEntrega(id, "6.trofeo"));
  const deFase = (f: number) => p.plan.tareas.filter((t) => t.startsWith(`${f}.`)) as TareaId[];
  const conversacion = [
    ...(p.notasCliente ?? []).map((n) => ({ fecha: n.fecha, texto: n.texto, quien: n.quien, a: n.tareas.map(nombreTarea).join(", "), pendiente: false })),
    ...(p.pendientesCliente ?? []).map((n) => ({ fecha: n.fecha, texto: n.texto, quien: "cliente" as const, a: "", pendiente: true })),
  ].sort((x, y) => x.fecha.localeCompare(y.fecha));
  const pendientesPortal = p.pendientesCliente ?? [];
  const archivos = listarArchivos(id);
  const enLinea = nubeActiva();
  const b = presupuestoVivo(p);
  const costo = sumar(p);
  const plantilla = plantillaPorId(p.pedido.plantilla);
  const tramos = calendario(p);
  const preguntasSinResponder = p.plan.preguntas.filter((q) => !(p.pedido.contexto?.respuestas ?? []).some((r) => r.pregunta === q && r.respuesta.trim()));
  // Si viene un comentario para repartir, se abre la pestaña del cliente.
  const ver = (vista ? "cliente" : ["entregas", "cliente", "archivos", "marca", "numeros", "ajustes"].includes(verCrudo ?? "") ? verCrudo : "") as Ver;

  // Vista previa del reparto de un comentario del cliente.
  const decision = vista ? await repartir(vista, p.plan) : undefined;
  const reparto = decision?.tareas ?? [];
  const arrastra = vista ? dependientes(reparto, p.plan.tareas) : [];
  const conTarea = [...new Set(p.plan.tareas.map((t) => t.split(".")[1]))];
  // Hex que ya usó el equipo en sus entregas (Mira, Orla, Rhea…), para tomarlos con un toque.
  const encontrados = ver === "marca" ? (() => {
    const vistos = new Map<string, string>();
    for (const t of p.plan.tareas) {
      const en = p.tareas[t] === "lista" ? leerEntrega(id, t) : undefined;
      for (const h of en?.contenido.match(/#[0-9a-fA-F]{6}\b/g) ?? []) if (!vistos.has(h.toLowerCase())) vistos.set(h.toLowerCase(), agentePorId(en!.agente)?.nombre ?? "");
    }
    return [...vistos].map(([hex, de]) => ({ hex, de }));
  })() : [];
  const tareaDirecciones = p.plan.tareas.find((t) => contratoPorId(t)?.direcciones);
  const versionWeb = versionesSitio(id)[0];
  const cortadas = p.plan.tareas.filter((t) => p.tareas[t] === "lista" && leerEntrega(id, t)?.datos?.cortada) as TareaId[];
  const comunes = <><input type="hidden" name="id" value={id} /><input type="hidden" name="motor" value="" /></>;

  const PESTANAS: { id: Ver; nombre: string; cuenta?: number }[] = [
    { id: "", nombre: "Resumen" },
    { id: "entregas", nombre: "Entregas", cuenta: m.hechas },
    { id: "cliente", nombre: "Cliente", cuenta: pendientesPortal.length + preguntasSinResponder.length || undefined },
    { id: "archivos", nombre: "Archivos", cuenta: archivos.length || undefined },
    { id: "marca", nombre: "Marca", cuenta: p.marca?.colores.length || undefined },
    { id: "numeros", nombre: "Números" },
    { id: "ajustes", nombre: "Ajustes" },
  ];

  return (
    <div className="px-5 pb-16 pt-7 md:px-10 md:pt-9">
      {/* Quién es y en qué paso va. */}
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-[13px] text-suave">
            <i className="h-2.5 w-2.5 rounded-[3px]" style={{ background: e.punto }} />
            {PEDIDOS[p.pedido.tipo].nombre}{plantilla ? ` · ${plantilla.nombre}` : ""} · {p.papelera ? "En la papelera" : ESTADO_PROYECTO[p.estado]}
          </p>
          <h1 className={`${serif} mt-1 text-[clamp(40px,5vw,68px)] leading-[0.95]`}>{p.pedido.cliente}</h1>
        </div>
        {nota && <div className="text-right"><p className="text-[12px] text-suave">Nota de calidad</p><p className={`${serif} text-[44px] leading-none`}>{String(nota.final).replace(".", ",")}</p></div>}
      </div>
      <div className="mt-6 max-w-3xl"><Camino m={m} /></div>

      {p.papelera && (
        <div role="alert" className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#fde8e4] p-5">
          <p className="text-[15px] text-[#8a1c0c]">Está en la papelera desde {hace(p.papelera.fecha)}: no aparece ni trabaja.</p>
          <Confirmar accion={accionSacarDePapelera} campos={{ id }} disparador="Restaurar" claseDisparador={botonLleno} titulo="¿Restaurar el proyecto?" texto={`«${p.pedido.cliente}» vuelve al estudio tal como estaba.`} confirmar="Restaurar" />
        </div>
      )}

      {/* AHORA: qué toca y qué viene después. Siempre una sola acción principal. */}
      {!p.papelera && p.estado !== "plan" && (
        <section aria-label="Ahora" className={`mt-6 overflow-hidden rounded-[22px] ${m.tono === "toca" || m.tono === "cortado" ? "bg-tinta text-white" : m.tono === "listo" ? "bg-[#e7f5ec]" : "bg-white shadow-[0_0_0_1px_rgba(26,24,22,.06)]"}`}>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-5 p-6 md:p-8">
            <div className={`min-w-[min(100%,20rem)] flex-1 ${m.revision ? "basis-full" : ""}`}>
              <p className={`flex items-center gap-2 text-[12px] ${m.tono === "toca" || m.tono === "cortado" ? "text-white/60" : "text-suave"}`}>
                <i className={`h-1.5 w-1.5 rounded-full ${m.tono === "vivo" ? "late bg-vivo" : m.tono === "toca" || m.tono === "otro" || m.tono === "cortado" ? "late bg-urgente" : "bg-suave"}`} />
                Ahora · fase {m.fase.n} de {m.fase.de}: {m.fase.nombre}
              </p>
              <p className={`${serif} mt-2 text-[clamp(26px,2.8vw,36px)] leading-[1.08]`}>{m.ahora}</p>
              <p className={`mt-2 text-[14px] ${m.tono === "toca" || m.tono === "cortado" ? "text-white/70" : "text-medio"}`}><span className="font-medium">Después:</span> {m.despues}</p>
              {p.estado === "en-curso" && m.tono === "vivo" && <AhoraEnVivo id={id} />}
              {/* Modo paso: la entrega que acaba de llegar, con sus tres decisiones. */}
              {m.revision && <div className="mt-6"><RevisarAgente p={p} t={m.revision as TareaId} mio={m.teToca} oscuro={m.tono === "toca"} /></div>}
              {m.direcciones && p.direcciones && p.direcciones.opciones.length > 0 && (
                <Link href={`/estudio/${id}/direcciones`} className="group mt-6 grid gap-3 sm:grid-cols-3">
                  <FuentesDirecciones ds={p.direcciones.opciones} />
                  {p.direcciones.opciones.map((d, n) => (
                    <span key={n} className="block transition group-hover:opacity-90">
                      <Maqueta d={d} />
                      <span className="mt-2 block text-[14px] font-medium">{n + 1}. {d.nombre}{p.direcciones?.cliente?.n === n ? " · le gusta al cliente" : ""}</span>
                    </span>
                  ))}
                </Link>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {m.direcciones && <Link href={`/estudio/${id}/direcciones`} className={`inline-flex min-h-12 items-center rounded-full px-7 text-[14px] font-medium transition ${m.teToca ? "bg-white text-tinta hover:bg-[#f1ede6]" : "bg-tinta text-white hover:bg-black"}`}>Ver y elegir →</Link>}
              {p.estado === "esperando" && !m.revision && !m.direcciones && (
                <>
                  <Caras ids={deFase(p.faseActual).map((t) => t.split(".")[1])} tam={30} />
                  <Link href={`/estudio/${id}/revisar`} className={`inline-flex min-h-12 items-center rounded-full px-7 text-[14px] font-medium transition ${m.teToca ? "bg-white text-tinta hover:bg-[#f1ede6]" : "bg-tinta text-white hover:bg-black"}`}>{m.teToca ? "Empezar la revisión →" : "Revisar igual →"}</Link>
                </>
              )}
              {p.estado === "en-curso" && m.tono === "cortado" && (
                <form action={accionSeguir}>{comunes}<Enviar className="inline-flex min-h-12 items-center rounded-full bg-white px-7 text-[14px] font-medium text-tinta" texto="Continuar el trabajo" trabajando="El equipo sigue…" proyecto={id} /></form>
              )}
              {p.estado === "en-curso" && m.tono === "vivo" && (
                <>
                  <Caras ids={m.trabajando} tam={36} />
                  <Confirmar accion={accionParar} campos={{ id, motor: "" }} disparador="Detener" claseDisparador={boton} titulo="¿Detener al equipo?" texto="Lo que ya entregaron queda guardado. El agente que está trabajando termina su entrega y nadie sigue hasta que reanudes." confirmar="Detener" />
                </>
              )}
              {p.estado === "parado" && (
                <form action={accionReanudar}>{comunes}<button className={botonLleno}>Reanudar</button></form>
              )}
              {p.estado === "listo" && (p.portal ? <Copiar ruta={`/portal/${id}?t=${p.portal.token}`} texto="Copiar el enlace del portal" /> : <Link href={`/estudio/${id}?ver=cliente#portal`} className={botonLleno}>Crear el portal del cliente</Link>)}
            </div>
          </div>
          {pendientesPortal.length > 0 && (
            <Link href={`/estudio/${id}?ver=cliente#conversacion`} className={`flex items-center gap-3 border-t px-6 py-3 text-[14px] md:px-8 ${m.tono === "toca" || m.tono === "cortado" ? "border-white/10 hover:bg-white/5" : "border-borde hover:bg-[#faf7f2]"}`}>
              <i className="h-2 w-2 rounded-full bg-urgente" /> El cliente escribió {pendientesPortal.length === 1 ? "algo" : `${pendientesPortal.length} cosas`} en su portal que falta pasarle al equipo <span className="ml-auto">Ver →</span>
            </Link>
          )}
        </section>
      )}
      {cortadas.length > 0 && !p.papelera && (
        <section aria-label="Entregas cortadas" className="mt-4 grid gap-2 rounded-[18px] bg-[#fff4e8] p-4 shadow-[inset_0_0_0_1px_rgba(255,90,31,.2)] md:p-5">
          <p className="text-[14px] font-medium text-[#8a3a0c]">{cortadas.length === 1 ? "Una entrega quedó cortada" : `${cortadas.length} entregas quedaron cortadas`}: al agente se le acabó el espacio antes de terminar.</p>
          {cortadas.map((t) => (
            <form key={t} action={accionCambiar} className="flex flex-wrap items-center gap-3">
              {comunes}
              <input type="hidden" name="agente" value={t.split(".")[1]} />
              <input type="hidden" name="nota" value="Tu entrega anterior quedó cortada antes de terminar. Entrégala completa, con todas sus secciones, más concisa si hace falta, y cierra con el bloque final." />
              <Cara id={t.split(".")[1]} tam={26} titulo={false} />
              <Link href={`/estudio/${id}/${t.replace(".", "-")}`} className="text-[14px] underline underline-offset-4">{agentePorId(t.split(".")[1])?.nombre} · {contratoPorId(t)?.entrega}</Link>
              {ocupado || p.estado === "en-curso"
                ? <span className="ml-auto text-[13px] text-[#8a3a0c]">{ocupado ? `${quienTrabaja} está trabajando: pídeselo cuando termine.` : "Disponible cuando el equipo se detenga para revisar."}</span>
                : <Enviar className="ml-auto inline-flex min-h-10 items-center rounded-full bg-tinta px-5 text-[13px] font-medium text-white" texto="Que la complete" trabajando={`${agentePorId(t.split(".")[1])?.nombre} la completa…`} proyecto={id} />}
            </form>
          ))}
        </section>
      )}
      {!p.papelera && p.estado === "plan" && <div className="mt-6"><PlanAtlas p={p} conIA={!!process.env.ANTHROPIC_API_KEY} /></div>}

      {/* Pestañas */}
      <nav aria-label="Secciones del proyecto" className="sticky top-0 z-10 -mx-5 mt-8 overflow-x-auto border-b border-borde bg-carta/95 px-5 backdrop-blur md:-mx-10 md:px-10">
        <ul className="flex gap-1">
          {PESTANAS.map((t) => (
            <li key={t.id}>
              <Link href={t.id ? `/estudio/${id}?ver=${t.id}` : `/estudio/${id}`} aria-current={ver === t.id ? "page" : undefined} scroll={false}
                className={`relative inline-flex min-h-12 items-center gap-1.5 whitespace-nowrap px-3 text-[14px] transition ${ver === t.id ? "font-medium text-tinta after:absolute after:inset-x-2 after:bottom-0 after:h-[2px] after:rounded-full after:bg-tinta" : "text-medio hover:text-tinta"}`}>
                {t.nombre}
                {t.cuenta ? <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] ${t.id === "cliente" ? "bg-urgente text-white" : "bg-[#f1ede6] text-medio"}`}>{t.cuenta}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="pt-7">
        {/* RESUMEN */}
        {ver === "" && (
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <EquipoVivo inicial={{ id, nombre: p.pedido.cliente, estado: p.estado, faseActual: p.faseActual, tareas: p.tareas, inicios: p.inicios ?? {}, estimados: Object.fromEntries(p.plan.tareas.map((t) => [t, segundosEstimados(t)])) }} entregas={Object.fromEntries(p.plan.tareas.map((t) => [t, contratoPorId(t)?.entrega ?? ""]))} />
            <div className="grid content-start gap-5">
              <Link href={`/estudio/${id}?ver=cliente#anotar`} className={`${tarjeta} group flex items-center gap-4 transition hover:-translate-y-0.5`}>
                <Cara id="atlas" tam={40} titulo={false} />
                <span className="min-w-0 flex-1"><span className="block text-[15px] font-medium">¿El cliente dijo algo?</span><span className="block text-[13px] text-medio">Anótalo y Atlas se lo pasa a quien corresponde.</span></span>
                <span className="text-suave transition group-hover:translate-x-0.5">→</span>
              </Link>
              {(p.tareas["1.ledger"] === "lista" || p.propuesta) && (
                <Link href={`/estudio/${id}/propuesta`} className={`${tarjeta} group flex items-center gap-4 transition hover:-translate-y-0.5`}>
                  <Cara id="ledger" tam={40} titulo={false} />
                  <span className="min-w-0 flex-1"><span className="block text-[15px] font-medium">La propuesta para el cliente</span><span className="block text-[13px] text-medio">{p.propuesta ? "Editada. Ábrela para cambiarla o descargarla." : "Borrador listo con precios y quiénes somos. Edítalo y descárgalo."}</span></span>
                  <span className="text-suave transition group-hover:translate-x-0.5">→</span>
                </Link>
              )}
              {versionWeb ? (
                <Link href={`/estudio/${id}/web`} className={`${tarjeta} group grid gap-3 transition hover:-translate-y-0.5`}>
                  <MiniWeb src={urlSitio(id, versionWeb)} />
                  <span className="flex items-center gap-3"><span className="min-w-0 flex-1"><span className="block text-[15px] font-medium">La web · versión {versionWeb}</span><span className="block text-[13px] text-medio">Funcionando: escritorio, tablet y celular.</span></span><span className="text-suave transition group-hover:translate-x-0.5">→</span></span>
                </Link>
              ) : null}
              <Link href={`/estudio/${id}?ver=marca`} className={`${tarjeta} group flex items-center gap-4 transition hover:-translate-y-0.5`}>
                <span className="flex shrink-0 -space-x-2">{(p.marca?.colores.length ? p.marca.colores.slice(0, 4).map((c) => c.hex) : ["#1a1816", "#e7e3da", "#f4f1eb"]).map((h, i) => <i key={i} className="h-9 w-9 rounded-full shadow-[0_0_0_2px_#fff]" style={{ background: h }} />)}</span>
                <span className="min-w-0 flex-1"><span className="block text-[15px] font-medium">Marca del cliente</span><span className="block text-[13px] text-medio">{p.marca?.colores.length ? `${p.marca.colores.length} colores · ${p.marca.fuentes.length} fuentes` : "Sin definir: se usan los colores de Anonymo."}</span></span>
                <span className="text-suave transition group-hover:translate-x-0.5">→</span>
              </Link>
              <details className={`${tarjeta} group`}>
                <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 text-[13px] font-medium">Lo que pidió el cliente <span className="ml-auto text-suave transition group-open:rotate-45">+</span></summary>
                <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-medio">{p.pedido.descripcion}</p>
              </details>
              <div className={tarjeta}>
                <p className="text-[13px] font-medium">Portal del cliente</p>
                <p className="mt-1 text-[13px] text-medio">Un enlace privado donde el cliente ve sus entregas, aprueba fases y comenta. Úsalo cuando quieras que participe.</p>
                <div className="mt-3 flex flex-wrap items-center gap-1">
                  {p.portal ? (
                    <>
                      <Copiar ruta={`/portal/${id}?t=${p.portal.token}`} />
                      <a href={`/portal/${id}?t=${p.portal.token}`} target="_blank" rel="noreferrer" className={botonSuave}>Verlo como el cliente ↗</a>
                    </>
                  ) : (
                    <form action={accionPortal}>{comunes}<button className={boton}>Crear el enlace</button></form>
                  )}
                </div>
              </div>
              {tramos.length > 0 && (
                <div className={tarjeta}>
                  <p className="mb-3 text-[13px] font-medium">Fechas</p>
                  <Calendario tramos={tramos} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ENTREGAS por fase */}
        {ver === "entregas" && (
          <div className="grid gap-9">
            <div className="flex flex-wrap items-center gap-2">
              <a href={`/imprimir/${id}/dossier`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-full bg-tinta px-5 text-[13px] font-medium text-white transition hover:bg-black">Dossier para el cliente (PDF) ↗</a>
              {versionWeb ? <Link href={`/estudio/${id}/web`} className={boton}>Ver la web</Link> : null}
              {tareaDirecciones && <Link href={`/estudio/${id}/direcciones`} className={boton}>{p.direcciones?.opciones.length ? "Direcciones de diseño" : "Pedir 3 direcciones de diseño"}</Link>}
              <span className="text-[12px] text-suave">El dossier junta todo lo que puede ver el cliente, sin lo interno.</span>
            </div>
            {p.plan.fases.map((f) => {
              const tareas = deFase(f);
              const listas = tareas.filter((t) => p.tareas[t] === "lista").length;
              return (
                <section key={f} aria-labelledby={`fase-${f}`}>
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <h2 id={`fase-${f}`} className={`${serif} text-[26px] leading-none`}>{nombreFase(f)}</h2>
                    <span className="text-[13px] text-suave">{listas} de {tareas.length} listas · la aprueba {nombreSocio(responsable(p, f))}{f === p.faseActual && p.estado !== "listo" ? " · fase actual" : ""}</span>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {tareas.map((t) => {
                      const c = contratoPorId(t)!;
                      const a = agentePorId(c.agente)!;
                      const en = leerEntrega(id, t);
                      const est = p.tareas[t];
                      return (
                        <Link key={t} href={`/estudio/${id}/${t.replace(".", "-")}`} className={`${tarjeta} flex flex-col !p-0 transition hover:-translate-y-0.5 ${est === "por-empezar" ? "opacity-70" : ""}`}>
                          <span className="block p-5">
                            <span className="flex items-center gap-2">
                              <Cara id={a.id} tam={26} apagado={est === "por-empezar"} titulo={false} />
                              <span className="text-[13px] font-medium">{a.nombre}</span>
                              <span className={`ml-auto inline-flex h-6 items-center rounded-full px-2.5 text-[11px] ${CHIP_TAREA[est]}`}>{ESTADO_TAREA[est]}</span>
                            </span>
                            <span className={`${serif} mt-3 block text-[23px] leading-[1.08]`}>{c.entrega}</span>
                            {en?.datos?.cortada ? <span className="mt-2 inline-flex rounded-full bg-[#fff1e6] px-2.5 py-1 text-[11px] text-[#b2450f]">Quedó cortada</span> : null}
                            {en?.dice ? <span className="mt-2 line-clamp-3 block text-[14px] leading-snug text-medio">“{en.dice}”</span> : <span className="mt-2 block text-[13px] text-suave">{est === "por-empezar" ? "Todavía no le toca." : "En camino."}</span>}
                          </span>
                          {en && <span className="mt-auto border-t border-[#f2eee8] px-5 py-2.5 text-[12px] text-suave">Versión {en.version} · {hace(en.creado)}</span>}
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* CLIENTE: anotar, conversación, preguntas, portal */}
        {ver === "cliente" && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <div className="grid content-start gap-6">
              <div id="anotar" className="scroll-mt-20">
                {vista ? (
                  <form action={accionMandarCliente} className={`${tarjeta} grid gap-4 !p-6`}>
                    {comunes}
                    <input type="hidden" name="texto" value={vista} />
                    {pendiente && <><input type="hidden" name="pendiente" value={pendiente} /><input type="hidden" name="origen" value="cliente" /></>}
                    <p className="text-[12px] text-suave">Paso 2 de 2 · revisa a quién se lo pasa</p>
                    <div className="flex items-start gap-3">
                      <Cara id="atlas" tam={36} flota />
                      <div className="min-w-0">
                        <p className={`${serif} text-[24px] leading-[1.12]`}>“{vista}”</p>
                        {decision && <p className="mt-2 text-[14px] text-medio">{decision.razon}</p>}
                      </div>
                    </div>
                    <fieldset>
                      <legend className="text-[13px] font-medium">Se lo pasa a · toca para cambiar</legend>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {conTarea.map((a) => (
                          <label key={a} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-[#f6f3ee] py-1 pl-1.5 pr-3 text-[14px] transition has-[:checked]:bg-tinta has-[:checked]:text-white has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-urgente">
                            <input type="checkbox" name="agentes" value={a} defaultChecked={reparto.some((t) => t.endsWith(`.${a}`))} className="sr-only" />
                            <Cara id={a} tam={26} titulo={false} /> {agentePorId(a)?.nombre}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <p className="text-[13px] text-medio">{arrastra.length ? `Se rehacen ${arrastra.length} entrega${arrastra.length === 1 ? "" : "s"}: ${arrastra.map(nombreTarea).join(", ")}.` : "Nadie elegido: no se rehace nada."}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {ocupado
                        ? <span className="text-[13px] text-medio">{quienTrabaja} está trabajando. Cuando termine podrás pasárselo al equipo.</span>
                        : <Enviar className={botonLleno} texto="Pasárselo al equipo" trabajando="Pasándolo…" proyecto={id} />}
                      <Link href={`/estudio/${id}?ver=cliente`} className={botonSuave}>Cancelar</Link>
                    </div>
                  </form>
                ) : (
                  <form action={accionVerReparto} className={`${tarjeta} grid gap-3 !p-6`}>
                    {comunes}
                    <label htmlFor="cliente-dijo" className={`${serif} text-[26px] leading-tight`}>¿Qué dijo el cliente?</label>
                    <p className="-mt-1 text-[13px] text-medio">Pégalo tal cual, del WhatsApp, una llamada o en persona. Antes de mandarlo, Atlas te muestra a quién se lo pasa.</p>
                    <textarea id="cliente-dijo" name="texto" rows={3} required placeholder="Ej.: «la de estética tiene que verse mucho más elegante»" className={`${campo} font-serif text-[19px]`} />
                    <div><button className={botonLleno}>Ver a quién se lo pasa →</button></div>
                  </form>
                )}
              </div>

              <section id="conversacion" aria-label="Conversación con el cliente" className="scroll-mt-20">
                <p className="text-[13px] font-medium">Lo que se habló</p>
                {conversacion.length === 0 ? <p className="mt-2 text-[14px] text-suave">Todavía nada anotado.</p> : (
                  <ol className="mt-3 grid gap-3">
                    {conversacion.map((c) => {
                      const delCliente = c.quien === "cliente";
                      return (
                        <li key={c.fecha + c.texto} className={`flex ${delCliente ? "justify-start" : "justify-end"}`}>
                          <div className={`max-w-[88%] rounded-[18px] px-4 py-3 ${c.pendiente ? "rounded-bl-md bg-[#fff1e3] shadow-[inset_0_0_0_1px_rgba(255,90,31,.2)]" : delCliente ? "rounded-bl-md bg-[#f4efe7]" : "rounded-br-md bg-tinta text-white"}`}>
                            <p className={`text-[12px] ${delCliente || c.pendiente ? "text-suave" : "text-white/60"}`}>
                              {delCliente ? p.pedido.cliente : `Lo anotó ${nombreSocio(c.quien)}`} · {hace(c.fecha)}{c.pendiente ? " · escrito en su portal" : ""}
                            </p>
                            <p className="mt-1 font-serif text-[19px] leading-snug">{c.texto}</p>
                            {c.a && <p className={`mt-1 text-[12px] ${delCliente ? "text-suave" : "text-white/60"}`}>Se lo pasó a: {c.a}</p>}
                            {c.pendiente && (
                              <div className="mt-2 flex flex-wrap items-center gap-1">
                                <form action={accionVerReparto}>{comunes}<input type="hidden" name="texto" value={c.texto} /><input type="hidden" name="pendiente" value={c.fecha} /><button className="inline-flex min-h-10 items-center rounded-full bg-tinta px-4 text-[13px] font-medium text-white">Pasárselo al equipo</button></form>
                                <Confirmar accion={accionDescartarPendiente} campos={{ id, motor: "", pendiente: c.fecha }} disparador="No hace falta" titulo="¿Dejarlo sin pasar al equipo?" texto="El comentario queda anotado aquí, pero nadie rehace nada." confirmar="Dejarlo así" />
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </section>
            </div>

            <div className="grid content-start gap-5">
              {p.plan.preguntas.length > 0 && p.estado !== "plan" && (
                <form action={accionResponder} className={`${tarjeta} grid gap-3`}>
                  {comunes}
                  <input type="hidden" name="quien" value={yo} />
                  <p className={`${serif} text-[22px] leading-tight`}>Lo que falta saber</p>
                  <p className="-mt-2 text-[13px] text-medio">Atlas preguntó esto. Lo que respondas lo leen todos desde ya.</p>
                  {p.plan.preguntas.map((q, i) => {
                    const r = p.pedido.contexto?.respuestas?.find((x) => x.pregunta === q)?.respuesta;
                    return (
                      <label key={q} className="grid gap-1.5 text-[14px]">
                        <span className="flex gap-2">{r ? <span className="text-vivo">✓</span> : <span className="text-urgente">•</span>}{q}</span>
                        <input name={`r${i}`} defaultValue={r ?? ""} className={campo} placeholder="Lo que dijo el cliente" />
                      </label>
                    );
                  })}
                  <div><button className={boton}>Guardar respuestas</button></div>
                </form>
              )}
              <div id="portal" className={`${tarjeta} scroll-mt-20`}>
                <p className="text-[13px] font-medium">Portal del cliente</p>
                <p className="mt-1 text-[13px] text-medio">Lo que escriba ahí aparece en esta conversación para que decidas si se lo pasas al equipo.</p>
                <div className="mt-3 flex flex-wrap items-center gap-1">
                  {p.portal ? (
                    <>
                      <Copiar ruta={`/portal/${id}?t=${p.portal.token}`} />
                      <a href={`/portal/${id}?t=${p.portal.token}`} target="_blank" rel="noreferrer" className={botonSuave}>Verlo ↗</a>
                    </>
                  ) : (
                    <form action={accionPortal}>{comunes}<button className={boton}>Crear el enlace</button></form>
                  )}
                </div>
              </div>
              <details className={`${tarjeta} group`}>
                <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 text-[13px] font-medium">Lo que pidió al principio <span className="ml-auto text-suave transition group-open:rotate-45">+</span></summary>
                <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-medio">{p.pedido.descripcion}</p>
              </details>
            </div>
          </div>
        )}

        {/* ARCHIVOS */}
        {ver === "archivos" && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div>
              {archivos.length === 0 ? <p className={`${serif} text-[26px] text-suave`}>Todavía no hay archivos.</p> : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {archivos.map((a) => (
                    <li key={a.nombre}>
                      <a href={`/estudio/${id}/archivos/${encodeURIComponent(a.nombre)}`} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-[14px] bg-white shadow-[0_0_0_1px_rgba(26,24,22,.05)] transition hover:-translate-y-0.5">
                        {esImagen(a.nombre) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={`/estudio/${id}/archivos/${encodeURIComponent(a.nombre)}`} alt={a.nota ?? a.nombre} loading="lazy" className="aspect-square w-full bg-[#f4f1eb] object-cover" />
                        ) : (
                          <span className="flex aspect-square w-full items-center justify-center bg-[#f4f1eb] p-3 text-center font-mono text-[11px] break-all">{a.nombre}</span>
                        )}
                        <span className="block truncate px-3 py-2 text-[12px] text-medio">{a.nota ?? a.nombre}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <form action={accionSubir} className={`${tarjeta} grid content-start gap-3`}>
              {comunes}
              <p className={`${serif} text-[22px] leading-tight`}>Agregar archivos</p>
              <p className="-mt-2 text-[13px] text-medio">Todo el equipo los ve en su próxima entrega: imágenes, PDF y videos (de cada video se sacan cuadros para que lo vean).</p>
              <ZonaArchivos nube={enLinea} />
              <label className="sr-only" htmlFor="nota-archivos">Qué es</label>
              <input id="nota-archivos" name="nota" placeholder="Qué es (ej.: fotos del consultorio)" className={campo} />
              <div><Enviar className={botonLleno} texto="Subir" trabajando="Subiendo…" /></div>
            </form>
          </div>
        )}

        {/* MARCA */}
        {ver === "marca" && (
          <div className="max-w-5xl">
            <p className="mb-5 max-w-2xl text-[15px] text-medio">{p.marca?.colores.length ? "La marca de este cliente. Todo el equipo la usa tal cual, y el proyecto se tiñe con su color principal." : "Aún no hay marca definida: el proyecto usa los colores de Anonymo. Cuando la definas, el equipo la usa tal cual y el proyecto se tiñe con ella."}</p>
            <MarcaEditor id={id} marca={p.marca} imagenes={archivos.filter((a) => esImagen(a.nombre)).map((a) => ({ nombre: a.nombre, nota: a.nota }))} encontrados={encontrados} />
          </div>
        )}

        {/* NÚMEROS */}
        {ver === "numeros" && (
          <div className="grid gap-5 lg:grid-cols-3">
            <div className={tarjeta}>
              <p className="text-[13px] font-medium">Precio para el cliente</p>
              <p className={`${serif} mt-1 text-[48px] leading-none`}>{b.precio !== undefined ? dinero(b.precio) : `${b.total ?? 0} h`}</p>
              <p className="mt-2 text-[13px] text-medio">
                {b.deJay ? `Con tus ${b.base} h` : `Con las ${b.base ?? "—"} h de Ledger`}{b.extra ? ` + ${b.extra} h de cambios` : ""}{b.tarifa ? ` · $${b.tarifa}/h` : " · pon tu tarifa para verlo en dólares"}
              </p>
              {b.deJay && b.estimadas !== undefined && <p className="mt-1 text-[12px] text-suave">Ledger había estimado {b.estimadas} h.</p>}
              {b.ajustes.length > 0 && <ul className="mt-3 grid gap-1 text-[13px]">{b.ajustes.map((a) => <li key={a.fecha + a.tarea}>+{a.horas} h {nombreTarea(a.tarea as TareaId)} <span className="text-suave">· {a.motivo}</span></li>)}</ul>}
              <form action={accionPresupuesto} className="mt-4 grid gap-2 border-t border-[#f2eee8] pt-4">
                {comunes}
                <p className="text-[13px] font-medium">Tus números mandan</p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="grid gap-1 text-[12px] text-suave">Tus horas reales<input name="horasJay" inputMode="decimal" defaultValue={p.presupuesto?.horasJay ?? ""} placeholder={b.estimadas ? `Ledger: ${b.estimadas}` : "Ej.: 35"} className={campo} /></label>
                  <label className="grid gap-1 text-[12px] text-suave">Tarifa por hora ($)<input name="tarifa" inputMode="decimal" defaultValue={p.presupuesto?.tarifa ?? ""} placeholder={process.env.TARIFA_HORA ? `Por defecto ${process.env.TARIFA_HORA}` : "Ej.: 40"} className={campo} /></label>
                </div>
                <p className="text-[12px] text-suave">Vacío = lo de Ledger. Si Ledger vuelve a calcular, respeta tus horas.</p>
                <div><button className={boton}>Guardar</button></div>
              </form>
            </div>
            <Link href={`/estudio/${id}/propuesta`} className={`${tarjeta} group flex flex-col justify-between gap-6 !bg-tinta text-white transition hover:-translate-y-0.5`}>
              <span><span className="text-[13px] text-white/60">Para el cliente</span><span className={`${serif} mt-1 block text-[32px] leading-[1.02]`}>La propuesta</span><span className="mt-2 block text-[14px] text-white/70">{p.propuesta ? `Editada ${hace(p.propuesta.actualizado)}. Precios, quiénes somos y qué haremos.` : "Un borrador listo con lo que ya sabe el equipo. Edítalo y descárgalo en PDF."}</span></span>
              <span className="text-[14px] font-medium">{p.propuesta ? "Abrir la propuesta →" : "Ver el borrador →"}</span>
            </Link>
            <div className={tarjeta}>
              <p className="text-[13px] font-medium">Lo que costó en IA</p>
              <p className={`${serif} mt-1 text-[48px] leading-none`}>${costo.real.toFixed(2)}</p>
              <p className="mt-2 text-[13px] text-medio">Lo que gastó Anthropic en este proyecto. No se cobra aparte.</p>
              <ul className="mt-3 grid gap-1 text-[13px]">
                {costo.tareas.map((t) => <li key={t.tarea} className="flex justify-between gap-3"><span className="truncate">{nombreTarea(t.tarea)}{t.veces > 1 ? ` ×${t.veces}` : ""}</span><span className="text-medio">${t.usd.toFixed(3)}</span></li>)}
              </ul>
              <p className="mt-2 text-[11px] text-suave">Por millón de tokens: entrada {PRECIOS.entrada} · salida {PRECIOS.salida}.</p>
            </div>
            <div className={tarjeta}>
              <p className="text-[13px] font-medium">Historial</p>
              <ul className="mt-2 grid max-h-[420px] gap-1.5 overflow-y-auto text-[13px] text-medio">{leerBitacora(id, 40).map((l, i) => <li key={i}>{l}</li>)}</ul>
            </div>
            {tramos.length > 0 && (
              <div className={`${tarjeta} lg:col-span-3`}>
                <p className="mb-3 text-[13px] font-medium">Fechas por fase</p>
                <Calendario tramos={tramos} />
              </div>
            )}
          </div>
        )}

        {/* AJUSTES */}
        {ver === "ajustes" && (
          <div className="grid max-w-3xl gap-5">
            <form action={accionModo} className={`${tarjeta} grid gap-3`}>
              {comunes}
              <p className={`${serif} text-[22px] leading-tight`}>¿Cómo trabaja el equipo?</p>
              <p className="-mt-2 text-[13px] text-medio">Lo puedes cambiar en cualquier momento. Si el equipo está trabajando, el cambio vale desde la próxima entrega.</p>
              <OpcionesModo actual={modoDe(p)} />
              <div><Enviar className={boton} texto="Guardar" trabajando="Guardando…" proyecto={id} /></div>
            </form>
            {modoDe(p) === "fase" && <form action={accionPausas} className={`${tarjeta} grid gap-3`}>
              {comunes}
              <label className="grid gap-1.5">
                <span className={`${serif} text-[22px] leading-tight`}>¿Cuándo te pide revisar?</span>
                <span className="text-[13px] text-medio">Ahora: {p.plan.pausas.length ? `al terminar ${p.plan.pausas.map((f) => nombreFase(f)).join(", ")}` : "solo al final"}. Al cambiarlo, si hay trabajo pendiente, el equipo sigue hasta la nueva pausa.</span>
                <select name="pausas" className={campo} defaultValue="clave">
                  <option value="clave">Donde propone Atlas</option>
                  <option value="cada-fase">Al terminar cada fase</option>
                  <option value="nunca">Solo al final</option>
                  {p.plan.fases.map((f) => <option key={f} value={String(f)}>Solo al terminar {nombreFase(f)}</option>)}
                </select>
              </label>
              <div><Enviar className={boton} texto="Guardar" trabajando="Guardando…" proyecto={id} /></div>
            </form>}

            <div className={`${tarjeta} grid gap-2`}>
              <p className={`${serif} text-[22px] leading-tight`}>¿Quién aprueba cada fase?</p>
              <p className="-mt-1 text-[13px] text-medio">A esa persona le aparece en «Te toca».</p>
              {p.plan.fases.map((f) => (
                <form key={f} action={accionResponsable} className="flex min-h-12 items-center justify-between gap-2 border-t border-[#f2eee8] pt-2 text-[14px]">
                  {comunes}
                  <input type="hidden" name="fase" value={f} />
                  <label htmlFor={`socio-${f}`}>{nombreFase(f)}</label>
                  <span className="flex items-center gap-1">
                    <select id={`socio-${f}`} name="socio" defaultValue={responsable(p, f)} className="min-h-10 rounded-full bg-[#f1ede6] px-3 text-[13px] outline-none">
                      <option value="jay">Jay</option><option value="luna">Luna</option>
                    </select>
                    <button className={botonSuave}>Guardar</button>
                  </span>
                </form>
              ))}
            </div>

            <div className={`${tarjeta} grid gap-2 text-[14px]`}>
              <p className={`${serif} text-[22px] leading-tight`}>PDF</p>
              {enLinea ? (
                <p className="text-medio">En línea todavía no se arma. Desde tu máquina: <code className="rounded bg-[#f4f1eb] px-1.5 py-0.5 font-mono text-[12px]">npm run pipeline -- pdf {id}</code></p>
              ) : (
                <p className="flex flex-wrap gap-2"><a href={`/estudio/${id}/pdf`} className={boton}>Para el cliente ↓</a><a href={`/estudio/${id}/pdf?internas=1`} className={boton}>Interno ↓</a></p>
              )}
            </div>

            <div className={`${tarjeta} grid gap-3`}>
              <p className={`${serif} text-[22px] leading-tight`}>Pausar o quitar</p>
              <p className="-mt-1 text-[13px] text-medio">Pausar detiene al equipo sin perder nada. La papelera lo saca del estudio; se puede restaurar durante 30 días.</p>
              <div className="flex flex-wrap gap-1">
                {p.estado !== "parado" && p.estado !== "listo" && (
                  <Confirmar accion={accionParar} campos={{ id, motor: "" }} disparador="Pausar el proyecto" claseDisparador={boton} titulo="¿Pausar el proyecto?" texto="El equipo deja de trabajar en él hasta que lo reanudes. No se pierde nada." confirmar="Pausar" />
                )}
                {!p.papelera && (
                  <Confirmar accion={accionAPapelera} campos={{ id }} disparador="Mandar a la papelera" claseDisparador={`${boton} !text-[#a3260f]`} titulo="¿Mandar a la papelera?" texto={`«${p.pedido.cliente}» deja de aparecer y de trabajar. Lo puedes restaurar desde la papelera durante 30 días; después se borra solo.`} confirmar="Mandar a la papelera" peligro />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
