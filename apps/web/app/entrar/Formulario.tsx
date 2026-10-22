"use client";
import { useActionState } from "react";
import { entrar } from "./acciones";

const campo = "w-full rounded-2xl border border-linea bg-papel p-3 text-[17px] outline-none focus:border-tinta";
const etiqueta = "font-mono text-[12px] uppercase tracking-[0.14em] text-gris";

export function Formulario({ a }: { a?: string }) {
  const [estado, accion, enviando] = useActionState(entrar, null);
  return (
    <form action={accion} className="mt-8 grid max-w-sm gap-4">
      <input type="hidden" name="a" value={a ?? "/estudio"} />
      <fieldset className="grid gap-2">
        <legend className={etiqueta}>Quién eres</legend>
        <div className="flex gap-2">
          {(["jay", "luna"] as const).map((q) => (
            <label key={q} className="flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-full border border-tinta font-mono text-[12px] uppercase tracking-[0.12em] has-[:checked]:bg-tinta has-[:checked]:text-hueso">
              <input type="radio" name="quien" value={q} defaultChecked={q === "jay"} className="sr-only" />
              {q === "jay" ? "Jay" : "Luna"}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="grid gap-2">
        <span className={etiqueta}>Clave</span>
        <input type="password" name="clave" required autoComplete="current-password" className={campo} />
      </label>
      {estado?.error && <p role="alert" className="rounded-2xl bg-[#fde8e4] p-3 text-[#8a1c0c]">{estado.error}</p>}
      <button disabled={enviando} className="inline-flex min-h-11 items-center justify-center rounded-full bg-tinta px-5 font-mono text-[12px] uppercase tracking-[0.12em] text-hueso disabled:opacity-50">
        {enviando ? "Entrando…" : "Entrar al estudio"}
      </button>
    </form>
  );
}
