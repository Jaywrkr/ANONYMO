"use client";
// Las webs de la Dirección se capturan solas (sistema/118): al abrir la ficha, si alguna todavía no tiene capturas,
// el estudio las saca y la ficha se actualiza. Siempre dice qué está haciendo y qué pasó.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function CapturarReferencias({ id, pendientes, total }: { id: string; pendientes: number; total: number }) {
  const router = useRouter();
  const [estado, setEstado] = useState<"" | "trabajando" | "listo" | "error">("");
  const [texto, setTexto] = useState("");
  const hecho = useRef(false);
  const capturar = async (todas: boolean) => {
    setEstado("trabajando");
    setTexto(todas ? `Capturando de nuevo ${total} ${total === 1 ? "web" : "webs"}… tarda un minuto.` : `Capturando ${pendientes} ${pendientes === 1 ? "web" : "webs"} en computadora y celular… tarda un minuto.`);
    try {
      const r = await fetch(`/estudio/cliente/${id}/capturar${todas ? "?todas=1" : ""}`, { method: "POST" });
      const j = (await r.json()) as { hechas?: number; fallas?: { url: string; motivo: string }[]; error?: string };
      if (!r.ok) throw new Error(j.error ?? "No se pudo capturar.");
      const f = j.fallas ?? [];
      setEstado(f.length ? "error" : "listo");
      setTexto([j.hechas ? `Listo: ${j.hechas} ${j.hechas === 1 ? "web capturada" : "webs capturadas"}.` : "", ...f.map((x) => `${x.url.replace(/^https?:\/\//, "")}: ${x.motivo}`)].filter(Boolean).join(" "));
      router.refresh();
    } catch (e) {
      setEstado("error");
      setTexto((e as Error).message);
    }
  };
  useEffect(() => {
    if (pendientes > 0 && !hecho.current) { hecho.current = true; void capturar(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendientes]);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px]" data-capturas={estado || "quieto"}>
      {estado && <p role={estado === "error" ? "alert" : "status"} className={estado === "error" ? "text-[#a33a0b]" : "text-medio"}>{estado === "trabajando" && <i aria-hidden className="late mr-2 inline-block h-2 w-2 rounded-full bg-vivo" />}{texto}</p>}
      {total > 0 && estado !== "trabajando" && <button type="button" onClick={() => void capturar(true)} className="min-h-11 text-medio underline underline-offset-4">Capturar de nuevo</button>}
    </div>
  );
}
