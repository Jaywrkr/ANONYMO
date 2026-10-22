"use client";

import { useActionState, useMemo, useState } from "react";
import { FASES, agentePorId } from "@anonymo/agentes";
import { AgenteVista } from "@/components/escena/AgenteVista";
import { PEDIDOS } from "@/lib/servicio";
import { enviarPedido } from "./acciones";

// Mientras el cliente escribe, ve qué agentes se despiertan para su pedido.
export function Formulario() {
  const [tipo, setTipo] = useState<keyof typeof PEDIDOS>("web");
  const [estado, enviar, enviando] = useActionState(enviarPedido, null);
  const despiertos = useMemo(() => {
    const ids = new Set<string>();
    PEDIDOS[tipo].fases.forEach((n) => FASES.find((f) => f.n === n)?.agentes.forEach((id) => ids.add(id)));
    return [...ids];
  }, [tipo]);

  const campo = "w-full border-b border-tinta bg-transparent py-3 text-xl font-light tracking-tight outline-none placeholder:text-gris/55 focus:border-b-2";
  const etiqueta = "font-mono text-[12px] uppercase tracking-[0.14em] text-gris";

  return (
    <div className="grid gap-12 lg:grid-cols-12">
      <form action={enviar} className="grid content-start gap-8 lg:col-span-6">
        <input type="hidden" name="tipo" value={tipo} />
        <label aria-hidden className="absolute -left-[9999px]" tabIndex={-1}>
          Sitio web <input name="sitio" tabIndex={-1} autoComplete="off" />
        </label>
        <fieldset>
          <legend className={etiqueta}>Qué necesitas</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(PEDIDOS).map(([k, p]) => (
              <button
                type="button"
                key={k}
                aria-pressed={tipo === k}
                onClick={() => setTipo(k as keyof typeof PEDIDOS)}
                className={`rounded-full border px-4 py-2 font-mono text-[12px] uppercase tracking-[0.12em] ${tipo === k ? "border-tinta bg-tinta text-hueso" : "border-linea text-gris hover:border-tinta hover:text-tinta"}`}
              >
                {p.nombre}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="grid gap-1">
          <span className={etiqueta}>Tu nombre</span>
          <input id="nombre" name="nombre" required minLength={2} maxLength={80} autoComplete="name" defaultValue={estado?.campos?.nombre} className={campo} placeholder="Cómo te llamas" />
        </label>
        <label className="grid gap-1">
          <span className={etiqueta}>Correo</span>
          <input id="correo" name="correo" type="email" required maxLength={120} autoComplete="email" defaultValue={estado?.campos?.correo} className={campo} placeholder="tu@correo.com" />
        </label>
        <label className="grid gap-1">
          <span className={etiqueta}>Cuéntanos</span>
          <textarea id="mensaje" name="mensaje" rows={4} required minLength={10} maxLength={3000} defaultValue={estado?.campos?.mensaje} className={`${campo} resize-none`} placeholder="Ej.: una web para mi clínica dental, con citas en línea" />
        </label>
        <div className="flex flex-wrap items-center gap-6">
          <button type="submit" disabled={enviando} className="rounded-full bg-tinta px-8 py-4 font-mono text-[12px] uppercase tracking-[0.14em] text-hueso transition-transform hover:-translate-y-0.5 disabled:opacity-60">
            {enviando ? "Enviando a Atlas…" : "Enviar a Atlas"}
          </button>
          {estado && (
            <p role={estado.ok ? "status" : "alert"} className={`max-w-sm text-[15px] ${estado.ok ? "text-tinta" : "text-[#a3105c]"}`}>
              {estado.mensaje}
            </p>
          )}
        </div>
      </form>

      <aside className="lg:col-span-6">
        <p className={etiqueta}>Para “{PEDIDOS[tipo].nombre.toLowerCase()}” se despiertan</p>
        <p className="display mt-2 text-7xl">{despiertos.length} agentes</p>
        <p className="mt-1 text-gris">Fases {PEDIDOS[tipo].fases.map((n) => String(n).padStart(2, "0")).join(" · ")}</p>
        <ul className="mt-6 grid grid-cols-4 gap-2 sm:grid-cols-5">
          {despiertos.map((id) => {
            const a = agentePorId(id)!;
            return (
              <li key={id}>
                <AgenteVista agente={a} className="aspect-square w-full" />
                <span className="block text-center font-mono text-[12px] uppercase tracking-[0.12em]">{a.nombre}</span>
              </li>
            );
          })}
        </ul>
      </aside>
    </div>
  );
}
