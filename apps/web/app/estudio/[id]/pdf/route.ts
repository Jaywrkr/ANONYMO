import { existe, exportarPdf } from "@anonymo/pipeline";
import { quienEsta } from "@/lib/estudio";
import { traer } from "@/lib/nube";

export const dynamic = "force-dynamic";

// PDF para el cliente. ?internas=1 incluye presupuesto, nota del jurado y ventas (solo para el equipo).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await traer(id);
  if (!(await quienEsta()) || !existe(id)) return new Response(null, { status: 404 });
  const internas = new URL(req.url).searchParams.get("internas") === "1";
  let pdf: Buffer;
  try {
    pdf = await exportarPdf(id, { internas });
  } catch {
    // En Vercel no hay navegador para armar el PDF: se saca desde tu máquina (npm run pipeline -- pdf <id>).
    return new Response("El PDF todavía no se puede armar en línea: se saca desde tu máquina con «npm run pipeline -- pdf " + id + "». Vuelve atrás para seguir.", {
      status: 501,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  return new Response(new Uint8Array(pdf), {
    headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${id}${internas ? "-interno" : ""}.pdf"` },
  });
}
