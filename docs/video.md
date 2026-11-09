# Departamento de video

Para que Luna edite videos filmados (personas hablando o haciendo algo) sin línea de tiempo: sube el video, ajusta con pocos toques y descarga el resultado. Plan completo en 4 fases; esta rama hace la **fase 1**.

## Fase 1 (0.63): la base

**Qué hace**
1. Menú → **Video** → soltar el video (mp4, mov, m4v o webm; hasta 500 MB y 3 minutos por ahora).
2. Sube directo a la nube privada (sin pasar por Vercel) con su avance a la vista. Al terminar abre el editor y **se transcribe solo** (Whisper, con el tiempo de cada palabra).
3. Ya transcrito, se quitan solas las **pausas largas** (más de 0,6 s, ajustable) y las **muletillas** («eh», «mmm»; «este» y «o sea» no, porque muchas veces son parte de la frase).
4. **Editar el video editando el texto**: tocar una palabra la saca; tocarla de nuevo la devuelve; con Mayús se quita un tramo entero. Hay «Deshacer» y «Devolver todo el texto».
5. **Subtítulos** con plantillas de la casa: *Marca* (pocas palabras grandes, la que se dice en color), *Limpio* (frase completa abajo, para entrevistas) y *Caja* (texto sobre fondo oscuro). Color de acento, tamaño y lugar. En vertical, «abajo» queda por encima de la zona que tapan los botones de Reels y TikTok.
6. **Vista previa instantánea** en 9:16, 1:1 y 16:9: el navegador reproduce el original saltando los cortes y dibuja los subtítulos con las mismas medidas que el render.
7. **Video final** por formato (1080×1920, 1080×1080, 1920×1080, H.264 + AAC): volumen parejo a −14 LUFS (el nivel de redes), limpieza de ruido opcional, fundido de 12 ms en cada corte para que no suene un clic. Si se cambia la edición después de armarlo, el formato dice «Volver a armar».

**Dónde vive**
- `packages/pipeline/src/video/`: `edicion.ts` (cortes, tramos, subtítulos: cálculo puro que usan la vista previa y el render), `subtitulos.ts` (plantillas y archivo `.ass`), `ffmpeg.ts`, `transcribir.ts`, `almacen-video.ts`, `proceso.ts`.
- Cada video vive en `_videos/<id>/` (en tu máquina, `proyectos/_videos/`; en línea, el mismo camino en la nube privada): `trabajo.json` (estado, transcripción y **JSON de edición**), `avance.json`, `original.*` y `final-9x16.mp4`, etc. No es un proyecto de la agencia: así las páginas del estudio no bajan megas de video.
- Web: `apps/web/app/estudio/video/` (lista, editor y rutas `nuevo`, `archivo`, `paso`, `estado`, `edicion`) y `apps/web/components/estudio/video/`.

**Configuración (la pone Jay en Vercel)**
- `OPENAI_API_KEY`: para transcribir. Sin ella se puede subir, pero el editor avisa que falta.
- Opcionales: `ANONYMO_WHISPER_MODELO` (por defecto `whisper-1`), `ANONYMO_VIDEO_MAX_MB` (500), `ANONYMO_VIDEO_MAX_SEG` (180).
- En Supabase, el límite por archivo del bucket tiene que aceptar videos: el plan gratis corta en 50 MB.

**Por qué FFmpeg y no Remotion todavía**: para cortar, subtitular y normalizar el sonido, FFmpeg (con libass) hace todo en una función de Vercel, sin cuentas nuevas. El binario viene de `ffmpeg-static` y solo viaja en la función `/estudio/video/[id]/paso` (80 MB; no se mete en las demás). Remotion entra en la fase 3, para textos animados y motion de marca.

**Límites conocidos**
- Vercel corta cada paso a los 5 minutos: por eso el tope de 3 minutos de video. Un video de 1 minuto se arma en unos 30–70 s por formato. Para videos largos hará falta render en otro servicio (Remotion Lambda u otro).
- El sonido (normalizar, limpiar ruido) se oye en el video final, no en la vista previa.
- La transcripción depende de Whisper; si la persona habla muy rápido o hay música fuerte, puede fallar alguna palabra.

**Pruebas**
- `packages/pipeline/test/video.test.ts`: cortes, muletillas, tiempos, subtítulos, Whisper, filtros y un render real con FFmpeg.
- `scripts/pruebas/e2e-video.mjs` (con `nube.sh`, que ahora levanta también un Whisper falso en 45889): sube, transcribe, quita una palabra, cambia plantilla, arma el 9:16, lo descarga (1080×1920 y más corto que el original), pide volver a armar al cambiar, lista, celular y acceso sin sesión. Capturas en `/tmp/anonymo-pruebas/capturas-video`.

## Fases que siguen (cada una en su rama)

2. **Atlas**: Luna escribe el pedido en el chat («corta los silencios, subtítulos estilo marca, zoom en la frase clave y el logo al final») y Atlas lo convierte en el JSON de edición. Cambios con una frase («el texto más grande», «quita la parte del inicio»). La base ya está: todo lo que hace el editor es un cambio a `Edicion` (validado por `edicionSegura`).
3. **Motion y marca**: zooms, textos animados, transiciones, logo al cierre, música con ducking bajo la voz; kit de marca por cliente (tipografías, colores, logo, estilo de subtítulos). Remotion para el motion.
4. **Criterio de calidad**: investigación de piezas premiadas (Cannes Lions: Social & Creator, Film, Craft) y cuentas de marcas top convertida en reglas (gancho en los primeros segundos, ritmo de cortes, texto en pantalla, cierre) y la revisión del director creativo antes de mostrarle el video a Luna.
