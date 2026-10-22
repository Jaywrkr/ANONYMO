"use client";
// Sonidos de Eco (web/16): apagados por defecto, se sintetizan en el navegador (sin archivos), suaves y cortos.
import { useSyncExternalStore } from "react";
import type { AreaId } from "@anonymo/agentes";

const CLAVE = "anonymo-sonido";
const oyentes = new Set<() => void>();
let activo = false;
let ctx: AudioContext | null = null;

if (typeof window !== "undefined") {
  try {
    activo = localStorage.getItem(CLAVE) === "1";
  } catch {}
}

/** Cada área tiene su nota (escala pentatónica: nada suena mal junto). */
const NOTA: Record<AreaId, number> = { mando: 261.63, estrategia: 293.66, marca: 329.63, producto: 392.0, comunicacion: 440.0, crecimiento: 523.25 };

function nota(frec: number, cuando = 0, dur = 0.35, vol = 0.06) {
  if (!ctx) return;
  const t = ctx.currentTime + cuando;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(frec, t);
  // Golpe suave tipo marimba: sube rápido, cae despacio.
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export function tocar(tipo: "toque" | "fase" | "firma", area?: AreaId) {
  if (!activo || !ctx) return;
  if (tipo === "toque") nota(area ? NOTA[area] : 392, 0, 0.3, 0.05);
  if (tipo === "fase") nota(523.25, 0, 0.18, 0.025);
  if (tipo === "firma") {
    // La firma de la casa: dos notas, una por Jay y una por Luna.
    nota(392.0, 0, 0.5, 0.06);
    nota(587.33, 0.16, 0.7, 0.05);
  }
}

export function cambiarSonido(valor: boolean) {
  activo = valor;
  try {
    localStorage.setItem(CLAVE, valor ? "1" : "0");
  } catch {}
  if (valor) {
    // El navegador solo deja crear audio tras un gesto: este clic lo es.
    ctx ??= new AudioContext();
    void ctx.resume();
    tocar("firma");
  }
  oyentes.forEach((f) => f());
}

export function useSonido() {
  return useSyncExternalStore(
    (f) => {
      oyentes.add(f);
      return () => oyentes.delete(f);
    },
    () => activo,
    () => false,
  );
}

/** Si quedó encendido de otra visita, el audio arranca con el primer gesto. */
if (typeof window !== "undefined") {
  const despertar = () => {
    if (activo && !ctx) {
      ctx = new AudioContext();
      void ctx.resume();
    }
  };
  addEventListener("pointerdown", despertar, { once: true, passive: true });
  addEventListener("keydown", despertar, { once: true });
}
