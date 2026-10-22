// Imágenes para compartir (web/08): 1200×630, mismo lenguaje que la web — hueso, tinta, óvalos de degradado.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { AREAS, type Agente } from "@anonymo/agentes";

export const tamano = { width: 1200, height: 630 };
export const tipo = "image/png";

const fuente = (archivo: string) => readFileSync(join(process.cwd(), "../../node_modules/geist/dist/fonts", archivo));

function Ovalo({ a, d }: { a: Agente; d: number }) {
  const c = a.tono ?? AREAS[a.area];
  return (
    <div style={{ width: d, height: d * 1.08, borderRadius: "50%", background: `radial-gradient(circle at 36% 28%, ${c.luz}, ${c.medio} 52%, ${c.sombra})`, display: "flex", alignItems: "center", justifyContent: "center", gap: d * 0.16, paddingBottom: d * 0.12 }}>
      <div style={{ width: d * 0.07, height: d * 0.09, borderRadius: "50%", background: "#121214" }} />
      <div style={{ width: d * 0.07, height: d * 0.09, borderRadius: "50%", background: "#121214" }} />
    </div>
  );
}

export function imagen({ titulo, bajada, etiqueta, agentes = [] }: { titulo: string; bajada?: string; etiqueta: string; agentes?: Agente[] }) {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#efede8", color: "#121214", display: "flex", padding: 64, fontFamily: "Geist" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
          <div style={{ fontFamily: "Mono", fontSize: 22, letterSpacing: 4, textTransform: "uppercase", color: "#55534e" }}>{etiqueta}</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: titulo.length > 22 ? 84 : 112, fontWeight: 300, lineHeight: 0.95, letterSpacing: -3, textTransform: "uppercase", maxWidth: agentes.length ? 640 : 1000 }}>{titulo}</div>
            {bajada && <div style={{ fontSize: 30, fontWeight: 300, marginTop: 24, maxWidth: agentes.length ? 620 : 900, color: "#121214" }}>{bajada}</div>}
          </div>
          <div style={{ fontFamily: "Mono", fontSize: 20, letterSpacing: 4, textTransform: "uppercase", color: "#55534e" }}>Anonymo · Cuenca, Ecuador</div>
        </div>
        {agentes.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", width: 420, alignItems: "center", justifyContent: "center", gap: 18 }}>
            {agentes.slice(0, 5).map((a, i) => <Ovalo key={a.id} a={a} d={agentes.length === 1 ? 360 : i === 0 ? 220 : 130} />)}
          </div>
        )}
      </div>
    ),
    {
      ...tamano,
      fonts: [
        { name: "Geist", data: fuente("geist-sans/Geist-Light.ttf"), weight: 300 },
        { name: "Geist", data: fuente("geist-sans/Geist-Regular.ttf"), weight: 400 },
        { name: "Mono", data: fuente("geist-mono/GeistMono-Regular.ttf"), weight: 400 },
      ],
    },
  );
}
