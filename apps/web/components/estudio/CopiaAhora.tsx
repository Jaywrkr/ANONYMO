"use client";
// «Hacer una copia ahora» (sistema/78): bloquea mientras copia y dice qué pasó.
import { useState } from "react";
import { useRouter } from "next/navigation";

export function CopiaAhora() {
  const router = useRouter();
  const [trabajando, setTrabajando] = useState(false);
  const [nota, setNota] = useState<{ ok: boolean; texto: string } | null>(null);
  async function copiar() {
    setTrabajando(true);
    setNota(null);
    try {
      const r = await fetch("/estudio/estado/respaldar", { method: "POST" });
      const j = (await r.json().catch(() => ({}))) as { archivos?: number; faltaron?: string[]; error?: string };
      if (!r.ok) throw new Error(j.error ?? "No se pudo hacer la copia.");
      setNota({ ok: true, texto: `Copia hecha: ${j.archivos} ${j.archivos === 1 ? "archivo" : "archivos"}${j.faltaron?.length ? ` (todavía no existen: ${j.faltaron.join(", ")})` : ""}.` });
      router.refresh();
    } catch (e) {
      setNota({ ok: false, texto: (e as Error).message });
    } finally {
      setTrabajando(false);
    }
  }
  return (
    <div className="grid gap-2">
      <button type="button" onClick={copiar} disabled={trabajando} className="inline-flex min-h-11 w-fit items-center rounded-full bg-tinta px-5 text-[13px] font-medium text-white disabled:opacity-50">
        {trabajando ? "Copiando…" : "Hacer una copia ahora"}
      </button>
      {nota && <p role="status" className={`text-[13px] ${nota.ok ? "text-[#17714a]" : "text-[#a33a0b]"}`}>{nota.texto}</p>}
    </div>
  );
}
