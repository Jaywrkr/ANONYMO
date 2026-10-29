"use client";

// La caja donde Jay o Luna le cuentan el pedido a Atlas (sistema/31): atajos de un toque, enlaces detectados
// y una guía de lo que suele faltar. Todo termina en el mismo texto que lee Atlas.
import { useMemo, useRef, useState } from "react";

const ATAJOS: { grupo: string; frases: string[] }[] = [
  { grupo: "Qué pide", frases: ["Necesita una web.", "Necesita logo e identidad.", "Necesita un nombre.", "Es un evento o lanzamiento.", "Quiere contenido para redes."] },
  { grupo: "Lo que ya tiene", frases: ["Ya tiene logo y colores.", "Ya tiene nombre.", "Tiene fotos propias.", "Los textos los pone el cliente.", "Los textos los escribimos nosotros."] },
  { grupo: "Cómo lo quiere", frases: ["Elegante y minimalista.", "Moderna, nivel premio.", "En español e inglés.", "Con reservas o agenda en línea.", "Con animaciones sutiles."] },
];

// Lo que Atlas casi siempre pregunta: si ya está en el texto, se marca.
const PISTAS: { nombre: string; patron: RegExp }[] = [
  { nombre: "Qué hace el cliente", patron: /\b(es|son|tiene|vende|clínica|consultorio|restaurante|tienda|estudio|marca|empresa|odontólog|abogad|hotel|café)\b/i },
  { nombre: "Qué quiere", patron: /\b(web|página|logo|marca|nombre|evento|lanzamiento|redes|video|fotos)\b/i },
  { nombre: "Público", patron: /\b(público|clientes|pacientes|mujeres|hombres|jóvenes|familias|turistas|extranjeros|años)\b/i },
  { nombre: "Estilo", patron: /\b(elegante|minimal|moderno|moderna|clásic|divertid|serio|premium|lujo|colorid|sobri)\w*/i },
  { nombre: "Plazo", patron: /\b(semana|mes|días|diciembre|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|urgente|para el)\b/i },
  { nombre: "Presupuesto", patron: /(\$|usd|dólares|presupuesto|\b\d{3,5}\b)/i },
];

export function Contar() {
  const [texto, setTexto] = useState("");
  const caja = useRef<HTMLTextAreaElement>(null);
  const enlaces = useMemo(() => [...new Set(texto.match(/https?:\/\/[^\s)>\]]+/g) ?? [])], [texto]);
  const palabras = texto.trim() ? texto.trim().split(/\s+/).length : 0;

  const agregar = (frase: string) => {
    const nuevo = texto.trim() ? `${texto.trim()} ${frase}` : frase;
    setTexto(nuevo);
    requestAnimationFrame(() => { caja.current?.focus(); caja.current?.setSelectionRange(nuevo.length, nuevo.length); });
  };

  return (
    <div className="grid gap-4">
      <label className="grid gap-2">
        <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-gris">Lo que hablaron</span>
        <textarea
          ref={caja}
          name="texto"
          required
          minLength={20}
          rows={10}
          autoFocus
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="w-full rounded-2xl border border-linea bg-papel p-4 text-[17px] leading-relaxed outline-none focus:border-tinta"
          placeholder="Ej.: Gabriela es odontóloga estética en Cuenca. Quiere una web para su consultorio, mucho más elegante que la de su competencia. Ya tiene logo. Pacientes de 30 a 50. Le gusta https://… Lo necesita antes de diciembre, unos 2.000 de presupuesto."
        />
      </label>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]" aria-label="Lo que Atlas suele necesitar">
        {PISTAS.map((p) => {
          const hay = p.patron.test(texto);
          return (
            <span key={p.nombre} className={hay ? "text-tinta" : "text-gris"}>
              <span aria-hidden>{hay ? "● " : "○ "}</span>{p.nombre}
            </span>
          );
        })}
        <span className="ml-auto text-gris">{palabras} palabras</span>
      </div>

      <div className="grid gap-3">
        {ATAJOS.map((g) => (
          <div key={g.grupo}>
            <p className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-gris">{g.grupo} · toca para agregar</p>
            <div className="flex flex-wrap gap-2">
              {g.frases.map((f) => {
                const puesta = texto.includes(f);
                return (
                  <button
                    key={f}
                    type="button"
                    disabled={puesta}
                    onClick={() => agregar(f)}
                    className={`min-h-9 rounded-full border px-3 text-[14px] transition-colors ${puesta ? "border-tinta bg-tinta text-hueso" : "border-linea hover:border-tinta"}`}
                  >
                    {puesta ? "✓ " : "+ "}{f.replace(/\.$/, "")}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {enlaces.length > 0 && (
        <div>
          <p className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-gris">Enlaces que van a abrir los agentes · {enlaces.length}</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {enlaces.map((u) => {
              let dominio = u;
              let ruta = "";
              try { const x = new URL(u); dominio = x.hostname.replace(/^www\./, ""); ruta = x.pathname === "/" ? "" : x.pathname; } catch {}
              return (
                <li key={u}>
                  <a href={u} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl border border-linea p-3 hover:border-tinta">
                    <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tinta font-mono text-[13px] uppercase text-hueso">{dominio[0]}</span>
                    <span className="min-w-0"><span className="block truncate text-[14px] font-medium">{dominio}</span><span className="block truncate text-[12px] text-gris">{ruta || "página principal"}</span></span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
