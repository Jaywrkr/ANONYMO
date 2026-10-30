import { bytesVersionados, guardadosVersionados, versionadoActivo } from '@anonymo/pipeline';
import { quienEsta } from '@/lib/estudio';
export const dynamic = 'force-dynamic';
export async function GET(req: Request, { params }: {
    params: Promise<{
        id: string;
        operacion: string;
    }>;
}) {
    if (!await quienEsta())
        return new Response(null, { status: 404 });
    const { id, operacion } = await params;
    if (!/^[a-z0-9][a-z0-9_-]{0,80}$/.test(id) || !versionadoActivo(id) || !/^[a-f0-9-]{36}$/.test(operacion))
        return new Response(null, { status: 404 });
    try {
        const r = new URL(req.url).searchParams.get('archivo') ?? '', a = (await guardadosVersionados(id)).find(x => x.id === operacion);
        const entrada = a && Object.hasOwn(a.archivos, r) ? a.archivos[r] : undefined;
        if (!entrada)
            return new Response(null, { status: 404 });
        const b = await bytesVersionados(id, entrada), nombre = r.split('/').at(-1)!.replace(/[^a-zA-Z0-9_.-]/g, '_');
        return new Response(new Uint8Array(b), { headers: { 'content-type': 'application/octet-stream', 'content-disposition': `attachment; filename="${nombre}"`, 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff', 'content-security-policy': "sandbox; default-src 'none'" } });
    }
    catch {
        return Response.json({ error: 'No pudimos descargar esta copia. Intenta de nuevo.' }, { status: 503 });
    }
}
