"use client";

// Qué es bueno, en imágenes (sistema/123): capturas de cuentas y piezas de primer nivel. Se achican en el navegador
// (máximo 1600 px, JPG) y se suben de a una. Faro las ve al diseñar y la revisión compara cada pieza con ellas.
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

async function achicar(f: File): Promise<Blob> {
  const img = await createImageBitmap(f);
  const k = Math.min(1, 1600 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return new Promise((ok, mal) => c.toBlob((b) => (b ? ok(b) : mal(new Error("No se pudo leer la imagen."))), "image/jpeg", 0.86));
}

export function ImagenesBuenas({ id, nombre, imagenes }: { id: string; nombre: string; imagenes: { archivo: string; nota?: string }[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<{ trabajando?: string; error?: string; ok?: string }>({});
  async function subir(files: FileList | null) {
    if (!files?.length) return;
    const lista = [...files].slice(0, 12);
    try {
      for (const [i, f] of lista.entries()) {
        setEstado({ trabajando: `Subiendo ${i + 1} de ${lista.length}…` });
        const fd = new FormData();
        fd.append("imagen", await achicar(f), "ref.jpg");
        const r = await fetch(`/estudio/cliente/${id}/imagenes`, { method: "POST", body: fd });
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        if (!r.ok) throw new Error(j.error ?? "No se pudo subir.");
      }
      setEstado({ ok: `${lista.length === 1 ? "Imagen subida" : `${lista.length} imágenes subidas`}. Faro ya las ve.` });
      router.refresh();
    } catch (e) {
      setEstado({ error: (e as Error).message === "Failed to fetch" ? "Se cortó la conexión. Vuelve a intentar." : (e as Error).message });
    } finally {
      if (input.current) input.current.value = "";
    }
  }
  async function quitar(archivo: string) {
    setEstado({ trabajando: "Quitando…" });
    const r = await fetch(`/estudio/cliente/${id}/imagenes`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ archivo }) });
    setEstado(r.ok ? { ok: "Quitada." } : { error: "No se pudo quitar." });
    router.refresh();
  }
  return (
    <div className="mt-5" data-imagenes-buenas>
      <p className="text-[12px] text-suave">Qué es bueno para {nombre}, en imágenes · Faro diseña mirándolas</p>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {imagenes.map((m) => (
          <div key={m.archivo} className="group relative shrink-0" data-imagen-buena>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/material/${m.archivo}`} alt="Referencia" className="h-28 w-auto rounded-[6px] shadow-[0_0_0_1px_rgba(26,24,22,.08)]" />
            <button type="button" onClick={() => void quitar(m.archivo)} disabled={!!estado.trabajando} aria-label="Quitar esta referencia" className="absolute right-1 top-1 hidden h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[13px] group-hover:flex">×</button>
          </div>
        ))}
        <button type="button" data-subir-imagenes disabled={!!estado.trabajando} onClick={() => input.current?.click()} className="flex h-28 w-28 shrink-0 items-center justify-center rounded-[6px] border border-dashed border-black/20 px-2 text-center text-[12px] text-medio disabled:opacity-50">
          {estado.trabajando ?? "Subir imágenes"}
        </button>
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(e) => void subir(e.target.files)} />
      </div>
      {estado.error && <p role="alert" className="mt-1 text-[13px] text-[#a33a0b]">{estado.error}</p>}
      {estado.ok && <p role="status" className="mt-1 text-[13px] text-[#17714a]">{estado.ok}</p>}
    </div>
  );
}
