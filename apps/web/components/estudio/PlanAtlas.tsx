// El plan que armó Atlas, antes de que nadie trabaje (sistema/32): quién entra, quién no y por qué, y cuánto costaría.
import { agentePorId, FASES } from "@anonymo/agentes";
import { contratoPorId, costoPlan, ocultarClaves, type Proyecto } from "@anonymo/pipeline";
import { Enviar } from "@/app/estudio/nuevo/Enviar";
import { accionEmpezar, accionReplanear } from "@/app/estudio/acciones";
import { boton, botonLleno, campo, serif } from "@/lib/estudio";
import { Cara } from "./piezas";

export function PlanAtlas({ p, conIA }: { p: Proyecto; conIA: boolean }) {
  const id = p.pedido.id;
  const fuera = FASES.filter((f) => !p.plan.fases.includes(f.n) && f.n !== 7);
  const costo = costoPlan(p.pedido, p.plan);
  return (
    <section aria-label="Plan de Atlas" className="overflow-hidden rounded-[20px] bg-white shadow-[0_0_0_1px_rgba(26,24,22,.06),0_18px_44px_-24px_rgba(40,30,20,.3)]">
      <div className="flex flex-wrap items-start gap-5 bg-tinta p-6 text-white md:p-8">
        <Cara id="atlas" tam={64} flota />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-[12px] text-white/60">
            <i className="late h-1.5 w-1.5 rounded-full bg-urgente" /> Te toca · plan de Atlas {p.plan.porIA ? "con IA" : "con reglas, sin IA"} · nadie trabaja todavía
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

      <div className="grid gap-4 border-t border-borde p-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-start md:p-8">
        <form action={accionEmpezar} className="grid gap-2">
          <input type="hidden" name="id" value={id} />
          <Enviar className={`${botonLleno} min-h-12 px-7 text-[14px]`} texto="Que empiecen" trabajando="El equipo está trabajando… no cierres esta página" />
          {conIA && (
            <label className="flex min-h-9 items-center gap-2 text-[12px] text-medio">
              <input type="checkbox" name="motor" value="simulado" className="accent-tinta" /> Prueba sin gastar (solo estructura)
            </label>
          )}
        </form>
        <form action={accionReplanear} className="grid gap-2">
          <input type="hidden" name="id" value={id} />
          <label className="sr-only" htmlFor="ajuste">Ajuste para Atlas</label>
          <textarea id="ajuste" name="ajuste" rows={2} required className={campo} placeholder="¿Algo no cuadra? «sin video», «sí necesita nombre», «que Lente haga la sesión de fotos»…" />
          <div><Enviar className={boton} texto="Ajustar el plan" trabajando="Atlas está ajustando…" /></div>
        </form>
      </div>
    </section>
  );
}
