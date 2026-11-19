"use client";

// Lo que hace la muestra en el navegador del negocio (sistema/72): avisa que la abrió, responde a los botones de ejemplo
// y deja la barra «Quiero esta web». Solo corre en un navegador de verdad: la vista previa de WhatsApp no la cuenta.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ContenidoMuestra } from "@anonymo/pipeline";
import { achicar } from "@/lib/achicar";
import { Asistente } from "@/components/muestra/Asistente";

export function Visto({ id, nombre, c, numero, oferta, fotos = 0, fotosMax = 3 }: { id: string; nombre: string; c: ContenidoMuestra; numero?: string; oferta: { dias: number; precio: string }; fotos?: number; fotosMax?: number }) {
  const [aviso, setAviso] = useState("");
  const [subiendo, setSubiendo] = useState("");
  const entrada = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // El negocio pone hasta 3 fotos suyas y la muestra se rehace con ellas (sistema/82).
  async function subir(lista: FileList | null) {
    const archivos = Array.from(lista ?? []).filter((a) => a.type.startsWith("image/")).slice(0, fotosMax);
    if (!archivos.length || subiendo) return;
    try {
      for (let i = 0; i < archivos.length; i++) {
        setSubiendo(`Subiendo foto ${i + 1} de ${archivos.length}…`);
        const r = await fetch(`/m/${id}/fotos/${i + 1}?de=${archivos.length}`, { method: "POST", headers: { "content-type": "image/jpeg" }, body: await achicar(archivos[i]!) });
        if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { error?: string }).error ?? "No se pudo subir la foto. Vuelve a intentar.");
      }
      setAviso(archivos.length === 1 ? "Listo: tu foto ya está en la página." : `Listo: tus ${archivos.length} fotos ya están en la página.`);
      router.refresh();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setAviso((e as Error).message);
    } finally {
      setSubiendo("");
      if (entrada.current) entrada.current.value = "";
      window.setTimeout(() => setAviso(""), 5000);
    }
  }
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
        {/* El asistente de demostración (sistema/87): su botón va pegado encima de esta barra. */}
        <Asistente c={c} lugar="absolute bottom-full right-0 mb-2.5" alQuerer={quiero}
          alProbar={() => void fetch(`/m/${id}/vista`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ accion: "chat" }), keepalive: true }).catch(() => {})} />
        <p className="min-w-0 basis-full text-[13px] leading-snug text-white/80 sm:flex-1 sm:basis-0">
          <span className="font-medium text-white">¿Te gusta? Esta puede ser tu web.</span> Lista en {oferta.dias} días · {oferta.precio}. Hecha por ANONYMO.
        </p>
        <input ref={entrada} type="file" accept="image/*" multiple hidden aria-label="Elegir fotos" onChange={(e) => void subir(e.target.files)} />
        <button type="button" onClick={() => entrada.current?.click()} disabled={!!subiendo} className="min-h-11 flex-1 rounded-full px-4 text-[13px] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,.35)] disabled:opacity-60 sm:flex-none">
          {subiendo || (fotos ? "Cambiar mis fotos" : "Verla con mis fotos")}
        </button>
        <button type="button" onClick={quiero} disabled={yendo} className="min-h-11 flex-1 rounded-full bg-[#25d366] px-5 text-[14px] font-medium text-black disabled:opacity-60 sm:flex-none">
          {yendo ? "Abriendo WhatsApp…" : "Quiero esta web"}
        </button>
      </aside>
    </>
  );
}
