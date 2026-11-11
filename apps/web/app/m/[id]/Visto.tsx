"use client";

// Lo que hace la muestra en el navegador del negocio (sistema/72): avisa que la abrió, responde a los botones de ejemplo
// y deja la barra «Quiero esta web». Solo corre en un navegador de verdad: la vista previa de WhatsApp no la cuenta.
import { useEffect, useState } from "react";

export function Visto({ id, nombre, numero, oferta }: { id: string; nombre: string; numero?: string; oferta: { dias: number; precio: string } }) {
  const [aviso, setAviso] = useState("");
  const [yendo, setYendo] = useState(false);

  useEffect(() => {
    const clave = `muestra-vista-${id}`;
    try { if (sessionStorage.getItem(clave)) return; sessionStorage.setItem(clave, "1"); } catch { /* sin almacenamiento: se cuenta igual */ }
    void fetch(`/m/${id}/vista`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}", keepalive: true }).catch(() => {});
  }, [id]);

  useEffect(() => {
    // Los botones de la muestra todavía no llevan a ningún lado: se explica en vez de no hacer nada.
    const alTocar = (e: Event) => {
      if (!(e.target as HTMLElement).closest("[data-demo]")) return;
      setAviso("En tu web, este botón abrirá tu WhatsApp con el mensaje listo para agendar.");
      window.setTimeout(() => setAviso(""), 3500);
    };
    document.addEventListener("click", alTocar);
    return () => document.removeEventListener("click", alTocar);
  }, []);

  async function quiero() {
    if (yendo) return;
    setYendo(true);
    await fetch(`/m/${id}/vista`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ accion: "quiere" }), keepalive: true }).catch(() => {});
    if (numero) window.location.href = `https://wa.me/${numero}?text=${encodeURIComponent(`Hola, vi la idea de web para ${nombre} y me interesa.`)}`;
    else { setAviso("¡Gracias! Responde al WhatsApp en el que te llegó este enlace y lo conversamos."); setYendo(false); }
  }

  return (
    <>
      {aviso && <p role="status" className="fixed inset-x-4 bottom-32 z-50 mx-auto max-w-md rounded-2xl bg-[#1a1816] px-4 py-3 text-center text-[14px] text-white shadow-lg">{aviso}</p>}
      <aside aria-label="Sobre esta muestra" className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-3xl flex-wrap items-center gap-3 rounded-3xl bg-[#1a1816] px-5 py-4 text-white shadow-[0_12px_40px_rgba(0,0,0,.25)]">
        <p className="min-w-0 flex-1 text-[13px] leading-snug text-white/80">
          <span className="font-medium text-white">¿Te gusta? Esta puede ser tu web.</span> Lista en {oferta.dias} días · {oferta.precio}. Hecha por ANONYMO.
        </p>
        <button type="button" onClick={quiero} disabled={yendo} className="min-h-11 rounded-full bg-[#25d366] px-5 text-[14px] font-medium text-black disabled:opacity-60">
          {yendo ? "Abriendo WhatsApp…" : "Quiero esta web"}
        </button>
      </aside>
    </>
  );
}
