"use client";

// Arrastrar archivos con vista previa (sistema/31). Va dentro de un <form>: los archivos viajan en el campo «archivos».
import { useEffect, useRef, useState } from "react";

const MB = 1024 * 1024;
const LIMITE = 25 * MB;

/** De un video saca unos cuadros en JPG (sistema/35): así el equipo «ve» el video sin subir megas de más. */
async function cuadrosDeVideo(f: File, cuantos = 6): Promise<File[]> {
  const url = URL.createObjectURL(f);
  try {
    const v = document.createElement("video");
    v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = url;
    await new Promise<void>((ok, mal) => { v.onloadedmetadata = () => ok(); v.onerror = () => mal(new Error("video")); });
    const dur = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 1;
    const lado = 1280;
    const esc = Math.min(1, lado / Math.max(v.videoWidth || lado, v.videoHeight || lado));
    const c = document.createElement("canvas");
    c.width = Math.round((v.videoWidth || 640) * esc);
    c.height = Math.round((v.videoHeight || 360) * esc);
    const ctx = c.getContext("2d")!;
    const base = f.name.replace(/\.[^.]+$/, "");
    const salida: File[] = [];
    for (let i = 0; i < cuantos; i++) {
      v.currentTime = Math.min(dur - 0.05, (dur * (i + 0.5)) / cuantos);
      await new Promise<void>((ok) => { v.onseeked = () => ok(); });
      ctx.drawImage(v, 0, 0, c.width, c.height);
      const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/jpeg", 0.82));
      const seg = Math.round(v.currentTime);
      if (blob) salida.push(new File([blob], `${base}-cuadro-${i + 1}-${Math.floor(seg / 60)}m${String(seg % 60).padStart(2, "0")}s.jpg`, { type: "image/jpeg" }));
    }
    return salida;
  } finally {
    URL.revokeObjectURL(url);
  }
}

type Item = { f: File; estado: "lista" | "subiendo" | "subida" | "error"; progreso: number; clave?: string; error?: string };

/** Sube un archivo directo a la nube con una URL firmada (sin pasar por Vercel), avisando el avance. */
async function subirDirecto(f: File, extra: { proyecto?: string; t?: string }, avance: (p: number) => void): Promise<string> {
  const r = await fetch("/subida", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nombre: f.name, bytes: f.size, ...extra }) });
  const j = (await r.json().catch(() => ({}))) as { clave?: string; url?: string; error?: string };
  if (!r.ok || !j.clave || !j.url) throw new Error(j.error ?? `No se pudo preparar (${r.status}).`);
  await new Promise<void>((ok, mal) => {
    const x = new XMLHttpRequest();
    x.open("PUT", j.url!);
    x.setRequestHeader("content-type", f.type || "application/octet-stream");
    x.upload.onprogress = (e) => e.lengthComputable && avance(e.loaded / e.total);
    x.onload = () => (x.status < 300 ? ok() : mal(new Error(`La nube respondió ${x.status}.`)));
    x.onerror = () => mal(new Error("Se cortó la conexión."));
    x.send(f);
  });
  return j.clave;
}

/**
 * Zona para soltar archivos (sistema/31, /35). En tu máquina viajan con el formulario.
 * En línea (`nube`) cada archivo sube directo a la nube privada apenas lo eliges: hasta 25 MB por archivo,
 * sin el límite de 4,5 MB de Vercel. El formulario no se envía hasta que terminen de subir.
 */
export function ZonaArchivos({ nube = false, proyecto, t, nombre = "archivos", texto = "Logo, fotos o capturas", en = false }: { nube?: boolean; proyecto?: string; t?: string; nombre?: string; texto?: string; en?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const caja = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [encima, setEncima] = useState(false);
  const [vistas, setVistas] = useState<string[]>([]);
  const [convirtiendo, setConvirtiendo] = useState("");
  const [espera, setEspera] = useState(false);
  const boton = useRef<HTMLElement | null>(null);
  const lista = items.map((x) => x.f);
  const subiendo = items.some((x) => x.estado === "subiendo") || !!convirtiendo;

  // Vistas previas de las imágenes (se liberan al cambiar).
  useEffect(() => {
    const urls = lista.map((f) => (f.type.startsWith("image/") ? URL.createObjectURL(f) : ""));
    setVistas(urls);
    return () => urls.forEach((u) => u && URL.revokeObjectURL(u));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // Mientras sube, el formulario espera (no se manda a medias).
  useEffect(() => {
    const form = caja.current?.closest("form");
    if (!form) return;
    const frenar = (e: Event) => { if (subiendo) { e.preventDefault(); e.stopImmediatePropagation(); boton.current = (e as SubmitEvent).submitter; setEspera(true); } };
    form.addEventListener("submit", frenar, true);
    return () => form.removeEventListener("submit", frenar, true);
  }, [subiendo]);
  // Si pidieron enviar mientras subía, se envía solo al terminar.
  useEffect(() => {
    if (subiendo || !espera) return;
    setEspera(false);
    const form = caja.current?.closest("form");
    form?.requestSubmit(boton.current instanceof HTMLButtonElement ? boton.current : undefined);
  }, [subiendo, espera]);

  // En tu máquina los archivos van en el campo del formulario.
  const sincronizar = (xs: Item[]) => {
    if (nube || !input.current) return;
    const dt = new DataTransfer();
    xs.forEach((x) => dt.items.add(x.f));
    input.current.files = dt.files;
  };

  const subir = (x: Item) => {
    subirDirecto(x.f, { proyecto, t }, (p) => setItems((xs) => xs.map((y) => (y === x || y.f === x.f ? { ...y, progreso: p } : y))))
      .then((clave) => setItems((xs) => xs.map((y) => (y.f === x.f ? { ...y, estado: "subida", progreso: 1, clave } : y))))
      .catch((e: Error) => setItems((xs) => xs.map((y) => (y.f === x.f ? { ...y, estado: "error", error: e.message } : y))));
  };

  const poner = async (entrantes: File[]) => {
    // Los videos se vuelven cuadros: el equipo los mira como imágenes.
    const nuevos: File[] = [];
    for (const f of entrantes) {
      if (!f.type.startsWith("video/")) { nuevos.push(f); continue; }
      setConvirtiendo(f.name);
      try { nuevos.push(...(await cuadrosDeVideo(f))); } catch { /* si el navegador no puede leerlo, se omite */ }
    }
    setConvirtiendo("");
    const agregados: Item[] = nuevos.map((f) =>
      f.size > LIMITE ? { f, estado: "error", progreso: 0, error: en ? "Over 25 MB" : "Pasa de 25 MB" } : { f, estado: nube ? "subiendo" : "lista", progreso: 0 });
    const todos = [...items, ...agregados].slice(0, 24);
    setItems(todos);
    sincronizar(todos.filter((x) => x.estado !== "error"));
    if (nube) agregados.filter((x) => x.estado === "subiendo" && todos.includes(x)).forEach(subir);
  };
  const quitar = (i: number) => {
    const todos = items.filter((_, j) => j !== i);
    setItems(todos);
    sincronizar(todos.filter((x) => x.estado !== "error"));
  };
  const total = lista.reduce((s, f) => s + f.size, 0);
  const listos = items.filter((x) => x.estado === "subida" || x.estado === "lista").length;

  return (
    <div ref={caja}>
      {items.filter((x) => x.clave).map((x) => <input key={x.clave} type="hidden" name="subida" value={x.clave} />)}
      <label
        onDragOver={(e) => { e.preventDefault(); setEncima(true); }}
        onDragLeave={() => setEncima(false)}
        onDrop={(e) => { e.preventDefault(); setEncima(false); poner([...e.dataTransfer.files]); }}
        className={`flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-[14px] border-[1.5px] border-dashed p-4 text-center transition focus-within:border-tinta ${encima ? "border-tinta bg-white" : "border-[#d9d2c6] hover:border-tinta hover:bg-white/60"}`}
      >
        <span className="text-[15px]">{texto}</span>
        <span className="text-[13px] text-suave">{en ? "images, PDF or video · drop them here or tap to choose · up to 25 MB each" : "imágenes, PDF o video · arrástralos aquí o toca para elegir · hasta 25 MB cada uno"}</span>
        <input ref={input} type="file" name={nube ? undefined : nombre} multiple accept="image/*,video/*,.pdf,.svg,.txt,.md" className="sr-only" onChange={(e) => { const f = [...(e.target.files ?? [])]; e.target.value = ""; poner(f); }} />
      </label>
      {convirtiendo && <p role="status" className="mt-2 text-[13px] text-medio">{en ? `Taking frames from «${convirtiendo}»…` : `Sacando cuadros de «${convirtiendo}» para que el equipo lo vea…`}</p>}
      {items.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {items.map((x, i) => (
            <li key={x.f.name + i} className="relative overflow-hidden rounded-lg">
              {vistas[i] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={vistas[i]} alt={x.f.name} className={`aspect-square w-full object-cover ${x.estado === "subiendo" ? "opacity-60" : ""}`} />
              ) : (
                <span className="flex aspect-square w-full items-center justify-center bg-[#f4f1eb] p-2 text-center font-mono text-[10px] break-all">{x.f.name}</span>
              )}
              {x.estado === "subiendo" && <span className="absolute inset-x-1.5 bottom-1.5 h-1 overflow-hidden rounded-full bg-white/70"><i className="block h-full bg-tinta transition-[width]" style={{ width: `${Math.max(4, x.progreso * 100)}%` }} /></span>}
              {x.estado === "subida" && <span className="absolute bottom-1.5 left-1.5 rounded-full bg-vivo px-1.5 text-[10px] text-white">✓</span>}
              {x.estado === "error" && <span className="absolute inset-x-0 bottom-0 bg-[#a3260f]/90 px-1.5 py-1 text-[10px] leading-tight text-white" title={x.error}>{x.error}</span>}
              <button type="button" onClick={() => quitar(i)} aria-label={`${en ? "Remove" : "Quitar"} ${x.f.name}`} className="absolute right-1 top-1 h-7 w-7 rounded-full bg-tinta/80 text-[14px] leading-none text-white">×</button>
            </li>
          ))}
        </ul>
      )}
      {items.length > 0 && (
        <p role="status" className={`mt-2 text-[13px] ${espera ? "text-urgente" : "text-suave"}`}>
          {listos} {en ? "file(s) ready" : "archivo(s) listo(s)"} · {(total / MB).toFixed(1)} MB
          {subiendo ? (espera ? (en ? " · it will send itself when the upload finishes" : " · se envía solo apenas termine de subir") : en ? " · uploading…" : " · subiendo…") : ""}
        </p>
      )}
    </div>
  );
}
