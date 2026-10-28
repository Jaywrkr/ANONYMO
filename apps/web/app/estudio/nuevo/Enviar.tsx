"use client";
import { useEffect } from "react";
import { useFormStatus } from "react-dom";

/**
 * Botón que avisa mientras trabaja. Además avisa a la oficina («anonymo:trabajando»)
 * para que muestre en vivo quién está trabajando.
 */
export function Enviar({ className, texto = "Que Atlas arme el plan", trabajando = "Atlas está leyendo…" }: { className: string; texto?: string; trabajando?: string }) {
  const { pending } = useFormStatus();
  useEffect(() => {
    dispatchEvent(new CustomEvent("anonymo:trabajando", { detail: pending }));
  }, [pending]);
  return (
    <button disabled={pending} aria-live="polite" className={`${className} disabled:opacity-60`}>
      {pending ? trabajando : texto}
    </button>
  );
}
