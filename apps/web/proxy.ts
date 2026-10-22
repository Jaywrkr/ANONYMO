// Primer filtro del estudio: sin sesión válida, a /entrar. Las páginas y acciones vuelven a revisar (lib/estudio.ts).
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, leerSesion, sesionConfigurada } from "./lib/sesion";

export default async function proxy(req: NextRequest) {
  const local = process.env.NODE_ENV === "development";
  // Sin claves: en local se entra directo; en línea la página da 404 por su cuenta.
  if (!sesionConfigurada()) return NextResponse.next();
  if (!local && process.env.ESTUDIO !== "1") return NextResponse.next();
  if (await leerSesion(req.cookies.get(COOKIE)?.value)) return NextResponse.next();
  const entrar = new URL("/entrar", req.nextUrl);
  entrar.searchParams.set("a", req.nextUrl.pathname);
  return NextResponse.redirect(entrar);
}

export const config = { matcher: ["/estudio", "/estudio/:path*"] };
