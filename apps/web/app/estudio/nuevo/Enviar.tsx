"use client";
import { useFormStatus } from "react-dom";

/** El botón avisa que el equipo está trabajando: con IA real puede tardar unos minutos. */
export function Enviar({ className }: { className: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} aria-live="polite" className={`${className} disabled:opacity-60`}>
      {pending ? "Atlas está trabajando… no cierres esta página" : "Crear proyecto"}
    </button>
  );
}
