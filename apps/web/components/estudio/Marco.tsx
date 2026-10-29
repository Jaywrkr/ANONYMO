"use client";

// El marco del estudio (sistema/32): como Arc, la barra vive sobre un fondo de color y el contenido flota en una tarjeta.
// Cada proyecto es un espacio: al entrar, el marco toma su color. Ctrl/⌘ K lleva a la caja de Atlas desde cualquier lado.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { caraSvg } from "@/lib/caras";
import { MARCO_TODO } from "@/lib/espacio";
import { salir } from "@/app/entrar/acciones";
import { Version } from "./Version";

const ATAJOS: [string, string][] = [["Ctrl K", "Buscar en la biblioteca"], ["N", "Nuevo pedido"], ["I", "Inicio"], ["B", "Biblioteca"], ["O", "La oficina"], ["?", "Ver estos atajos"], ["Esc", "Cerrar"]];

function Ayuda({ cerrar }: { cerrar: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-label="Atajos de teclado" className="fixed inset-0 z-[75] grid place-items-center bg-tinta/25 p-4 backdrop-blur-[3px]" onClick={cerrar}>
      <div className="aparece w-[min(380px,100%)] rounded-[22px] bg-carta p-6 shadow-[0_30px_80px_-20px_rgba(20,15,10,.45)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={caraSvg("vector")} alt="" width={36} height={39} className="flota" />
          <p className="font-serif text-[28px] leading-none">Atajos</p>
          <button type="button" onClick={cerrar} className="ml-auto h-10 w-10 rounded-full bg-[#f1ede6] text-lg" aria-label="Cerrar">×</button>
        </div>
        <p className="mt-2 text-[13px] text-medio">Vector dice: «Bonito y rápido, o no sale».</p>
        <ul className="mt-4 grid gap-1.5">
          {ATAJOS.map(([k, t]) => (
            <li key={k} className="flex items-center justify-between gap-3 text-[14px]">
              <span>{t}</span>
              <kbd className="min-w-8 rounded-md bg-white px-2 py-1 text-center font-mono text-[12px] shadow-[0_0_0_1px_rgba(26,24,22,.1),0_1px_0_rgba(26,24,22,.15)]">{k}</kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export interface EspacioBarra {
  id: string;
  nombre: string;
  punto: string;
  marco: string;
  /** Agentes que están en algo ahora (trabajando o esperando revisión). */
  caras: string[];
  /** "toca": espera una decisión · "vivo": el equipo trabaja · "": nada urgente. */
  senal: "toca" | "vivo" | "parado" | "listo" | "";
}

export interface AvisoCampana { href: string; titulo: string; detalle: string; punto: string }

interface Props {
  yo: "jay" | "luna";
  avisos: AvisoCampana[];
  conSalir: boolean;
  espacios: EspacioBarra[];
  tetoca: number;
  papelera: number;
  children: React.ReactNode;
}

const fila = (activo: boolean) =>
  `flex min-h-10 items-center gap-2.5 rounded-[10px] px-2.5 text-[13.5px] transition ${activo ? "bg-white/80 font-medium shadow-[0_1px_2px_rgba(26,24,22,.06),inset_0_0_0_1px_rgba(255,255,255,.9)]" : "hover:bg-white/40"}`;

function Icono({ d }: { d: string }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>;
}

const I = {
  todo: "M4 5h7v7H4zM13 5h7v4h-7zM13 11h7v8h-7zM4 14h7v5H4z",
  toca: "M12 3v10M12 17v.5M5 21h14",
  oficina: "M3 10.5 12 4l9 6.5V20H3zM9 20v-6h6v6",
  nuevo: "M12 5v14M5 12h14",
  metricas: "M4 19V9M10 19V5M16 19v-7M21 19H3",
  papelera: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
  web: "M7 17 17 7M9 7h8v8",
  buscar: "M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM20 20l-3.5-3.5",
  biblioteca: "M4 4h4v16H4zM10 4h4v16h-4zM16 5l4 1-3 14-4-1z",
};

/** La campana: lo que espera una decisión, sin sacarte de donde estás. */
function Campana({ avisos, alIr }: { avisos: AvisoCampana[]; alIr?: () => void }) {
  const [abierta, setAbierta] = useState(false);
  const ruta = usePathname();
  useEffect(() => setAbierta(false), [ruta]);
  return (
    <div className="relative">
      <button type="button" onClick={() => setAbierta((x) => !x)} aria-expanded={abierta} aria-label={`Pendientes: ${avisos.length}`}
        className={`relative flex h-9 w-9 items-center justify-center rounded-full transition ${abierta ? "bg-white" : "hover:bg-white/50"}`}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={avisos.length ? "campana" : ""}><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4" /></svg>
        {avisos.length > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-urgente px-1 text-[10px] font-medium text-white">{avisos.length}</span>}
      </button>
      {abierta && (
        <>
          <button type="button" aria-label="Cerrar" className="fixed inset-0 z-40 cursor-default" onClick={() => setAbierta(false)} />
          <div className="aparece absolute right-0 top-11 z-50 w-[min(340px,calc(100vw-32px))] lg:left-0 lg:right-auto overflow-hidden rounded-[18px] bg-carta shadow-[0_0_0_1px_rgba(26,24,22,.07),0_24px_60px_-18px_rgba(20,15,10,.45)]">
            <p className="border-b border-borde px-4 py-3 text-[13px] font-medium">Pendientes {avisos.length ? `· ${avisos.length}` : ""}</p>
            {avisos.length === 0 ? <p className="px-4 py-5 text-[14px] text-medio">Nada pendiente. Estás al día.</p> : (
              <ul className="max-h-[60vh] overflow-y-auto">
                {avisos.map((a, i) => (
                  <li key={i}>
                    <Link href={a.href} onClick={() => { setAbierta(false); alIr?.(); }} className="flex gap-3 px-4 py-3 transition hover:bg-white">
                      <i className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: a.punto }} />
                      <span className="min-w-0"><span className="block truncate text-[14px] font-medium">{a.titulo}</span><span className="line-clamp-2 text-[12px] text-medio">{a.detalle}</span></span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Barra({ yo, conSalir, espacios, tetoca, papelera, activo, ruta, alIr, avisos }: Omit<Props, "children"> & { activo?: EspacioBarra; ruta: string; alIr?: () => void }) {
  const enInicio = ruta === "/estudio";
  return (
    <nav aria-label="Estudio" className="flex h-full flex-col gap-5 text-tinta">
      <div className="flex items-center gap-2 pl-2.5 pt-0.5">
        <Link href="/estudio" onClick={alIr} className="font-display text-[24px] uppercase leading-none tracking-[0.01em]">Anonymo*</Link>
        <span className="text-[11px] text-tinta/50">estudio</span>
        <span className="ml-auto"><Campana avisos={avisos} alIr={alIr} /></span>
      </div>

      <Link href="/estudio/nuevo" onClick={alIr} className="flex min-h-11 items-center justify-center gap-2 rounded-[12px] bg-tinta px-3 text-[14px] font-medium text-white shadow-[0_8px_20px_-10px_rgba(20,15,10,.6)] transition hover:bg-black">
        <Icono d={I.nuevo} /> Nuevo pedido <kbd className="ml-1 font-mono text-[10px] text-white/50">N</kbd>
      </Link>

      <div className="grid gap-0.5">
        <Link href="/estudio" onClick={alIr} className={fila(enInicio)} aria-current={enInicio ? "page" : undefined}>
          <Icono d={I.todo} /> Inicio
          {tetoca > 0 && <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-urgente px-1.5 text-[11px] font-medium text-white" title="Cosas que esperan tu decisión">{tetoca}</span>}
        </Link>
        <Link href="/estudio/biblioteca" onClick={alIr} className={fila(ruta === "/estudio/biblioteca")} aria-current={ruta === "/estudio/biblioteca" ? "page" : undefined}><Icono d={I.biblioteca} /> Biblioteca <kbd className="ml-auto font-mono text-[10px] text-tinta/45">Ctrl K</kbd></Link>
        <Link href="/estudio/oficina" onClick={alIr} className={fila(ruta === "/estudio/oficina")} aria-current={ruta === "/estudio/oficina" ? "page" : undefined}><Icono d={I.oficina} /> La oficina <span className="ml-auto font-mono text-[11px] text-tinta/45">22</span></Link>
      </div>

      <div className="grid min-h-0 gap-0.5">
        <p className="px-2.5 pb-1 text-[11px] text-tinta/50">Proyectos · {espacios.length}</p>
        <div className="grid max-h-[46vh] min-w-0 grid-cols-[minmax(0,1fr)] gap-0.5 overflow-y-auto overflow-x-hidden pr-0.5">
          {espacios.length === 0 && <p className="px-2.5 text-[13px] text-tinta/55">Cada proyecto aparece aquí con su color. Empieza con «Nuevo pedido».</p>}
          {espacios.map((e) => (
            <Link key={e.id} href={`/estudio/${e.id}`} onClick={alIr} className={`${fila(activo?.id === e.id)} min-w-0`} aria-current={activo?.id === e.id ? "page" : undefined}>
              <i aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: e.punto }} />
              <span className="min-w-0 flex-1 truncate">{e.nombre}</span>
              {e.caras.length > 0 && (
                <span className="flex shrink-0" aria-hidden>
                  {e.caras.slice(0, 3).map((c, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={c} src={caraSvg(c)} alt="" width={17} height={18} className={i ? "-ml-[5px]" : ""} />
                  ))}
                </span>
              )}
              {e.senal === "toca" && <i className="h-2 w-2 shrink-0 rounded-full bg-urgente" title="Espera una decisión" />}
              {e.senal === "vivo" && <i className="late h-2 w-2 shrink-0 rounded-full bg-vivo" title="El equipo está trabajando" />}
              <span className="sr-only">{e.senal === "toca" ? "Espera tu decisión" : e.senal === "vivo" ? "El equipo está trabajando" : ""}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-auto grid gap-0.5">
        <Link href="/estudio/analitica" onClick={alIr} className={fila(ruta === "/estudio/analitica")}><Icono d={I.metricas} /> Métricas de la web</Link>
        <Link href="/estudio/papelera" onClick={alIr} className={fila(ruta === "/estudio/papelera")}><Icono d={I.papelera} /> Papelera {papelera > 0 && <span className="ml-auto font-mono text-[11px] text-tinta/45">{papelera}</span>}</Link>
        <a href="/" target="_blank" rel="noreferrer" className={fila(false)}><Icono d={I.web} /> Ver la web</a>
        <div className="mt-2 flex items-center gap-2 px-2.5">
          <span className="flex">
            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] shadow-[0_0_0_2px_rgba(255,255,255,.8)] ${yo === "jay" ? "bg-tinta text-white" : "bg-white text-tinta"}`}>J</span>
            <span className={`-ml-2 flex h-7 w-7 items-center justify-center rounded-full text-[12px] shadow-[0_0_0_2px_rgba(255,255,255,.8)] ${yo === "luna" ? "bg-[#ff6fb1] text-tinta" : "bg-white text-tinta"}`}>L</span>
          </span>
          <span className="text-[13px]">{yo === "luna" ? "Luna" : "Jay"}</span>
          {conSalir && (
            <form action={salir} className="ml-auto">
              <button className="min-h-9 rounded-full px-3 text-[12px] text-tinta/60 transition hover:bg-white/50 hover:text-tinta">Salir</button>
            </form>
          )}
        </div>
      </div>
    </nav>
  );
}

export function Marco({ children, ...props }: Props) {
  const ruta = usePathname() ?? "/estudio";
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const idRuta = ruta.split("/")[2];
  const activo = props.espacios.find((e) => e.id === idRuta);

  // Atajos: Ctrl/⌘ K busca; sin estar escribiendo: N nuevo pedido, I inicio, B biblioteca, O oficina, ? la ayuda.
  const [ayuda, setAyuda] = useState(false);
  useEffect(() => {
    const ir: Record<string, string> = { n: "/estudio/nuevo", i: "/estudio", b: "/estudio/biblioteca", o: "/estudio/oficina" };
    const f = (e: KeyboardEvent) => {
      const escribiendo = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement)?.tagName) || (e.target as HTMLElement)?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const c = document.getElementById("buscar") as HTMLInputElement | null;
        if (c) { c.focus(); c.select?.(); } else router.push("/estudio/biblioteca?buscar=1");
        return;
      }
      if (escribiendo || e.metaKey || e.ctrlKey || e.altKey || document.querySelector("dialog[open]")) return;
      if (e.key === "Escape") { setAyuda(false); return; }
      if (e.key === "?") { setAyuda((x) => !x); return; }
      const destino = ir[e.key.toLowerCase()];
      if (destino) { setAyuda(false); router.push(destino); }
    };
    addEventListener("keydown", f);
    return () => removeEventListener("keydown", f);
  }, [router]);

  useEffect(() => setAbierto(false), [ruta]);

  return (
    <div className="estudio-marco flex min-h-dvh gap-2 p-2" style={{ background: activo?.marco ?? MARCO_TODO }}>
      <aside className="sticky top-2 hidden h-[calc(100dvh-16px)] w-[236px] shrink-0 py-2 lg:block">
        <Barra {...props} activo={activo} ruta={ruta} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {/* En pantallas chicas la barra se vuelve una línea arriba con un menú. */}
        <div className="flex items-center gap-3 px-2 pt-1 lg:hidden">
          <Link href="/estudio" className="font-display text-[22px] uppercase leading-none">Anonymo*</Link>
          {activo && <span className="flex min-w-0 items-center gap-1.5 text-[13px]"><i className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: activo.punto }} /><span className="truncate">{activo.nombre}</span></span>}
          <span className="ml-auto"><Campana avisos={props.avisos} /></span>
          <button type="button" onClick={() => setAbierto(true)} aria-expanded={abierto} aria-controls="menu-estudio" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/60 px-4 text-[13px]">
            Menú {props.tetoca > 0 && <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-urgente px-1.5 text-[11px] text-white">{props.tetoca}</span>}
          </button>
        </div>
        {abierto && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú del estudio">
            <button type="button" aria-label="Cerrar menú" onClick={() => setAbierto(false)} className="absolute inset-0 bg-tinta/30 backdrop-blur-sm" />
            <div id="menu-estudio" className="absolute inset-y-2 left-2 w-[min(300px,calc(100%-16px))] overflow-y-auto rounded-[18px] p-3" style={{ background: activo?.marco ?? MARCO_TODO }}>
              <Barra {...props} activo={activo} ruta={ruta} alIr={() => setAbierto(false)} />
            </div>
          </div>
        )}

        {ayuda && <Ayuda cerrar={() => setAyuda(false)} />}
        <div className="pointer-events-none fixed bottom-2.5 right-4 z-40 flex items-center gap-3">
          <button type="button" onClick={() => setAyuda(true)} className="pointer-events-auto hidden h-6 w-6 items-center justify-center rounded-full bg-white/70 font-mono text-[11px] text-tinta/60 shadow-[0_0_0_1px_rgba(26,24,22,.08)] hover:text-tinta lg:inline-flex" aria-label="Atajos de teclado">?</button>
          <Version className="rounded-full bg-white/70 px-2.5 py-1 shadow-[0_0_0_1px_rgba(26,24,22,.06)] backdrop-blur" />
        </div>
        <main id="principal" className="min-h-[calc(100dvh-16px)] min-w-0 flex-1 rounded-[18px] bg-carta shadow-[0_0_0_1px_rgba(26,24,22,.05),0_24px_60px_-24px_rgba(60,40,20,.25)]">
          {children}
        </main>
      </div>
    </div>
  );
}
