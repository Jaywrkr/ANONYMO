#!/usr/bin/env bash
# Levanta el estudio «en línea» de prueba: Supabase falso (54321), IA falsa y lenta (45888) y la web en 3100.
# Antes: cd apps/web && npx next build. Para detener: bash scripts/pruebas/parar.sh (en otro comando).
set -e
# Ningún servicio externo de avisos se hereda en el servidor ficticio.
unset RESEND_API_KEY AVISOS_CORREO AVISOS_WEBHOOK ANONYMO_AVISOS_VERSIONADOS ANONYMO_WEBHOOK_IDEMPOTENTE
D="$(cd "$(dirname "$0")" && pwd)"; R="$(cd "$D/../.." && pwd)"; T="${PRUEBAS:-/tmp/anonymo-pruebas}"
rm -rf "$T"; mkdir -p "$T/semilla" "$T/nube"
(nohup node "$D/supabase-falso.mjs" > "$T/supabase.log" 2>&1 &)
(PALABRAS=60 PAUSA=400 nohup node "$D/anthropic-lento.mjs" > "$T/anthropic.log" 2>&1 &)
sleep 1
cd "$R"
ANONYMO_PROYECTOS="$T/semilla" node --experimental-strip-types "$D/semilla.ts"
export ANONYMO_NUBE=1 SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_KEY=x SUPABASE_BUCKET=proyectos
ANONYMO_PROYECTOS="$T/semilla" node --experimental-strip-types -e 'const { subirProyecto } = await import("./packages/pipeline/src/index.ts"); for (const id of ["clinica-sonrisa","cafe-lento","hotel-cuenca","dental-norte","_solicitudes"]) await subirProyecto(id); console.log("subido a la nube falsa");'
cd apps/web
(ANONYMO_PROYECTOS="$T/nube" ESTUDIO=1 ESTUDIO_CLAVE_JAY=prueba-clave-jay ESTUDIO_CLAVE_LUNA=prueba-clave-luna ESTUDIO_SECRETO=secreto-de-prueba-largo-123456789 PORTAL=1 TARIFA_HORA=35 ANTHROPIC_API_KEY=sk-ant-prueba-falsa ANTHROPIC_BASE_URL=http://127.0.0.1:45888 ANONYMO_PLAZO_MS=20000 ANONYMO_MARGEN_MS=2000 nohup npx next start -p 3100 > "$T/next.log" 2>&1 &)
sleep 4
echo "Estudio de prueba en http://127.0.0.1:3100 (clave: prueba-clave-jay). Registro: $T/next.log"
