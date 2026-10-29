"use client";

// Arrastrar archivos con vista previa (sistema/31). Va dentro de un <form>: los archivos viajan en el campo «archivos».
import { useEffect, useRef, useState } from "react";

const MB = 1024 * 1024;

export function ZonaArchivos({ limiteMB, nombre = "archivos", texto = "Arrastra aquí logo, fotos o capturas" }: { limiteMB?: number; nombre?: string; texto?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [lista, setLista] = useState<File[]>([]);
  const [encima, setEncima] = useState(false);
  const [vistas, setVistas] = useState<string[]>([]);

  // Vistas previas de las imágenes (se liberan al cambiar).
  useEffect(() => {
    const urls = lista.map((f) => (f.type.startsWith("image/") ? URL.createObjectURL(f) : ""));
    setVistas(urls);
    return () => urls.forEach((u) => u && URL.revokeObjectURL(u));
  }, [lista]);

  const poner = (nuevos: File[]) => {
    const todos = [...lista, ...nuevos].slice(0, 15);
    const dt = new DataTransfer();
    todos.forEach((f) => dt.items.add(f));
    if (input.current) input.current.files = dt.files;
    setLista(todos);
  };
  const quitar = (i: number) => {
    const todos = lista.filter((_, j) => j !== i);
    const dt = new DataTransfer();
    todos.forEach((f) => dt.items.add(f));
    if (input.current) input.current.files = dt.files;
    setLista(todos);
  };
  const total = lista.reduce((s, f) => s + f.size, 0);
  const pasa = limiteMB !== undefined && total > limiteMB * MB;

  return (
    <div>
      <label
        onDragOver={(e) => { e.preventDefault(); setEncima(true); }}
        onDragLeave={() => setEncima(false)}
        onDrop={(e) => { e.preventDefault(); setEncima(false); poner([...e.dataTransfer.files]); }}
        className={`flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed p-4 text-center transition-colors ${encima ? "border-tinta bg-papel" : "border-linea hover:border-tinta"}`}
      >
        <span className="text-[15px]">{texto}</span>
        <span className="text-[13px] text-gris">o toca para elegir{limiteMB ? ` · hasta ${limiteMB} MB en total` : ""}</span>
        <input ref={input} type="file" name={nombre} multiple accept="image/*,.pdf,.svg,.txt,.md,.docx" className="sr-only" onChange={(e) => { const f = [...(e.target.files ?? [])]; e.target.value = ""; poner(f); }} />
      </label>
      {lista.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {lista.map((f, i) => (
            <li key={f.name + i} className="relative">
              {vistas[i] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={vistas[i]} alt={f.name} className="aspect-square w-full rounded-xl object-cover" />
              ) : (
                <span className="flex aspect-square w-full items-center justify-center rounded-xl bg-papel p-2 text-center font-mono text-[10px] break-all">{f.name}</span>
              )}
              <button type="button" onClick={() => quitar(i)} aria-label={`Quitar ${f.name}`} className="absolute right-1 top-1 h-7 w-7 rounded-full bg-tinta/80 text-[14px] leading-none text-hueso">×</button>
            </li>
          ))}
        </ul>
      )}
      {lista.length > 0 && (
        <p className={`mt-2 text-[13px] ${pasa ? "text-[#8a1c0c]" : "text-gris"}`}>
          {lista.length} archivo(s) · {(total / MB).toFixed(1)} MB{pasa ? ` · pasa de ${limiteMB} MB: quita alguno o súbelos después desde el proyecto` : ""}
        </p>
      )}
    </div>
  );
}
