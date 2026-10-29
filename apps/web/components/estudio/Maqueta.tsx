// Una dirección de diseño dibujada como página (sistema/37): barra del navegador, portada y una sección.
// Todo escala con el ancho (unidades cqw), así sirve igual en miniatura, en grande y en el PDF.
import type { Direccion } from "@anonymo/pipeline";
import { luz } from "@/lib/espacio";

const limpia = (f: string) => f.replace(/[^\p{L}\p{N} ]/gu, "").trim();
const familia = (f: string, respaldo: string) => `"${limpia(f)}", ${respaldo}`;

/** Las fuentes de Google de un grupo de direcciones, en un solo enlace. */
export function FuentesDirecciones({ ds }: { ds: Direccion[] }) {
  const nombres = [...new Set(ds.flatMap((d) => [d.tipografias.titulos, d.tipografias.texto]).map(limpia).filter(Boolean))].slice(0, 12);
  if (!nombres.length) return null;
  const href = `https://fonts.googleapis.com/css2?${nombres.map((n) => `family=${encodeURIComponent(n).replace(/%20/g, "+")}:wght@400;600;700`).join("&")}&display=swap`;
  // Sin «precedence»: si Google Fonts no responde, la maqueta sigue con las fuentes de respaldo y no rompe la página.
  return <link rel="stylesheet" href={href} />;
}

/** Colores de la maqueta según el estilo: fondo, texto, acento y un segundo tono. */
function paleta(d: Direccion) {
  const cs = d.colores.map((c) => c.hex);
  const porLuz = [...cs].sort((a, b) => luz(b) - luz(a));
  const claro = porLuz[0];
  const oscuro = porLuz.at(-1)!;
  const principal = cs[0];
  const segundo = cs.find((c) => c !== principal && c !== claro && c !== oscuro) ?? cs[1] ?? principal;
  const sobre = (fondo: string) => (luz(fondo) > 0.55 ? (luz(oscuro) < 0.35 ? oscuro : "#141414") : luz(claro) > 0.8 ? claro : "#ffffff");
  if (d.estilo === "audaz") {
    const fondo = principal;
    return { fondo, texto: sobre(fondo), acento: segundo === fondo ? claro : segundo, suave: segundo, tarjeta: "transparent" };
  }
  const fondo = d.estilo === "minimal" ? (luz(claro) > 0.9 ? claro : "#ffffff") : claro;
  const tarjeta = porLuz[1] && luz(porLuz[1]) > 0.6 ? porLuz[1] : "#ffffff";
  return { fondo, texto: sobre(fondo), acento: principal === claro ? segundo : principal, suave: segundo, tarjeta };
}

export function Maqueta({ d, dominio = "tuweb.com" }: { d: Direccion; dominio?: string }) {
  // Sin same-origin: el código de la dirección no puede leer la sesión ni el documento del estudio.
  // La política también bloquea peticiones, formularios y rutas base aportadas por el HTML.
  if (d.html) {
    const politica = "default-src 'none'; script-src 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data: https:; connect-src 'none'; form-action 'none'; base-uri 'none'";
    return (
      <iframe title={`Dirección ${d.nombre}`} sandbox="allow-scripts" referrerPolicy="no-referrer"
        className="h-[600px] w-full rounded-[10px] border-0 bg-white"
        srcDoc={`<!doctype html><meta http-equiv="Content-Security-Policy" content="${politica}"><meta name="viewport" content="width=device-width, initial-scale=1">${d.html}`} />
    );
  }
  const c = paleta(d);
  const titulos = familia(d.tipografias.titulos, "Georgia, serif");
  const texto = familia(d.tipografias.texto, "system-ui, sans-serif");
  const boton = { background: c.acento, color: luz(c.acento) > 0.55 ? "#141414" : "#ffffff" };
  const imagen = (
    <div className="relative flex h-full min-h-[18cqw] items-end overflow-hidden" style={{ background: `linear-gradient(135deg, ${c.acento}, ${c.suave})`, borderRadius: d.estilo === "calido" ? "2.4cqw" : d.estilo === "audaz" ? "50%" : "0.6cqw" }}>
      <span className="m-[1.6cqw] max-w-[85%] rounded-[0.6cqw] bg-black/25 px-[1.2cqw] py-[0.6cqw] text-[1.25cqw] leading-tight text-white backdrop-blur-sm">Foto: {d.imagen}</span>
    </div>
  );
  const nav = (
    <div className="flex items-center justify-between px-[4cqw] py-[2cqw] text-[1.35cqw]" style={{ fontFamily: texto }}>
      <span className="text-[1.9cqw] font-semibold" style={{ fontFamily: titulos }}>{dominio.replace(/\.com$/, "")}</span>
      <span className="flex gap-[2.2cqw] opacity-75"><span>Inicio</span><span>Servicios</span><span>Nosotros</span><span>Contacto</span></span>
    </div>
  );
  const items = d.seccion.items.slice(0, 3);

  return (
    <div className="@container overflow-hidden rounded-[10px] bg-white shadow-[0_0_0_1px_rgba(26,24,22,.08),0_18px_40px_-24px_rgba(20,15,10,.45)]" style={{ containerType: "inline-size" }}>
      {/* Barra del navegador */}
      <div className="flex items-center gap-[1cqw] border-b border-black/5 bg-[#f1efeb] px-[1.6cqw] py-[1cqw]">
        <i className="h-[1cqw] w-[1cqw] rounded-full bg-[#ff5f57]" /><i className="h-[1cqw] w-[1cqw] rounded-full bg-[#febc2e]" /><i className="h-[1cqw] w-[1cqw] rounded-full bg-[#28c840]" />
        <span className="ml-[2cqw] flex-1 truncate rounded-full bg-white px-[1.6cqw] py-[0.35cqw] text-center font-mono text-[1.1cqw] text-black/50">{dominio}</span>
      </div>
      <div className="aspect-[16/10] overflow-hidden" style={{ background: c.fondo, color: c.texto, fontFamily: texto }}>
        {nav}
        {d.estilo === "editorial" && (
          <>
            <div className="grid grid-cols-[1.15fr_1fr] gap-[3cqw] px-[4cqw] pt-[1.5cqw]">
              <div className="pt-[2cqw]">
                <p className="text-[5.6cqw] leading-[0.98] tracking-[-0.01em]" style={{ fontFamily: titulos }}>{d.portada.titular}</p>
                <p className="mt-[1.8cqw] max-w-[90%] text-[1.6cqw] leading-snug opacity-80">{d.portada.bajada}</p>
                <span className="mt-[2cqw] inline-block rounded-full px-[2.4cqw] py-[1cqw] text-[1.4cqw] font-semibold" style={boton}>{d.portada.boton}</span>
              </div>
              <div className="h-[26cqw]">{imagen}</div>
            </div>
            <div className="mt-[3cqw] px-[4cqw]">
              <p className="text-[2.2cqw]" style={{ fontFamily: titulos }}>{d.seccion.titulo}</p>
              <div className="mt-[1.4cqw] grid grid-cols-3 gap-[2.4cqw]">
                {items.map((it, i) => <div key={i} className="border-t pt-[1cqw]" style={{ borderColor: c.texto + "33" }}><p className="text-[1.45cqw] font-semibold">{it.titulo}</p><p className="mt-[0.4cqw] text-[1.25cqw] leading-snug opacity-75">{it.texto}</p></div>)}
              </div>
            </div>
          </>
        )}
        {d.estilo === "minimal" && (
          <>
            <div className="px-[10cqw] pt-[4cqw] text-center">
              <p className="text-[1.2cqw] uppercase tracking-[0.2em]" style={{ color: c.acento }}>{d.nombre}</p>
              <p className="mx-auto mt-[1.4cqw] max-w-[80%] text-[4.6cqw] font-semibold leading-[1.02] tracking-[-0.02em]" style={{ fontFamily: titulos }}>{d.portada.titular}</p>
              <p className="mx-auto mt-[1.6cqw] max-w-[60%] text-[1.55cqw] leading-snug opacity-70">{d.portada.bajada}</p>
              <span className="mt-[2.2cqw] inline-block rounded-[0.5cqw] border px-[2.4cqw] py-[1cqw] text-[1.35cqw] font-semibold" style={{ borderColor: c.acento, color: c.acento }}>{d.portada.boton} →</span>
            </div>
            <div className="mx-[6cqw] mt-[4cqw] h-px" style={{ background: c.texto + "22" }} />
            <div className="mx-[6cqw] mt-[2.4cqw] grid grid-cols-3 gap-[3cqw]">
              {items.map((it, i) => <div key={i}><p className="font-mono text-[1.2cqw]" style={{ color: c.acento }}>0{i + 1}</p><p className="mt-[0.6cqw] text-[1.5cqw] font-semibold" style={{ fontFamily: titulos }}>{it.titulo}</p><p className="mt-[0.4cqw] text-[1.2cqw] leading-snug opacity-70">{it.texto}</p></div>)}
            </div>
          </>
        )}
        {d.estilo === "audaz" && (
          <div className="relative h-full px-[4cqw] pt-[1cqw]">
            <p className="relative z-10 max-w-[72%] text-[7.4cqw] font-bold leading-[0.9] tracking-[-0.03em]" style={{ fontFamily: titulos }}>{d.portada.titular}</p>
            <p className="relative z-10 mt-[2cqw] max-w-[45%] text-[1.7cqw] leading-snug opacity-85">{d.portada.bajada}</p>
            <span className="relative z-10 mt-[2.2cqw] inline-block rounded-full px-[2.8cqw] py-[1.1cqw] text-[1.5cqw] font-bold" style={boton}>{d.portada.boton}</span>
            <div className="absolute right-[4cqw] top-[2cqw] h-[30cqw] w-[30cqw]">{imagen}</div>
            <div className="absolute inset-x-[4cqw] bottom-[3.5cqw] grid grid-cols-3 gap-[2.4cqw]">
              {items.map((it, i) => <div key={i}><p className="text-[3.6cqw] font-bold leading-none" style={{ fontFamily: titulos, color: c.acento }}>{i + 1}</p><p className="mt-[0.6cqw] text-[1.45cqw] font-semibold">{it.titulo}</p><p className="text-[1.2cqw] leading-snug opacity-80">{it.texto}</p></div>)}
            </div>
          </div>
        )}
        {d.estilo === "calido" && (
          <>
            <div className="grid grid-cols-[1fr_1.1fr] items-center gap-[3cqw] px-[4cqw] pt-[1cqw]">
              <div className="h-[25cqw]">{imagen}</div>
              <div>
                <p className="text-[4.8cqw] leading-[1.02]" style={{ fontFamily: titulos }}>{d.portada.titular}</p>
                <p className="mt-[1.6cqw] text-[1.55cqw] leading-snug opacity-80">{d.portada.bajada}</p>
                <span className="mt-[2cqw] inline-block rounded-full px-[2.4cqw] py-[1cqw] text-[1.4cqw] font-semibold" style={boton}>{d.portada.boton}</span>
              </div>
            </div>
            <div className="mt-[3cqw] grid grid-cols-3 gap-[1.8cqw] px-[4cqw]">
              {items.map((it, i) => <div key={i} className="rounded-[2cqw] p-[1.8cqw]" style={{ background: c.tarjeta, color: luz(c.tarjeta) > 0.55 ? "#1a1816" : "#fff" }}><p className="text-[1.5cqw] font-semibold" style={{ fontFamily: titulos }}>{it.titulo}</p><p className="mt-[0.4cqw] text-[1.2cqw] leading-snug opacity-75">{it.texto}</p></div>)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Los colores y las fuentes de una dirección, para leerlos de un vistazo. */
export function FichaDireccion({ d }: { d: Direccion }) {
  return (
    <div className="grid gap-3">
      {d.justificacion && <p className="text-[13px] text-medio">{d.justificacion}</p>}
      <div className="flex flex-wrap gap-1.5">
        {d.colores.map((c) => (
          <span key={c.hex} className="inline-flex items-center gap-1.5 rounded-full bg-[#f6f3ee] py-1 pl-1 pr-2.5 text-[11px]">
            <i className="h-5 w-5 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,.08)]" style={{ background: c.hex }} />
            <span className="font-mono">{c.hex.toUpperCase()}</span>{c.nombre && <span className="text-suave">· {c.nombre}</span>}
          </span>
        ))}
      </div>
      <p className="text-[13px]"><span className="text-suave">Títulos</span> <span className="text-[17px]" style={{ fontFamily: familia(d.tipografias.titulos, "serif") }}>{d.tipografias.titulos}</span> <span className="ml-2 text-suave">Texto</span> <span style={{ fontFamily: familia(d.tipografias.texto, "sans-serif") }}>{d.tipografias.texto}</span></p>
    </div>
  );
}
