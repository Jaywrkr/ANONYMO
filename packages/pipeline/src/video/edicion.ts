// El editor del departamento de video (sistema/62): de la transcripción y el JSON de edición salen
// los cortes, los tramos que quedan y los subtítulos con los tiempos del video ya cortado.
// Todo es cálculo puro: la vista previa del navegador y el render final usan exactamente lo mismo.
import type { Corte, Edicion, MotivoCorte, Palabra, Transcripcion, TramoVideo } from "./tipos.ts";

/** Respiro que se deja antes y después de cada frase al cortar un silencio (segundos). */
export const MARGEN = 0.12;
/** Lo mínimo que vale la pena cortar o conservar: menos que esto se siente como un salto. */
const MINIMO = 0.08;

/** Sin tildes, sin signos, en minúscula: para comparar palabras. */
export const limpia = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9ñ]+/g, "");

/** Muletillas que se quitan solas. «Este» y «o sea» no: muchas veces son parte de la frase. */
const MULETILLAS = /^(e+h*|e+m+|m+|m+h+|a+h+|u+m+|u+h+|hm+|mm+h*)$/;
export const esMuletilla = (texto: string) => { const l = limpia(texto); return l.length > 0 && MULETILLAS.test(l); };

/** Por qué se quita cada palabra (o undefined si queda). */
export function motivoPalabra(i: number, p: Palabra, ed: Edicion, quitadas = new Set(ed.quitadas)): MotivoCorte | undefined {
  if (quitadas.has(i)) return "texto";
  if (ed.muletillas && esMuletilla(p.texto)) return "muletilla";
  return undefined;
}

/** Los tramos del original que se quitan, ordenados y sin cruzarse. */
export function calcularCortes(tr: Transcripcion | undefined, ed: Edicion, duracion: number): Corte[] {
  const palabras = tr?.palabras ?? [];
  if (!palabras.length || !(duracion > 0)) return [];
  const quitadas = new Set(ed.quitadas);
  const quedan = palabras.map((p, i) => ({ p, i, motivo: motivoPalabra(i, p, ed, quitadas) }));
  const vivas = quedan.filter((x) => !x.motivo);
  // Si se quita todo, no se corta nada: un video vacío no sirve a nadie.
  if (!vivas.length) return [];
  const cortes: Corte[] = [];
  const poner = (inicio: number, fin: number, motivo: MotivoCorte) => {
    const a = Math.max(0, inicio), b = Math.min(duracion, fin);
    if (b - a >= MINIMO) cortes.push({ inicio: r3(a), fin: r3(b), motivo });
  };
  const primera = vivas[0].p, ultima = vivas[vivas.length - 1].p;
  // Lo de antes de la primera palabra y después de la última: si hay que quitar silencios o palabras ahí.
  const antes = quedan.slice(0, vivas[0].i).find((x) => x.motivo)?.motivo;
  if (antes || (ed.silencios && primera.inicio > ed.pausaMax)) poner(0, primera.inicio - MARGEN, antes ?? "inicio");
  for (let k = 0; k + 1 < vivas.length; k++) {
    const a = vivas[k], b = vivas[k + 1];
    const enMedio = quedan.slice(a.i + 1, b.i).find((x) => x.motivo)?.motivo;
    const hueco = b.p.inicio - a.p.fin;
    if (enMedio) {
      // Una palabra quitada: se corta pegado, dejando una pausa natural si el hueco lo permite.
      const m = Math.min(MARGEN, Math.max(0.03, hueco / 4));
      poner(a.p.fin + m, b.p.inicio - m, enMedio);
    } else if (ed.silencios && hueco > ed.pausaMax) {
      poner(a.p.fin + MARGEN, b.p.inicio - MARGEN, "silencio");
    }
  }
  const despues = quedan.slice(vivas[vivas.length - 1].i + 1).find((x) => x.motivo)?.motivo;
  if (despues || (ed.silencios && duracion - ultima.fin > ed.pausaMax)) poner(ultima.fin + MARGEN, duracion, despues ?? "final");
  return unir(cortes);
}

const r3 = (n: number) => Math.round(n * 1000) / 1000;

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

export interface PalabraSub { texto: string; inicio: number; fin: number }
export interface GrupoSub { inicio: number; fin: number; palabras: PalabraSub[] }

/** Cuántas palabras entran por pantalla según la plantilla y el formato. */
export function medidaGrupo(plantilla: Edicion["subtitulos"]["plantilla"], vertical: boolean) {
  if (plantilla === "marca") return { palabras: 3, caracteres: vertical ? 16 : 22 };
  return { palabras: vertical ? 6 : 9, caracteres: vertical ? 28 : 44 };
}

/** Subtítulos en tiempos del video cortado, agrupados para leerse de un vistazo. */
export function gruposSubtitulos(tr: Transcripcion | undefined, ed: Edicion, tramos: TramoVideo[], vertical = true): GrupoSub[] {
  const palabras = tr?.palabras ?? [];
  const quitadas = new Set(ed.quitadas);
  const { palabras: maxP, caracteres: maxC } = medidaGrupo(ed.subtitulos.plantilla, vertical);
  const vivas: PalabraSub[] = [];
  palabras.forEach((p, i) => {
    if (motivoPalabra(i, p, ed, quitadas)) return;
    const texto = p.texto.trim();
    if (!texto) return;
    const inicio = aEditado(p.inicio, tramos), fin = Math.max(inicio + 0.05, aEditado(p.fin, tramos));
    vivas.push({ texto, inicio: r3(inicio), fin: r3(fin) });
  });
  const grupos: GrupoSub[] = [];
  let actual: PalabraSub[] = [];
  const cerrar = () => { if (actual.length) grupos.push({ inicio: actual[0].inicio, fin: actual[actual.length - 1].fin, palabras: actual }); actual = []; };
  for (const w of vivas) {
    const u = actual[actual.length - 1];
    const largo = actual.reduce((s, x) => s + x.texto.length + 1, 0) + w.texto.length;
    if (u && (actual.length >= maxP || largo > maxC || /[.!?…]$/.test(u.texto) || (/[,;:]$/.test(u.texto) && actual.length >= 2) || w.inicio - u.fin > 0.45)) cerrar();
    actual.push(w);
  }
  cerrar();
  // Sin parpadeos: si el siguiente llega enseguida, el anterior se queda hasta que aparezca.
  for (let i = 0; i + 1 < grupos.length; i++) {
    const hueco = grupos[i + 1].inicio - grupos[i].fin;
    if (hueco > 0 && hueco < 0.35) grupos[i].fin = grupos[i + 1].inicio;
  }
  if (grupos.length) { const u = grupos[grupos.length - 1]; u.fin = r3(Math.min(duracionDe(tramos), u.fin + 0.4)); }
  return grupos;
}

/** Lo que se quitó, en palabras simples, para mostrarlo junto a la vista previa. */
export function resumenCortes(cortes: Corte[], duracion: number) {
  const por: Record<MotivoCorte, number> = { silencio: 0, muletilla: 0, texto: 0, inicio: 0, final: 0 };
  for (const c of cortes) por[c.motivo] += c.fin - c.inicio;
  const quitado = cortes.reduce((s, c) => s + c.fin - c.inicio, 0);
  return { quitado: r3(quitado), queda: r3(Math.max(0, duracion - quitado)), por, cortes: cortes.length };
}

/** El paquete completo que usan la vista previa y el render. */
export function planEdicion(tr: Transcripcion | undefined, ed: Edicion, duracion: number, vertical = true) {
  const cortes = calcularCortes(tr, ed, duracion);
  const tramos = tramosConservados(cortes, duracion);
  return { cortes, tramos, duracion: duracionDe(tramos), grupos: ed.subtitulos.activos ? gruposSubtitulos(tr, ed, tramos, vertical) : [], resumen: resumenCortes(cortes, duracion) };
}

/** Normaliza un JSON de edición que llega de la interfaz: nunca se confía en lo que manda el navegador. */
export function edicionSegura(x: unknown, base: Edicion): Edicion {
  const e = (x && typeof x === "object" ? x : {}) as Partial<Edicion>;
  const s = (e.subtitulos ?? {}) as Partial<Edicion["subtitulos"]>;
  const a = (e.audio ?? {}) as Partial<Edicion["audio"]>;
  const num = (v: unknown, min: number, max: number, def: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def);
  const bool = (v: unknown, def: boolean) => (typeof v === "boolean" ? v : def);
  return {
    silencios: bool(e.silencios, base.silencios),
    pausaMax: num(e.pausaMax, 0.25, 3, base.pausaMax),
    muletillas: bool(e.muletillas, base.muletillas),
    quitadas: Array.isArray(e.quitadas) ? [...new Set(e.quitadas.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < 100000))].sort((m, n) => m - n) : base.quitadas,
    subtitulos: {
      activos: bool(s.activos, base.subtitulos.activos),
      plantilla: s.plantilla === "marca" || s.plantilla === "limpio" || s.plantilla === "caja" ? s.plantilla : base.subtitulos.plantilla,
      acento: typeof s.acento === "string" && /^#[0-9a-f]{6}$/i.test(s.acento) ? s.acento.toLowerCase() : base.subtitulos.acento,
      tamano: num(s.tamano, 0.6, 1.6, base.subtitulos.tamano),
      posicion: s.posicion === "abajo" || s.posicion === "centro" || s.posicion === "arriba" ? s.posicion : base.subtitulos.posicion,
    },
    audio: { normalizar: bool(a.normalizar, base.audio.normalizar), limpiarRuido: bool(a.limpiarRuido, base.audio.limpiarRuido) },
  };
}

/**
 * Lo que identifica un resultado: si cambia, el video armado quedó viejo. El servidor y el navegador
 * calculan su huella (sha-256) sobre este mismo texto.
 */
export function textoHuella(t: { edicion: Edicion; transcripcion?: Transcripcion; duracion?: number }, formato: string) {
  return JSON.stringify({ e: edicionSegura(t.edicion, t.edicion), n: t.transcripcion?.palabras.length ?? 0, d: t.duracion, formato });
}
