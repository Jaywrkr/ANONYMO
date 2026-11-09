"use client";

// Subir un video (sistema/62): se elige, sube con su avance a la vista y abre el editor, que empieza a transcribir solo.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Espera } from "./Espera";

const TIPOS = ".mp4,.mov,.m4v,.webm,video/mp4,video/quicktime,video/webm";

/** Sube con avance: a la nube (URL firmada) o al estudio en tu máquina. */
function subir(url: string, archivo: File, avance: (p: number) => void) {
  return new Promise<void>((ok, mal) => {
    const x = new XMLHttpRequest();
    x.open("PUT", url);
    x.setRequestHeader("content-type", archivo.type || "application/octet-stream");
    x.upload.onprogress = (e) => e.lengthComputable && avance(e.loaded / e.total);
    x.onload = () => (x.status < 300 ? ok() : mal(new Error(`La subida falló (${x.status}). Vuelve a intentarlo.`)));
    x.onerror = () => mal(new Error("Se cortó la conexión mientras subía. Vuelve a intentarlo."));
    x.send(archivo);
  });
}

export function SubirVideo({ maxMb }: { maxMb: number }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [listo, setListo] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [cliente, setCliente] = useState("");
  const [encima, setEncima] = useState(false);
  const [subiendo, setSubiendo] = useState<{ desde: number; avance: number; texto: string } | null>(null);
  const [error, setError] = useState("");
  // Hasta que la página está lista, el botón no responde: así nunca hay un clic sin respuesta.
  useEffect(() => setListo(true), []);

  const elegir = (f?: File | null) => {
    setError("");
    if (!f) return;
    if (!/\.(mp4|mov|m4v|webm)$/i.test(f.name)) return setError("Ese archivo no es un video que podamos editar (mp4, mov, m4v o webm).");
    if (f.size > maxMb * 1024 * 1024) return setError(`El video pesa ${Math.round(f.size / 1024 / 1024)} MB; el máximo es ${maxMb} MB.`);
    setArchivo(f);
  };

  async function empezar() {
    if (!archivo || subiendo) return;
    setError("");
    setSubiendo({ desde: Date.now(), avance: 0, texto: "Preparando la subida" });
    try {
      const r = await fetch("/estudio/video/nuevo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nombre: archivo.name, bytes: archivo.size, cliente }) });
      const j = (await r.json().catch(() => ({}))) as { id?: string; url?: string; archivo?: string; error?: string };
      if (!r.ok || !j.id) throw new Error(j.error ?? `No se pudo empezar (${r.status}).`);
      setSubiendo((s) => s && { ...s, texto: "Subiendo el video" });
      await subir(j.url ?? `/estudio/video/${j.id}/archivo/${j.archivo}`, archivo, (p) => setSubiendo((s) => s && { ...s, avance: p * 0.97 }));
      setSubiendo((s) => s && { ...s, avance: 0.98, texto: "Abriendo el editor" });
      const ok = await fetch(`/estudio/video/${j.id}/paso`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ paso: "subido" }) });
      if (!ok.ok) throw new Error(((await ok.json().catch(() => ({}))) as { error?: string }).error ?? "El video subió, pero no se pudo registrar.");
      router.push(`/estudio/video/${j.id}`);
    } catch (e) {
      setSubiendo(null);
      setError((e as Error).message);
    }
  }

  return (
    <div className="mt-6 rounded-[22px] bg-white p-5 shadow-[0_0_0_1px_rgba(26,24,22,.06)] md:p-6">
      <div
        onDragOver={(e) => { e.preventDefault(); setEncima(true); }}
        onDragLeave={() => setEncima(false)}
        onDrop={(e) => { e.preventDefault(); setEncima(false); elegir(e.dataTransfer.files?.[0]); }}
        className={`grid min-h-40 place-items-center rounded-2xl border-2 border-dashed p-6 text-center transition ${encima ? "border-tinta bg-hueso" : "border-borde"}`}
      >
        <div>
          <p className="text-[16px] font-medium">{archivo ? archivo.name : "Suelta aquí el video"}</p>
          <p className="mt-1 text-[13px] text-suave">{archivo ? `${Math.round(archivo.size / 1024 / 1024)} MB` : `mp4, mov o webm · hasta ${maxMb} MB · personas hablando a cámara`}</p>
          <button type="button" disabled={!listo} onClick={() => input.current?.click()} className="mt-3 inline-flex min-h-11 items-center rounded-full bg-hueso px-5 text-[13px] font-medium disabled:opacity-40">
            {archivo ? "Elegir otro" : "Elegir video"}
          </button>
          <input ref={input} type="file" accept={TIPOS} className="sr-only" onChange={(e) => elegir(e.target.files?.[0])} />
        </div>
      </div>
      <label className="mt-4 block text-[12px] text-suave">
        Cliente o marca (opcional)
        <input value={cliente} onChange={(e) => setCliente(e.target.value)} maxLength={80} placeholder="Por ejemplo: Clínica Silva" className="mt-1 w-full rounded-xl bg-white px-3.5 py-3 text-[15px] text-tinta shadow-[inset_0_0_0_1px_var(--color-borde)] outline-none focus:shadow-[inset_0_0_0_1.5px_var(--color-tinta)]" />
      </label>
      {error && <p role="alert" className="mt-3 rounded-xl bg-[#fff1ea] px-3 py-2 text-[14px] text-[#a33a0b]">{error}</p>}
      <button type="button" disabled={!listo || !archivo || !!subiendo} onClick={empezar} className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-tinta px-6 text-[14px] font-medium text-white transition hover:bg-black disabled:opacity-40 md:w-auto">
        {!listo ? "Cargando…" : subiendo ? "Subiendo…" : "Subir y transcribir"}
      </button>
      <p className="mt-2 text-[12px] text-suave">Después de subir, el video se transcribe solo y se quitan las pausas largas. Nada se publica.</p>
      {subiendo && <Espera titulo="Subiendo el video" texto={subiendo.texto} avance={subiendo.avance} desde={subiendo.desde} aviso="No cierres esta pestaña hasta que termine de subir." />}
    </div>
  );
}
