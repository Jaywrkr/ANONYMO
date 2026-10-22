import { existe, exportarPdf } from "@anonymo/pipeline";
import { estudioActivo } from "@/lib/estudio";

export const dynamic = "force-dynamic";

// PDF para el cliente. ?internas=1 incluye presupuesto, nota del jurado y ventas (solo para el equipo).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!estudioActivo() || !existe(id)) return new Response(null, { status: 404 });
  const internas = new URL(req.url).searchParams.get("internas") === "1";
  const pdf = await exportarPdf(id, { internas });
  return new Response(new Uint8Array(pdf), {
    headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${id}${internas ? "-interno" : ""}.pdf"` },
  });
}
