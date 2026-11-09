// El editor del departamento de video (sistema/62, por partes desde sistema/64): del análisis del audio y del
// JSON de edición salen los cortes y los tramos que quedan. Todo es cálculo puro: la vista previa del navegador
// y el render final usan exactamente lo mismo.
import { EDICION_INICIAL, type Analisis, type Corte, type Edicion, type MotivoCorte, type TramoVideo } from "./tipos.ts";

/** Respiro que se deja antes y después de cada parte al cortar un silencio (segundos). */
export const MARGEN = 0.12;
/** Lo mínimo que vale la pena cortar o conservar: menos que esto se siente como un salto. */
const MINIMO = 0.08;
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Los tramos del original que se quitan, ordenados y sin cruzarse. */
export function calcularCortes(an: Analisis | undefined, ed: Edicion, duracion: number): Corte[] {
  const partes = an?.partes ?? [];
  if (!partes.length || !(duracion > 0)) return [];
  const quitadas = new Set(ed.quitadas);
  const todas = partes.map((p, i) => ({ p, i, fuera: quitadas.has(i) }));
  const vivas = todas.filter((x) => !x.fuera);
  // Si se quita todo, no se corta nada: un video vacío no sirve a nadie.
  if (!vivas.length) return [];
  const cortes: Corte[] = [];
  const poner = (inicio: number, fin: number, motivo: MotivoCorte) => {
    const a = Math.max(0, inicio), b = Math.min(duracion, fin);
    if (b - a >= MINIMO) cortes.push({ inicio: r3(a), fin: r3(b), motivo });
  };
  const primera = vivas[0].p, ultima = vivas[vivas.length - 1].p;
  // Antes de la primera parte y después de la última.
  const antes = todas.slice(0, vivas[0].i).some((x) => x.fuera);
  if (antes || (ed.silencios && primera.inicio > ed.pausaMax)) poner(0, primera.inicio - MARGEN, antes ? "parte" : "inicio");
  for (let k = 0; k + 1 < vivas.length; k++) {
    const a = vivas[k], b = vivas[k + 1];
    const enMedio = todas.slice(a.i + 1, b.i).some((x) => x.fuera);
    const hueco = b.p.inicio - a.p.fin;
    if (enMedio) {
      // Una parte quitada: se corta pegado, dejando una pausa natural si el hueco lo permite.
      const m = Math.min(MARGEN, Math.max(0.03, hueco / 4));
      poner(a.p.fin + m, b.p.inicio - m, "parte");
    } else if (ed.silencios && hueco > ed.pausaMax) {
      poner(a.p.fin + MARGEN, b.p.inicio - MARGEN, "silencio");
    }
  }
  const despues = todas.slice(vivas[vivas.length - 1].i + 1).some((x) => x.fuera);
  if (despues || (ed.silencios && duracion - ultima.fin > ed.pausaMax)) poner(ultima.fin + MARGEN, duracion, despues ? "parte" : "final");
  return unir(cortes);
}

function unir(cortes: Corte[]): Corte[] {
  const o = [...cortes].sort((a, b) => a.inicio - b.inicio);
  const out: Corte[] = [];
  for (const c of o) {
    const u = out[out.length - 1];
    if (u && c.inicio - u.fin < MINIMO) u.fin = Math.max(u.fin, c.fin);
    else out.push({ ...c });
  }
  return out;
}

/** Lo que queda del original, en orden. */
export function tramosConservados(cortes: Corte[], duracion: number): TramoVideo[] {
  const out: TramoVideo[] = [];
  let t = 0;
  for (const c of cortes) {
    if (c.inicio - t >= MINIMO / 2) out.push({ inicio: r3(t), fin: r3(c.inicio) });
    t = Math.max(t, c.fin);
  }
  if (duracion - t >= MINIMO / 2) out.push({ inicio: r3(t), fin: r3(duracion) });
  return out;
}

export const duracionDe = (tramos: TramoVideo[]) => r3(tramos.reduce((s, x) => s + (x.fin - x.inicio), 0));

/** Un instante del original en el video cortado. Si cae dentro de un corte, va al punto del corte. */
export function aEditado(t: number, tramos: TramoVideo[]): number {
  let acum = 0;
  for (const x of tramos) {
    if (t < x.inicio) return acum;
    if (t <= x.fin) return acum + (t - x.inicio);
    acum += x.fin - x.inicio;
  }
  return acum;
}

/** Un instante del video cortado en el original (la vista previa salta con esto). */
export function aOriginal(te: number, tramos: TramoVideo[]): number {
  let acum = 0;
  for (const x of tramos) {
    const d = x.fin - x.inicio;
    if (te <= acum + d) return x.inicio + (te - acum);
    acum += d;
  }
  return tramos.length ? tramos[tramos.length - 1].fin : 0;
}

/** Lo que se quitó, en palabras simples, para mostrarlo junto a la vista previa. */
export function resumenCortes(cortes: Corte[], duracion: number) {
  const por: Record<MotivoCorte, number> = { silencio: 0, parte: 0, inicio: 0, final: 0 };
  for (const c of cortes) por[c.motivo] += c.fin - c.inicio;
  const quitado = cortes.reduce((s, c) => s + c.fin - c.inicio, 0);
  return { quitado: r3(quitado), queda: r3(Math.max(0, duracion - quitado)), por, cortes: cortes.length };
}

/** El paquete completo que usan la vista previa y el render. */
export function planEdicion(an: Analisis | undefined, ed: Edicion, duracion: number) {
  const cortes = calcularCortes(an, ed, duracion);
  const tramos = tramosConservados(cortes, duracion);
  return { cortes, tramos, duracion: duracionDe(tramos), resumen: resumenCortes(cortes, duracion) };
}

/**
 * Las partes a partir de los silencios que detecta FFmpeg: lo que no es silencio es una parte.
 * Las partes muy cortas (un golpe, un clic) se descartan y las que quedan casi pegadas se unen.
 */
export function partesDesdeSilencios(silencios: TramoVideo[], duracion: number, o: { minParte?: number; unir?: number } = {}): TramoVideo[] {
  const minParte = o.minParte ?? 0.15, juntar = o.unir ?? 0.12;
  const s = [...silencios].sort((a, b) => a.inicio - b.inicio);
  const crudas: TramoVideo[] = [];
  let t = 0;
  for (const x of s) {
    if (x.inicio > t) crudas.push({ inicio: t, fin: Math.min(x.inicio, duracion) });
    t = Math.max(t, x.fin);
  }
  if (duracion > t) crudas.push({ inicio: t, fin: duracion });
  const unidas: TramoVideo[] = [];
  for (const p of crudas) {
    const u = unidas[unidas.length - 1];
    if (u && p.inicio - u.fin < juntar) u.fin = p.fin;
    else unidas.push({ ...p });
  }
  return unidas.filter((p) => p.fin - p.inicio >= minParte).map((p) => ({ inicio: r3(p.inicio), fin: r3(p.fin) }));
}

/** Normaliza un JSON de edición que llega de la interfaz o de Atlas: nunca se confía en lo que llega. */
export function edicionSegura(x: unknown, base: Edicion): Edicion {
  // Los videos de antes de sistema/65 no tienen motion ni marca: se completan con lo de siempre.
  const b: Edicion = { ...EDICION_INICIAL, ...base, motion: { ...EDICION_INICIAL.motion, ...base?.motion }, marca: { ...EDICION_INICIAL.marca, ...base?.marca } };
  const e = (x && typeof x === "object" ? x : {}) as Partial<Edicion>;
  const a = (e.audio ?? {}) as Partial<Edicion["audio"]>;
  const mo = (e.motion ?? {}) as Partial<Edicion["motion"]>;
  const ma = (e.marca ?? {}) as Partial<Edicion["marca"]>;
  const num = (v: unknown, min: number, max: number, def: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def);
  const bool = (v: unknown, def: boolean) => (typeof v === "boolean" ? v : def);
  const indices = (v: unknown, def: number[]) => (Array.isArray(v) ? [...new Set(v.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < 100000))].sort((m, n) => m - n) : def);
  return {
    silencios: bool(e.silencios, b.silencios),
    pausaMax: Math.round(num(e.pausaMax, 0.25, 3, b.pausaMax) * 100) / 100,
    quitadas: indices(e.quitadas, b.quitadas),
    audio: { normalizar: bool(a.normalizar, b.audio.normalizar), limpiarRuido: bool(a.limpiarRuido, b.audio.limpiarRuido) },
    motion: {
      zoomAlterno: bool(mo.zoomAlterno, b.motion.zoomAlterno),
      zoomPartes: indices(mo.zoomPartes, b.motion.zoomPartes),
      transicion: mo.transicion === "corte" || mo.transicion === "fundido" ? mo.transicion : b.motion.transicion,
    },
    marca: {
      logoEsquina: bool(ma.logoEsquina, b.marca.logoEsquina),
      cierre: bool(ma.cierre, b.marca.cierre),
      cierreSegundos: Math.round(num(ma.cierreSegundos, 1, 5, b.marca.cierreSegundos) * 10) / 10,
      musica: bool(ma.musica, b.marca.musica),
      volumenMusica: Math.round(num(ma.volumenMusica, 0.05, 0.5, b.marca.volumenMusica) * 100) / 100,
    },
  };
}

/** Cuánto se acerca el plano cerrado. */
export const ZOOM = 1.18;
/** Duración del fundido entre tramos (segundos), sin pasar de la mitad del tramo más corto. */
export const duracionFundido = (tramos: TramoVideo[]) => Math.max(0.05, Math.min(0.25, ...tramos.map((t) => (t.fin - t.inicio) / 2)));

/** Qué tramos van con plano cerrado: el alterno (uno sí, uno no) y los de las partes marcadas. */
export function zoomDeTramos(tramos: TramoVideo[], an: Analisis | undefined, ed: Edicion): boolean[] {
  const marcadas = (ed.motion?.zoomPartes ?? []).map((i) => an?.partes[i]).filter((p): p is TramoVideo => !!p);
  return tramos.map((t, i) => (!!ed.motion?.zoomAlterno && i % 2 === 1) || marcadas.some((p) => { const m = (p.inicio + p.fin) / 2; return m >= t.inicio && m <= t.fin; }));
}

/** Duración del video final: lo que queda, menos lo que se solapa en los fundidos, más el cierre. */
export function duracionFinal(tramos: TramoVideo[], ed: Edicion, conCierre: boolean) {
  const base = duracionDe(tramos);
  const solape = ed.motion?.transicion === "fundido" && tramos.length > 1 ? (tramos.length - 1) * duracionFundido(tramos) : 0;
  return r3(base - solape + (conCierre && ed.marca?.cierre ? ed.marca.cierreSegundos : 0));
}

/**
 * Lo que identifica un resultado: si cambia, el video armado quedó viejo. El servidor y el navegador
 * calculan su huella (sha-256) sobre este mismo texto.
 */
export function textoHuella(t: { edicion: Edicion; analisis?: Analisis; duracion?: number; marca?: string; kit?: string }, formato: string) {
  return JSON.stringify({ e: edicionSegura(t.edicion, t.edicion), n: t.analisis?.partes.length ?? 0, d: t.duracion, formato, m: t.marca ?? "", k: t.kit ?? "" });
}
