"use client";

// Lo que hace la propuesta en el navegador del negocio (sistema/80): avisa que la abrió y deja «Aceptar».
// Al aceptar se anota, suena el celular de Jay y se abre el WhatsApp de ANONYMO con el mensaje listo.
import { useEffect, useState } from "react";

export function Aceptar({ id, nombre, numero, yaAcepto }: { id: string; nombre: string; numero?: string; yaAcepto: boolean }) {
  const [estado, setEstado] = useState<"" | "enviando" | "listo">(yaAcepto ? "listo" : "");

  useEffect(() => {
    const clave = `propuesta-vista-${id}`;
    try { if (sessionStorage.getItem(clave)) return; sessionStorage.setItem(clave, "1"); } catch { /* se cuenta igual */ }
    void fetch(`/p/${id}/registro`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}", keepalive: true }).catch(() => {});
  }, [id]);

  const wa = numero ? `https://wa.me/${numero}?text=${encodeURIComponent(`Hola, acepto la propuesta de web para ${nombre}. ¿Cómo hacemos el primer pago?`)}` : undefined;

  async function aceptar() {
    if (estado) return;
    setEstado("enviando");
    await fetch(`/p/${id}/registro`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ accion: "acepto" }), keepalive: true }).catch(() => {});
    setEstado("listo");
    if (wa) window.location.href = wa;
  }

  return (
    <aside aria-label="Aceptar la propuesta" className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-2xl flex-wrap items-center gap-3 rounded-3xl bg-[#1a1816] px-5 py-4 text-white shadow-[0_12px_40px_rgba(0,0,0,.25)]">
      {estado === "listo" ? (
        <>
          <p role="status" className="min-w-0 flex-1 text-[14px] leading-snug"><span className="font-medium">¡Gracias! Propuesta aceptada.</span> <span className="text-white/75">Te escribimos hoy para el primer pago y empezamos.</span></p>
          {wa && <a href={wa} className="inline-flex min-h-11 items-center rounded-full bg-[#25d366] px-5 text-[14px] font-medium text-black">Escribirnos ahora</a>}
        </>
      ) : (
        <>
          <p className="min-w-0 flex-1 text-[13px] leading-snug text-white/80"><span className="font-medium text-white">¿Empezamos?</span> Al aceptar te escribimos para el primer pago (50 %).</p>
          <button type="button" onClick={aceptar} disabled={!!estado} className="min-h-11 rounded-full bg-[#25d366] px-6 text-[14px] font-medium text-black disabled:opacity-60">
            {estado === "enviando" ? "Aceptando…" : "Aceptar propuesta"}
          </button>
        </>
      )}
    </aside>
  );
}
