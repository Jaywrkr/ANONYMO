"use client";

// El editor de video (sistema/62; por partes y sin transcripción desde sistema/64). Sin línea de tiempo:
// el video se divide en partes (cada tramo con voz o sonido) y se edita tocándolas o pidiéndoselo a Atlas.
// La vista previa es instantánea: reproduce el original saltando los cortes, con las mismas cuentas que el render.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { aEditado, aOriginal, edicionSegura, planEdicion, textoHuella, ZOOM, zoomDeTramos } from "@anonymo/pipeline/src/video/edicion.ts";
import type { KitVista } from "@/lib/video";
import { FORMATOS_VIDEO, type Edicion, type FormatoVideo, type MensajeVideo, type Ocupado, type ResultadoVideo, type TrabajoVideo } from "@anonymo/pipeline/src/video/tipos.ts";
import { Espera, mmss } from "./Espera";

const NOMBRE_FORMATO: Record<FormatoVideo, string> = { "9:16": "Vertical 9:16", "1:1": "Cuadrado 1:1", "16:9": "Horizontal 16:9" };
const USO_FORMATO: Record<FormatoVideo, string> = { "9:16": "Reels, TikTok, Shorts, historias", "1:1": "Feed de Instagram y LinkedIn", "16:9": "YouTube y web" };
const tarjeta = "rounded-[18px] bg-white p-4 shadow-[0_0_0_1px_rgba(26,24,22,.06)] md:p-5";
const chip = (activo: boolean) => `inline-flex min-h-10 items-center justify-center rounded-full px-4 text-[13px] transition ${activo ? "bg-tinta text-white" : "bg-hueso text-tinta hover:bg-[#e4e1da]"}`;

async function sha(texto: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

/** Un aviso que sobrevive a la recarga del editor (al terminar de escuchar, la página trae las partes). */
const avisoPendiente = new Map<string, { tipo: "ok" | "error"; texto: string }>();

type Paso = { titulo: string; texto?: string; avance?: number; desde: number; estimado?: number };

export function EditorVideo({ inicial, atlas, kits }: { inicial: TrabajoVideo; atlas: boolean; kits: KitVista[] }) {
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
  // La marca del video (sistema/65).
  const [marcaId, setMarcaId] = useState(t.marca ?? "");
  const kit = kits.find((k) => k.id === marcaId);
  const [desdeParte, setDesdeParte] = useState<number | null>(null);
  useEffect(() => { setListo(true); avisoPendiente.delete(t.id); }, [t.id]);

  const duracion = t.duracion ?? 0;
  const plan = useMemo(() => planEdicion(t.analisis, ed, duracion), [t.analisis, ed, duracion]);
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
    Promise.all(FORMATOS_VIDEO.map(async (f) => [f, await sha(textoHuella({ edicion: ed, analisis: t.analisis, duracion: t.duracion, marca: marcaId || undefined, kit: kit?.actualizado }, f))] as const)).then((xs) => vivo && setHuellas(Object.fromEntries(xs)));
    return () => { vivo = false; };
  }, [ed, t.analisis, t.duracion, marcaId, kit?.actualizado]);

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

  const correr = useCallback(async (cuerpo: { paso: "analizar" | "render"; formato?: FormatoVideo }): Promise<boolean> => {
    const desde = Date.now();
    const titulo = cuerpo.paso === "analizar" ? "Escuchando el video" : `Armando el ${NOMBRE_FORMATO[cuerpo.formato!].toLowerCase()}`;
    const estimado = Math.round(cuerpo.paso === "analizar" ? 8 + (t.bytes ?? 0) / 20e6 : 8 + duracion * 1.1);
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
      if (cuerpo.paso === "analizar") {
        const listo = { tipo: "ok" as const, texto: `Listo en ${mmss(s)}: dividimos el video en partes y quitamos las pausas largas. Revisa la vista previa.` };
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
  }, [duracion, guardar, router, seguir, t.bytes, t.id]);

  // Si al abrir la página ya había un paso trabajando (otra pestaña, o recargaste), se espera a que termine.
  useEffect(() => {
    if (!t.ocupado) return;
    const desde = Date.parse(t.ocupado.desde) || Date.now();
    const titulo = t.ocupado.paso === "analizar" ? "Escuchando el video" : `Armando el ${NOMBRE_FORMATO[t.ocupado.formato ?? "9:16"].toLowerCase()}`;
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

  // Recién subido: se escucha solo (una vez).
  const arrancado = useRef(false);
  useEffect(() => {
    if (arrancado.current || t.ocupado || t.analisis || t.estado !== "subido" || t.error) return;
    arrancado.current = true;
    void correr({ paso: "analizar" });
  }, [correr, t.analisis, t.estado, t.error, t.ocupado]);

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
    setPaso({ titulo: "Corte está leyendo tu pedido", texto: "Mirando las partes del video y la edición de ahora", desde, estimado: 15 });
    // Atlas parte de lo último que hizo Luna: primero se guarda.
    if (reloj.current) clearTimeout(reloj.current);
    if (!(await guardar(edRef.current))) { setPaso(null); setAviso({ tipo: "error", texto: "No se pudo guardar la edición. Revisa la conexión y vuelve a intentarlo." }); return; }
    let armar: FormatoVideo[] = [];
    try {
      const r = await fetch(`/estudio/video/${t.id}/atlas`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ texto: limpio, inicial }) });
      const j = (await r.json().catch(() => ({}))) as { error?: string; edicion?: Edicion; anterior?: Edicion; cambios?: string[]; armar?: FormatoVideo[]; mensajes?: MensajeVideo[] };
      if (j.mensajes) setCharla((c) => [...c, ...j.mensajes!]);
      if (!r.ok || !j.edicion) throw new Error(j.error ?? `Corte no pudo responder (${r.status}).`);
      const nueva = edicionSegura(j.edicion, j.edicion);
      ultima.current = JSON.stringify(nueva);
      setEd(nueva);
      setGuardado("si");
      if (j.cambios?.length) { setDeshacerAtlas(j.anterior ? edicionSegura(j.anterior, j.anterior) : null); setHistorial([]); }
      setPedido("");
      armar = j.armar ?? [];
      setAviso(j.cambios?.length ? { tipo: "ok", texto: `Corte hizo ${j.cambios.length === 1 ? "1 cambio" : `${j.cambios.length} cambios`}. Revisa la vista previa.` } : null);
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
  /** Cambia la marca del video y lo guarda al instante. */
  const elegirMarca = async (id: string) => {
    const antes = marcaId;
    setMarcaId(id);
    setGuardado("guardando");
    const r = await fetch(`/estudio/video/${t.id}/edicion`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ marca: id }) }).catch(() => undefined);
    if (r?.ok) { setGuardado("si"); setAviso({ tipo: "ok", texto: id ? `Marca: ${kits.find((k) => k.id === id)?.nombre}. Elige qué usar de ella.` : "El video quedó sin marca." }); }
    else { setMarcaId(antes); setGuardado("error"); setAviso({ tipo: "error", texto: "No se pudo cambiar la marca. Vuelve a intentarlo." }); }
  };
  const deshacerLoDeAtlas = () => {
    if (!deshacerAtlas) return;
    cambiar(() => deshacerAtlas);
    setDeshacerAtlas(null);
    setAviso({ tipo: "ok", texto: "Volvimos a la edición de antes del último pedido a Corte." });
  };
  // El pedido que Luna escribió al subir: se aplica solo, una vez, apenas hay texto.
  const pedidoInicial = useRef(false);
  const pedirAtlasRef = useRef(pedirAtlas);
  pedirAtlasRef.current = pedirAtlas;
  useEffect(() => {
    if (!t.analisis || !t.pedido || t.pedidoAplicado || t.ocupado) return;
    const id = setTimeout(() => {
      if (pedidoInicial.current) return;
      pedidoInicial.current = true;
      void pedirAtlasRef.current(t.pedido!, true);
    }, 300);
    return () => clearTimeout(id);
  }, [t.analisis, t.ocupado, t.pedido, t.pedidoAplicado]);

  // ——— Vista previa: salta los cortes y, si hay cierre de marca, lo muestra al final (sistema/65) ———
  const video = useRef<HTMLVideoElement>(null);
  const musica = useRef<HTMLAudioElement>(null);
  const [te, setTe] = useState(0);
  const [sonando, setSonando] = useState(false);
  const [enCierre, setEnCierre] = useState(false);
  const cierreDesde = useRef<number | null>(null);
  const conCierre = !!kit && ed.marca.cierre;
  const cs = ed.marca.cierreSegundos;
  const total = plan.duracion + (conCierre ? cs : 0);
  const conMusica = !!kit?.musica && ed.marca.musica;
  const pararMusica = () => musica.current?.pause();
  const sonarMusica = (desde: number) => {
    const m = musica.current;
    if (!m || !conMusica) return;
    m.volume = Math.min(1, ed.marca.volumenMusica * 2);
    if (Number.isFinite(m.duration) && m.duration > 0) m.currentTime = desde % m.duration;
    void m.play().catch(() => {});
  };
  useEffect(() => {
    let id = 0;
    const v = video.current;
    const paso = (ahora: number) => {
      if (cierreDesde.current !== null) {
        const e = (ahora - cierreDesde.current) / 1000;
        if (e >= cs) {
          cierreDesde.current = null;
          setEnCierre(false); setSonando(false); pararMusica();
          if (v) v.currentTime = plan.tramos[0]?.inicio ?? 0;
          setTe(0);
        } else setTe(plan.duracion + e);
      } else if (v && !v.paused) {
        const x = v.currentTime;
        const dentro = plan.tramos.find((r) => x >= r.inicio - 0.01 && x < r.fin - 0.02);
        if (!dentro) {
          const siguiente = plan.tramos.find((r) => r.inicio > x);
          if (siguiente) v.currentTime = siguiente.inicio;
          else if (conCierre) { cierreDesde.current = ahora; setEnCierre(true); v.pause(); }
          else { v.pause(); pararMusica(); v.currentTime = plan.tramos[0]?.inicio ?? 0; }
        }
        if (cierreDesde.current === null) setTe(aEditado(v.currentTime, plan.tramos));
      }
      id = requestAnimationFrame(paso);
    };
    id = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.tramos, plan.duracion, conCierre, cs]);
  const ir = (tEditado: number) => {
    const v = video.current;
    if (!v) return;
    const x = Math.max(0, Math.min(total, tEditado));
    cierreDesde.current = null;
    if (conCierre && x > plan.duracion) { v.pause(); setEnCierre(true); setSonando(false); pararMusica(); setTe(x); return; }
    setEnCierre(false);
    v.currentTime = aOriginal(Math.min(plan.duracion, x), plan.tramos);
    setTe(x);
    if (!v.paused) sonarMusica(x);
  };
  const tocar = () => {
    const v = video.current;
    if (!v) return;
    if (sonando) { v.pause(); cierreDesde.current = null; setSonando(false); pararMusica(); return; }
    let desde = te;
    if (te >= total - 0.05) { ir(0); desde = 0; }
    setSonando(true);
    sonarMusica(desde);
    if (conCierre && desde > plan.duracion) { cierreDesde.current = performance.now() - (desde - plan.duracion) * 1000; setEnCierre(true); return; }
    void v.play();
  };
  const zooms = useMemo(() => zoomDeTramos(plan.tramos, t.analisis, ed), [plan.tramos, t.analisis, ed]);

  const tOriginal = aOriginal(Math.min(te, plan.duracion), plan.tramos);
  const tramoVivo = plan.tramos.findIndex((r) => tOriginal >= r.inicio - 0.01 && tOriginal <= r.fin);
  const cerrado = !enCierre && zooms[tramoVivo];
  const partes = t.analisis?.partes ?? [];
  const parteViva = partes.findIndex((p) => tOriginal >= p.inicio - 0.05 && tOriginal < p.fin + 0.05);

  // ——— Partes: tocar una la quita o la devuelve; con Mayús se toma un tramo ———
  const tocarParte = (i: number, mayus: boolean) => {
    setHistorial((h) => [...h.slice(-30), ed.quitadas]);
    if (mayus && desdeParte !== null) {
      const [a, b] = [Math.min(desdeParte, i), Math.max(desdeParte, i)];
      const rango = Array.from({ length: b - a + 1 }, (_, k) => a + k);
      const quitar = !quitadas.has(i);
      cambiar((e) => ({ ...e, quitadas: quitar ? [...e.quitadas, ...rango] : e.quitadas.filter((n) => n < a || n > b) }));
    } else {
      cambiar((e) => ({ ...e, quitadas: quitadas.has(i) ? e.quitadas.filter((n) => n !== i) : [...e.quitadas, i] }));
    }
    setDesdeParte(i);
  };
  const deshacer = () => setHistorial((h) => { const u = h[h.length - 1]; if (u) cambiar((e) => ({ ...e, quitadas: u })); return h.slice(0, -1); });
  /** Ver una parte en la vista previa (aunque esté quitada, se muestra dónde estaba). */
  const verParte = (i: number) => { const v = video.current; if (!v) return; ir(aEditado(partes[i].inicio, plan.tramos)); };
  // Miniatura de cada parte, recortada de la hoja.
  const cuadros = t.analisis?.cuadros;
  const urlHoja = cuadros ? `/estudio/video/${t.id}/archivo/${cuadros.archivo}` : "";
  const miniAncho = cuadros && cuadros.alto > cuadros.ancho ? 64 : 96;
  const miniatura = (i: number): React.CSSProperties | undefined => {
    if (!cuadros || i >= cuadros.total) return undefined;
    const k = miniAncho / cuadros.ancho, hueco = 4;
    const col = i % cuadros.columnas, fila = Math.floor(i / cuadros.columnas);
    const W = cuadros.columnas * cuadros.ancho + (cuadros.columnas - 1) * hueco, H = Math.ceil(cuadros.total / cuadros.columnas) * (cuadros.alto + hueco) - hueco;
    return { backgroundImage: `url(${urlHoja})`, backgroundSize: `${W * k}px ${H * k}px`, backgroundPosition: `-${col * (cuadros.ancho + hueco) * k}px -${fila * (cuadros.alto + hueco) * k}px`, width: miniAncho, height: Math.round(cuadros.alto * k) };
  };

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
        <div className="mx-auto mt-3 w-full" style={{ maxWidth: formato === "9:16" ? "min(340px, calc(58svh * 9 / 16))" : formato === "1:1" ? "min(420px, 58svh)" : 520 }}>
          <div className="relative w-full overflow-hidden rounded-[14px] bg-noche" style={{ aspectRatio: formato.replace(":", " / "), containerType: "size" }}>
            {fuente && t.estado !== "subiendo" ? (
              <video ref={video} src={fuente} playsInline preload="auto" className="absolute inset-0 h-full w-full object-cover" style={{ transform: cerrado ? `scale(${ZOOM})` : undefined }} onPlay={() => setSonando(true)} onPause={() => { if (cierreDesde.current === null) { setSonando(false); pararMusica(); } }} onClick={tocar} />
            ) : (
              <div className="absolute inset-0 grid place-items-center p-6 text-center text-[13px] text-white/70">El video no terminó de subir.</div>
            )}
            {kit?.logo && ed.marca.logoEsquina && !enCierre && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={kit.logo} alt="" aria-hidden className="pointer-events-none absolute object-contain opacity-90" style={{ right: "5%", top: formato === "9:16" ? "6%" : "5%", width: formato === "16:9" ? "9%" : "16%", height: formato === "9:16" ? "9%" : "16%", objectPosition: "top right" }} />
            )}
            {enCierre && kit && (
              <div aria-label="Cierre de la marca" className="aparece absolute inset-0 grid place-items-center" style={{ background: kit.color }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {kit.logo ? <img src={kit.logo} alt={`Logo de ${kit.nombre}`} className="max-h-[42%] max-w-[42%] object-contain" /> : <span className="px-[10%] text-center font-semibold" style={{ color: kit.texto, fontSize: "9cqmin" }}>{kit.nombre}</span>}
              </div>
            )}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button onClick={tocar} disabled={!listo || !t.analisis} aria-label={sonando ? "Pausar" : "Reproducir"} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-tinta text-white disabled:opacity-40">
              {sonando ? <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden><rect x="2" y="1" width="3.5" height="12" fill="currentColor" /><rect x="8.5" y="1" width="3.5" height="12" fill="currentColor" /></svg> : <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden><path d="M3 1l10 6-10 6z" fill="currentColor" /></svg>}
            </button>
            <input type="range" min={0} max={Math.max(0.1, total)} step={0.05} value={Math.min(te, total)} onChange={(e) => ir(Number(e.target.value))} disabled={!t.analisis} aria-label="Avanzar en el video editado" className="min-w-0 flex-1 accent-[var(--color-tinta)]" />
            <span className="shrink-0 font-mono text-[12px] text-medio">{mmss(te)} / {mmss(total)}</span>
          </div>
          {t.analisis && (
            <p className="mt-2 text-[13px] text-medio">
              Queda <b className="font-medium text-tinta">{mmss(r.queda)}</b> de {mmss(duracion)}.
              {r.quitado > 0 ? ` Quitamos ${Math.round(r.quitado)} s: ${[r.por.silencio + r.por.inicio + r.por.final > 0.5 ? `${Math.round(r.por.silencio + r.por.inicio + r.por.final)} s de pausas` : "", r.por.parte > 0.05 ? `${Math.round(r.por.parte)} s de partes que quitaste` : ""].filter(Boolean).join(", ")}.` : " Todavía no se quita nada."}
            </p>
          )}
          <p className="mt-1 text-[12px] text-suave">Vista previa rápida: se ve al instante. El video final sale con la misma edición en alta calidad{ed.motion.transicion === "fundido" ? "; los fundidos y la música bajando con la voz se ven y se oyen en el video final" : ""}.</p>
          {kit?.musica && <audio ref={musica} src={kit.musica.url} preload="none" loop aria-hidden />}
        </div>
      </section>

      <div className="grid gap-4">
        {aviso && (
          <p role={aviso.tipo === "error" ? "alert" : "status"} className={`flex items-start justify-between gap-3 rounded-xl px-4 py-3 text-[14px] ${aviso.tipo === "error" ? "bg-[#fff1ea] text-[#a33a0b]" : "bg-[#e6f6ee] text-[#17714a]"}`}>
            <span>{aviso.texto}</span>
            <button onClick={() => setAviso(null)} className="shrink-0 text-[12px] underline">Cerrar</button>
          </p>
        )}

        {/* Sin analizar: qué falta */}
        {!t.analisis && !paso && (
          <section className={tarjeta}>
            <h2 className="text-[16px] font-medium">Escuchar el video</h2>
            {t.estado === "subiendo" ? (
              <p className="mt-2 text-[14px] text-medio">El video no terminó de subir. Vuelve a la lista y súbelo de nuevo.</p>
            ) : (
              <p className="mt-2 text-[14px] text-medio">Para cortar primero hay que escuchar dónde se habla y dónde hay silencio.</p>
            )}
            <button disabled={!listo || t.estado === "subiendo"} onClick={() => void correr({ paso: "analizar" })} className="mt-3 inline-flex min-h-11 items-center rounded-full bg-tinta px-5 text-[13px] font-medium text-white disabled:opacity-40">
              {t.error ? "Intentar de nuevo" : "Escuchar el video"}
            </button>
          </section>
        )}

        {t.analisis && (
          <>
            <section className={tarjeta} aria-labelledby="titulo-atlas">
              <div className="flex items-center gap-2">
                <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-tinta font-serif text-[17px] text-white">A</span>
                <h2 id="titulo-atlas" className="text-[16px] font-medium">Pídeselo a Corte</h2>
              </div>
              <p className="mt-1 text-[13px] text-medio">Escribe lo que quieres como se lo dirías a alguien del equipo. Corte mira las partes del video, cambia la edición y tú lo ves al instante en la vista previa.</p>
              {!atlas && <p className="mt-2 rounded-xl bg-[#fff1ea] px-3 py-2 text-[13px] text-[#a33a0b]">Falta la clave de Anthropic (ANTHROPIC_API_KEY): Corte no puede leer pedidos. Puedes editar a mano.</p>}
              {charla.length > 0 && (
                <ol ref={listaChat} aria-label="Conversación con Corte" aria-live="polite" className="mt-3 grid max-h-[38vh] gap-2 overflow-y-auto rounded-xl bg-carta p-3">
                  {charla.map((m, i) => (
                    <li key={i} className={`max-w-[92%] rounded-2xl px-3 py-2 text-[14px] ${m.quien === "atlas" ? (m.error ? "bg-[#fff1ea] text-[#a33a0b]" : "bg-white shadow-[0_0_0_1px_rgba(26,24,22,.06)]") : "ml-auto bg-tinta text-white"}`}>
                      <span className="sr-only">{m.quien === "atlas" ? "Corte: " : "Tú: "}</span>
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
                <label htmlFor="pedido-atlas" className="sr-only">Pedido para Corte</label>
                <textarea
                  id="pedido-atlas"
                  value={pedido}
                  onChange={(e) => setPedido(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void pedirAtlas(pedido); } }}
                  rows={2}
                  maxLength={2000}
                  disabled={!listo || !!paso}
                  placeholder="Por ejemplo: quita el arranque donde se acomoda, más dinámico y expórtalo vertical"
                  className="w-full resize-y rounded-xl bg-white px-3.5 py-3 text-[15px] text-tinta shadow-[inset_0_0_0_1px_var(--color-borde)] outline-none placeholder:text-[#b3ab9f] focus:shadow-[inset_0_0_0_1.5px_var(--color-tinta)] disabled:opacity-60"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button type="submit" disabled={!listo || !!paso || !pedido.trim()} className="inline-flex min-h-11 items-center rounded-full bg-tinta px-5 text-[13px] font-medium text-white disabled:opacity-40">Pedir a Corte</button>
                  {deshacerAtlas && <button type="button" onClick={deshacerLoDeAtlas} disabled={!!paso} className="inline-flex min-h-11 items-center rounded-full bg-hueso px-4 text-[13px] disabled:opacity-40">Deshacer lo de Corte</button>}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Ideas rápidas">
                  {["Más dinámico", "Quita la parte del inicio", "Zoom en cada corte", "Cierra con el logo", "Ponle la música de la marca", "Expórtalo en los tres formatos"].map((x) => (
                    <button key={x} type="button" disabled={!listo || !!paso} onClick={() => setPedido(x)} className="inline-flex min-h-9 items-center rounded-full bg-hueso px-3 text-[12px] text-medio hover:text-tinta disabled:opacity-40">{x}</button>
                  ))}
                </div>
              </form>
            </section>

            <section className={tarjeta} aria-labelledby="titulo-partes">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="titulo-partes" className="text-[16px] font-medium">Partes del video · {partes.length}</h2>
                <span className="text-[12px] text-suave" aria-live="polite">{guardado === "guardando" ? "Guardando…" : guardado === "error" ? "No se guardó: revisa la conexión" : "Guardado"}</span>
              </div>
              <p className="mt-1 text-[13px] text-medio">Cada parte es un tramo donde se habla o suena algo. Toca una para quitarla del video; tócala otra vez para devolverla. Con Mayús quitas desde la última que tocaste hasta esta.</p>
              <ul className="mt-3 flex max-h-[46vh] flex-wrap gap-2 overflow-y-auto rounded-xl bg-carta p-2">
                {partes.map((p, i) => {
                  const fuera = quitadas.has(i);
                  const mini = miniatura(i);
                  return (
                    <li key={i} className="flex flex-col items-center gap-1">
                      <button
                        disabled={!listo}
                        onClick={(e) => tocarParte(i, e.shiftKey)}
                        aria-pressed={fuera}
                        aria-label={`Parte ${i + 1}, ${mmss(p.inicio)}, dura ${Math.max(1, Math.round(p.fin - p.inicio))} s${fuera ? ", quitada: toca para devolverla" : ": toca para quitarla"}`}
                        className={`relative overflow-hidden rounded-lg bg-noche transition ${i === parteViva && !fuera ? "outline outline-2 outline-offset-2 outline-[#ffd43b]" : ""} ${fuera ? "opacity-35 grayscale" : "hover:brightness-110"}`}
                        style={mini ?? { width: miniAncho, height: miniAncho > 64 ? 54 : 114 }}
                      >
                        {!mini && <span className="text-[13px] text-white">{i + 1}</span>}
                        {fuera && <span aria-hidden className="absolute inset-0 grid place-items-center bg-[rgba(194,65,12,.35)] text-[22px] text-white">✕</span>}
                      </button>
                      <button type="button" disabled={!listo || !t.original} onClick={() => verParte(i)} className="min-h-8 rounded-full px-2 font-mono text-[11px] text-medio hover:bg-hueso hover:text-tinta" aria-label={`Ver la parte ${i + 1}`}>
                        ▶ {(Math.round((p.fin - p.inicio) * 10) / 10).toLocaleString("es")} s
                      </button>
                      <button type="button" disabled={!listo || fuera} onClick={() => cambiar((e) => ({ ...e, motion: { ...e.motion, zoomPartes: e.motion.zoomPartes.includes(i) ? e.motion.zoomPartes.filter((n) => n !== i) : [...e.motion.zoomPartes, i] } }))} aria-pressed={ed.motion.zoomPartes.includes(i)} aria-label={`Zoom en la parte ${i + 1}`} className={`min-h-8 rounded-full px-2 text-[11px] transition disabled:opacity-30 ${ed.motion.zoomPartes.includes(i) ? "bg-tinta text-white" : "text-medio hover:bg-hueso"}`}>
                        Zoom
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                <button disabled={!historial.length} onClick={deshacer} className="inline-flex min-h-10 items-center rounded-full bg-hueso px-4 text-[13px] disabled:opacity-40">Deshacer</button>
                <button disabled={!ed.quitadas.length} onClick={() => { setHistorial((h) => [...h, ed.quitadas]); cambiar((e) => ({ ...e, quitadas: [] })); }} className="inline-flex min-h-10 items-center rounded-full bg-hueso px-4 text-[13px] disabled:opacity-40">Devolver todas las partes</button>
              </div>
            </section>

            <section className={tarjeta} aria-labelledby="titulo-cortes">
              <h2 id="titulo-cortes" className="text-[16px] font-medium">Pausas</h2>
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
            </section>

            <section className={tarjeta} aria-labelledby="titulo-motion">
              <h2 id="titulo-motion" className="text-[16px] font-medium">Movimiento</h2>
              <label className="mt-2 flex min-h-11 items-center gap-3 text-[14px]">
                <input type="checkbox" checked={ed.motion.zoomAlterno} onChange={(e) => cambiar((x) => ({ ...x, motion: { ...x.motion, zoomAlterno: e.target.checked } }))} className="h-5 w-5 accent-[var(--color-tinta)]" />
                Zoom en cada corte (plano normal y cerrado, uno y uno)
              </label>
              <p className="ml-8 text-[12px] text-suave">Disimula los saltos de los cortes. Para remarcar un momento, toca «Zoom» debajo de esa parte.{ed.motion.zoomPartes.length ? ` Con zoom: ${ed.motion.zoomPartes.map((i) => i + 1).join(", ")}.` : ""}</p>
              <p className="mt-3 text-[13px] text-medio">Entre una parte y otra</p>
              <div className="mt-2 flex gap-2">
                {([["Corte seco", "corte"], ["Fundido corto", "fundido"]] as const).map(([n, v]) => (
                  <button key={v} onClick={() => cambiar((x) => ({ ...x, motion: { ...x.motion, transicion: v } }))} aria-pressed={ed.motion.transicion === v} className={chip(ed.motion.transicion === v)}>{n}</button>
                ))}
              </div>
            </section>

            <section className={tarjeta} aria-labelledby="titulo-marca">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="titulo-marca" className="text-[16px] font-medium">Marca</h2>
                <a href="/estudio/video/marcas" className="inline-flex min-h-11 items-center text-[13px] text-medio underline">Editar marcas</a>
              </div>
              <label className="mt-2 block text-[13px] text-medio">
                Marca de este video
                <select value={marcaId} disabled={!listo || !!paso} onChange={(e) => void elegirMarca(e.target.value)} className="mt-1 block min-h-11 w-full max-w-sm rounded-xl bg-white px-3 text-[15px] text-tinta shadow-[inset_0_0_0_1px_var(--color-borde)]">
                  <option value="">Sin marca</option>
                  {kits.map((k) => <option key={k.id} value={k.id}>{k.nombre}</option>)}
                </select>
              </label>
              {!kits.length && <p className="mt-2 text-[13px] text-medio">Todavía no hay marcas. Créalas en «Editar marcas» con su logo, colores y música.</p>}
              {kit && (
                <div className="mt-3 grid gap-1">
                  <label className="flex min-h-11 items-center gap-3 text-[14px]">
                    <input type="checkbox" disabled={!kit.logo} checked={ed.marca.logoEsquina && !!kit.logo} onChange={(e) => cambiar((x) => ({ ...x, marca: { ...x.marca, logoEsquina: e.target.checked } }))} className="h-5 w-5 accent-[var(--color-tinta)]" />
                    Logo chico en la esquina {!kit.logo && <span className="text-[12px] text-suave">(esta marca no tiene logo)</span>}
                  </label>
                  <label className="flex min-h-11 items-center gap-3 text-[14px]">
                    <input type="checkbox" checked={ed.marca.cierre} onChange={(e) => cambiar((x) => ({ ...x, marca: { ...x.marca, cierre: e.target.checked } }))} className="h-5 w-5 accent-[var(--color-tinta)]" />
                    Cerrar con {kit.logo ? "el logo" : "el nombre"} sobre el color de la marca
                  </label>
                  {ed.marca.cierre && (
                    <div className="ml-8 flex gap-2">
                      {[2, 3, 4].map((n) => <button key={n} onClick={() => cambiar((x) => ({ ...x, marca: { ...x.marca, cierreSegundos: n } }))} aria-pressed={ed.marca.cierreSegundos === n} className={chip(ed.marca.cierreSegundos === n)}>{n} s</button>)}
                    </div>
                  )}
                  <label className="mt-1 flex min-h-11 items-center gap-3 text-[14px]">
                    <input type="checkbox" disabled={!kit.musica} checked={ed.marca.musica && !!kit.musica} onChange={(e) => cambiar((x) => ({ ...x, marca: { ...x.marca, musica: e.target.checked } }))} className="h-5 w-5 accent-[var(--color-tinta)]" />
                    Música de la marca {kit.musica ? <span className="text-[12px] text-suave">(«{kit.musica.nombre}»; baja sola cuando alguien habla)</span> : <span className="text-[12px] text-suave">(esta marca no tiene música)</span>}
                  </label>
                  {ed.marca.musica && kit.musica && (
                    <div className="ml-8 flex gap-2">
                      {([["Baja", 0.1], ["Normal", 0.18], ["Alta", 0.3]] as const).map(([n, v]) => <button key={n} onClick={() => cambiar((x) => ({ ...x, marca: { ...x.marca, volumenMusica: v } }))} aria-pressed={ed.marca.volumenMusica === v} className={chip(ed.marca.volumenMusica === v)}>{n}</button>)}
                    </div>
                  )}
                </div>
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
