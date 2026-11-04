// Piloto: archivos inmutables en Storage y un único índice visible confirmado en PostgreSQL.
import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { carpeta } from './almacen.ts';
export interface EntradaIndice {
    objeto: string;
    sha256: string;
    bytes: number;
}
export interface IndiceProyecto {
    revision: number;
    archivos: Record<string, EntradaIndice>;
}
export interface ReservaTrabajo {
    id: string;
    proyecto: string;
    propietario: string;
    revision: number;
}
interface Base {
    indice: IndiceProyecto;
    legado: boolean;
}
interface Sesion {
    restaurar?: string;
    bases: Map<string, Base>;
    reserva?: ReservaTrabajo;
    fallo?: string;
    publicacion: {
        pendiente: boolean;
    };
}
const sesiones = new AsyncLocalStorage<Sesion>();
export const enPublicacion = <T>(fn: () => T) => sesiones.run({ bases: new Map(), publicacion: { pendiente: false } }, fn);
export const conReserva = <T>(r: ReservaTrabajo, fn: () => T) => { const s = sesiones.getStore(); if (!s)
    throw new Error('La reserva necesita una copia aislada.'); return sesiones.run({ ...s, reserva: r }, fn); };
export const hayPublicacionSinConfirmar = () => !!sesiones.getStore()?.publicacion.pendiente;
export const conRestauracion = <T>(origen:string,fn:()=>T) => {const s=sesiones.getStore();if(!s)throw new Error("Falta una operación aislada.");return sesiones.run({...s,restaurar:origen},fn);};
export const reservaActual = () => sesiones.getStore()?.reserva;
export const marcarFalloPublicacion = (mensaje?: string) => { const s = sesiones.getStore(); if (s)
    s.fallo = mensaje; };
export const versionadoActivo = (id: string) => process.env.ANONYMO_ALMACEN_VERSIONADO === '1' && !id.startsWith('_') && (!process.env.ANONYMO_PROYECTOS_VERSIONADOS || process.env.ANONYMO_PROYECTOS_VERSIONADOS.split(',').map(s => s.trim()).includes(id));
const seguro = (id: string) => { if (!/^[a-z0-9][a-z0-9_-]{0,80}$/.test(id))
    throw new Error('Proyecto versionado no válido.'); return id; };
const rutaSegura = (r: string) => !!r && /^[a-zA-Z0-9_.\/-]+$/.test(r) && r.split('/').every(p => p !== '.' && p !== '..' && p !== '') && !r.startsWith('/');
const sha = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');
function cfg() { const url = process.env.SUPABASE_URL?.replace(/\/$/, ''); const key = process.env.SUPABASE_SERVICE_KEY; if (!url || !key)
    throw new Error('Falta la conexión privada del almacén versionado.'); return { url, key, bucket: process.env.SUPABASE_BUCKET ?? 'proyectos' }; }
const headers = (key: string) => ({ authorization: `Bearer ${key}`, apikey: key, 'content-type': 'application/json' });
export async function rpcVersionado<T>(nombre: string, datos: unknown, f: typeof fetch = fetch): Promise<T> {
    const { url, key } = cfg();
    const r = await f(`${url}/rest/v1/rpc/${nombre}`, { method: 'POST', headers: headers(key), body: JSON.stringify(datos), signal: AbortSignal.timeout(30000), cache: 'no-store' });
    if (!r.ok)
        throw new Error(`El almacén versionado no respondió (HTTP ${r.status}). No se utiliza el guardado anterior como alternativa.`);
    return r.json() as Promise<T>;
}
function validarIndice(id: string, d: IndiceProyecto) { if (!Number.isSafeInteger(d.revision) || d.revision < 1 || !d.archivos || typeof d.archivos !== 'object' || Array.isArray(d.archivos) || Object.keys(d.archivos).length > 5000)
    throw new Error('Índice versionado no válido.'); for (const [r, e] of Object.entries(d.archivos)) {
    if (!rutaSegura(r) || !e || !Number.isSafeInteger(e.bytes) || e.bytes < 0 || e.bytes > 32 * 1024 * 1024 || !/^[a-f0-9]{64}$/.test(e.sha256) || e.objeto !== `_anonymo/${id}/${e.sha256}`)
        throw new Error('El índice contiene un archivo no válido.');
} if (!d.archivos['estado.json'])
    throw new Error('Falta el estado del proyecto en el índice.'); return d; }
export async function indiceActual(id: string, f: typeof fetch = fetch) { seguro(id); const d = await rpcVersionado<IndiceProyecto | null>('anonymo_leer_publicacion', { p_proyecto: id }, f); return d ? validarIndice(id, d) : null; }
export async function proyectosVersionados(f: typeof fetch = fetch) { const r = await rpcVersionado<{
    proyecto: string;
}[]>('anonymo_listar_publicaciones', {}, f); return r.map(p => seguro(p.proyecto)); }
export function registrarBase(id: string, indice: IndiceProyecto | null, legado: boolean) { sesiones.getStore()?.bases.set(id, { indice: indice ?? { revision: 0, archivos: Object.create(null) }, legado }); }
export async function bytesVersionados(id: string, entrada: EntradaIndice, f: typeof fetch = fetch) { seguro(id); if (entrada.objeto !== `_anonymo/${id}/${entrada.sha256}` || !/^[a-f0-9]{64}$/.test(entrada.sha256) || !Number.isSafeInteger(entrada.bytes) || entrada.bytes < 0 || entrada.bytes > 32 * 1024 * 1024)
    throw new Error('Archivo guardado no válido.'); const { url, key, bucket } = cfg(); const r = await f(`${url}/storage/v1/object/${bucket}/${entrada.objeto}`, { headers: headers(key), cache: 'no-store', signal: AbortSignal.timeout(30000) }); if (!r.ok)
    throw new Error(`No se pudo leer una versión guardada (HTTP ${r.status}).`); const b = Buffer.from(await r.arrayBuffer()); if (b.length !== entrada.bytes || sha(b) !== entrada.sha256)
    throw new Error('La copia guardada no coincide con su huella. No se usa contenido alterado.'); return b; }
export async function leerArchivoVersionado(id: string, ruta: string, f: typeof fetch = fetch) { if (!rutaSegura(ruta))
    throw new Error('Ruta no válida.'); const d = await indiceActual(id, f); if (!d)
    return null; const e = Object.hasOwn(d.archivos, ruta) ? d.archivos[ruta] : undefined; return { existe: true, bytes: e ? await bytesVersionados(id, e, f) : undefined }; }
export async function estadoCola(id: string, f: typeof fetch = fetch) { return rpcVersionado<any>('anonymo_estado_trabajo', { p_proyecto: seguro(id) }, f); }
export async function vivoVersionado(id: string, f: typeof fetch = fetch) { const q = await estadoCola(id, f); if (!q)
    return undefined; return { ...(q.vivo ?? {}), vuelta: q.propietario ?? q.id, desde: q.creado ?? q.actualizado, latido: q.vivo?.latido ?? q.actualizado, ...(q.estado === 'ejecutando' && Date.parse(q.vence) > Date.now() ? {} : { fin: q.actualizado }) }; }
export async function anotarEstadoCola(id: string, f: typeof fetch = fetch) {
    const q = await estadoCola(id, f), base = join(carpeta(), id);
    if (!existsSync(join(base, 'estado.json')))
        return;
    if (q) {
        writeFileSync(join(base, 'vivo.json'), JSON.stringify(await vivoVersionado(id, f)));
        if (q.estado === 'error') {
            const p = JSON.parse(readFileSync(join(base, 'estado.json'), 'utf8'));
            p.error ??= { mensaje: q.resultado?.guardado ? 'El pedido cambió durante el trabajo. Hay un avance guardado para revisar antes de continuar.' : q.resultado?.motivo ?? 'La reserva agotó sus intentos. Revisa el proyecto antes de continuar.', fecha: q.actualizado };
            writeFileSync(join(base, 'estado.json'), JSON.stringify(p));
        }
    }
}
export async function bajarVersionado(id: string, f: typeof fetch = fetch) {
    const d = await indiceActual(id, f);
    if (!d)
        return false;
    registrarBase(id, d, false);
    const destino = join(carpeta(), id), temporal = join(carpeta(), '.version-' + randomUUID());
    mkdirSync(temporal, { recursive: true });
    try {
        for (const [r, e] of Object.entries(d.archivos)) {
            const p = join(temporal, r);
            mkdirSync(dirname(p), { recursive: true });
            writeFileSync(p, await bytesVersionados(id, e, f));
        }
        const viejo = temporal + '.viejo';
        if (existsSync(destino))
            renameSync(destino, viejo);
        renameSync(temporal, destino);
        rmSync(viejo, { recursive: true, force: true });
        await anotarEstadoCola(id, f);
    }
    finally {
        rmSync(temporal, { recursive: true, force: true });
    }
    return Object.keys(d.archivos).length;
}
function archivos(id: string) { const base = join(carpeta(), id); const encontrados: Record<string, Buffer> = Object.create(null); const recorrer = (d: string) => { for (const nombre of readdirSync(d)) {
    const p = join(d, nombre), s = lstatSync(p);
    if (s.isSymbolicLink())
        throw new Error('No se publican enlaces de disco.');
    if (s.isDirectory())
        recorrer(p);
    else {
        const r = relative(base, p).split('\\').join('/');
        if (r === 'vivo.json' || r === '.publicacion-no-confirmada.json' || r.endsWith('.tmp'))
            continue;
        if (!rutaSegura(r) || s.size > 32 * 1024 * 1024)
            throw new Error('Archivo no admitido en la publicación.');
        encontrados[r] = readFileSync(p);
    }
} }; if (existsSync(base))
    recorrer(base); if (Object.keys(encontrados).length > 5000)
    throw new Error('El proyecto supera el límite de archivos por publicación.'); return encontrados; }
export class PublicacionRechazada extends Error {
    guardado: string;
    estado: string;
    constructor(guardado: string, estado: string) { super(`No se sustituyó el proyecto: ${estado === 'conflicto' ? 'cambió mientras se guardaba' : 'la reserva dejó de ser válida'}. El avance está guardado con el identificador ${guardado}.`); this.guardado = guardado; this.estado = estado; }
}
export async function publicarVersionado(id: string, antes: Map<string, string>, espejo: boolean, f: typeof fetch = fetch, importar = false) {
    seguro(id);
    const s = sesiones.getStore();
    if (!s)
        throw new Error('El guardado versionado requiere una operación aislada.');
    const base = s.bases.get(id);
    if (!base)
        throw new Error('Antes de guardar hay que cargar la revisión del proyecto.');
    if (base.legado && !importar)
        throw new Error('Este proyecto necesita una importación controlada antes de modificarlo en modo versionado.');
    const locales = archivos(id);
    if (!locales['estado.json'])
        throw new Error('No se publica un proyecto sin estado.');
    const mapa: Record<string, EntradaIndice> = Object.assign(Object.create(null), base.indice.archivos);
    let subidos = 0, borrados = 0;
    s.publicacion.pendiente = true;
    const { url, key, bucket } = cfg();
    for (const [r, b] of Object.entries(locales)) {
        const huella = sha(b), cambio = antes.get(`${id}/${r}`) !== createHash('sha1').update(b).digest('hex');
        if (base.indice.revision && (!cambio || mapa[r]?.sha256 === huella))
            continue;
        const objeto = `_anonymo/${id}/${huella}`;
        const u = await f(`${url}/storage/v1/object/${bucket}/${objeto}`, { method: 'POST', headers: { ...headers(key), 'content-type': 'application/octet-stream', 'x-upsert': 'false' }, body: new Uint8Array(b), signal: AbortSignal.timeout(30000) });
        if (!u.ok && ![400, 409].includes(u.status))
            throw new Error(`No se completó el guardado remoto (HTTP ${u.status}). No se cambió la revisión visible.`);
        mapa[r] = { objeto, sha256: huella, bytes: b.length };
        if (!u.ok)
            await bytesVersionados(id, mapa[r], f);
        subidos++;
    }
    if (espejo)
        for (const r of Object.keys(mapa))
            if (!Object.hasOwn(locales, r) && antes.has(`${id}/${r}`)) {
                delete mapa[r];
                borrados++;
            }
    if (!subidos && !borrados && base.indice.revision) {
        s.publicacion.pendiente = false;
        return { subidos: 0, borrados: 0 };
    }
    const operacion = randomUUID(), reserva = s.reserva;
    const huella = sha(JSON.stringify(mapa));
    const enviar = () => rpcVersionado<{
        estado: string;
        revision: number;
        id: string;
    }>(s.restaurar?'anonymo_restaurar':'anonymo_publicar', { p_proyecto: id, p_base: base.indice.revision, p_id: operacion, p_huella: huella, p_archivos: mapa, ...(s.restaurar?{p_origen:s.restaurar}:{p_trabajo: reserva?.id ?? null, p_propietario: reserva?.propietario ?? null, p_reserva: reserva?.revision ?? null, p_correcto: !s.fallo, p_error: s.fallo ?? null}) }, f);
    const recibo = join(carpeta(), id, '.publicacion-no-confirmada.json');
    writeFileSync(recibo, JSON.stringify({ id: operacion, base: base.indice.revision, huella }));
    let r;
    try {
        r = await enviar();
    }
    catch {
        try {
            r = await enviar();
        }
        catch {
            throw new Error('No se pudo confirmar la publicación. Revisa la revisión visible antes de reintentar.');
        }
    }
    s.publicacion.pendiente = false;
    rmSync(recibo, { force: true });
    if (r.estado !== 'publicado')
        throw new PublicacionRechazada(r.id, r.estado);
    s.bases.set(id, { indice: { revision: r.revision, archivos: mapa }, legado: false });
    return { subidos, borrados };
}
export async function encolarVersionado(id: string, f: typeof fetch = fetch) { return rpcVersionado<string>('anonymo_encolar', { p_proyecto: seguro(id), p_id: randomUUID() }, f); }
export async function tomarVersionado(id: string, f: typeof fetch = fetch): Promise<ReservaTrabajo | undefined> { const propietario=randomUUID();const rs = await rpcVersionado<any[]>('anonymo_tomar_trabajo', { p_proyecto: seguro(id), p_propietario: propietario, p_segundos: 90 }, f); if(!Array.isArray(rs)||rs.length>1)throw new Error('No se confirmó una reserva válida.');const r=rs[0];if(!r)return undefined;const revision=Number(r.revision),uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;if(!uuid.test(r.id)||!uuid.test(r.propietario)||r.propietario!==propietario||r.proyecto!==id||!Number.isSafeInteger(revision)||revision<1)throw new Error('No se confirmó una reserva válida.');return {id:r.id,proyecto:r.proyecto,propietario:r.propietario,revision}; }
export async function pulsoVersionado(id: string, vivo: unknown, f: typeof fetch = fetch) { const r = reservaActual(); if (!r || r.proyecto !== id)
    return false; return rpcVersionado<boolean>('anonymo_pulso', { p_id: r.id, p_propietario: r.propietario, p_revision: r.revision, p_vivo: vivo }, f); }
export async function guardadosVersionados(id: string, f: typeof fetch = fetch) { return rpcVersionado<{
    id: string;
    estado: string;
    creado: string;
    archivos: Record<string, EntradaIndice>;
}[]>('anonymo_guardados_de', { p_proyecto: seguro(id) }, f); }
export async function terminarReserva(r: ReservaTrabajo, correcto: boolean, motivo: string, f: typeof fetch = fetch) { return rpcVersionado<boolean>('anonymo_terminar_trabajo', { p_id: r.id, p_propietario: r.propietario, p_revision: r.revision, p_resultado: { motivo }, p_correcto: correcto }, f); }
export async function estadoConCola(id: string, contenido: string, f: typeof fetch = fetch) { const q = await estadoCola(id, f); if (q?.estado !== 'error')
    return contenido; const p = JSON.parse(contenido); p.error ??= { mensaje: q.resultado?.guardado ? 'El pedido cambió durante el trabajo. Hay un avance guardado para revisar antes de continuar.' : q.resultado?.motivo ?? 'La reserva agotó sus intentos.', fecha: q.actualizado }; return JSON.stringify(p); }

export interface GuardadoProyecto {id:string;estado:string;revision:number|null;creado:string;archivos:Record<string,EntradaIndice>;}
export async function historialVersionado(id:string,f:typeof fetch=fetch){return rpcVersionado<Omit<GuardadoProyecto,'archivos'>[]>('anonymo_historial',{p_proyecto:seguro(id)},f);}
export async function guardadoVersionado(id:string,operacion:string,f:typeof fetch=fetch){if(!/^[a-f0-9-]{36}$/.test(operacion))throw new Error('Identificador de copia no válido.');const d=await rpcVersionado<GuardadoProyecto|null>('anonymo_guardado',{p_proyecto:seguro(id),p_id:operacion},f);if(d)validarIndice(id,{revision:1,archivos:d.archivos});return d;}
export function compararIndices(actual:IndiceProyecto,copia:GuardadoProyecto){return [...new Set([...Object.keys(actual.archivos),...Object.keys(copia.archivos)])].sort().flatMap(r=>{const a=actual.archivos[r],b=copia.archivos[r];return a?.sha256===b?.sha256?[]:[{ruta:r,cambio:!a?'recuperar':!b?'retirar':'cambiar'}];});}
