// El plan que armó Atlas, antes de que nadie trabaje (sistema/32): quién entra, quién no y por qué, y cuánto costaría.
import Link from "next/link";
import {requisitosDe} from "@anonymo/pipeline";
import { agentePorId, FASES } from "@anonymo/agentes";
import { contratoPorId, costoPlan, ocultarClaves, type Proyecto, type TareaId } from "@anonymo/pipeline";

/** Lo que costaría una sola entrega con IA (la misma cuenta que el total del plan). */
const costoTarea = (p: Proyecto, t: TareaId) => costoPlan(p.pedido, { tareas: p.plan.tareas.slice(0, p.plan.tareas.indexOf(t) + 1) }) - costoPlan(p.pedido, { tareas: p.plan.tareas.slice(0, p.plan.tareas.indexOf(t)) });
import { Enviar } from "@/app/estudio/nuevo/Enviar";
import { accionEmpezar, accionReplanear } from "@/app/estudio/acciones";
import { boton, botonLleno, campo, serif } from "@/lib/estudio";
import { Cara } from "./piezas";
import { OpcionesModo } from "./OpcionesModo";
import { segundosEstimados } from "@/lib/duracion";

export function PlanAtlas({ p, conIA }: { p: Proyecto; conIA: boolean }) {
  const id = p.pedido.id;
  const fuera = FASES.filter((f) => !p.plan.fases.includes(f.n) && f.n !== 7);
  const costo = costoPlan(p.pedido, p.plan);
  return (
    <section aria-label="Plan de Atlas" className="overflow-hidden rounded-[20px] bg-white shadow-[0_0_0_1px_rgba(26,24,22,.06),0_18px_44px_-24px_rgba(40,30,20,.3)]">
      <details className="border-b border-borde p-4 text-[14px]"><summary className="min-h-11 cursor-pointer font-medium">Qué debe cumplir este pedido · antes de producir</summary><ul className="mt-2 grid gap-2">{requisitosDe(p).map((r,i)=><li key={r.id+i}>{r.texto}</li>)}</ul><Link href={`/estudio/${id}/calidad`} className="inline-flex min-h-11 items-center underline">Revisar condiciones por entrega →</Link></details>
      <div className="flex flex-wrap items-start gap-5 bg-tinta p-6 text-white md:p-8">
        <Cara id="atlas" tam={64} flota />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-[12px] text-white/60">
            <i className="late h-1.5 w-1.5 rounded-full bg-urgente" /> Te toca · el plan de Atlas{p.plan.porIA ? "" : " (hecho con reglas, sin IA)"} · nadie trabaja hasta que digas
          </p>
          <p className={`${serif} mt-2 text-[clamp(28px,3.2vw,40px)] leading-[1.05]`}>{p.plan.resumen || `Trabajan ${p.plan.tareas.length} agentes en ${p.plan.fases.length} fases.`}</p>
          <p className="mt-2 text-[14px] text-white/70">Costo aproximado con IA ≈ US$ {costo.toFixed(2)}, sin contar cambios.</p>
        </div>
      </div>

      {!p.plan.porIA && p.plan.sinIA && (
        <p role="alert" className="mx-6 mt-6 rounded-xl bg-[#fff4e0] p-3 text-[14px] md:mx-8">
          Atlas no pudo usar la IA: <span className="font-mono text-[12px]">{ocultarClaves(p.plan.sinIA)}</span>. Arréglalo y escribe un ajuste abajo para que lo vuelva a leer.
        </p>
      )}

      <div className="grid gap-8 p-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:p-8">
        <div>
          <p className="text-[12px] text-suave">Trabajan · {p.plan.tareas.length}</p>
          <div className="mt-3 grid gap-5">
            {p.plan.fases.map((f) => (
              <div key={f}>
                <p className="text-[15px] font-medium">{FASES.find((x) => x.n === f)?.nombre}</p>
                {p.plan.razones[f] && <p className="text-[13px] text-medio">{p.plan.razones[f]}</p>}
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {p.plan.tareas.filter((t) => t.startsWith(`${f}.`)).map((t) => {
                    const c = contratoPorId(t)!;
                    const a = agentePorId(c.agente)!;
                    return (
                      <li key={t} className="inline-flex min-h-9 items-center gap-2 rounded-full bg-[#f6f3ee] py-1 pl-1.5 pr-3 text-[13px]">
                        <Cara id={a.id} tam={24} /> <span><strong className="font-medium">{a.nombre}</strong> · {c.entrega}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="grid content-start gap-6">
          {(p.plan.quitadas.length > 0 || fuera.length > 0) && (
            <div>
              <p className="text-[12px] text-suave">No trabajan</p>
              <ul className="mt-2 grid gap-2 text-[13px]">
                {p.plan.quitadas.map((q) => {
                  const a = agentePorId(contratoPorId(q.id)?.agente ?? "");
                  return (
                    <li key={q.id} className="flex items-start gap-2">
                      {a && <Cara id={a.id} tam={20} apagado />}
                      <span><span className="font-medium">{a?.nombre}</span> <span className="text-medio">({contratoPorId(q.id)?.entrega.toLowerCase()}) · {q.razon}</span></span>
                    </li>
                  );
                })}
                {fuera.length > 0 && <li className="text-medio">Fases que no entran: {fuera.map((f) => f.nombre).join(", ")}.</li>}
              </ul>
            </div>
          )}
          {p.plan.preguntas.length > 0 && (
            <div>
              <p className="text-[12px] text-suave">Lo que falta saber del cliente</p>
              <ul className="mt-2 grid gap-1.5 text-[14px]">{p.plan.preguntas.map((q) => <li key={q} className="flex gap-2"><span className="text-suave">—</span>{q}</li>)}</ul>
              <p className="mt-2 text-[12px] text-suave">Las respondes cuando quieras, desde «Del cliente».</p>
            </div>
          )}
        </div>
      </div>

      {/* El orden en que trabajan y cuánto suele tardar cada uno (sistema/36). */}
      <details className="group border-t border-borde px-6 py-4 md:px-8">
        <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 text-[14px] font-medium">
          En qué orden trabajan · unos {Math.max(1, Math.round(p.plan.tareas.reduce((s, t) => s + segundosEstimados(t), 0) / 60))} min de IA en total
          <span className="ml-auto text-suave transition group-open:rotate-45">+</span>
        </summary>
        <ol className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {p.plan.tareas.map((t, i) => {
            const c = contratoPorId(t)!;
            const a = agentePorId(c.agente)!;
            return (
              <li key={t} className="flex items-center gap-2.5 rounded-xl bg-[#faf8f4] px-2.5 py-1.5 text-[13px]">
                <span className="w-5 text-right font-mono text-[11px] text-suave">{i + 1}</span>
                <Cara id={a.id} tam={22} titulo={false} />
                <span className="min-w-0 flex-1 truncate"><span className="font-medium">{a.nombre}</span> · {c.entrega}</span>
                <span className="shrink-0 font-mono text-[11px] text-suave">~{Math.max(1, Math.round(segundosEstimados(t) / 60))} min · ${costoTarea(p, t).toFixed(2)}</span>
              </li>
            );
          })}
        </ol>
      </details>

      <form action={accionEmpezar} className="grid gap-4 border-t border-borde p-6 md:p-8">
        <input type="hidden" name="id" value={id} />
        <div>
          <p className="mb-2 text-[13px] font-medium">¿Cómo quieres que trabajen?</p>
          <OpcionesModo actual={p.modo ?? "paso"} />
        </div>
        <div className="grid gap-2">
          <div><Enviar className={`${botonLleno} min-h-12 px-7 text-[14px]`} texto="Que empiecen" trabajando="Arrancando…" proyecto={id} /></div>
          {conIA && (
            <label className="flex min-h-9 items-center gap-2 text-[12px] text-medio">
              <input type="checkbox" name="motor" value="simulado" className="accent-tinta" /> Probar sin gastar IA (solo arma la estructura)
            </label>
          )}
        </div>
      </form>
      <div className="border-t border-borde p-6 md:p-8">
        <form action={accionReplanear} className="grid gap-2">
          <input type="hidden" name="id" value={id} />
          <label className="sr-only" htmlFor="ajuste">Ajuste para Atlas</label>
          <textarea id="ajuste" name="ajuste" rows={2} required className={campo} placeholder="¿Algo no cuadra? Díselo a Atlas: «sin video», «sí necesita nombre», «que Lente haga las fotos»…" />
          <div><Enviar className={boton} texto="Ajustar el plan" trabajando="Atlas está rehaciendo el plan…" proyecto={id} largo /></div>
        </form>
      </div>
    </section>
  );
}
