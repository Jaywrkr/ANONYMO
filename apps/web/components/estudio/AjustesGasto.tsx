"use client";

// Los controles de la pantalla «Gasto» (sistema/91): topes, saldo anotado y permiso para seguir hoy.
import { useState } from "react";
import { useRouter } from "next/navigation";

const campo = "min-h-11 w-28 rounded-xl bg-hueso/60 px-3 text-[15px] outline-none focus:bg-white focus:shadow-[inset_0_0_0_1px_var(--color-borde)]";
const boton = "inline-flex min-h-11 items-center rounded-full bg-white px-4 text-[13px] shadow-[inset_0_0_0_1px_var(--color-borde)] transition hover:shadow-[inset_0_0_0_1px_rgba(26,24,22,.35)] disabled:opacity-50";

export function AjustesGasto({ diario, mensual, saldo, pasaDia, extra, permisoSugerido }: { diario: number; mensual: number; saldo?: number; pasaDia: boolean; extra: number; permisoSugerido: number }) {
  const router = useRouter();
  const [d, setD] = useState(String(diario));
  const [m, setM] = useState(String(mensual));
  const [s, setS] = useState(saldo === undefined ? "" : String(saldo));
  const [trabajo, setTrabajo] = useState("");
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);

  async function guardar(cuerpo: Record<string, unknown>, haciendo: string, hecho: string) {
    if (trabajo) return;
    setTrabajo(haciendo);
    setAviso(null);
    try {
      const r = await fetch("/estudio/gasto/ajustes", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(cuerpo) });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "No se pudo guardar. Vuelve a intentar.");
      setAviso({ ok: true, texto: hecho });
      router.refresh();
    } catch (e) {
      setAviso({ ok: false, texto: (e as Error).message });
    } finally {
      setTrabajo("");
    }
  }
  const num = (t: string) => Number(t.replace(",", "."));
  const limpio = (t: string) => t.replace(/[^\d.,]/g, "").slice(0, 8);

  return (
    <div className="grid gap-4" data-ajustes-gasto>
      {pasaDia && (
        <div className="rounded-2xl bg-[#fff1ea] p-4 text-[14px] text-[#8a2f08]">
          <p className="font-medium">Hoy se llegó al tope: la IA está detenida.</p>
          <p className="mt-1">{extra ? `Ya diste permiso para USD ${extra} más hoy.` : "Lo automático sigue mañana. Si necesitas seguir tú, da permiso solo por hoy."}</p>
          {!extra && <button type="button" disabled={!!trabajo} onClick={() => void guardar({ extra: permisoSugerido }, "Dando permiso", `Listo: hoy se pueden gastar USD ${permisoSugerido} más en lo que lances a mano.`)} className={`${boton} mt-3`}>Permitir USD {permisoSugerido} más hoy</button>}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-1.5 text-[13px] text-medio">Tope por día (USD)
          <span className="flex gap-2"><input value={d} onChange={(e) => setD(limpio(e.target.value))} inputMode="decimal" className={campo} />
            <button type="button" disabled={!!trabajo || !d || num(d) === diario} onClick={() => void guardar({ diario: num(d) }, "Guardando el tope del día", `Tope del día: USD ${num(d)}.`)} className={boton}>Guardar</button></span>
        </label>
        <label className="grid gap-1.5 text-[13px] text-medio">Tope por mes (USD)
          <span className="flex gap-2"><input value={m} onChange={(e) => setM(limpio(e.target.value))} inputMode="decimal" className={campo} />
            <button type="button" disabled={!!trabajo || !m || num(m) === mensual} onClick={() => void guardar({ mensual: num(m) }, "Guardando el tope del mes", `Tope del mes: USD ${num(m)}.`)} className={boton}>Guardar</button></span>
        </label>
        <label className="grid gap-1.5 text-[13px] text-medio">Saldo en la consola (USD)
          <span className="flex gap-2"><input value={s} onChange={(e) => setS(limpio(e.target.value))} inputMode="decimal" placeholder="269.06" className={campo} />
            <button type="button" disabled={!!trabajo || !s || num(s) === saldo} onClick={() => void guardar({ saldo: num(s) }, "Anotando el saldo", `Saldo anotado: USD ${num(s)}. Desde ahora se descuenta lo que gaste el estudio.`)} className={boton}>Anotar</button></span>
        </label>
      </div>
      <p role="status" className={`min-h-5 text-[13px] ${trabajo ? "text-medio" : aviso?.ok ? "text-[#17714a]" : "text-[#a33a0b]"}`}>{trabajo ? `${trabajo}…` : aviso?.texto ?? ""}</p>
    </div>
  );
}
