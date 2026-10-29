"use client";
import { useEffect } from "react";
import { useFormStatus } from "react-dom";

export interface Trabajo {
  activo: boolean;
  /** Proyecto que se está trabajando (para mostrar en vivo quién trabaja). */
  proyecto?: string;
  /** Qué está pasando, en una frase. */
  texto?: string;
  /** Si tarda (el equipo trabaja): muestra el aviso grande con los agentes. */
  largo?: boolean;
}

/**
 * Botón que avisa mientras trabaja. Además avisa al estudio («anonymo:trabajando»):
 * si la acción es larga, aparece el aviso con quién está trabajando y cuánto lleva (sistema/33).
 */
export function Enviar({ className, texto = "Que Atlas arme el plan", trabajando = "Atlas está leyendo…", proyecto, largo = false }: { className: string; texto?: string; trabajando?: string; proyecto?: string; largo?: boolean }) {
  const { pending } = useFormStatus();
  useEffect(() => {
    dispatchEvent(new CustomEvent<Trabajo>("anonymo:trabajando", { detail: { activo: pending, proyecto, texto: trabajando, largo } }));
  }, [pending, proyecto, trabajando, largo]);
  return (
    <button disabled={pending} aria-live="polite" className={`${className} disabled:opacity-60`}>
      {pending ? trabajando : texto}
    </button>
  );
}

/** Lee el evento, venga con el formato nuevo o el viejo (booleano). */
export const leerTrabajo = (e: Event): Trabajo => {
  const d = (e as CustomEvent<Trabajo | boolean>).detail;
  return typeof d === "object" && d ? d : { activo: !!d };
};
