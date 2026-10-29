# ANONYMO*

Agencia creativa de Jay y Luna (Cuenca, Ecuador) con un equipo de 22 agentes de IA.
El repo tiene tres cosas:

1. **La web pública de la agencia**: el equipo en 3D, la sala, los casos y el contacto.
2. **El estudio**: el panel interno donde Jay y Luna cargan un pedido, Atlas arma el plan y los agentes trabajan uno por uno hasta entregar la web del cliente.
3. **El pipeline**: el motor que hace trabajar a los agentes con Claude, guarda todo y maneja revisiones, pausas, jurado y nube.

> ¿Vas a seguir el desarrollo con otra herramienta (Codex u otra)? Lee primero **[HANDOFF.md](HANDOFF.md)**: estado actual, qué falla, qué sigue y cómo probar. Las reglas del repo para agentes de código están en **[AGENTS.md](AGENTS.md)**.

En línea: https://anonymo-ecru.vercel.app (estudio en `/estudio`, con clave). La versión se ve abajo a la derecha del estudio (`apps/web/lib/version.ts`).

---

## Estructura

```
apps/web/                 Next.js 16 (App Router), React 19, Tailwind v4, R3F/three, Motion, GSAP
  app/                    Web pública (/ /agentes /proceso /sala /casos /contacto /en/...)
  app/estudio/            El estudio (panel interno): inicio, proyecto, biblioteca, oficina, papelera...
  app/portal/[id]/        Portal privado del cliente (entregas, cuestionario, elegir dirección, comentar)
  app/trabajo/[id]/       Vuelta de trabajo en segundo plano (un agente por vuelta)
  app/sitio/[id]/[v]/...  Vista previa firmada de la web que construyó Vector
  app/imprimir/[id]/...   Páginas para PDF (entregas, propuesta, direcciones, dossier)
  components/estudio/     Piezas del estudio (Camino, EquipoVivo, AhoraEnVivo, Trabajando, RevisarAgente, Maqueta...)
  lib/                    Lógica del lado web (camino, trabajo, nube, sitio, propuesta, pendientes...)
packages/agentes/         Los 22 agentes (nombre, rol, área, color, caras) y las 7 fases. Español e inglés
packages/pipeline/        El motor: contratos, Atlas, correr, motor de IA, nube, sitio, direcciones, jurado, PDF, CLI
  src/contratos.ts        Qué entrega cada agente en cada fase, qué lee y con qué criterios
  test/                   Pruebas (node:test)
scripts/pruebas/          Estudio de prueba completo sin servicios reales (Supabase e IA falsos) + pruebas de punta a punta
docs/                     mejoras.md (todo lo construido, rama por rama), pipeline.md, fases.md, direccion-arte.md, jurado/
data/nombres.json         Matriz de nombres con dominio libre (de cuando se buscó el nombre de la agencia)
proyectos/                Proyectos de clientes en local. NO se suben (ver .gitignore y el candado de pre-commit)
prototipos/               Primer prototipo de la sala, solo referencia
```

## El equipo

| Fase | Agentes y entrega |
|---|---|
| 1 · Arranque | Atlas (plan del proyecto), Sonda (investigación), Nova (brief de marca), Ledger (presupuesto) |
| 2 · Naming | Verba (lista de nombres), Rhea (frase por finalista), Sonda (dominios y redes) |
| 3 · Identidad | Mira (sistema visual), Rhea (tono de voz), Kine (logo animado), Eco (logo sonoro) |
| 4 · Web | Orla (diseño de la web + 3 direcciones), Lumen (concepto 3D), Vector (web construida), Kine (movimiento), Eco (sonidos), Tempo (calendario y riesgos) |
| 5 · Lanzamiento | Faro (contenido), Chispa (cuentas y comunidad), Lente (shooting), Corte (guiones de video), Escena (evento) |
| 6 · Jurado | Prisma (calidad técnica), Trofeo (nota tipo Awwwards), Pulso (métricas) |
| 7 · Crecimiento | Imán (siguiente propuesta), Ledger (cierre financiero), Atlas (cierre del proyecto) |

Atlas decide en cada pedido qué tareas entran. Los contratos completos (qué lee cada uno, criterios y si es interna) están en `packages/pipeline/src/contratos.ts`.

## Cómo funciona un proyecto (el flujo)

1. **Nuevo pedido** (`/estudio/nuevo`): Jay o Luna cuentan en texto libre lo que quiere el cliente y suben archivos (fotos, logos, referencias; subida directa a la nube, hasta 25 MB por archivo).
2. **Plan**: Atlas lee el pedido y arma el plan: qué agentes trabajan, por qué no los demás, preguntas para el cliente y costo aproximado. Se puede corregir con palabras.
3. **Cómo trabajan**: al decir «Que empiecen» se elige el modo:
   - **Un agente a la vez** (por defecto): trabaja uno, entrega y te avisa; revisas, apruebas y sigue el siguiente.
   - **Por fases**: trabajan todos los de la fase y revisas al cerrarla.
   - **Automático**: corre hasta el final y solo para en decisiones obligatorias.
4. **Trabajo en segundo plano**: cada agente trabaja en una «vuelta» de menos de 5 minutos (`/trabajo/[id]`, límite de Vercel). Si se alarga, guarda lo escrito y sigue en la vuelta siguiente. Da señal cada 10 s (`vivo.json`) y el estudio la muestra en vivo (fase, palabras, cuánto lleva).
5. **Revisión por agente**: aprobar y seguir, pedir un cambio (con nota) o rehacer.
6. **Direcciones de diseño**: antes de la web, Orla propone 3 direcciones (colores, tipografías, portada, sección). Jay, Luna o el cliente eligen una (también desde el portal). Esto frena siempre, incluso en automático.
7. **La web**: Vector construye la web como archivos (HTML, CSS y JS) con la dirección elegida. Se ve funcionando en el estudio (escritorio, tablet, celular), por versión, y se baja en .zip.
8. **Jurado**: Prisma mide y Trofeo pone nota (diseño 40, usabilidad 30, creatividad 20, contenido 10). Bajo 7, se rehace lo más débil.
9. **Entrega al cliente**: portal privado, PDF por entrega (versión cliente sin lo interno, o interna completa), dossier y propuesta editable.

## El estudio (qué hay)

- **Inicio**: «Te toca» (lo que espera tu decisión), el equipo trabajando, la oficina, lo último entregado y el gasto de IA del mes.
- **Proyecto**: barra de fases del plan (con avance y si trabajan o te toca), panel «Ahora/Después», el equipo en vivo, pestañas Resumen, Entregas, Cliente, Archivos, Marca, Números (presupuesto, costo, propuesta) y Ajustes (modo, pausas, quién aprueba, papelera).
- **Biblioteca**: todas las entregas, más «Diseño y web» (direcciones y webs construidas de todos los proyectos).
- **La oficina**: escritorios 3D de los agentes con su estado.
- **Campana**: pendientes y avisos (también notificaciones del navegador).
- **Papelera**: restaurar o borrar para siempre (hay que escribir el nombre del cliente).
- **Portal del cliente**: enlace privado para ver entregas (sin lo interno), contestar preguntas, elegir dirección y comentar.
- Mientras una acción responde, la pantalla se bloquea con un aviso; no se puede tocar dos veces. Si un arranque se pierde, el proyecto arranca solo en unos 20 s.

Todo lo construido, rama por rama, con cómo se usa: **[docs/mejoras.md](docs/mejoras.md)**.

## Correr en local

```bash
npm install
cp .env.example .env.local   # llena lo que uses; sin ANTHROPIC_API_KEY todo corre en modo simulado
npm run dev                  # http://localhost:3000 (el estudio en /estudio abre directo en local)
```

Otros comandos:

```bash
npm run probar               # pruebas del pipeline y de la web
npx tsc -p apps/web --noEmit # tipos de la web
npm run build                # build de producción
npm run pipeline -- doctor   # revisa que todo esté bien configurado
npm run pipeline -- lista    # el pipeline también se maneja por terminal (ver docs/pipeline.md)
```

## Probar el estudio «en línea» sin servicios reales

`scripts/pruebas/` levanta un Supabase falso, una IA falsa que escribe despacio y el estudio en el puerto 3100, con proyectos de prueba:

```bash
cd apps/web && npx next build && cd ../..
bash scripts/pruebas/nube.sh          # http://127.0.0.1:3100 · clave: prueba-clave-jay
node scripts/pruebas/e2e-auto-web.mjs # automático: direcciones, web funcionando, zip, biblioteca
bash scripts/pruebas/parar.sh         # siempre en un comando aparte
```

Más pruebas (un agente a la vez con IA lenta, proyecto nuevo, arranque perdido) y el orden para correrlas: ver [HANDOFF.md](HANDOFF.md#cómo-probar). Si Chromium no está en el lugar estándar: `CHROMIUM=/ruta/al/chromium`.

## Variables de entorno

Todas están explicadas en `.env.example`. Las principales:

| Variable | Para qué |
|---|---|
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `ANTHROPIC_MODEL_RAPIDO` | IA real. Sin clave, modo simulado |
| `ESTUDIO=1`, `ESTUDIO_CLAVE_JAY`, `ESTUDIO_CLAVE_LUNA`, `ESTUDIO_SECRETO` | Estudio en línea con clave |
| `PORTAL=1` | Portal del cliente |
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_BUCKET` | Almacén privado (en Vercel es obligatorio: el disco se borra) |
| `TARIFA_HORA` | Precio por hora para presupuesto y propuesta |
| `RESEND_API_KEY`, `AVISOS_CORREO`, `AVISOS_WEBHOOK` | Avisos por correo o webhook |
| `ANONYMO_PLAZO_MS`, `ANONYMO_MARGEN_MS` | Duración de cada vuelta (pruebas) |

Las claves las pone Jay en Vercel. Nunca se escriben en el código, en el chat ni en el registro.

## Despliegue

Vercel (plan Hobby: funciones de hasta 300 s, registros de 1 hora). Cada merge a `main` se publica solo. En línea los proyectos viven en Supabase Storage (bucket privado). Cada acción y cada vuelta trabaja en su propia copia temporal y sube solo los archivos cuyo contenido cambió.

## Reglas del repo

- **Ramas**: una rama por mejora (`sistema/NN-nombre` o `web/NN-nombre`). El agente de código hace commit y push a la rama; **Jay abre el PR y hace el merge**.
- Cada rama sube `VERSION` en `apps/web/lib/version.ts` y agrega su fila en `docs/mejoras.md`.
- **Proyectos de clientes nunca al repo** (es público): `.gitignore` y el hook `.githooks/pre-commit` lo impiden.
- Antes de pedir merge: `npm run probar`, tipos, build y las pruebas de `scripts/pruebas/` que toquen lo cambiado.
- El texto de la interfaz va en español, simple y directo. Sin jerga técnica para Jay y Luna.
