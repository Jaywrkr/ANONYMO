"use client";

// El editor de video (sistema/62). Sin línea de tiempo: el video se edita tocando el texto.
// La vista previa es instantánea: reproduce el original saltando los cortes y dibuja los subtítulos encima,
// con las mismas cuentas y medidas que el render final.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { aEditado, aOriginal, edicionSegura, motivoPalabra, planEdicion, textoHuella } from "@anonymo/pipeline/src/video/edicion.ts";
import { estiloSub, PLANTILLAS_SUB } from "@anonymo/pipeline/src/video/subtitulos.ts";
import { FORMATOS_VIDEO, type Edicion, type FormatoVideo, type MensajeVideo, type Ocupado, type ResultadoVideo, type TrabajoVideo } from "@anonymo/pipeline/src/video/tipos.ts";
import { Espera, mmss } from "./Espera";

const ACENTOS = ["#ffd43b", "#ffffff", "#2bb673", "#ff5a1f", "#4f8cff", "#ff6fb1"];
const NOMBRE_FORMATO: Record<FormatoVideo, string> = { "9:16": "Vertical 9:16", "1:1": "Cuadrado 1:1", "16:9": "Horizontal 16:9" };
const USO_FORMATO: Record<FormatoVideo, string> = { "9:16": "Reels, TikTok, Shorts, historias", "1:1": "Feed de Instagram y LinkedIn", "16:9": "YouTube y web" };
const tarjeta = "rounded-[18px] bg-white p-4 shadow-[0_0_0_1px_rgba(26,24,22,.06)] md:p-5";
const chip = (activo: boolean) => `inline-flex min-h-10 items-center justify-center rounded-full px-4 text-[13px] transition ${activo ? "bg-tinta text-white" : "bg-hueso text-tinta hover:bg-[#e4e1da]"}`;

async function sha(texto: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

/** Un aviso que sobrevive a la recarga del editor (al terminar de transcribir, la página trae el texto nuevo). */
const avisoPendiente = new Map<string, { tipo: "ok" | "error"; texto: string }>();

type Paso = { titulo: string; texto?: string; avance?: number; desde: number; estimado?: number };

export function EditorVideo({ inicial, whisper }: { inicial: TrabajoVideo; whisper: boolean }) {
  const router = useRouter();
  const t = inicial;
  const [ed, setEd] = useState<Edicion>(() => edicionSegura(t.edicion, t.edicion));
  // La edición de ahora, para los pasos que corren después de un cambio de Atlas (sin esperar otro render).
  const edRef = useRef(ed);
  edRef.current = ed;
  const [historial, setHistorial] = useState<number[][]>([]);
  const [formato, setFormato] = useState<FormatoVideo>(() => ((t.alto ?? 16) > (t.ancho ?? 9) ? "9:16" : "16:9"));
  const [guardado, setGuardado] = useState<"si" | "guardando" | "error">("si");
  const [paso, setPaso] = useState<Paso | null>(null);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(() => {
    const p = avisoPendiente.get(t.id);
    return p ?? (t.error ? { tipo: "error", texto: t.error } : null);
  });
  const [resultados, setResultados] = useState<ResultadoVideo[]>(t.resultados);
  const [huellas, setHuellas] = useState<Partial<Record<FormatoVideo, string>>>({});
  const [listo, setListo] = useState(false);
  const [desdeTexto, setDesdeTexto] = useState<number | null>(null);
  useEffect(() => { setListo(true); avisoPendiente.delete(t.id); }, [t.id]);

  const duracion = t.duracion ?? 0;
  const plan = useMemo(() => planEdicion(t.transcripcion, ed, duracion, formato === "9:16"), [t.transcripcion, ed, duracion, formato]);
  const quitadas = useMemo(() => new Set(ed.quitadas), [ed.quitadas]);

  // ——— Guardar la edición (al rato de cada cambio) ———
  const pendiente = useRef<Promise<boolean> | null>(null);
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ultima = useRef(JSON.stringify(ed));
  const guardar = useCallback(async (e: Edicion) => {
    const texto = JSON.stringify(e);
    if (texto === ultima.current) return true;
    setGuardado("guardando");
    const p = fetch(`/estudio/video/${t.id}/edicion`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ edicion: e }) })
      .then((r) => { if (r.ok) { ultima.current = texto; setGuardado("si"); return true; } setGuardado("error"); return false; })
      .catch(() => { setGuardado("error"); return false; });
    pendiente.current = p;
    return p;
  }, [t.id]);
  const cambiar = useCallback((f: (e: Edicion) => Edicion) => {
    setEd((e) => {
      const n = edicionSegura(f(e), e);
      if (reloj.current) clearTimeout(reloj.current);
      reloj.current = setTimeout(() => void guardar(n), 600);
      return n;
    });
  }, [guardar]);
  // Al salir con cambios sin guardar, avisa.
  useEffect(() => {
    const f = (e: BeforeUnloadEvent) => { if (guardado !== "si" || paso) { e.preventDefault(); } };
    addEventListener("beforeunload", f);
    return () => removeEventListener("beforeunload", f);
  }, [guardado, paso]);

  // ¿Cada resultado corresponde a la edición de ahora?
  useEffect(() => {
    let vivo = true;
    Promise.all(FORMATOS_VIDEO.map(async (f) => [f, await sha(textoHuella({ edicion: ed, transcripcion: t.transcripcion, duracion: t.duracion }, f))] as const)).then((xs) => vivo && setHuellas(Object.fromEntries(xs)));
    return () => { vivo = false; };
  }, [ed, t.transcripcion, t.duracion]);

  // ——— Pasos pesados: se piden y se sigue su avance ———
  const seguir = useCallback((desde: number, titulo: string, estimado?: number) => {
    let sigue = true;
    const vuelta = async () => {
      while (sigue) {
        await new Promise((r) => setTimeout(r, 1500));
        if (!sigue) break;
        try {
          const r = await fetch(`/estudio/video/${t.id}/estado`, { cache: "no-store" });
          const j = (await r.json()) as { ocupado?: Ocupado; resultados?: ResultadoVideo[] };
          if (j.ocupado) setPaso({ titulo, texto: j.ocupado.texto, avance: j.ocupado.avance, desde, estimado });
        } catch {}
      }
    };
    void vuelta();
    return () => { sigue = false; };
  }, [t.id]);

  const correr = useCallback(async (cuerpo: { paso: "transcribir" | "render"; formato?: FormatoVideo }): Promise<boolean> => {
    const desde = Date.now();
    const titulo = cuerpo.paso === "transcribir" ? "Transcribiendo el video" : `Armando el ${NOMBRE_FORMATO[cuerpo.formato!].toLowerCase()}`;
    const estimado = Math.round(cuerpo.paso === "transcribir" ? 12 + duracion * 0.35 : 8 + duracion * 1.1);
    setAviso(null);
    setPaso({ titulo, texto: "Empezando", desde, estimado });
    if (cuerpo.paso === "render") {
      // Lo que se arma es lo que está guardado: primero se guarda lo último.
      if (reloj.current) clearTimeout(reloj.current);
      if (!(await guardar(edRef.current))) { setPaso(null); setAviso({ tipo: "error", texto: "No se pudo guardar la edición. Revisa la conexión y vuelve a intentarlo." }); return false; }
    }
    const parar = seguir(desde, titulo, estimado);
    try {
      const r = await fetch(`/estudio/video/${t.id}/paso`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cuerpo) });
      const j = (await r.json().catch(() => ({}))) as { error?: string; resultado?: ResultadoVideo };
      if (!r.ok) throw new Error(j.error ?? `No se pudo terminar (${r.status}).`);
      const s = Math.round((Date.now() - desde) / 1000);
      if (cuerpo.paso === "transcribir") {
        const listo = { tipo: "ok" as const, texto: `Listo: transcrito en ${mmss(s)}. Ya quitamos las pausas largas; revisa la vista previa.` };
        avisoPendiente.set(t.id, listo);
        setAviso(listo);
        router.refresh();
      } else if (j.resultado) {
        setResultados((rs) => [...rs.filter((x) => x.formato !== cuerpo.formato), j.resultado!]);
        setAviso({ tipo: "ok", texto: `Listo: ${NOMBRE_FORMATO[cuerpo.formato!]} armado en ${mmss(s)}. Ya puedes descargarlo.` });
      }
      return true;
    } catch (e) {
      setAviso({ tipo: "error", texto: (e as Error).message });
      return false;
    } finally {
      parar();
      setPaso(null);
    }
  }, [duracion, guardar, router, seguir, t.id]);

  // Si al abrir la página ya había un paso trabajando (otra pestaña, o recargaste), se espera a que termine.
  useEffect(() => {
    if (!t.ocupado) return;
    const desde = Date.parse(t.ocupado.desde) || Date.now();
    const titulo = t.ocupado.paso === "transcribir" ? "Transcribiendo el video" : `Armando el ${NOMBRE_FORMATO[t.ocupado.formato ?? "9:16"].toLowerCase()}`;
    setPaso({ titulo, texto: t.ocupado.texto, avance: t.ocupado.avance, desde });
    let sigue = true;
    (async () => {
      while (sigue) {
        await new Promise((r) => setTimeout(r, 1500));
        try {
          const j = (await (await fetch(`/estudio/video/${t.id}/estado`, { cache: "no-store" })).json()) as { ocupado?: Ocupado; error?: string };
          if (!j.ocupado) { sigue = false; setPaso(null); if (j.error) setAviso({ tipo: "error", texto: j.error }); router.refresh(); break; }
          setPaso({ titulo, texto: j.ocupado.texto, avance: j.ocupado.avance, desde });
        } catch {}
      }
    })();
    return () => { sigue = false; };
  }, [router, t.id, t.ocupado]);

  // Recién subido: se transcribe solo (una vez).
  const arrancado = useRef(false);
  useEffect(() => {
    if (arrancado.current || t.ocupado || t.transcripcion || t.estado !== "subido" || t.error || !whisper) return;
    arrancado.current = true;
    void correr({ paso: "transcribir" });
  }, [correr, t.estado, t.error, t.ocupado, t.transcripcion, whisper]);

  // ——— Atlas (sistema/63): Luna escribe lo que quiere y Atlas cambia la edición ———
  const [charla, setCharla] = useState<MensajeVideo[]>(t.conversacion ?? []);
  const [pedido, setPedido] = useState("");
  const [deshacerAtlas, setDeshacerAtlas] = useState<Edicion | null>(null);
  // El chat siempre muestra lo último.
  const listaChat = useRef<HTMLOListElement>(null);
  useEffect(() => { const l = listaChat.current; if (l) l.scrollTop = l.scrollHeight; }, [charla]);
  const pedirAtlas = useCallback(async (texto: string, inicial = false) => {
    const limpio = texto.trim();
    if (!limpio || paso) return;
    const desde = Date.now();
    setAviso(null);
    setPaso({ titulo: "Atlas está leyendo tu pedido", texto: "Revisando el texto del video y la edición de ahora", desde, estimado: 15 });
    // Atlas parte de lo último que hizo Luna: primero se guarda.
    if (reloj.current) clearTimeout(reloj.current);
    if (!(await guardar(edRef.current))) { setPaso(null); setAviso({ tipo: "error", texto: "No se pudo guardar la edición. Revisa la conexión y vuelve a intentarlo." }); return; }
    let armar: FormatoVideo[] = [];
    try {
      const r = await fetch(`/estudio/video/${t.id}/atlas`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ texto: limpio, inicial }) });
      const j = (await r.json().catch(() => ({}))) as { error?: string; edicion?: Edicion; anterior?: Edicion; cambios?: string[]; armar?: FormatoVideo[]; mensajes?: MensajeVideo[] };
      if (j.mensajes) setCharla((c) => [...c, ...j.mensajes!]);
      if (!r.ok || !j.edicion) throw new Error(j.error ?? `Atlas no pudo responder (${r.status}).`);
      const nueva = edicionSegura(j.edicion, j.edicion);
      ultima.current = JSON.stringify(nueva);
      setEd(nueva);
      setGuardado("si");
      if (j.cambios?.length) { setDeshacerAtlas(j.anterior ? edicionSegura(j.anterior, j.anterior) : null); setHistorial([]); }
      setPedido("");
      armar = j.armar ?? [];
      setAviso(j.cambios?.length ? { tipo: "ok", texto: `Atlas hizo ${j.cambios.length === 1 ? "1 cambio" : `${j.cambios.length} cambios`}. Revisa la vista previa.` } : null);
    } catch (e) {
      setAviso({ tipo: "error", texto: (e as Error).message });
    } finally {
      setPaso(null);
    }
    // Si pidió el video final, se arma cada formato, uno detrás de otro.
    for (const f of armar) {
      await new Promise((ok) => setTimeout(ok, 50));
      if (!(await correr({ paso: "render", formato: f }))) break;
    }
  }, [correr, guardar, paso, t.id]);
  const deshacerLoDeAtlas = () => {
    if (!deshacerAtlas) return;
    cambiar(() => deshacerAtlas);
    setDeshacerAtlas(null);
    setAviso({ tipo: "ok", texto: "Volvimos a la edición de antes del último pedido a Atlas." });
  };
  // El pedido que Luna escribió al subir: se aplica solo, una vez, apenas hay texto.
  const pedidoInicial = useRef(false);
  const pedirAtlasRef = useRef(pedirAtlas);
  pedirAtlasRef.current = pedirAtlas;
  useEffect(() => {
    if (!t.transcripcion || !t.pedido || t.pedidoAplicado || t.ocupado) return;
    const id = setTimeout(() => {
      if (pedidoInicial.current) return;
      pedidoInicial.current = true;
      void pedirAtlasRef.current(t.pedido!, true);
    }, 300);
    return () => clearTimeout(id);
  }, [t.ocupado, t.pedido, t.pedidoAplicado, t.transcripcion]);

  // ——— Vista previa ———
  const video = useRef<HTMLVideoElement>(null);
  const [te, setTe] = useState(0);
  const [sonando, setSonando] = useState(false);
  useEffect(() => {
    let id = 0;
    const v = video.current;
    const paso = () => {
      if (v && !v.paused) {
        const x = v.currentTime;
        const dentro = plan.tramos.find((r) => x >= r.inicio - 0.01 && x < r.fin - 0.02);
        if (!dentro) {
          const siguiente = plan.tramos.find((r) => r.inicio > x);
          if (siguiente) v.currentTime = siguiente.inicio;
          else { v.pause(); v.currentTime = plan.tramos[0]?.inicio ?? 0; }
        }
        setTe(aEditado(v.currentTime, plan.tramos));
      }
      id = requestAnimationFrame(paso);
    };
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
  }, [plan.tramos]);
  const ir = (tEditado: number) => { const v = video.current; if (!v) return; v.currentTime = aOriginal(Math.max(0, Math.min(plan.duracion, tEditado)), plan.tramos); setTe(tEditado); };
  const tocar = () => { const v = video.current; if (!v) return; if (v.paused) { if (te >= plan.duracion - 0.05) ir(0); void v.play(); } else v.pause(); };

  const grupo = plan.grupos.find((g) => te >= g.inicio && te < g.fin);
  const estilo = estiloSub(ed.subtitulos, formato);
  const pl = estilo.plantilla;
  const tOriginal = aOriginal(te, plan.tramos);
  const palabraViva = t.transcripcion?.palabras.findIndex((p) => tOriginal >= p.inicio && tOriginal < p.fin) ?? -1;

  // ——— Texto: tocar una palabra la quita o la devuelve; con Mayús se toma un tramo ———
  const tocarPalabra = (i: number, mayus: boolean) => {
    const p = t.transcripcion!.palabras[i];
    if (!quitadas.has(i) && motivoPalabra(i, p, { ...ed, quitadas: [] }) === "muletilla") {
      setAviso({ tipo: "ok", texto: "Esa muletilla se quita sola. Si quieres dejarla, apaga «Quitar muletillas»." });
      return;
    }
    setHistorial((h) => [...h.slice(-30), ed.quitadas]);
    if (mayus && desdeTexto !== null) {
      const [a, b] = [Math.min(desdeTexto, i), Math.max(desdeTexto, i)];
      const rango = Array.from({ length: b - a + 1 }, (_, k) => a + k);
      const quitar = !quitadas.has(i);
      cambiar((e) => ({ ...e, quitadas: quitar ? [...e.quitadas, ...rango] : e.quitadas.filter((n) => n < a || n > b) }));
    } else {
      cambiar((e) => ({ ...e, quitadas: quitadas.has(i) ? e.quitadas.filter((n) => n !== i) : [...e.quitadas, i] }));
    }
    setDesdeTexto(i);
  };
  const deshacer = () => setHistorial((h) => { const u = h[h.length - 1]; if (u) cambiar((e) => ({ ...e, quitadas: u })); return h.slice(0, -1); });

  const fuente = t.original ? `/estudio/video/${t.id}/archivo/${t.original}` : "";
  const r = plan.resumen;

  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start">
      {paso && <Espera titulo={paso.titulo} texto={paso.texto} avance={paso.avance} desde={paso.desde} estimado={paso.estimado} />}

      {/* Vista previa */}
      <section aria-label="Vista previa" className="lg:sticky lg:top-5">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Formato de la vista previa">
          {FORMATOS_VIDEO.map((f) => (
            <button key={f} role="tab" aria-selected={formato === f} disabled={!listo} onClick={() => setFormato(f)} className={chip(formato === f)}>{f}</button>
          ))}
        </div>
        <div className="mx-auto mt-3 w-full" style={{ maxWidth: formato === "9:16" ? 340 : formato === "1:1" ? 420 : 520 }}>
          <div className="relative w-full overflow-hidden rounded-[14px] bg-noche" style={{ aspectRatio: formato.replace(":", " / "), containerType: "size" }}>
            {fuente && t.estado !== "subiendo" ? (
              <video ref={video} src={fuente} playsInline preload="auto" className="absolute inset-0 h-full w-full object-cover" onPlay={() => setSonando(true)} onPause={() => setSonando(false)} onClick={tocar} />
            ) : (
              <div className="absolute inset-0 grid place-items-center p-6 text-center text-[13px] text-white/70">El video no terminó de subir.</div>
            )}
            {grupo && (
              <div aria-hidden className="pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-1/2 text-center leading-[1.15]" style={{ top: `${estilo.y * 100}%`, width: `${(1 - 2 * estilo.margen) * 100}%`, fontSize: `${estilo.tamano * 100}cqh`, fontWeight: pl.peso, fontFamily: "var(--font-geist-sans), sans-serif", letterSpacing: pl.id === "marca" ? "-0.01em" : 0 }}>
                <span style={pl.caja ? { background: "rgba(0,0,0,.78)", padding: "0.12em 0.35em", borderRadius: "0.12em", WebkitBoxDecorationBreak: "clone", boxDecorationBreak: "clone", color: "#fff" } : { color: "#fff", WebkitTextStroke: `${pl.id === "marca" ? 0.16 : 0.12}em #000`, paintOrder: "stroke fill", textShadow: "0 0.06em 0.1em rgba(0,0,0,.45)" }}>
                  {grupo.palabras.map((w, k) => {
                    const activa = pl.resalta && (te >= w.inicio || k === 0) && (k + 1 >= grupo.palabras.length || te < grupo.palabras[k + 1].inicio);
                    return <span key={k} style={activa ? { color: ed.subtitulos.acento } : undefined}>{k ? " " : ""}{pl.mayusculas ? w.texto.toLocaleUpperCase("es") : w.texto}</span>;
                  })}
                </span>
              </div>
            )}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button onClick={tocar} disabled={!listo || !t.transcripcion} aria-label={sonando ? "Pausar" : "Reproducir"} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-tinta text-white disabled:opacity-40">
              {sonando ? <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden><rect x="2" y="1" width="3.5" height="12" fill="currentColor" /><rect x="8.5" y="1" width="3.5" height="12" fill="currentColor" /></svg> : <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden><path d="M3 1l10 6-10 6z" fill="currentColor" /></svg>}
            </button>
            <input type="range" min={0} max={Math.max(0.1, plan.duracion)} step={0.05} value={Math.min(te, plan.duracion)} onChange={(e) => ir(Number(e.target.value))} disabled={!t.transcripcion} aria-label="Avanzar en el video editado" className="min-w-0 flex-1 accent-[var(--color-tinta)]" />
            <span className="shrink-0 font-mono text-[12px] text-medio">{mmss(te)} / {mmss(plan.duracion)}</span>
          </div>
          {t.transcripcion && (
            <p className="mt-2 text-[13px] text-medio">
              Queda <b className="font-medium text-tinta">{mmss(r.queda)}</b> de {mmss(duracion)}.
              {r.quitado > 0 ? ` Quitamos ${Math.round(r.quitado)} s: ${[r.por.silencio + r.por.inicio + r.por.final > 0.5 ? `${Math.round(r.por.silencio + r.por.inicio + r.por.final)} s de pausas` : "", r.por.muletilla > 0.05 ? `${(Math.round(r.por.muletilla * 10) / 10).toLocaleString("es")} s de muletillas` : "", r.por.texto > 0.05 ? `${Math.round(r.por.texto)} s de texto que quitaste` : ""].filter(Boolean).join(", ")}.` : " Todavía no se quita nada."}
            </p>
          )}
          <p className="mt-1 text-[12px] text-suave">Vista previa rápida: se ve al instante. El video final sale con la misma edición en alta calidad.</p>
        </div>
      </section>

      <div className="grid gap-4">
        {aviso && (
          <p role={aviso.tipo === "error" ? "alert" : "status"} className={`flex items-start justify-between gap-3 rounded-xl px-4 py-3 text-[14px] ${aviso.tipo === "error" ? "bg-[#fff1ea] text-[#a33a0b]" : "bg-[#e6f6ee] text-[#17714a]"}`}>
            <span>{aviso.texto}</span>
            <button onClick={() => setAviso(null)} className="shrink-0 text-[12px] underline">Cerrar</button>
          </p>
        )}

        {/* Sin transcripción: qué falta */}
        {!t.transcripcion && !paso && (
          <section className={tarjeta}>
            <h2 className="text-[16px] font-medium">Transcripción</h2>
            {!whisper ? (
              <p className="mt-2 text-[14px] text-medio">Falta la clave de transcripción (OPENAI_API_KEY). Jay la pone en Vercel; después vuelve a esta página y toca «Transcribir».</p>
            ) : t.estado === "subiendo" ? (
              <p className="mt-2 text-[14px] text-medio">El video no terminó de subir. Vuelve a la lista y súbelo de nuevo.</p>
            ) : (
              <p className="mt-2 text-[14px] text-medio">Para cortar y poner subtítulos primero hay que escuchar el video.</p>
            )}
            <button disabled={!listo || !whisper || t.estado === "subiendo"} onClick={() => void correr({ paso: "transcribir" })} className="mt-3 inline-flex min-h-11 items-center rounded-full bg-tinta px-5 text-[13px] font-medium text-white disabled:opacity-40">
              {t.error ? "Intentar de nuevo" : "Transcribir"}
            </button>
          </section>
        )}

        {t.transcripcion && (
          <>
            <section className={tarjeta} aria-labelledby="titulo-atlas">
              <div className="flex items-center gap-2">
                <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-tinta font-serif text-[17px] text-white">A</span>
                <h2 id="titulo-atlas" className="text-[16px] font-medium">Pídeselo a Atlas</h2>
              </div>
              <p className="mt-1 text-[13px] text-medio">Escribe lo que quieres como se lo dirías a alguien del equipo. Atlas cambia la edición y tú lo ves al instante en la vista previa.</p>
              {charla.length > 0 && (
                <ol ref={listaChat} aria-label="Conversación con Atlas" aria-live="polite" className="mt-3 grid max-h-[38vh] gap-2 overflow-y-auto rounded-xl bg-carta p-3">
                  {charla.map((m, i) => (
                    <li key={i} className={`max-w-[92%] rounded-2xl px-3 py-2 text-[14px] ${m.quien === "atlas" ? (m.error ? "bg-[#fff1ea] text-[#a33a0b]" : "bg-white shadow-[0_0_0_1px_rgba(26,24,22,.06)]") : "ml-auto bg-tinta text-white"}`}>
                      <span className="sr-only">{m.quien === "atlas" ? "Atlas: " : "Tú: "}</span>
                      {m.texto}
                      {!!m.cambios?.length && (
                        <ul className="mt-1.5 grid gap-0.5 text-[13px] text-medio">
                          {m.cambios.map((c, k) => <li key={k}>✓ {c}</li>)}
                        </ul>
                      )}
                      {!!m.noSePuede?.length && (
                        <ul className="mt-1.5 grid gap-0.5 text-[13px] text-[#a35a0b]">
                          {m.noSePuede.map((c, k) => <li key={k}>Todavía no: {c}</li>)}
                        </ul>
                      )}
                    </li>
                  ))}
                </ol>
              )}
              <form onSubmit={(e) => { e.preventDefault(); void pedirAtlas(pedido); }} className="mt-3">
                <label htmlFor="pedido-atlas" className="sr-only">Pedido para Atlas</label>
                <textarea
                  id="pedido-atlas"
                  value={pedido}
                  onChange={(e) => setPedido(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void pedirAtlas(pedido); } }}
                  rows={2}
                  maxLength={2000}
                  disabled={!listo || !!paso}
                  placeholder="Por ejemplo: corta los silencios, subtítulos estilo marca más grandes y expórtalo vertical"
                  className="w-full resize-y rounded-xl bg-white px-3.5 py-3 text-[15px] text-tinta shadow-[inset_0_0_0_1px_var(--color-borde)] outline-none placeholder:text-[#b3ab9f] focus:shadow-[inset_0_0_0_1.5px_var(--color-tinta)] disabled:opacity-60"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button type="submit" disabled={!listo || !!paso || !pedido.trim()} className="inline-flex min-h-11 items-center rounded-full bg-tinta px-5 text-[13px] font-medium text-white disabled:opacity-40">Pedir a Atlas</button>
                  {deshacerAtlas && <button type="button" onClick={deshacerLoDeAtlas} disabled={!!paso} className="inline-flex min-h-11 items-center rounded-full bg-hueso px-4 text-[13px] disabled:opacity-40">Deshacer lo de Atlas</button>}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Ideas rápidas">
                  {["Más dinámico", "Subtítulos más grandes", "Quita la parte del inicio", "Sin subtítulos", "Expórtalo en los tres formatos"].map((x) => (
                    <button key={x} type="button" disabled={!listo || !!paso} onClick={() => setPedido(x)} className="inline-flex min-h-9 items-center rounded-full bg-hueso px-3 text-[12px] text-medio hover:text-tinta disabled:opacity-40">{x}</button>
                  ))}
                </div>
              </form>
            </section>

            <section className={tarjeta} aria-labelledby="titulo-texto">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="titulo-texto" className="text-[16px] font-medium">Texto del video</h2>
                <span className="text-[12px] text-suave" aria-live="polite">{guardado === "guardando" ? "Guardando…" : guardado === "error" ? "No se guardó: revisa la conexión" : "Guardado"}</span>
              </div>
              <p className="mt-1 text-[13px] text-medio">Toca una palabra para quitarla del video; tócala otra vez para devolverla. Con Mayús quitas desde la última que tocaste hasta esta.</p>
              <p className="mt-3 max-h-[46vh] overflow-y-auto rounded-xl bg-carta p-3 text-[16px] leading-[1.9]">
                {t.transcripcion.palabras.map((p, i) => {
                  const m = motivoPalabra(i, p, ed, quitadas);
                  return (
                    <button
                      key={i}
                      disabled={!listo}
                      onClick={(e) => tocarPalabra(i, e.shiftKey)}
                      title={m === "muletilla" ? "Muletilla: se quita sola" : m ? "Quitada: toca para devolverla" : `${mmss(p.inicio)} · toca para quitarla`}
                      className={`mr-[0.28em] rounded px-[2px] transition ${m === "texto" ? "text-[#c2410c] line-through decoration-2" : m === "muletilla" ? "text-suave line-through" : "hover:bg-hueso"} ${i === palabraViva ? "bg-[#fff3bf]" : ""}`}
                    >
                      {p.texto}
                    </button>
                  );
                })}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button disabled={!historial.length} onClick={deshacer} className="inline-flex min-h-10 items-center rounded-full bg-hueso px-4 text-[13px] disabled:opacity-40">Deshacer</button>
                <button disabled={!ed.quitadas.length} onClick={() => { setHistorial((h) => [...h, ed.quitadas]); cambiar((e) => ({ ...e, quitadas: [] })); }} className="inline-flex min-h-10 items-center rounded-full bg-hueso px-4 text-[13px] disabled:opacity-40">Devolver todo el texto</button>
              </div>
            </section>

            <section className={tarjeta} aria-labelledby="titulo-cortes">
              <h2 id="titulo-cortes" className="text-[16px] font-medium">Cortes</h2>
              <label className="mt-3 flex min-h-11 items-center gap-3 text-[14px]">
                <input type="checkbox" checked={ed.silencios} onChange={(e) => cambiar((x) => ({ ...x, silencios: e.target.checked }))} className="h-5 w-5 accent-[var(--color-tinta)]" />
                Quitar pausas largas
              </label>
              {ed.silencios && (
                <label className="ml-8 block text-[13px] text-medio">
                  Pausas de más de <b className="font-medium text-tinta">{ed.pausaMax.toLocaleString("es", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} s</b> {ed.pausaMax <= 0.4 ? "(ritmo muy rápido)" : ed.pausaMax >= 1.2 ? "(ritmo pausado)" : "(ritmo de redes)"}
                  <input type="range" min={0.3} max={2} step={0.1} value={ed.pausaMax} onChange={(e) => cambiar((x) => ({ ...x, pausaMax: Number(e.target.value) }))} className="mt-1 block w-full max-w-xs accent-[var(--color-tinta)]" />
                </label>
              )}
              <label className="mt-2 flex min-h-11 items-center gap-3 text-[14px]">
                <input type="checkbox" checked={ed.muletillas} onChange={(e) => cambiar((x) => ({ ...x, muletillas: e.target.checked }))} className="h-5 w-5 accent-[var(--color-tinta)]" />
                Quitar muletillas («eh», «mmm»…)
              </label>
            </section>

            <section className={tarjeta} aria-labelledby="titulo-subs">
              <div className="flex items-center justify-between gap-3">
                <h2 id="titulo-subs" className="text-[16px] font-medium">Subtítulos</h2>
                <label className="flex min-h-11 items-center gap-2 text-[14px]">
                  <input type="checkbox" checked={ed.subtitulos.activos} onChange={(e) => cambiar((x) => ({ ...x, subtitulos: { ...x.subtitulos, activos: e.target.checked } }))} className="h-5 w-5 accent-[var(--color-tinta)]" />
                  Poner subtítulos
                </label>
              </div>
              {ed.subtitulos.activos && (
                <>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {PLANTILLAS_SUB.map((p) => (
                      <button key={p.id} onClick={() => cambiar((x) => ({ ...x, subtitulos: { ...x.subtitulos, plantilla: p.id } }))} aria-pressed={ed.subtitulos.plantilla === p.id} className={`min-h-24 rounded-2xl p-3 text-left transition ${ed.subtitulos.plantilla === p.id ? "bg-tinta text-white" : "bg-hueso hover:bg-[#e4e1da]"}`}>
                        <span className="block text-[15px]" style={{ fontWeight: p.peso, textTransform: p.mayusculas ? "uppercase" : undefined }}>{p.nombre}</span>
                        <span className={`mt-1 block text-[12px] ${ed.subtitulos.plantilla === p.id ? "text-white/75" : "text-medio"}`}>{p.uso}</span>
                      </button>
                    ))}
                  </div>
                  {pl.resalta && (
                    <div className="mt-4">
                      <p className="text-[13px] text-medio">Color de la palabra que se dice</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {ACENTOS.map((c) => (
                          <button key={c} onClick={() => cambiar((x) => ({ ...x, subtitulos: { ...x.subtitulos, acento: c } }))} aria-label={`Color ${c}`} aria-pressed={ed.subtitulos.acento === c} className={`h-10 w-10 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,.15)] ${ed.subtitulos.acento === c ? "outline outline-2 outline-offset-2 outline-tinta" : ""}`} style={{ background: c }} />
                        ))}
                        <label className="ml-1 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full bg-hueso px-3 text-[13px]">
                          Otro
                          <input type="color" value={ed.subtitulos.acento} onChange={(e) => cambiar((x) => ({ ...x, subtitulos: { ...x.subtitulos, acento: e.target.value } }))} className="h-6 w-8 cursor-pointer border-0 bg-transparent p-0" />
                        </label>
                      </div>
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
                    <div>
                      <p className="text-[13px] text-medio">Tamaño</p>
                      <div className="mt-2 flex gap-2">
                        {([["Chico", 0.8], ["Normal", 1], ["Grande", 1.25]] as const).map(([n, v]) => (
                          <button key={n} onClick={() => cambiar((x) => ({ ...x, subtitulos: { ...x.subtitulos, tamano: v } }))} aria-pressed={ed.subtitulos.tamano === v} className={chip(ed.subtitulos.tamano === v)}>{n}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[13px] text-medio">Lugar</p>
                      <div className="mt-2 flex gap-2">
                        {([["Arriba", "arriba"], ["Centro", "centro"], ["Abajo", "abajo"]] as const).map(([n, v]) => (
                          <button key={v} onClick={() => cambiar((x) => ({ ...x, subtitulos: { ...x.subtitulos, posicion: v } }))} aria-pressed={ed.subtitulos.posicion === v} className={chip(ed.subtitulos.posicion === v)}>{n}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </section>

            <section className={tarjeta} aria-labelledby="titulo-audio">
              <h2 id="titulo-audio" className="text-[16px] font-medium">Sonido</h2>
              <label className="mt-2 flex min-h-11 items-center gap-3 text-[14px]">
                <input type="checkbox" checked={ed.audio.normalizar} onChange={(e) => cambiar((x) => ({ ...x, audio: { ...x.audio, normalizar: e.target.checked } }))} className="h-5 w-5 accent-[var(--color-tinta)]" />
                Volumen parejo, al nivel de redes
              </label>
              <label className="flex min-h-11 items-center gap-3 text-[14px]">
                <input type="checkbox" checked={ed.audio.limpiarRuido} onChange={(e) => cambiar((x) => ({ ...x, audio: { ...x.audio, limpiarRuido: e.target.checked } }))} className="h-5 w-5 accent-[var(--color-tinta)]" />
                Limpiar ruido de fondo (aire, ventilador)
              </label>
              <p className="text-[12px] text-suave">El sonido se escucha en el video final, no en la vista previa.</p>
            </section>

            <section className={tarjeta} aria-labelledby="titulo-exportar">
              <h2 id="titulo-exportar" className="text-[16px] font-medium">Video final</h2>
              <p className="mt-1 text-[13px] text-medio">Cada formato se arma aparte. Si cambias algo después, vuelve a armarlo.</p>
              <ul className="mt-3 grid gap-2">
                {FORMATOS_VIDEO.map((f) => {
                  const res = resultados.find((x) => x.formato === f);
                  const viejo = res && huellas[f] && res.huella !== huellas[f];
                  const enlace = res ? `/estudio/video/${t.id}/archivo/${res.archivo}` : "";
                  return (
                    <li key={f} className="flex flex-wrap items-center gap-3 rounded-2xl bg-carta p-3">
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-medium">{NOMBRE_FORMATO[f]}</span>
                        <span className="block text-[12px] text-suave">{res ? (viejo ? "Cambiaste la edición después de armarlo" : `Listo · ${Math.round(res.bytes / 1024 / 1024 * 10) / 10} MB`) : USO_FORMATO[f]}</span>
                      </span>
                      {res && !viejo && (
                        <>
                          <a href={enlace} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-full bg-white px-4 text-[13px] shadow-[inset_0_0_0_1px_var(--color-borde)]">Ver</a>
                          <a href={`${enlace}?descargar=${encodeURIComponent(`${t.nombre} ${f.replace(":", "x")}`)}`} className="inline-flex min-h-10 items-center rounded-full bg-tinta px-4 text-[13px] text-white">Descargar</a>
                        </>
                      )}
                      {(!res || viejo) && (
                        <button disabled={!listo || !!paso || guardado === "error"} onClick={() => void correr({ paso: "render", formato: f })} className="inline-flex min-h-10 items-center rounded-full bg-tinta px-4 text-[13px] text-white disabled:opacity-40">
                          {viejo ? "Volver a armar" : "Armar"}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
