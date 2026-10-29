// Cada proyecto es un espacio con su color, como en Arc (sistema/32).
// El color sale del id: siempre el mismo para el mismo proyecto, sin guardarlo en ningún lado.

export interface Espacio {
  /** Color sólido: el punto del proyecto y la fase que espera revisión. */
  punto: string;
  /** Degradado del marco cuando estás dentro del proyecto. */
  marco: string;
  /** Fondo claro para resaltar dentro de la tarjeta. */
  suave: string;
}

const PALETA: Espacio[] = [
  { punto: "#4f6bff", marco: "linear-gradient(160deg,#cdd8ff 0%,#e2e8ff 45%,#efe8ff 100%)", suave: "#eef1ff" },
  { punto: "#2f8f6b", marco: "linear-gradient(160deg,#cfeadc 0%,#e4f2e7 45%,#f1efdc 100%)", suave: "#e9f5ee" },
  { punto: "#ff7a3d", marco: "linear-gradient(160deg,#ffd9c2 0%,#fde6d6 45%,#f6ead6 100%)", suave: "#fff1e8" },
  { punto: "#d6458f", marco: "linear-gradient(160deg,#f8d0e6 0%,#f9e2ee 45%,#efe4f6 100%)", suave: "#fcedf5" },
  { punto: "#8a5cf6", marco: "linear-gradient(160deg,#ddd0ff 0%,#ebe3ff 45%,#f6e6ef 100%)", suave: "#f2edff" },
  { punto: "#1f9bb5", marco: "linear-gradient(160deg,#c9ecf3 0%,#e0f2f5 45%,#ecefe2 100%)", suave: "#e6f5f8" },
  { punto: "#c9a300", marco: "linear-gradient(160deg,#f6ebb5 0%,#f8f0d2 45%,#f1ead9 100%)", suave: "#fbf5dc" },
  { punto: "#e0473b", marco: "linear-gradient(160deg,#fbd3cd 0%,#fbe3dd 45%,#f5e7dc 100%)", suave: "#fdecea" },
];

/** El marco de «Todo»: cálido y neutro. */
export const MARCO_TODO = "linear-gradient(160deg,#e6def5 0%,#f2e7dc 55%,#efe9d9 100%)";

export function espacio(id: string): Espacio {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETA[h % PALETA.length];
}
