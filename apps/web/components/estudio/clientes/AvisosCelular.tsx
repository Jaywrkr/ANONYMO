"use client";

// «Avisarme en este celular» (sistema/72 y 74): suena cuando un negocio abre su muestra. En Android basta Chrome;
// en iPhone, primero hay que agregar el estudio a la pantalla de inicio. Siempre dice si el aviso salió o por qué no.
import { useEffect, useState } from "react";

const aBytes = (b64: string) => {
  const s = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};
const igual = (a: ArrayBuffer | null | undefined, b: Uint8Array) => !!a && a.byteLength === b.length && new Uint8Array(a).every((x, i) => x === b[i]);

type Estado = "cargando" | "sin-soporte" | "apagado" | "activo" | "trabajando";
interface Respuesta { enviados?: number; fallas?: { status: number; detalle: string }[]; error?: string }

/** Lo que pasó con el aviso, en palabras simples. */
function explicar(j: Respuesta): { ok: boolean; texto: string; reactivar?: boolean } {
  if (j.enviados) return { ok: true, texto: "Aviso enviado. Si en unos segundos no te llega, revisa que las notificaciones de Chrome (o del estudio en iPhone) estén permitidas y que No molestar esté apagado." };
  const f = j.fallas?.[0];
  if (!f) return { ok: false, texto: "Este celular no estaba anotado. Toca «Volver a activar».", reactivar: true };
  if (f.status === 401 || f.status === 403) return { ok: false, texto: "El servicio de avisos rechazó las claves (cambiaron desde que activaste). Toca «Volver a activar».", reactivar: true };
  if (f.status === 404 || f.status === 410) return { ok: false, texto: "Este celular dejó de estar suscrito. Toca «Volver a activar».", reactivar: true };
  if (f.status === 0) return { ok: false, texto: `No salió el aviso: ${f.detalle}` };
  return { ok: false, texto: `No salió el aviso: el servicio respondió ${f.status}. Prueba «Volver a activar».`, reactivar: true };
}

export function AvisosCelular({ clavePublica, compacto = false }: { clavePublica?: string; compacto?: boolean }) {
  const [estado, setEstado] = useState<Estado>("cargando");
  const [nota, setNota] = useState<{ ok: boolean; texto: string; reactivar?: boolean } | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setEstado("sin-soporte");
    navigator.serviceWorker.getRegistration("/estudio/").then(async (r) => {
      const s = await r?.pushManager.getSubscription();
      // Si las claves cambiaron desde que se activó, la suscripción vieja ya no sirve.
      const vigente = !!s && !!clavePublica && igual(s.options.applicationServerKey, aBytes(clavePublica));
      setEstado(vigente && Notification.permission === "granted" ? "activo" : "apagado");
      if (s && !vigente && clavePublica) setNota({ ok: false, texto: "Las claves cambiaron: vuelve a activar los avisos.", reactivar: true });
    }).catch(() => setEstado("apagado"));
  }, [clavePublica]);

  async function enviar(suscripcion: PushSubscription) {
    const equipo = /iphone|ipad/i.test(navigator.userAgent) ? "iPhone" : /android/i.test(navigator.userAgent) ? "Android" : "Computadora";
    const res = await fetch("/estudio/avisos", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ suscripcion: suscripcion.toJSON(), equipo }) });
    const j = (await res.json().catch(() => ({}))) as Respuesta;
    if (!res.ok) throw new Error(j.error ?? "No se pudo guardar este celular.");
    return explicar(j);
  }

  async function activar(deCero = false) {
    if (!clavePublica) return;
    setEstado("trabajando");
    setNota({ ok: true, texto: "Pidiendo permiso para avisarte…" });
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") throw new Error("No diste permiso. Actívalo en los ajustes del navegador para este sitio y vuelve a intentar.");
      const r = await navigator.serviceWorker.register("/sw-estudio.js", { scope: "/estudio/" });
      await navigator.serviceWorker.ready;
      let s = await r.pushManager.getSubscription();
      if (s && (deCero || !igual(s.options.applicationServerKey, aBytes(clavePublica)))) { await s.unsubscribe(); s = null; }
      s ??= await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aBytes(clavePublica) });
      setNota({ ok: true, texto: "Guardando este celular y mandando un aviso de prueba…" });
      const n = await enviar(s);
      setEstado("activo");
      setNota(n);
    } catch (e) {
      setEstado("apagado");
      setNota({ ok: false, texto: (e as Error).message });
    }
  }

  async function probar() {
    setEstado("trabajando");
    setNota({ ok: true, texto: "Mandando un aviso de prueba…" });
    try {
      const s = await (await navigator.serviceWorker.getRegistration("/estudio/"))?.pushManager.getSubscription();
      if (!s) throw new Error("Este celular no está suscrito. Toca «Volver a activar».");
      setNota(await enviar(s));
    } catch (e) {
      setNota({ ok: false, texto: (e as Error).message, reactivar: true });
    } finally {
      setEstado("activo");
    }
  }

  if (estado === "cargando") return null;
  // En la tanda (compacto) solo aparece si falta activarlo: ahí lo importante es despachar.
  if (compacto && (estado === "activo" || estado === "sin-soporte" || !clavePublica) && !nota) return null;
  const boton = "inline-flex min-h-10 items-center rounded-full px-4 text-[13px] font-medium transition disabled:opacity-50";
  const claro = `${boton} bg-white shadow-[inset_0_0_0_1px_var(--color-borde)]`;
  return (
    <div className="grid w-full gap-2" aria-label="Avisos en el celular">
      {!clavePublica ? (
        <p className="text-[12px] text-suave">Falta configurarlos: Jay pone <code className="font-mono">VAPID_PUBLICA</code> y <code className="font-mono">VAPID_PRIVADA</code> en Vercel.</p>
      ) : estado === "sin-soporte" ? (
        <p className="text-[12px] text-suave">Este navegador no recibe avisos. En iPhone: Compartir → «Agregar a inicio», abre el estudio desde ese ícono y vuelve aquí.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {estado === "activo" && <span className="text-[13px] text-[#17714a]">Activados en este celular.</span>}
          {estado === "apagado" && <button type="button" onClick={() => void activar()} className={`${boton} bg-tinta text-white`}>Avisarme en este celular</button>}
          {estado === "trabajando" && <span className="text-[13px] text-medio">Un momento…</span>}
          {estado === "activo" && <button type="button" onClick={() => void probar()} className={claro}>Mandar aviso de prueba</button>}
          {nota?.reactivar && estado !== "trabajando" && <button type="button" onClick={() => void activar(true)} className={claro}>Volver a activar</button>}
        </div>
      )}
      {nota && <p role="status" className={`text-[12px] ${nota.ok ? "text-medio" : "text-[#a33a0b]"}`}>{nota.texto}</p>}
    </div>
  );
}
