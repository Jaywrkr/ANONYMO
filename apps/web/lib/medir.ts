"use client";
// Medición sin cookies (web/19). Respeta "No rastrear". Si hay Plausible configurado, también le avisa.

type Plausible = (e: string, o?: { props?: Record<string, string | number> }) => void;

let primera = true;

export function medir(e: string, valor?: string | number) {
  if (typeof window === "undefined" || navigator.doNotTrack === "1") return;
  let origen: string | undefined;
  if (primera && document.referrer) {
    try {
      const h = new URL(document.referrer).hostname;
      if (h !== location.hostname) origen = h.replace(/^www\./, "");
    } catch {}
  }
  primera = false;
  const datos = {
    e,
    ruta: location.pathname,
    idioma: location.pathname.startsWith("/en") ? "en" : "es",
    equipo: matchMedia("(pointer: coarse)").matches ? "celular" : "escritorio",
    origen,
    valor,
  };
  const cuerpo = JSON.stringify(datos);
  if (!navigator.sendBeacon?.("/api/medir", new Blob([cuerpo], { type: "application/json" }))) {
    void fetch("/api/medir", { method: "POST", body: cuerpo, keepalive: true }).catch(() => {});
  }
  const p = (window as Window & { plausible?: Plausible }).plausible;
  if (p && e !== "vista") p(e, valor !== undefined ? { props: { valor } } : undefined);
}
