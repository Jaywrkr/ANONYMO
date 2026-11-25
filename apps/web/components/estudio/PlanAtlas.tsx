// El plan que armó Atlas, antes de que nadie trabaje (sistema/32). Ordenado por importancia (sistema/111):
// 1) las cifras, 2) las entregas por fase con su cara, 3) la decisión junta (modo, «Que empiecen», «Ajustar el plan»),
// 4) las preguntas para responder ahí mismo, 5) lo demás plegado: requisitos, quién no trabaja, orden y el pedido.
import Link from "next/link";
import { requisitosDe } from "@anonymo/pipeline";
import { agentePorId, FASES } from "@anonymo/agentes";
import { contratoPorId, costoPlan, esInterno, ocultarClaves, type Proyecto, type TareaId } from "@anonymo/pipeline";
import { Enviar } from "@/app/estudio/nuevo/Enviar";
import { accionEmpezar, accionReplanear, accionResponder } from "@/app/estudio/acciones";
import { boton, botonLleno, campo, serif } from "@/lib/estudio";
import { Cara } from "./piezas";
import { MODOS } from "./OpcionesModo";
import { AbrirAjuste } from "./AbrirAjuste";
import { segundosEstimados } from "@/lib/duracion";

/** Lo que costaría una sola entrega con IA (la misma cuenta que el total del plan). */
const costoTarea = (p: Proyecto, t: TareaId) => costoPlan(p.pedido, { tareas: p.plan.tareas.slice(0, p.plan.tareas.indexOf(t) + 1) }) - costoPlan(p.pedido, { tareas: p.plan.tareas.slice(0, p.plan.tareas.indexOf(t)) });
const minutos = (t: TareaId) => Math.max(1, Math.round(segundosEstimados(t) / 60));
const plegable = "group border-t border-borde px-6 md:px-8";
const resumenPlegable = "flex min-h-14 cursor-pointer list-none items-center gap-3 text-[14px] [&::-webkit-details-marker]:hidden";
const mas = <span aria-hidden className="ml-auto text-suave transition group-open:rotate-45">+</span>;

export function PlanAtlas({ p, conIA }: { p: Proyecto; conIA: boolean }) {
  const id = p.pedido.id;
  const fuera = FASES.filter((f) => !p.plan.fases.includes(f.n) && f.n !== 7);
  const costo = costoPlan(p.pedido, p.plan);
  const totalMin = Math.max(1, Math.round(p.plan.tareas.reduce((s, t) => s + segundosEstimados(t), 0) / 60));
  const requisitos = requisitosDe(p);
  const interno = esInterno(p.pedido);
  const cifra = (n: number | string, t: string) => <span className="flex items-baseline gap-1.5"><span className={`${serif} text-[28px] leading-none`}>{n}</span><span className="text-[13px] text-medio">{t}</span></span>;
  return (
    <section aria-label="Plan de Atlas" className="overflow-hidden rounded-[20px] bg-white shadow-[0_0_0_1px_rgba(26,24,22,.06),0_18px_44px_-24px_rgba(40,30,20,.3)]">
      {/* 1 · Las cifras: lo que vas a aprobar, de un vistazo. */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4 p-6 md:p-8" data-plan-cifras>
        <div className="flex items-center gap-3">
          <Cara id="atlas" tam={44} flota />
          <div>
            <p className="flex items-center gap-2 text-[12px] text-suave"><i className="late h-1.5 w-1.5 rounded-full bg-urgente" />Te toca decidir · nadie trabaja antes</p>
            <p className="text-[17px] font-medium">Plan de Atlas{p.plan.porIA ? "" : " (con reglas, sin IA)"}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          {cifra(p.plan.tareas.length, p.plan.tareas.length === 1 ? "entrega" : "entregas")}
          {cifra(p.plan.fases.length, p.plan.fases.length === 1 ? "fase" : "fases")}
          {cifra(`~${totalMin}`, "min de IA")}
          {cifra(`US$ ${costo.toFixed(2)}`, "aprox.")}
        </div>
      </div>

      {!p.plan.porIA && p.plan.sinIA && (
        <p role="alert" className="mx-6 mb-4 rounded-xl bg-[#fff4e0] p-3 text-[14px] md:mx-8">
          Atlas no pudo usar la IA: <span className="font-mono text-[12px]">{ocultarClaves(p.plan.sinIA)}</span>. Arréglalo y ajusta el plan para que lo vuelva a leer.
        </p>
      )}

      {/* 2 · Las entregas por fase, con quién las hace y cuánto tarda. */}
      <div className="grid gap-4 border-t border-borde p-6 md:p-8" data-plan-entregas>
        {p.plan.fases.map((f) => (
          <div key={f} className="grid gap-2 md:grid-cols-[140px_minmax(0,1fr)] md:items-start">
            <p className="pt-2 text-[12px] uppercase tracking-[0.08em] text-suave" title={p.plan.razones[f]}>{FASES.find((x) => x.n === f)?.nombre}</p>
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {p.plan.tareas.filter((t) => t.startsWith(`${f}.`)).map((t) => {
                const c = contratoPorId(t)!;
                const a = agentePorId(c.agente)!;
                return (
                  <li key={t} className="flex min-h-14 items-center gap-3 rounded-2xl bg-[#f6f3ee] px-3 py-2.5" data-entrega={t}>
                    <Cara id={a.id} tam={32} />
                    <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-medium">{c.entrega}</span><span className="block text-[12px] text-medio">{a.nombre}</span></span>
                    <span className="shrink-0 font-mono text-[11px] text-suave">~{minutos(t)} min</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* 3 · La decisión, junta: cómo trabajan, «Que empiecen» y «Ajustar el plan» lado a lado. */}
      <div className="grid gap-3 border-t border-borde bg-[#faf8f4] p-6 md:p-8" data-plan-decidir>
        <form action={accionEmpezar} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="id" value={id} />
          <fieldset className="flex flex-wrap rounded-full bg-white p-1 shadow-[inset_0_0_0_1px_var(--color-borde)]">
            <legend className="sr-only">Cómo trabaja el equipo</legend>
            {MODOS.map((m) => (
              <label key={m.id} title={m.ayuda} className="cursor-pointer rounded-full px-4 py-2 text-[13px] text-medio transition has-[:checked]:bg-tinta has-[:checked]:text-white has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-urgente">
                <input type="radio" name="modo" value={m.id} defaultChecked={m.id === (p.modo ?? "paso")} className="sr-only" />
                {m.id === "paso" ? "Uno a la vez" : m.nombre}
              </label>
            ))}
          </fieldset>
          <Enviar className={`${botonLleno} min-h-12 px-7 text-[14px]`} texto="Que empiecen" trabajando="Arrancando…" proyecto={id} />
          <AbrirAjuste className={`${boton} min-h-12`} />
          {conIA && (
            <label className="flex min-h-11 w-full items-center gap-2 text-[12px] text-suave md:min-h-8">
              <input type="checkbox" name="motor" value="simulado" className="accent-tinta" /> Probar sin gastar IA (solo arma la estructura)
            </label>
          )}
        </form>
        <details id="ajustar" className="group scroll-mt-24" data-plan-ajustar>
          <summary className="sr-only">Ajustar el plan</summary>
          <form action={accionReplanear} className="grid gap-2">
            <input type="hidden" name="id" value={id} />
            <label className="sr-only" htmlFor="ajuste">Ajuste para Atlas</label>
            <textarea id="ajuste" name="ajuste" rows={2} required className={campo} placeholder="¿Algo no cuadra? Díselo a Atlas: «sin video», «sí necesita nombre», «que Lente haga las fotos»…" />
            <div><Enviar className={boton} texto="Ajustar el plan" trabajando="Atlas está rehaciendo el plan…" proyecto={id} largo /></div>
          </form>
        </details>
      </div>

      {/* 4 · Las preguntas, para responder ahí mismo (sistema/111). Sin IA: quedan en el pedido y las leen los agentes. */}
      {p.plan.preguntas.length > 0 && (
        <form action={accionResponder} className="grid gap-3 border-t border-borde p-6 md:p-8" data-plan-preguntas>
          <input type="hidden" name="id" value={id} />
          <p className="text-[13px] font-medium">{p.plan.preguntas.length} {p.plan.preguntas.length === 1 ? "pregunta" : "preguntas"} {interno ? "para ustedes" : "para el cliente"} <span className="font-normal text-suave">· responde las que sepas</span></p>
          <div className="grid gap-2 md:grid-cols-2">
            {p.plan.preguntas.map((q, i) => (
              <label key={q} className="grid gap-1 text-[13px]">
                <span className="text-medio">{q}</span>
                <input name={`r${i}`} maxLength={500} className={campo} />
              </label>
            ))}
          </div>
          <div><Enviar className={boton} texto="Guardar respuestas" trabajando="Guardando…" proyecto={id} /></div>
        </form>
      )}

      {/* 5 · Lo demás, plegado: como cifras que abres si quieres. */}
      {(p.plan.quitadas.length > 0 || fuera.length > 0) && (
        <details className={plegable}>
          <summary className={resumenPlegable}>
            <span className="flex">{p.plan.quitadas.slice(0, 6).map((q) => { const a = agentePorId(contratoPorId(q.id)?.agente ?? ""); return a ? <Cara key={q.id} id={a.id} tam={22} apagado className="-ml-1 first:ml-0" /> : null; })}</span>
            No trabajan · {p.plan.quitadas.length}{mas}
          </summary>
          <ul className="grid gap-1.5 pb-5 text-[13px]">
            {p.plan.quitadas.map((q) => {
              const a = agentePorId(contratoPorId(q.id)?.agente ?? "");
              return <li key={q.id} className="flex items-start gap-2">{a && <Cara id={a.id} tam={20} apagado />}<span><span className="font-medium">{a?.nombre}</span> <span className="text-medio">· {q.razon}</span></span></li>;
            })}
            {fuera.length > 0 && <li className="text-medio">Fases que no entran: {fuera.map((f) => f.nombre).join(", ")}.</li>}
          </ul>
        </details>
      )}
      <details className={plegable}>
        <summary className={resumenPlegable}>Qué debe cumplir · {requisitos.length} {requisitos.length === 1 ? "requisito" : "requisitos"}{mas}</summary>
        <ul className="grid gap-1.5 pb-3 text-[13px]">{requisitos.map((r, i) => <li key={r.id + i}>{r.texto}</li>)}</ul>
        <Link href={`/estudio/${id}/calidad`} className="mb-4 inline-flex min-h-11 items-center text-[13px] underline">Revisar condiciones por entrega →</Link>
      </details>
      <details className={plegable}>
        <summary className={resumenPlegable}>En qué orden trabajan · unos {totalMin} min de IA en total{mas}</summary>
        <ol className="grid gap-1.5 pb-5 sm:grid-cols-2">
          {p.plan.tareas.map((t, i) => {
            const c = contratoPorId(t)!;
            const a = agentePorId(c.agente)!;
            return (
              <li key={t} className="flex items-center gap-2.5 rounded-xl bg-[#faf8f4] px-2.5 py-1.5 text-[13px]">
                <span className="w-5 text-right font-mono text-[11px] text-suave">{i + 1}</span>
                <Cara id={a.id} tam={22} titulo={false} />
                <span className="min-w-0 flex-1 truncate"><span className="font-medium">{a.nombre}</span> · {c.entrega}</span>
                <span className="shrink-0 font-mono text-[11px] text-suave">~{minutos(t)} min · ${costoTarea(p, t).toFixed(2)}</span>
              </li>
            );
          })}
        </ol>
      </details>
      <details className={plegable}>
        <summary className={resumenPlegable}>El pedido completo{mas}</summary>
        <p className="pb-5 text-[14px] leading-relaxed text-medio">{p.plan.resumen || p.pedido.descripcion}</p>
      </details>
    </section>
  );
}
