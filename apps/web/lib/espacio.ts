// Los colores del estudio (sistema/35).
// Afuera de un proyecto: el marco cálido del estudio. Adentro: los colores de la marca del cliente;
// si todavía no tiene, los de Anonymo (hueso y tinta). Nada de colores al azar.
import type { Marca } from "@anonymo/pipeline";

export interface Espacio {
  /** Color sólido: el punto del proyecto en la barra y en las filas. */
  punto: string;
  /** Fondo del marco cuando estás dentro del proyecto. */
  marco: string;
  /** Fondo claro para resaltar dentro de la tarjeta. */
  suave: string;
  /** Si viene de la marca del cliente. */
  deMarca: boolean;
}

/** El marco de afuera: cálido y neutro, como una mente. */
export const MARCO_TODO = "linear-gradient(160deg,#e6def5 0%,#f2e7dc 55%,#efe9d9 100%)";

/** Anonymo por defecto: hueso, papel y tinta. */
const ANONYMO: Espacio = { punto: "#1a1816", marco: "linear-gradient(160deg,#e7e3da 0%,#efece5 55%,#e9e5dc 100%)", suave: "#f4f1eb", deMarca: false };

const hex = (h: string) => {
  const m = h.trim().replace("#", "");
  const x = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  return /^[0-9a-f]{6}$/i.test(x) ? [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16)) : undefined;
};
/** Mezcla un color con blanco (t = cuánto blanco). */
const aclarar = (h: string, t: number) => {
  const c = hex(h);
  if (!c) return "#f4f1eb";
  return `#${c.map((v) => Math.round(v + (255 - v) * t).toString(16).padStart(2, "0")).join("")}`;
};
/** Qué tan claro es (0 negro, 1 blanco). */
export const luz = (h: string) => {
  const c = hex(h);
  return c ? (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255 : 1;
};
export const hexValido = (h: string) => !!hex(h);

export function espacio(_id: string, marca?: Marca): Espacio {
  const colores = (marca?.colores ?? []).map((c) => c.hex).filter(hexValido);
  if (!colores.length) return ANONYMO;
  // El primero que no sea casi blanco ni casi negro es el principal; los otros acompañan el degradado.
  const principal = colores.find((c) => luz(c) > 0.12 && luz(c) < 0.9) ?? colores[0];
  const segundo = colores.find((c) => c !== principal && luz(c) > 0.12) ?? principal;
  return {
    punto: principal,
    marco: `linear-gradient(160deg,${aclarar(principal, 0.72)} 0%,${aclarar(segundo, 0.84)} 55%,${aclarar(principal, 0.9)} 100%)`,
    suave: aclarar(principal, 0.9),
    deMarca: true,
  };
}
