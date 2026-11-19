"use client";

// El asistente de demostración de la muestra (sistema/87). El dueño lo prueba como si fuera un cliente: contesta con
// lo que ya se sabe de su negocio y le enseña el aviso que le llegaría cuando alguien quiere una cita.
// Son reglas (packages/pipeline/src/prospectos/asistente-demo.ts): no usa IA, no cuesta y no guarda lo que se escribe.
import { useEffect, useRef, useState } from "react";
import type { ContenidoMuestra } from "@anonymo/pipeline";
import { PREGUNTAS_DEMO, TOPE_DEMO, responderDemo, type RespuestaDemo } from "@anonymo/pipeline/src/prospectos/asistente-demo.ts";

type Linea = { de: "cliente"; texto: string } | ({ de: "asistente" } & Pick<RespuestaDemo, "texto" | "nota" | "aviso" | "enlace">);

/** `alProbar` avisa (una vez) que alguien lo usó. `alQuerer` es el «Quiero esta web» de la muestra. `lugar`: dónde va el botón que lo abre. */
export function Asistente({ c, alProbar, alQuerer, lugar = "fixed bottom-4 right-4" }: { c: ContenidoMuestra; alProbar?: () => void; alQuerer?: () => void; lugar?: string }) {
  const k = c.paleta;
  const [abierto, setAbierto] = useState(false);
  const [lineas, setLineas] = useState<Linea[]>([{ de: "asistente", texto: `Hola, soy el asistente de ${c.nombre}. Contesto a tus clientes a cualquier hora. Pruébame: pregunta como si fueras un cliente.` }]);
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [usadas, setUsadas] = useState(0);
  const lista = useRef<HTMLDivElement>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const abrir = useRef<HTMLButtonElement>(null);
  const tope = usadas >= TOPE_DEMO;

  useEffect(() => { lista.current?.scrollTo({ top: lista.current.scrollHeight, behavior: "smooth" }); }, [lineas, pensando]);
  useEffect(() => {
    if (!abierto) return;
    entrada.current?.focus({ preventScroll: true });
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") cerrar(); };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [abierto]);

  function cerrar() { setAbierto(false); abrir.current?.focus({ preventScroll: true }); }

  function preguntar(pregunta: string) {
    const p = pregunta.trim().slice(0, 200);
    if (!p || pensando || tope) return;
    if (!usadas) alProbar?.();
    setUsadas((n) => n + 1);
    setTexto("");
    setLineas((l) => [...l, { de: "cliente", texto: p }]);
    setPensando(true);
    // Una pausa corta, como quien escribe.
    window.setTimeout(() => {
      const r = responderDemo(c, p);
      setLineas((l) => [...l, { de: "asistente", texto: r.texto, nota: r.nota, aviso: r.aviso, enlace: r.enlace }]);
      setPensando(false);
    }, 650);
  }

  return (
    <>
      {!abierto && (
        <button ref={abrir} type="button" data-asistente-abrir onClick={() => setAbierto(true)} className={`${lugar} z-40 flex min-h-12 items-center gap-2.5 rounded-full py-2 pl-3 pr-5 text-[14px] font-medium shadow-[0_10px_30px_rgba(0,0,0,.28)]`} style={{ background: "#ffffff", color: "#141414" }}>
          <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full" style={{ background: k.acento, color: k.sobreAcento }}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9.5L5 21v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /></svg>
          </span>
          Prueba el asistente
        </button>
      )}
      {abierto && (
        <section role="dialog" aria-label={`Asistente de ${c.nombre}, demostración`} data-asistente className="fixed inset-x-2 bottom-2 z-50 flex max-h-[min(640px,84dvh)] flex-col overflow-hidden rounded-[26px] bg-white text-[#141414] shadow-[0_24px_70px_rgba(0,0,0,.35)] sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-[390px]">
          <header className="flex items-center justify-between gap-3 px-4 py-3" style={{ background: k.acento, color: k.sobreAcento }}>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold leading-tight">Asistente de {c.nombre}</p>
              <p className="text-[12px] leading-tight opacity-85">Demostración. Es un extra opcional de tu web.</p>
            </div>
            <button type="button" onClick={cerrar} aria-label="Cerrar el asistente" className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[22px] leading-none" style={{ boxShadow: `inset 0 0 0 1.5px ${k.sobreAcento}55` }}>×</button>
          </header>

          <div ref={lista} aria-live="polite" className="flex-1 space-y-2.5 overflow-y-auto px-3 py-4">
            {lineas.map((l, i) => l.de === "cliente" ? (
              <p key={i} className="ml-auto w-fit max-w-[84%] whitespace-pre-line rounded-[18px] rounded-br-[6px] px-3.5 py-2.5 text-[15px] leading-snug" style={{ background: k.acento, color: k.sobreAcento }}>{l.texto}</p>
            ) : (
              <div key={i} className="max-w-[90%] space-y-2">
                <p className="w-fit whitespace-pre-line rounded-[18px] rounded-bl-[6px] bg-[#f0f0ee] px-3.5 py-2.5 text-[15px] leading-snug">{l.texto}</p>
                {l.enlace && <a href={l.enlace.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-full px-4 text-[14px] font-medium shadow-[inset_0_0_0_1.5px_#141414]">{l.enlace.texto}</a>}
                {l.aviso && (
                  <div data-aviso className="rounded-[16px] bg-[#e7f8ee] px-3.5 py-3 text-[14px] leading-snug text-[#0d3b22]">
                    <p className="flex items-center gap-2 text-[12px] font-semibold"><span aria-hidden className="h-2 w-2 rounded-full bg-[#25d366]" />Esto te llega a tu WhatsApp</p>
                    <p className="mt-1">{l.aviso}</p>
                  </div>
                )}
                {l.nota && <p className="border-l-2 pl-3 text-[13px] leading-snug text-[#5b5b57]" style={{ borderColor: k.acento }}>{l.nota}</p>}
              </div>
            ))}
            {pensando && <p className="w-fit rounded-[18px] rounded-bl-[6px] bg-[#f0f0ee] px-3.5 py-2.5 text-[15px] text-[#5b5b57]">Escribiendo…</p>}
            {tope && !pensando && (
              <div className="rounded-[16px] bg-[#141414] px-4 py-3.5 text-[14px] leading-snug text-white">
                <p>Hasta aquí la demostración. En tu web contesta sin límite, con lo que tú le enseñes de tu negocio.</p>
                {alQuerer && <button type="button" onClick={alQuerer} className="mt-3 min-h-11 rounded-full bg-[#25d366] px-5 text-[14px] font-medium text-black">Quiero esta web</button>}
              </div>
            )}
          </div>

          {!tope && (
            <div className="border-t border-[#e6e6e2] px-3 pb-3 pt-2.5">
              <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-2.5">
                {PREGUNTAS_DEMO.map((q) => <button key={q} type="button" disabled={pensando} onClick={() => preguntar(q)} className="min-h-11 shrink-0 rounded-full px-3.5 text-[13px] shadow-[inset_0_0_0_1px_#c9c9c4] disabled:opacity-50">{q}</button>)}
              </div>
              <form onSubmit={(e) => { e.preventDefault(); preguntar(texto); }} className="flex items-center gap-2">
                <input ref={entrada} value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={200} aria-label="Escribe una pregunta" placeholder="Escribe como un cliente…" enterKeyHint="send" autoComplete="off"
                  className="min-h-12 min-w-0 flex-1 rounded-full bg-[#f0f0ee] px-4 text-[16px]" />
                <button type="submit" disabled={pensando || !texto.trim()} aria-label="Enviar" className="grid h-12 w-12 shrink-0 place-items-center rounded-full disabled:opacity-40" style={{ background: k.acento, color: k.sobreAcento }}>
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </button>
              </form>
            </div>
          )}
        </section>
      )}
    </>
  );
}
