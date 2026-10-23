"use client";
import { useFormStatus } from "react-dom";

/** Mientras Atlas lee el pedido, el botón lo dice. */
export function Enviar({ className, texto = "Que Atlas arme el plan", trabajando = "Atlas está leyendo…" }: { className: string; texto?: string; trabajando?: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} aria-live="polite" className={`${className} disabled:opacity-60`}>
      {pending ? trabajando : texto}
    </button>
  );
}
