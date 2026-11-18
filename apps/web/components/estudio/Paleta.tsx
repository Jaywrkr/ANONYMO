"use client";

// Ctrl K / ⌘ K (sistema/77): escribir para ir a cualquier pantalla, proyecto o acción. Si nada coincide, busca en la biblioteca.
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export interface Destino { grupo: "Acciones" | "Pantallas" | "Proyectos"; titulo: string; detalle?: string; href?: string; evento?: string }

const normal = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const FIJOS: Destino[] = [
  { grupo: "Acciones", titulo: "Nuevo pedido", detalle: "Cuéntale a Atlas", href: "/estudio/nuevo" },
  { grupo: "Acciones", titulo: "Empezar la tanda de hoy", detalle: "WhatsApp a negocios nuevos", href: "/estudio/clientes/tanda" },
  { grupo: "Acciones", titulo: "Buscar más negocios", detalle: "Imán en Google Maps", href: "/estudio/clientes/nuevos" },
  { grupo: "Acciones", titulo: "Pedir un guion", detalle: "Faro, antes de grabar", href: "/estudio/video#guiones" },
  { grupo: "Acciones", titulo: "Subir un video", detalle: "Corte lo edita", href: "/estudio/video#subir" },
  { grupo: "Acciones", titulo: "Hablar con Atlas", evento: "anonymo:atlas" },
  { grupo: "Pantallas", titulo: "Inicio", href: "/estudio" },
  { grupo: "Pantallas", titulo: "Clientes", detalle: "La cartera", href: "/estudio/clientes" },
  { grupo: "Pantallas", titulo: "Clientes nuevos", detalle: "Imán", href: "/estudio/clientes/nuevos" },
  { grupo: "Pantallas", titulo: "Video", href: "/estudio/video" },
  { grupo: "Pantallas", titulo: "Marcas de video", detalle: "Logo, colores y música", href: "/estudio/video/marcas" },
  { grupo: "Pantallas", titulo: "Biblioteca", href: "/estudio/biblioteca" },
  { grupo: "Pantallas", titulo: "La oficina", href: "/estudio/oficina" },
  { grupo: "Pantallas", titulo: "Papelera", href: "/estudio/papelera" },
];

export function Paleta({ proyectos, cerrar }: { proyectos: { id: string; nombre: string }[]; cerrar: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const campo = useRef<HTMLInputElement>(null);
  useEffect(() => campo.current?.focus(), []);

  const lista = useMemo(() => {
    const todos: Destino[] = [...FIJOS, ...proyectos.map((p) => ({ grupo: "Proyectos" as const, titulo: p.nombre, href: `/estudio/${p.id}` }))];
    const n = normal(q.trim());
    const hay = n ? todos.filter((d) => normal(`${d.titulo} ${d.detalle ?? ""}`).includes(n)) : todos;
    // Siempre queda la salida de buscar dentro de lo que hizo el estudio.
    return n ? [...hay, { grupo: "Acciones" as const, titulo: `Buscar «${q.trim()}» en la biblioteca`, href: `/estudio/biblioteca?q=${encodeURIComponent(q.trim())}` }] : hay;
  }, [q, proyectos]);
  useEffect(() => setI(0), [q]);

  function ir(d?: Destino) {
    if (!d) return;
    cerrar();
    if (d.evento) window.dispatchEvent(new CustomEvent(d.evento, { detail: {} }));
    else if (d.href) router.push(d.href);
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-start bg-black/30 px-4 pt-[12vh] backdrop-blur-[2px]" onMouseDown={(e) => { if (e.target === e.currentTarget) cerrar(); }}>
      <div role="dialog" aria-modal="true" aria-label="Ir a" className="mx-auto w-full max-w-lg overflow-hidden rounded-2xl bg-carta shadow-2xl"
        onKeyDown={(e) => {
          if (e.key === "Escape") { e.preventDefault(); cerrar(); }
          else if (e.key === "ArrowDown") { e.preventDefault(); setI((x) => Math.min(lista.length - 1, x + 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setI((x) => Math.max(0, x - 1)); }
          else if (e.key === "Enter") { e.preventDefault(); ir(lista[i]); }
        }}>
        <input ref={campo} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ir a una pantalla, un proyecto o una acción…" aria-label="Ir a"
          role="combobox" aria-expanded="true" aria-controls="paleta-lista" aria-activedescendant={lista[i] ? `paleta-${i}` : undefined}
          className="w-full border-b border-borde bg-transparent px-5 py-4 text-[16px] outline-none" />
        <ul id="paleta-lista" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {lista.map((d, n) => (
            <li key={`${d.grupo}-${d.titulo}`} id={`paleta-${n}`} role="option" aria-selected={n === i}
              onMouseEnter={() => setI(n)} onClick={() => ir(d)}
              className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] ${n === i ? "bg-white shadow-[0_0_0_1px_rgba(26,24,22,.08)]" : ""}`}>
              <span className="w-20 shrink-0 text-[11px] text-suave">{d.grupo}</span>
              <span className="min-w-0 flex-1 truncate">{d.titulo}{d.detalle && <span className="text-suave"> · {d.detalle}</span>}</span>
              {n === i && <kbd className="font-mono text-[11px] text-suave">↵</kbd>}
            </li>
          ))}
        </ul>
        <p className="border-t border-borde px-5 py-2 text-[11px] text-suave">↑ ↓ para elegir · Enter para ir · Esc para cerrar</p>
      </div>
    </div>
  );
}
