"use server";
// Entrar y salir del estudio en línea.
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { estudioActivo } from "@/lib/estudio";
import { claveValida, COOKIE, crearSesion, DURACION, type Socio } from "@/lib/sesion";

// Freno contra adivinar claves: 8 intentos fallidos por IP cada 15 minutos (en memoria del servidor).
const fallos = new Map<string, number[]>();

/** Solo rutas internas del estudio como destino (nada de enlaces a otros sitios). */
const destinoSeguro = (a: string) => (/^\/estudio(\/[\w\-/%.]*)?$/.test(a) ? a : "/estudio");

export async function entrar(_: { error?: string } | null, f: FormData): Promise<{ error?: string }> {
  if (!estudioActivo()) return { error: "El estudio no está activo en este servidor." };
  const quien: Socio = f.get("quien") === "luna" ? "luna" : "jay";
  const clave = String(f.get("clave") ?? "");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const ahora = Date.now();
  const recientes = (fallos.get(ip) ?? []).filter((t) => ahora - t < 15 * 60_000);
  if (recientes.length >= 8) return { error: "Demasiados intentos. Espera 15 minutos." };
  if (!(await claveValida(quien, clave))) {
    fallos.set(ip, [...recientes, ahora]);
    return { error: "Esa clave no es." };
  }
  fallos.delete(ip);
  (await cookies()).set(COOKIE, await crearSesion(quien), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACION,
  });
  redirect(destinoSeguro(String(f.get("a") ?? "")));
}

export async function salir() {
  (await cookies()).delete(COOKIE);
  redirect("/entrar");
}
