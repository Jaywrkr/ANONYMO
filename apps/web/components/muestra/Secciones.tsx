// Las secciones que completan cada muestra (sistema/87): cómo se agenda, lo que dicen los clientes, las fotos y las
// preguntas de siempre. Son las mismas en las cinco plantillas; cada una las viste con su letra, sus esquinas y sus colores.
import type { CSSProperties } from "react";
import type { ContenidoMuestra } from "@anonymo/pipeline";
import { OPINIONES, PASOS, PREGUNTAS, type Paleta } from "./estilos";
import { Cielo, Cuenta, Estrella, nota } from "./Cielo";

/** Cómo viste una plantilla las secciones compartidas. */
export interface Tema {
  k: Paleta;
  /** La letra de los titulares. */
  titular: CSSProperties;
  /** Tamaño y peso de un título de sección. */
  h2: string;
  /** Tamaño y peso de un título chico, dentro de una tarjeta. */
  h3: string;
  /** Las esquinas de las tarjetas («» = rectas). */
  radio: string;
  /** Fondo y texto de una tarjeta. */
  tarjeta: CSSProperties;
  /** El peso de los números grandes («font-extrabold», o «» si la letra ya trae el suyo). */
  peso: string;
  /** El color que marca: números, estrellas, puntos. Tiene que leerse sobre la tarjeta. */
  marca: string;
  /** Texto secundario, sobre la tarjeta y sobre el fondo de la sección. */
  apagado: string;
  linea: string;
}

type Props = { c: ContenidoMuestra; t: Tema; className?: string; style?: CSSProperties };
const n = (i: number) => ({ ["--n" as string]: i });

/** «Así de fácil»: tres pasos para llegar al negocio. */
export function Pasos({ c, t, className = "", style }: Props) {
  return (
    <section aria-label="Cómo funciona" className={className} style={style}>
      <h2 data-aparece style={t.titular} className={t.h2}>Así de fácil</h2>
      <ol className="mt-8 grid gap-2.5 md:mt-12 md:grid-cols-3 md:gap-4">
        {PASOS[c.tono].map(([titulo, texto], i) => (
          <li key={titulo} data-aparece style={{ ...t.tarjeta, ...n(i) }} className={`muestra-tarjeta flex min-h-[200px] flex-col justify-between p-6 md:min-h-[280px] md:p-8 ${t.radio}`}>
            <span aria-hidden style={{ ...t.titular, color: t.marca }} className={`text-[64px] leading-[.8] tracking-[-0.05em] md:text-[88px] ${t.peso}`}>{i + 1}</span>
            <div className="mt-8">
              <p style={t.titular} className={t.h3}>{titulo}</p>
              <p className="mt-2 text-[15px] leading-relaxed" style={{ color: t.apagado }}>{texto}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Lo que dicen los clientes: su nota real de Google en grande y tres reseñas de ejemplo, dichas como tales. */
export function Opiniones({ c, t, className = "", style }: Props) {
  return (
    <section aria-label="Lo que dicen" className={className} style={style}>
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
        <h2 data-aparece style={t.titular} className={t.h2}>Lo que dicen</h2>
        {c.estrellas ? (
          <p data-aparece className="flex items-center gap-3">
            <span style={t.titular} className={`text-[56px] leading-none tracking-[-0.04em] md:text-[72px] ${t.peso}`}><Cuenta valor={c.estrellas} decimales={1} /></span>
            <span className="text-[13px] leading-snug" style={{ color: t.apagado }}>
              <span className="flex gap-0.5">{[0, 1, 2, 3, 4].map((i) => <Estrella key={i} className="h-4 w-4" color={t.marca} />)}</span>
              <span className="mt-1 block"><Cuenta valor={c.resenas} /> reseñas en Google</span>
            </span>
          </p>
        ) : null}
      </div>
      {/* En celular se deslizan con el dedo; en pantalla grande van las tres juntas. */}
      <div className="mt-8 flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-2 md:mt-12 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:pb-0">
        {OPINIONES[c.tono].map(([texto, quien], i) => (
          <figure key={quien} data-aparece="escala" style={{ ...t.tarjeta, ...n(i) }} className={`muestra-tarjeta m-0 flex min-h-[250px] w-[80%] shrink-0 snap-center flex-col justify-between p-6 md:min-h-[300px] md:w-auto md:p-8 ${t.radio}`}>
            <span className="flex gap-0.5">{[0, 1, 2, 3, 4].map((e) => <Estrella key={e} className="h-4 w-4" color={t.marca} />)}</span>
            <blockquote style={t.titular} className="m-0 mt-6 text-[23px] leading-[1.14] tracking-[-0.015em] md:text-[27px]">«{texto}»</blockquote>
            <figcaption className="mt-6 flex items-center justify-between gap-3 text-[14px]">
              <span>{quien}</span>
              <span className="rounded-full px-2.5 py-1 text-[11px]" style={{ boxShadow: `inset 0 0 0 1px ${t.linea}`, color: t.apagado }}>Ejemplo</span>
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="mt-4 text-[13px]" style={{ color: t.apagado }}>Estas reseñas son de ejemplo. En tu web van las de verdad, traídas de Google.</p>
    </section>
  );
}

/** Las fotos del negocio. Mientras no las sube, dos espacios de color dicen qué foto va en cada lugar. */
export function Fotos({ c, t, fotos, className = "", style }: Props & { fotos: string[] }) {
  const resto = fotos.slice(1);
  return (
    <section aria-label="Fotos" className={`grid gap-2.5 md:gap-4 ${resto.length ? "sm:grid-cols-2" : "grid-cols-2"} ${className}`} style={style}>
      {resto.length
        // eslint-disable-next-line @next/next/no-img-element
        ? resto.map((f, i) => <figure key={f} data-aparece="corta" style={n(i)} className={`m-0 aspect-[4/3] overflow-hidden ${t.radio} ${resto.length === 1 ? "sm:col-span-2 sm:aspect-[21/9]" : ""}`}><img src={f} alt={c.nombre} data-foto loading="lazy" className="h-full w-full object-cover" /></figure>)
        : ["tu equipo", "tu trabajo"].map((que, i) => (
          <figure key={que} data-aparece="corta" style={n(i)} className={`relative m-0 overflow-hidden ${t.radio}`}>
            <Cielo colores={i ? [t.k.cielo[2], t.k.cielo[1], t.k.cielo[0]] : t.k.cielo} alt="" className="aspect-[4/5] sm:aspect-[4/3]" />
            <figcaption className="absolute bottom-2.5 left-2.5 rounded-full px-3 py-1.5 text-[12px] font-medium sm:bottom-3 sm:left-3 sm:px-3.5 sm:py-2 sm:text-[13px]" style={{ background: t.k.fondo, color: t.k.tinta }}>La foto de {que}</figcaption>
          </figure>
        ))}
    </section>
  );
}

/** Preguntas frecuentes: se abren al tocar. */
export function Preguntas({ c, t, className = "", style }: Props) {
  const lista = PREGUNTAS[c.tono];
  return (
    <section aria-label="Preguntas frecuentes" className={`grid gap-8 md:grid-cols-[1fr_1.5fr] md:gap-16 ${className}`} style={style}>
      <div data-aparece>
        <h2 style={t.titular} className={t.h2}>Preguntas frecuentes</h2>
        <p className="mt-4 max-w-sm text-[16px] leading-relaxed" style={{ color: t.apagado }}>¿Tienes otra duda? Escríbenos y te respondemos hoy.</p>
      </div>
      <div>
        {lista.map(([pregunta, respuesta], i) => (
          <details key={pregunta} data-aparece className="muestra-fila" style={{ borderTop: `1px solid ${t.linea}`, borderBottom: i === lista.length - 1 ? `1px solid ${t.linea}` : undefined, ...n(i) }}>
            <summary className="flex min-h-[68px] items-center justify-between gap-4 py-3">
              <span style={t.titular} className={t.h3}>{pregunta}</span>
              <span aria-hidden className="muestra-mas grid h-9 w-9 shrink-0 place-items-center rounded-full text-[22px] leading-none" style={{ boxShadow: `inset 0 0 0 1px ${t.linea}` }}>+</span>
            </summary>
            <p className="max-w-lg pb-6 text-[16px] leading-relaxed" style={{ color: t.apagado }}>{respuesta.replace("la ciudad", c.ciudad)}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
