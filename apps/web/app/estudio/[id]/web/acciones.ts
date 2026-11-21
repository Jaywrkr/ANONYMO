"use server";
// La web en vivo del cliente (sistema/98): solo Jay o Luna la ponen en vivo, cambian su plan o la sacan de línea.
import { redirect, RedirectType } from "next/navigation";
import { revalidatePath } from "next/cache";
import { activarMiWeb, apagarMiWeb, esPlan, PLANES, tokenPortal, usarVersionNueva } from "@anonymo/pipeline";
import { exigirEstudio } from "@/lib/estudio";
import { conNube } from "@/lib/nube";

export async function accionWebEnVivo(f: FormData) {
  const yo = await exigirEstudio();
  const id = String(f.get("id") ?? "");
  if (!/^[a-z0-9_-]+$/.test(id)) return;
  const accion = String(f.get("accion") ?? "");
  let aviso = "";
  try {
    aviso = await conNube([id], () => {
      if (accion === "activar" || accion === "plan") {
        const plan = String(f.get("plan") ?? "cuidado");
        if (!esPlan(plan)) throw new Error("Ese plan no existe.");
        tokenPortal(id);
        activarMiWeb(id, yo, plan);
        return accion === "activar" ? `Su web está en vivo con el plan ${PLANES[plan].nombre}.` : `Plan cambiado a ${PLANES[plan].nombre}.`;
      }
      if (accion === "nueva") { const r = usarVersionNueva(id, yo); return `En vivo con la versión ${r.estado.base}.${r.sinEncajar ? ` ${r.sinEncajar} cambios del cliente ya no encajan con lo nuevo: revísalos con él.` : ""}`; }
      if (accion === "apagar") { apagarMiWeb(id, yo); return "Su web ya no está en línea. Los cambios del cliente se guardan."; }
      throw new Error("Esa acción no existe.");
    });
  } catch (e) {
    redirect(`/estudio/${id}/web?error=${encodeURIComponent((e as Error).message)}#en-vivo`, RedirectType.replace);
  }
  revalidatePath(`/estudio/${id}/web`);
  redirect(`/estudio/${id}/web?ok=${encodeURIComponent(aviso)}#en-vivo`, RedirectType.replace);
}
