"use client";

// Las piezas que diseña Faro (sistema/123): pedir una de un proyecto, verla a tamaño real (todas las láminas),
// ver su nota frente a «qué es bueno» y aprobar o pedir un cambio. Faro trabaja en vueltas: cada una es un pedido.
import { useState } from "react";
import type { PiezaFaro } from "@anonymo/pipeline";
import { LaminasFaro, NOMBRE_FORMATO, NotaFaro, PaqueteFaro, decidirFaro, vueltasFaro } from "./FaroComun";

type Proyecto = { cliente: string; nombreCliente: string; url: string; nombre: string };
const boton = "inline-flex min-h-11 items-center justify-center rounded-full bg-white px-4 text-[13px] shadow-[inset_0_0_0_1px_var(--color-borde)] disabled:opacity-40";
const lleno = "inline-flex min-h-11 items-center justify-center rounded-full bg-tinta px-5 text-[13px] text-white disabled:opacity-40";

export function PiezasFaro({ proyectos, inicial, referencias }: { proyectos: Proyecto[]; inicial: PiezaFaro[]; referencias: Record<string, number> }) {
  const [piezas, setPiezas] = useState(inicial);
  const [trabajando, setTrabajando] = useState<{ id?: string; texto: string } | null>(null);
  const [error, setError] = useState("");
  const [nota, setNota] = useState<Record<string, string>>({});
  const poner = (p: PiezaFaro) => setPiezas((xs) => [p, ...xs.filter((x) => x.id !== p.id)].sort((a, b) => b.creado.localeCompare(a.creado)));

  async function vueltas(id: string) { await vueltasFaro(id, poner, (texto) => setTrabajando({ id, texto })); }
  async function pedir(pr: Proyecto) {
    setError("");
    try {
      setTrabajando({ texto: "Preparando…" });
      const r = await fetch("/estudio/contenido/faro/pedir", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ cliente: pr.cliente, url: pr.url }) });
      const j = (await r.json().catch(() => ({}))) as { error?: string; pieza?: PiezaFaro };
      if (!r.ok || !j.pieza) throw new Error(j.error ?? "No se pudo pedir.");
      poner(j.pieza);
      await vueltas(j.pieza.id);
    } catch (e) { setError((e as Error).message === "Failed to fetch" ? "Se cortó la conexión. Vuelve a intentar." : (e as Error).message); }
    finally { setTrabajando(null); }
  }
  async function decidir(p: PiezaFaro, accion: "aprobar" | "cambio") {
    setError("");
    try {
      setTrabajando({ id: p.id, texto: accion === "aprobar" ? "Aprobando…" : "Anotando el cambio…" });
      poner(await decidirFaro(p.id, accion, nota[p.id]));
      if (accion === "cambio") { setNota((n) => ({ ...n, [p.id]: "" })); await vueltas(p.id); }
    } catch (e) { setError((e as Error).message); }
    finally { setTrabajando(null); }
  }

  return (
    <div className="mt-6 grid gap-8">
      <section>
        <h2 className="text-[13px] text-suave">Pedirle una pieza a Faro</h2>
        {!proyectos.length && <p className="mt-2 text-[14px] text-medio">No hay proyectos con capturas. Agrega webs en «Su trabajo real» de la Dirección de un cliente y abre su ficha para que se capturen.</p>}
        <div className="mt-2 flex flex-wrap gap-2">
          {proyectos.map((pr) => (
            <button key={pr.cliente + pr.url} type="button" data-pedir-pieza={pr.url} disabled={!!trabajando} onClick={() => void pedir(pr)} className={boton}>
              {pr.nombre} <span className="ml-1.5 text-suave">· {pr.nombreCliente}</span>
            </button>
          ))}
        </div>
        {proyectos.some((pr) => !referencias[pr.cliente]) && <p className="mt-2 text-[13px] text-[#a33a0b]">Para que Faro sepa qué es bueno, sube imágenes de referencia en la Dirección del cliente («Qué es bueno, en imágenes»).</p>}
        {trabajando && !trabajando.id && <p role="status" className="mt-2 text-[13px] text-medio">{trabajando.texto}</p>}
        {error && <p role="alert" className="mt-2 text-[13px] text-[#a33a0b]">{error}</p>}
      </section>

      {piezas.map((p) => {
        const v = p.versiones.at(-1);
        const ocupada = trabajando?.id === p.id;
        return (
          <article key={p.id} data-pieza-faro={p.id} data-estado={p.estado} className="rounded-[18px] bg-white p-4 shadow-[0_0_0_1px_rgba(26,24,22,.06)] md:p-6">
            <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[13px] text-medio">
              <span className="text-[15px] font-medium text-tinta">{p.proyecto.nombre}</span>
              <span>{p.nombreCliente}</span>
              <span>{p.formato === "carrusel" ? `Carrusel · ${v?.laminas.length ?? 0} láminas` : NOMBRE_FORMATO[p.formato]}</span>
              {p.enMes && <a href={`/estudio/contenido/${p.enMes.mes}#${p.enMes.pieza}`} className="underline underline-offset-4">Del mes · {p.enMes.fecha}</a>}
              {v && <span>Versión {v.n}</span>}
              <span className={`ml-auto rounded-full px-3 py-1 text-[12px] ${p.estado === "aprobada" ? "bg-[#e6f6ee] text-[#17714a]" : "bg-hueso"}`}>{p.estado === "aprobada" ? "Aprobada" : p.estado === "cambio" ? "Pidieron un cambio" : p.estado === "trabajando" ? "Faro trabajando" : "Por revisar"}</span>
            </header>
            {ocupada && <p role="status" className="mt-3 text-[13px] text-medio">{trabajando!.texto}</p>}
            {v && (
              <>
                <div className="mt-4"><LaminasFaro p={p} v={v} /></div>
                <p className="mt-3 max-w-xl whitespace-pre-line text-[14px]" data-texto>{v.texto}</p>
                {v.porQue && <p className="mt-1 max-w-xl text-[13px] text-suave">Faro: {v.porQue}</p>}
                {v.sparring && (
                  <details data-sparring className="mt-2 max-w-xl text-[13px] text-medio">
                    <summary className="cursor-pointer">Nova: {v.sparring.caminos[v.sparring.elegido]?.nombre} · {v.sparring.porQue}</summary>
                    <ul className="mt-1 grid gap-0.5">{v.sparring.caminos.map((c, i) => <li key={i} className={c.cliche ? "line-through opacity-60" : i === v.sparring!.elegido ? "text-tinta" : ""}>· {c.nombre}: {c.idea}{c.cliche ? " (cliché)" : ""}</li>)}</ul>
                  </details>
                )}
                <NotaFaro v={v} />
                {p.estado === "aprobada" && <PaqueteFaro p={p} v={v} />}
                {p.estado !== "aprobada" && (
                  <div className="mt-4 flex max-w-xl flex-wrap items-end gap-2">
                    <button type="button" data-aprobar disabled={!!trabajando} onClick={() => void decidir(p, "aprobar")} className={lleno}>Aprobar</button>
                    <label className="grid min-w-[220px] flex-1 gap-1 text-[12px] text-suave">Qué cambiar
                      <input value={nota[p.id] ?? ""} onChange={(e) => setNota((n) => ({ ...n, [p.id]: e.target.value }))} placeholder="Ej.: menos texto, el logo más chico" className="min-h-11 rounded-xl bg-hueso/60 px-3 text-[14px] text-tinta outline-none focus:bg-white focus:shadow-[inset_0_0_0_1px_var(--color-borde)]" />
                    </label>
                    <button type="button" data-cambio disabled={!!trabajando || !(nota[p.id] ?? "").trim()} onClick={() => void decidir(p, "cambio")} className={boton}>Pedir el cambio</button>
                  </div>
                )}
              </>
            )}
            {!v && !ocupada && <button type="button" disabled={!!trabajando} onClick={() => { setError(""); setTrabajando({ id: p.id, texto: "" }); void vueltas(p.id).catch((e) => setError((e as Error).message)).finally(() => setTrabajando(null)); }} className={`${boton} mt-3`}>Volver a pedirla</button>}
          </article>
        );
      })}
    </div>
  );
}
