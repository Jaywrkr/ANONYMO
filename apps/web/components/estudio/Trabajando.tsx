"use client";

// Mientras la IA trabaja (sistema/35): la pantalla queda bloqueada y borrosa hasta que termine.
// Dice quién está en qué, cuánto lleva cada uno y cuánto suele tardar. No se puede salir a medias.
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { agentePorId } from "@anonymo/agentes";
import { caraSvg } from "@/lib/caras";
import { queHace } from "@/lib/haciendo";
import { leerTrabajo, type Trabajo } from "@/app/estudio/nuevo/Enviar";

interface Vivo { tareas: Record<string, string>; inicios?: Record<string, string>; estimados?: Record<string, number> }

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

export function Trabajando() {
  const [t, setT] = useState<Trabajo>({ activo: false });
  const [desde, setDesde] = useState(0);
  const [ahora, setAhora] = useState(0);
  const [vivo, setVivo] = useState<Vivo | null>(null);
  const [turno, setTurno] = useState(0);
  // Al llegar a otra página (la acción terminó y redirigió), el aviso se cierra.
  const ruta = usePathname();
  const params = useSearchParams();
  useEffect(() => { setT((x) => (x.activo ? { activo: false } : x)); }, [ruta, params]);

  useEffect(() => {
    const f = (e: Event) => {
      const x = leerTrabajo(e);
      if (!x.largo) return;
      setT(x);
      if (x.activo) { setDesde(Date.now()); setAhora(Date.now()); setVivo(null); }
    };
    addEventListener("anonymo:trabajando", f);
    return () => removeEventListener("anonymo:trabajando", f);
  }, []);

  // Mientras trabaja: reloj, estado en vivo, nada de atajos ni de salir.
  useEffect(() => {
    if (!t.activo) return;
    document.documentElement.setAttribute("data-trabajando", "1");
    const reloj = setInterval(() => setAhora(Date.now()), 1000);
    const cambio = setInterval(() => setTurno((n) => n + 1), 3200);
    let sigue = true;
    const consultar = async () => {
      if (!t.proyecto) return;
      try {
        const r = await fetch(`/estudio/${t.proyecto}/vivo`, { cache: "no-store" });
        if (r.ok && sigue) setVivo(await r.json());
      } catch {}
    };
    consultar();
    const sondeo = setInterval(consultar, 3000);
    const antes = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    const teclas = (e: KeyboardEvent) => { if (!(e.target as HTMLElement)?.closest?.("[data-aviso-trabajo]")) { e.stopImmediatePropagation(); if (e.key !== "Tab") e.preventDefault(); } };
    addEventListener("beforeunload", antes);
    addEventListener("keydown", teclas, true);
    return () => {
      sigue = false; clearInterval(reloj); clearInterval(cambio); clearInterval(sondeo);
      removeEventListener("beforeunload", antes); removeEventListener("keydown", teclas, true);
      document.documentElement.removeAttribute("data-trabajando");
    };
  }, [t.activo, t.proyecto]);

  if (!t.activo) return null;
  const seg = Math.max(0, Math.round((ahora - desde) / 1000));
  const tareas = Object.entries(vivo?.tareas ?? {});
  const enCurso = tareas.filter(([, e]) => e === "en-curso").map(([x]) => x);
  const hechas = tareas.filter(([, e]) => e === "lista").length;
  const filas = enCurso.length ? enCurso : ["1.atlas"];

  return (
    <div data-aviso-trabajo role="alertdialog" aria-modal="true" aria-live="polite" aria-label="La IA está trabajando" className="fixed inset-0 z-[90] grid place-items-center bg-[#efe9df]/55 p-4 backdrop-blur-md">
      <div className="aparece w-[min(500px,100%)] rounded-[26px] bg-carta p-7 text-center shadow-[0_0_0_1px_rgba(26,24,22,.06),0_30px_80px_-20px_rgba(20,15,10,.45)]">
        <div className="flex items-end justify-center gap-2">
          {filas.slice(0, 4).map((x, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={x} src={caraSvg(x.split(".")[1])} alt="" width={64} height={69} className="flota" style={{ animationDelay: `${i * 0.25}s` }} />
          ))}
        </div>
        <p className="mt-5 font-serif text-[30px] leading-[1.05]">{t.texto ?? "El equipo está trabajando…"}</p>
        <p className="mt-1 text-[13px] text-suave">La IA aún no termina. Espera aquí: la pantalla se libera sola.</p>

        <ul className="mx-auto mt-5 grid max-w-sm gap-3 text-left">
          {filas.slice(0, 3).map((x, i) => {
            const id = x.split(".")[1];
            const inicio = vivo?.inicios?.[x] ? Date.parse(vivo.inicios[x]) : desde;
            const lleva = Math.max(0, Math.round((ahora - inicio) / 1000));
            const suele = vivo?.estimados?.[x] ?? 120;
            const avance = Math.min(0.95, lleva / suele);
            return (
              <li key={x} className="aparece" style={{ animationDelay: `${i * 0.08}s` }}>
                <p className="flex items-baseline gap-2 text-[14px]">
                  <span className="font-medium">{agentePorId(id)?.nombre}</span>
                  <span key={turno} className="aparece min-w-0 flex-1 truncate text-medio">{queHace(id, turno + i)}…</span>
                  <span className="shrink-0 font-mono text-[11px] text-suave">{mmss(lleva)}</span>
                </p>
                <span className="mt-1.5 block h-[3px] overflow-hidden rounded-full bg-borde">
                  <i className="block h-full rounded-full bg-vivo transition-[width] duration-1000" style={{ width: `${avance * 100}%` }} />
                </span>
                <p className="mt-1 text-[11px] text-suave">{lleva > suele ? "Está tardando más de lo normal; sigue trabajando." : `Suele tardar unos ${Math.max(1, Math.round(suele / 60))} min.`}</p>
              </li>
            );
          })}
        </ul>

        <p className="mt-5 text-[12px] text-suave">
          {tareas.length ? `${hechas} de ${tareas.length} entregas listas · ` : ""}total {mmss(seg)}
        </p>
        <p className="mx-auto mt-3 max-w-sm text-[12px] leading-relaxed text-medio">
          No cierres ni recargues esta pestaña. Si pasa de 5 minutos el servidor corta, pero lo terminado queda guardado y continúas con un toque.
        </p>
      </div>
    </div>
  );
}
