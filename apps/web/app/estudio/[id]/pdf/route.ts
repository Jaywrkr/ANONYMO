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
  const pdf = await exportarPdf(id, { internas });
  return new Response(new Uint8Array(pdf), {
    headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${id}${internas ? "-interno" : ""}.pdf"` },
  });
}
