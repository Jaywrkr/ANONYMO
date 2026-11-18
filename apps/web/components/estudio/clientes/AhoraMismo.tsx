"use client";

// Quién está viendo su muestra ahora, quién tocó «Quiero esta web» (sistema/72) y quién aceptó su propuesta (sistema/80). Se actualiza solo cada medio minuto.
import { useEffect, useState } from "react";
import type { VistaProspecto } from "@/lib/clientes";
import { calientes, viendoAhora } from "@/lib/tanda";

const hace = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  return m < 1 ? "ahora mismo" : `hace ${m} min`;
};
const sinTexto = (wa?: string) => wa?.split("?")[0];

export function AhoraMismo({ inicial }: { inicial: VistaProspecto[] }) {
  const [ahora, setAhora] = useState(() => viendoAhora(inicial));
  const [quieren, setQuieren] = useState(() => calientes(inicial));
  useEffect(() => {
    let vivo = true;
    const traer = () => {
      if (document.hidden) return;
      fetch("/estudio/clientes/ahora", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((j) => {
        if (vivo && j) { setAhora(j.ahora); setQuieren(j.quieren); }
      }).catch(() => {});
    };
    const t = window.setInterval(traer, 30_000);
    document.addEventListener("visibilitychange", traer);
    return () => { vivo = false; window.clearInterval(t); document.removeEventListener("visibilitychange", traer); };
  }, []);
  if (!ahora.length && !quieren.length) return null;
  const fila = (p: VistaProspecto, texto: string) => (
    <li key={p.id} className="flex flex-wrap items-center gap-2">
      <p className="min-w-0 basis-full text-[14px] sm:flex-1 sm:basis-0"><span className="font-medium">{p.nombre}</span> <span className="text-white/70">{texto}</span></p>
      {p.telefono && <a href={`tel:${p.telefono.replace(/[^\d+]/g, "")}`} className="inline-flex min-h-9 items-center rounded-full bg-white px-4 text-[13px] font-medium text-tinta">Llamar</a>}
      {p.acepto && p.whatsappCobro && <a href={p.whatsappCobro} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center rounded-full bg-[#25d366] px-4 text-[13px] font-medium text-black">Cobrar el 50 %</a>}
      {p.acepto && !p.proyecto && <a href={p.pedido} className="inline-flex min-h-9 items-center rounded-full bg-white px-4 text-[13px] font-medium text-tinta">Crear el pedido</a>}
      {!p.acepto && sinTexto(p.whatsapp) && <a href={sinTexto(p.whatsapp)} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center rounded-full bg-[#25d366] px-4 text-[13px] font-medium text-black">WhatsApp</a>}
    </li>
  );
  return (
    <section aria-label="Ahora mismo" className="grid gap-3 rounded-2xl bg-[#ff4d2e] p-4 text-white">
      <p className="text-[12px] uppercase tracking-[.12em] text-white/80">Ahora mismo</p>
      <ul className="grid gap-2">
        {quieren.map((p) => fila(p, p.acepto ? "aceptó la propuesta: cobra el primer pago y crea el pedido" : "quiere su web: tocó «Quiero esta web»"))}
        {ahora.filter((p) => !quieren.some((q) => q.id === p.id)).map((p) => fila(p, `está viendo su muestra (${hace(p.ultimaVista!)})`))}
      </ul>
    </section>
  );
}
