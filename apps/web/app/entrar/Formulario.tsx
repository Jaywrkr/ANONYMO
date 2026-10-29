"use client";
import { useActionState } from "react";
import { entrar } from "./acciones";

export function Formulario({ a }: { a?: string }) {
  const [estado, accion, enviando] = useActionState(entrar, null);
  return (
    <form action={accion} className="mt-7 grid gap-5">
      <input type="hidden" name="a" value={a ?? "/estudio"} />
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-[13px] font-medium">Quién eres</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["jay", "luna"] as const).map((q) => (
            <label key={q} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl bg-white px-3 text-[15px] shadow-[inset_0_0_0_1px_var(--color-borde)] transition has-[:checked]:bg-tinta has-[:checked]:text-white has-[:checked]:shadow-none has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-urgente">
              <input type="radio" name="quien" value={q} defaultChecked={q === "jay"} className="sr-only" />
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] ${q === "jay" ? "bg-[#f1ede6] text-tinta" : "bg-[#ff6fb1] text-tinta"}`}>{q === "jay" ? "J" : "L"}</span>
              {q === "jay" ? "Jay" : "Luna"}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="grid gap-2">
        <span className="text-[13px] font-medium">Clave</span>
        <input type="password" name="clave" required autoComplete="current-password" autoFocus className="w-full rounded-xl bg-white px-3.5 py-3 text-[16px] shadow-[inset_0_0_0_1px_var(--color-borde)] outline-none transition focus:shadow-[inset_0_0_0_1.5px_var(--color-tinta)]" />
      </label>
      {estado?.error && <p role="alert" className="rounded-xl bg-[#fde8e4] p-3 text-[14px] text-[#7a1a0c]">{estado.error}</p>}
      <button disabled={enviando} className="inline-flex min-h-12 items-center justify-center rounded-full bg-tinta px-5 text-[14px] font-medium text-white transition hover:bg-black disabled:opacity-50">
        {enviando ? "Entrando…" : "Entrar al estudio"}
      </button>
    </form>
  );
}
