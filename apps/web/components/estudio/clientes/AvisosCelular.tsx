"use client";

// «Avisarme en este celular» (sistema/72): suena cuando un negocio abre su muestra. En Android basta Chrome;
// en iPhone, primero hay que agregar el estudio a la pantalla de inicio.
import { useEffect, useState } from "react";

const aBytes = (b64: string) => {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

export function AvisosCelular({ clavePublica, compacto = false }: { clavePublica?: string; compacto?: boolean }) {
  const [estado, setEstado] = useState<"cargando" | "sin-soporte" | "apagado" | "activo" | "trabajando">("cargando");
  const [texto, setTexto] = useState("");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setEstado("sin-soporte");
    navigator.serviceWorker.getRegistration("/estudio/").then(async (r) => {
      const s = await r?.pushManager.getSubscription();
      setEstado(s && Notification.permission === "granted" ? "activo" : "apagado");
    }).catch(() => setEstado("apagado"));
  }, []);

  async function activar() {
    if (!clavePublica) return;
    setEstado("trabajando");
    setTexto("Pidiendo permiso para avisarte…");
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") throw new Error("No diste permiso. Actívalo en los ajustes del navegador para este sitio y vuelve a intentar.");
      const r = await navigator.serviceWorker.register("/sw-estudio.js", { scope: "/estudio/" });
      await navigator.serviceWorker.ready;
      const s = (await r.pushManager.getSubscription()) ?? (await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aBytes(clavePublica) }));
      setTexto("Guardando este celular…");
      const equipo = /iphone|ipad/i.test(navigator.userAgent) ? "iPhone" : /android/i.test(navigator.userAgent) ? "Android" : "Computadora";
      const res = await fetch("/estudio/avisos", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ suscripcion: s.toJSON(), equipo }) });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "No se pudo guardar este celular.");
      setEstado("activo");
      setTexto("Listo: te mandamos un aviso de prueba. Desde ahora suena cuando un negocio abra su muestra.");
    } catch (e) {
      setEstado("apagado");
      setTexto((e as Error).message);
    }
  }

  if (estado === "cargando") return null;
  const boton = "inline-flex min-h-10 items-center rounded-full px-4 text-[13px] font-medium transition disabled:opacity-50";
  return (
    <div className={compacto ? "flex flex-wrap items-center gap-2" : "grid gap-2"} aria-label="Avisos en el celular">
      {!clavePublica ? (
        <p className="text-[12px] text-suave">Avisos al celular: falta que Jay ponga <code className="font-mono">VAPID_PUBLICA</code> y <code className="font-mono">VAPID_PRIVADA</code> en Vercel.</p>
      ) : estado === "sin-soporte" ? (
        <p className="text-[12px] text-suave">Este navegador no recibe avisos. En iPhone: Compartir → «Agregar a inicio», abre el estudio desde ahí y vuelve aquí.</p>
      ) : estado === "activo" ? (
        <p className="text-[13px] text-[#17714a]">Este celular recibe avisos cuando un negocio abre su muestra.</p>
      ) : (
        <button type="button" onClick={activar} disabled={estado === "trabajando"} className={`${boton} bg-tinta text-white`}>
          {estado === "trabajando" ? "Activando…" : "Avisarme en este celular"}
        </button>
      )}
      {texto && <p role="status" className="text-[12px] text-medio">{texto}</p>}
    </div>
  );
}
