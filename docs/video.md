# Departamento de video

Para que Luna edite videos filmados (personas hablando o haciendo algo) sin línea de tiempo: sube el video, le dice a Atlas lo que quiere o toca las partes que sobran, y descarga el resultado.

**Solo usa la API de Anthropic** (la misma clave del estudio) y FFmpeg. No hay transcripción ni subtítulos: Jay decidió no usar Whisper/OpenAI (0.65).

## Cómo funciona hoy (0.65)

1. Menú → **Video** → soltar el video (mp4, mov, m4v o webm; hasta 500 MB y 3 minutos por ahora) y, si quiere, escribir **qué quiere** («corta los silencios, quita el arranque donde se acomoda y expórtalo vertical»).
2. Sube directo a la nube privada (sin pasar por Vercel) con su avance a la vista. Al terminar abre el editor y **se escucha solo**: FFmpeg mide el volumen del video, detecta los silencios (umbral = 12 dB bajo el promedio, entre −50 y −26 dB) y divide el video en **partes**: cada tramo donde se habla o suena algo. De cada parte saca una miniatura numerada.
3. Se quitan solas las **pausas largas** (más de 0,6 s, ajustable), dejando un respiro de 0,12 s a cada lado.
4. **Partes del video**: tocar una parte la quita (queda en gris con ✕), tocarla otra vez la devuelve, con Mayús se quita un tramo de partes. «▶ 1,5 s» la muestra en la vista previa. Hay «Deshacer» y «Devolver todas las partes».
5. **Pídeselo a Atlas**: cambios con una frase («más dinámico», «quita la parte del inicio», «quita las partes donde no se ve la cara», «limpia el ruido», «expórtalo en los tres formatos»). Atlas **ve la hoja de miniaturas** (una imagen con todas las partes numeradas) y la lista de partes con sus tiempos, y responde con acciones. Lista lo que cambió y dice con claridad lo que todavía no se puede (subtítulos, zoom, logo, música). «Deshacer lo de Atlas» vuelve a lo de antes. El pedido escrito al subir se aplica solo apenas termina el análisis y, si pidió el video final, lo arma. La conversación queda guardada.
6. **Vista previa instantánea** en 9:16, 1:1 y 16:9: el navegador reproduce el original saltando los cortes, con las mismas cuentas que el render.
7. **Video final** por formato (1080×1920, 1080×1080, 1920×1080, H.264 + AAC): volumen parejo a −14 LUFS, limpieza de ruido opcional, fundido de 12 ms en cada corte. Si cambia la edición después de armarlo, dice «Volver a armar».

## Dónde vive
- `packages/pipeline/src/video/`: `edicion.ts` (partes, cortes y tramos: cálculo puro que usan la vista previa y el render), `ffmpeg.ts` (medir, silencios, hoja de miniaturas, render), `atlas-video.ts`, `almacen-video.ts`, `proceso.ts` (`analizarVideo`, `renderVideo`).
- Cada video vive en `_videos/<id>/` (en tu máquina `proyectos/_videos/`; en línea el mismo camino en la nube privada): `trabajo.json` (estado, análisis, **JSON de edición**, charla con Atlas), `avance.json`, `original.*`, `cuadros.jpg` y `final-9x16.mp4`, etc. No es un proyecto de la agencia: así las páginas del estudio no bajan megas de video.
- Web: `apps/web/app/estudio/video/` (lista, editor y rutas `nuevo`, `archivo`, `paso`, `estado`, `edicion`, `atlas`) y `apps/web/components/estudio/video/`.

## Atlas por dentro
- La IA (API de Anthropic con `ANTHROPIC_API_KEY` y `ANTHROPIC_MODEL_RAPIDO` o `ANTHROPIC_MODEL`) recibe la hoja de miniaturas como imagen, la lista de partes (inicio, fin, duración, silencio de antes, si está quitada), la edición actual, la charla reciente y el pedido. Responde con la herramienta `editar_video`: acciones `silencios`, `quitar`/`devolver` (por número de parte desde 1, o por segundos), `audio` y `armar`, más lo que no se puede.
- Las acciones se aplican **sin IA** (`aplicarAcciones`) y pasan por `edicionSegura`: lo que no encaja se descarta. Lo que se ve es exactamente lo pedido y se puede deshacer.
- `pedirEstructura` (`ia.ts`) acepta bloques (imagen + texto) y no fuerza la herramienta en Sonnet/Opus 5.5 ni Fable/Mythos 5.1–5.2 (esos modelos responden 400).
- Atlas no oye: no puede buscar una frase por lo que se dice ni cortar dentro de una parte. Lo dice cuando se lo piden.

## Configuración
- Solo `ANTHROPIC_API_KEY` (ya está). Opcionales: `ANONYMO_VIDEO_MAX_MB` (500), `ANONYMO_VIDEO_MAX_SEG` (180).
- En Supabase, el límite por archivo del bucket tiene que aceptar videos: el plan gratis corta en 50 MB.
- FFmpeg viene de `ffmpeg-static` y solo viaja en la función `/estudio/video/[id]/paso` (80 MB; se busca por ruta para no meterlo en las demás). No trae `drawtext`: los números de las miniaturas se ponen con libass y la fuente Geist SemiBold incluida (OFL).

## Límites conocidos
- Vercel corta cada paso a los 5 minutos: por eso el tope de 3 minutos de video. Un video de 1 minuto se arma en unos 30–70 s por formato.
- Si hay música o ruido fuerte de fondo, el audio casi no tiene silencios y el video queda en pocas partes largas.
- El sonido (normalizar, limpiar ruido) se oye en el video final, no en la vista previa.
- La hoja muestra hasta 80 partes; con más, Atlas ve solo las primeras 80 (se le avisa).

## Pruebas
- `packages/pipeline/test/video.test.ts`: partes desde silencios, cortes, tiempos, limpieza de la edición, filtros, un análisis y render reales con FFmpeg (video con sonido en dos tramos), y Atlas (acciones, mensaje, llamada a la API con la imagen).
- `scripts/pruebas/e2e-video.mjs` y `scripts/pruebas/e2e-video-atlas.mjs` (con `nube.sh`): video de 9 s con sonido en tres tramos; partes con miniatura, quitar a mano, armar y descargar (1080×1920, 4,3 s), Atlas con el pedido al subir, cambio por chat, deshacer, pedido que no entiende, conversación guardada, celular.

## Historia
- 0.63 (sistema/62): base con transcripción Whisper, subtítulos y edición por texto.
- 0.64 (sistema/63): Atlas convierte el pedido en la edición.
- 0.65 (sistema/64): sin transcripción ni subtítulos; partes por silencios y Atlas que ve las miniaturas.

## Fases que siguen (cada una en su rama)
3. **Motion y marca**: zooms, transiciones, logo al cierre, música con ducking bajo la voz; kit de marca por cliente (colores, logo). Remotion para el motion.
4. **Criterio de calidad**: investigación de piezas premiadas (Cannes Lions: Social & Creator, Film, Craft) y cuentas de marcas top convertida en reglas (gancho en los primeros segundos, ritmo de cortes, cierre) y la revisión del director creativo antes de mostrarle el video a Luna.
