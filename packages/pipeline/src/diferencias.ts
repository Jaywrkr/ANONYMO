// Diferencias línea por línea entre dos textos (LCS). Suficiente para entregas de unos cientos de líneas.
export type Linea = { tipo: "igual" | "quitada" | "agregada"; texto: string };

export function diferencias(antes: string, despues: string): Linea[] {
  const a = antes.split("\n");
  const b = despues.split("\n");
  const n = a.length;
  const m = b.length;
  const t: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) t[i][j] = a[i] === b[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
  const out: Linea[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push({ tipo: "igual", texto: a[i] }); i++; j++; }
    else if (t[i + 1][j] >= t[i][j + 1]) out.push({ tipo: "quitada", texto: a[i++] });
    else out.push({ tipo: "agregada", texto: b[j++] });
  }
  while (i < n) out.push({ tipo: "quitada", texto: a[i++] });
  while (j < m) out.push({ tipo: "agregada", texto: b[j++] });
  return out;
}

/** Resumen: cuántas líneas cambiaron. */
export const contarCambios = (d: Linea[]) => ({ agregadas: d.filter((x) => x.tipo === "agregada").length, quitadas: d.filter((x) => x.tipo === "quitada").length });
