"use client";

import { useActionState, useState } from "react";
import { PEDIDOS } from "@/lib/servicio";
import { usePathname } from "next/navigation";
import { idiomaDeRuta, pedido as nombrePedido } from "@/lib/idioma";
import { enviarPedido } from "./acciones";
import { medir } from "@/lib/medir";
import { useEffect } from "react";

// El pedido y, al lado, qué pasa después de enviarlo (web/21).
export function Formulario() {
  const [tipo, setTipo] = useState<keyof typeof PEDIDOS>("web");
  const [estado, enviar, enviando] = useActionState(enviarPedido, null);
  const idioma = idiomaDeRuta(usePathname());
  const en = idioma === "en";
  useEffect(() => {
    if (estado?.ok) medir("formulario", tipo);
  }, [estado, tipo]);

  const campo = "w-full border-b border-tinta bg-transparent py-3 text-xl font-light tracking-tight outline-none placeholder:text-gris/55 focus:border-b-2";
  const etiqueta = "font-mono text-[12px] uppercase tracking-[0.14em] text-gris";

  return (
    <div className="grid gap-12 lg:grid-cols-12">
      <form action={enviar} className="grid content-start gap-8 lg:col-span-6">
        <input type="hidden" name="tipo" value={tipo} />
        <input type="hidden" name="idioma" value={idioma} />
        <label aria-hidden className="absolute -left-[9999px]" tabIndex={-1}>
          Sitio web <input name="sitio" tabIndex={-1} autoComplete="off" />
        </label>
        <fieldset>
          <legend className={etiqueta}>{en ? "What do you need" : "Qué necesitas"}</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(PEDIDOS).map(([k, p]) => (
              <button
                type="button"
                key={k}
                aria-pressed={tipo === k}
                onClick={() => setTipo(k as keyof typeof PEDIDOS)}
                className={`rounded-full border px-4 py-2 font-mono text-[12px] uppercase tracking-[0.12em] ${tipo === k ? "border-tinta bg-tinta text-hueso" : "border-linea text-gris hover:border-tinta hover:text-tinta"}`}
              >
                {nombrePedido(k as keyof typeof PEDIDOS, idioma)}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="grid gap-1">
          <span className={etiqueta}>{en ? "Your name" : "Tu nombre"}</span>
          <input id="nombre" name="nombre" required minLength={2} maxLength={80} autoComplete="name" defaultValue={estado?.campos?.nombre} className={campo} placeholder={en ? "What should we call you" : "Cómo te llamas"} />
        </label>
        <label className="grid gap-1">
          <span className={etiqueta}>{en ? "Email" : "Correo"}</span>
          <input id="correo" name="correo" type="email" required maxLength={120} autoComplete="email" defaultValue={estado?.campos?.correo} className={campo} placeholder={en ? "you@email.com" : "tu@correo.com"} />
        </label>
        <label className="grid gap-1">
          <span className={etiqueta}>{en ? "Tell us" : "Cuéntanos"}</span>
          <textarea id="mensaje" name="mensaje" rows={4} required minLength={10} maxLength={3000} defaultValue={estado?.campos?.mensaje} className={`${campo} resize-none`} placeholder={en ? "E.g.: a website for my dental clinic, with online booking" : "Ej.: una web para mi clínica dental, con citas en línea"} />
        </label>
        <div className="flex flex-wrap items-center gap-6">
          <button type="submit" disabled={enviando} className="rounded-full bg-tinta px-8 py-4 font-mono text-[12px] uppercase tracking-[0.14em] text-hueso transition-transform hover:-translate-y-0.5 disabled:opacity-60">
            {enviando ? (en ? "Sending…" : "Enviando…") : en ? "Send" : "Enviar"}
          </button>
          {estado && (
            <p role={estado.ok ? "status" : "alert"} className={`max-w-sm text-[15px] ${estado.ok ? "text-tinta" : "text-[#a3105c]"}`}>
              {estado.mensaje}
            </p>
          )}
        </div>
      </form>

      <aside className="lg:col-span-5 lg:col-start-8">
        <p className={etiqueta}>{en ? "What happens next" : "Qué pasa después"}</p>
        <ol className="mt-4 grid gap-0">
          {(en
            ? ["We read your request.", "Jay or Luna write to you within 24 hours.", "You get a proposal with a fixed price before we start."]
            : ["Leemos tu pedido.", "Jay o Luna te escriben en menos de 24 horas.", "Recibes una propuesta con precio cerrado antes de empezar."]
          ).map((x, i) => (
            <li key={x} className="flex items-baseline gap-5 border-t border-linea py-5">
              <span className="display text-4xl text-gris">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-xl font-light tracking-tight">{x}</span>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
