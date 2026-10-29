# Instrucciones para agentes de código (Codex, Claude, etc.)

Lee [HANDOFF.md](HANDOFF.md) antes de empezar: estado actual, prioridades de Jay y cómo probar. [README.md](README.md) explica el proyecto.

## Flujo
- Trabaja en una rama nueva por mejora: `sistema/NN-nombre` (estudio, pipeline) o `web/NN-nombre` (web pública), saliendo de `main` actualizado. La última fue `sistema/45-handoff`.
- Haz commit y push a esa rama y dale a Jay el enlace para abrir el PR. **No hagas merge a `main`**: lo hace Jay.
- En cada rama: sube `VERSION` en `apps/web/lib/version.ts` (0.45, 0.46…) y agrega una fila en `docs/mejoras.md` que diga qué cambia en palabras simples y dónde se ve.

## Antes de entregar (obligatorio)
```bash
npm run probar
npx tsc -p apps/web --noEmit && npx tsc -p packages/pipeline --noEmit
cd apps/web && npx next build
```
Y las pruebas de punta a punta de `scripts/pruebas/` que toquen lo que cambiaste (ver HANDOFF.md, «Cómo probar»). Si cambias el flujo de trabajo, la nube o el estudio, córrelas todas.

## No se puede
- Subir proyectos de clientes (`proyectos/*/`) ni datos de clientes: el repo es público. Hay un hook en `.githooks/pre-commit`.
- Escribir claves o tokens en el código, en los commits o en los registros. Las pone Jay en Vercel.
- Publicar, desplegar sitios de clientes, mandar correos o mensajes sin que Jay lo pida.
- Borrar proyectos o mandarlos a la papelera sin confirmar con Jay.

## Estilo
- Interfaz y comentarios en español, frases simples, sin jerga técnica en lo que ven Jay, Luna o el cliente.
- Toda acción en la interfaz tiene que mostrar al instante que está trabajando, bloquear mientras responde y decir qué pasó.
- Node 22 con `--experimental-strip-types` para el pipeline (TypeScript sin compilar: imports con `.ts`).
