"use client";

// Kits de marca del departamento de video (sistema/65): nombre, colores, logo y música propia de cada cliente.
// Cada acción bloquea con un aviso y dice qué pasó.
import { useEffect, useState } from "react";
import type { KitVista } from "@/lib/video";
import { Espera } from "./Espera";

const campo = "w-full rounded-xl bg-white px-3.5 py-3 text-[15px] text-tinta shadow-[inset_0_0_0_1px_var(--color-borde)] outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-tinta)]";

async function enviar<T>(url: string, cuerpo: unknown): Promise<T> {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cuerpo) });
  const j = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (!r.ok) throw new Error(j.error ?? `No se pudo (${r.status}).`);
  return j;
}

function subir(url: string, archivo: File, avance: (p: number) => void) {
  return new Promise<void>((ok, mal) => {
    const x = new XMLHttpRequest();
    x.open("PUT", url);
    x.setRequestHeader("content-type", archivo.type || "application/octet-stream");
    x.upload.onprogress = (e) => e.lengthComputable && avance(e.loaded / e.total);
    x.onload = () => (x.status < 300 ? ok() : mal(new Error(`La subida falló (${x.status}).`)));
    x.onerror = () => mal(new Error("Se cortó la conexión mientras subía."));
    x.send(archivo);
  });
}

export function KitsMarca({ inicial }: { inicial: KitVista[] }) {
  const [kits, setKits] = useState(inicial);
  const [listo, setListo] = useState(false);
  const [espera, setEspera] = useState<{ titulo: string; desde: number; avance?: number } | null>(null);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [nuevo, setNuevo] = useState({ nombre: "", color: "#121214", texto: "#ffffff" });
  useEffect(() => setListo(true), []);

  const trabajar = async (titulo: string, fn: (avance: (p: number) => void) => Promise<string>) => {
    setAviso(null);
    const desde = Date.now();
    setEspera({ titulo, desde });
    try {
      setAviso({ tipo: "ok", texto: await fn((p) => setEspera({ titulo, desde, avance: p })) });
    } catch (e) {
      setAviso({ tipo: "error", texto: (e as Error).message });
    } finally {
      setEspera(null);
    }
  };
  const poner = (k: KitVista) => setKits((ks) => (ks.some((x) => x.id === k.id) ? ks.map((x) => (x.id === k.id ? k : x)) : [...ks, k]).sort((a, b) => a.nombre.localeCompare(b.nombre, "es")));

  const crear = () => trabajar("Creando la marca", async () => {
    const { kit } = await enviar<{ kit: KitVista }>("/estudio/video/marcas/nueva", nuevo);
    poner(kit);
    setNuevo({ nombre: "", color: "#121214", texto: "#ffffff" });
    return `Listo: creamos la marca «${kit.nombre}». Ahora súbele el logo y, si tiene, su música.`;
  });
  const cambiar = (k: KitVista, datos: Record<string, unknown>, titulo = "Guardando la marca") => trabajar(titulo, async () => {
    const { kit } = await enviar<{ kit: KitVista }>(`/estudio/video/marcas/${k.id}`, { nombre: k.nombre, color: k.color, texto: k.texto, ...datos });
    poner(kit);
    return `Listo: guardamos «${kit.nombre}».`;
  });
  const subirArchivo = (k: KitVista, tipo: "logo" | "musica", f: File) => trabajar(tipo === "logo" ? "Subiendo el logo" : "Subiendo la música", async (avance) => {
    const { archivo, url } = await enviar<{ archivo: string; url?: string }>(`/estudio/video/marcas/${k.id}/subida`, { tipo, nombre: f.name, bytes: f.size });
    await subir(url ?? `/estudio/video/marcas/${k.id}/archivo/${archivo}`, f, (p) => avance(p * 0.95));
    const { kit } = await enviar<{ kit: KitVista }>(`/estudio/video/marcas/${k.id}`, { nombre: k.nombre, color: k.color, texto: k.texto, [tipo]: archivo, nombreMusica: f.name });
    poner(kit);
    return tipo === "logo" ? "Listo: el logo quedó guardado." : "Listo: la música quedó guardada. Baja sola cuando alguien habla.";
  });

  return (
    <div className="mt-6 grid gap-4">
      {espera && <Espera titulo={espera.titulo} desde={espera.desde} avance={espera.avance} aviso="Espera aquí un momento." />}
      {aviso && (
        <p role={aviso.tipo === "error" ? "alert" : "status"} className={`flex items-start justify-between gap-3 rounded-xl px-4 py-3 text-[14px] ${aviso.tipo === "error" ? "bg-[#fff1ea] text-[#a33a0b]" : "bg-[#e6f6ee] text-[#17714a]"}`}>
          <span>{aviso.texto}</span>
          <button onClick={() => setAviso(null)} className="shrink-0 text-[12px] underline">Cerrar</button>
        </p>
      )}

      {kits.map((k) => (
        <section key={k.id} aria-label={`Marca ${k.nombre}`} className="grid gap-4 rounded-[18px] bg-white p-4 shadow-[0_0_0_1px_rgba(26,24,22,.06)] md:grid-cols-[180px_minmax(0,1fr)] md:p-5">
          {/* Así se ve el cierre del video */}
          <div className="grid aspect-[9/16] w-full max-w-[180px] place-items-center rounded-xl p-4" style={{ background: k.color }} aria-label="Así se ve el cierre">
            {k.logo ? <img src={k.logo} alt={`Logo de ${k.nombre}`} className="max-h-[40%] max-w-[80%] object-contain" /> : <span className="text-center text-[16px] font-semibold" style={{ color: k.texto }}>{k.nombre}</span>}
          </div>
          <div className="grid content-start gap-3">
            <label className="text-[12px] text-suave">Nombre
              <input defaultValue={k.nombre} maxLength={80} onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== k.nombre && void cambiar({ ...k, nombre: e.target.value.trim() }, {})} className={`mt-1 ${campo}`} />
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="flex min-h-11 items-center gap-2 text-[13px]">
                <input type="color" value={k.color} onChange={(e) => poner({ ...k, color: e.target.value })} onBlur={(e) => void cambiar({ ...k, color: e.target.value }, {})} className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent p-0" />
                Color de fondo del cierre
              </label>
              <label className="flex min-h-11 items-center gap-2 text-[13px]">
                <input type="color" value={k.texto} onChange={(e) => poner({ ...k, texto: e.target.value })} onBlur={(e) => void cambiar({ ...k, texto: e.target.value }, {})} className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent p-0" />
                Color del nombre (si no hay logo)
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className={`inline-flex min-h-11 cursor-pointer items-center rounded-full bg-hueso px-4 text-[13px] ${!listo ? "pointer-events-none opacity-40" : ""}`}>
                {k.logo ? "Cambiar logo" : "Subir logo"}
                <input type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void subirArchivo(k, "logo", f); }} />
              </label>
              {k.logo && <button onClick={() => void cambiar(k, { quitar: "logo" }, "Quitando el logo")} className="inline-flex min-h-11 items-center rounded-full px-3 text-[13px] text-medio underline">Quitar logo</button>}
              <span className="text-[12px] text-suave">PNG con fondo transparente, hasta 5 MB.</span>
            </div>
            <div className="grid gap-2">
              {k.musica ? (
                <div className="flex flex-wrap items-center gap-2 text-[13px]">
                  <span>Música: <b className="font-medium">{k.musica.nombre}</b></span>
                  <audio controls preload="none" src={k.musica.url} className="h-9 max-w-full" />
                </div>
              ) : <p className="text-[13px] text-medio">Sin música. Sube una que la marca tenga derecho a usar.</p>}
              <div className="flex flex-wrap items-center gap-2">
                <label className={`inline-flex min-h-11 cursor-pointer items-center rounded-full bg-hueso px-4 text-[13px] ${!listo ? "pointer-events-none opacity-40" : ""}`}>
                  {k.musica ? "Cambiar música" : "Subir música"}
                  <input type="file" accept=".mp3,.m4a,.wav,.aac,audio/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void subirArchivo(k, "musica", f); }} />
                </label>
                {k.musica && <button onClick={() => void cambiar(k, { quitar: "musica" }, "Quitando la música")} className="inline-flex min-h-11 items-center rounded-full px-3 text-[13px] text-medio underline">Quitar música</button>}
                <span className="text-[12px] text-suave">MP3, M4A o WAV, hasta 30 MB.</span>
              </div>
            </div>
          </div>
        </section>
      ))}

      <form onSubmit={(e) => { e.preventDefault(); if (nuevo.nombre.trim()) void crear(); }} className="grid gap-3 rounded-[18px] bg-white p-4 shadow-[0_0_0_1px_rgba(26,24,22,.06)] md:p-5">
        <h2 className="text-[16px] font-medium">Nueva marca</h2>
        <label className="text-[12px] text-suave">Nombre del cliente o la marca
          <input value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} maxLength={80} placeholder="Por ejemplo: Clínica Silva" className={`mt-1 ${campo}`} />
        </label>
        <div className="flex flex-wrap gap-4">
          <label className="flex min-h-11 items-center gap-2 text-[13px]"><input type="color" value={nuevo.color} onChange={(e) => setNuevo({ ...nuevo, color: e.target.value })} className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent p-0" /> Color de fondo del cierre</label>
          <label className="flex min-h-11 items-center gap-2 text-[13px]"><input type="color" value={nuevo.texto} onChange={(e) => setNuevo({ ...nuevo, texto: e.target.value })} className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent p-0" /> Color del nombre</label>
        </div>
        <button disabled={!listo || !nuevo.nombre.trim() || !!espera} className="inline-flex min-h-11 w-fit items-center rounded-full bg-tinta px-5 text-[13px] font-medium text-white disabled:opacity-40">Crear marca</button>
      </form>
    </div>
  );
}
