# Memoria vigente · 0.51

Atlas se abre desde la esquina inferior derecha en cualquier pantalla del estudio. La conversación muestra el proyecto activo, admite Enter para enviar y Shift+Enter para otra línea. Al cerrar se conservan el borrador y las peticiones en curso; cambiar de proyecto es explícito y se bloquea mientras se responde. Las opciones de agente y encargos quedan plegadas. La página de memoria conserva las decisiones y los controles avanzados, sin duplicar el chat.

Un motivo registrado no equivale a una decisión vigente. La vista de Atlas conserva las decisiones y enlaza la versión exacta de su entrega. Indica si está confirmada, es propuesta, pertenece a una versión anterior, cambió el contexto o falta evidencia.

Solo una decisión de la versión actual, aprobada y con contexto comprobado puede reutilizarse como memoria confirmada. La aprobación de una entrega no inventa el contexto que falta en registros antiguos o continuaciones mezcladas. Las simulaciones nunca se reutilizan como confirmadas.

## Qué queda registrado

Antes de llamar al productor se fijan las huellas de requisitos, marca, materiales y dirección aplicable, junto con las huellas de las entregas que realmente recibe. Al terminar, la decisión se vincula también a los bytes de su propia entrega. Cambiar la versión, el contenido, sus requisitos o una fuente directa retira la vigencia de sus motivos. Añadir una fuente al plan también obliga a reconsiderarlos.

El contexto inicial se conserva entre vueltas. Si una continuación recibe otro contexto, la mezcla queda registrada y no se borra aunque después vuelvan los requisitos originales. Una continuación antigua sin contexto no adquiere uno inventado. Se detecta una incidencia para su seguimiento. Rehacer la entrega desde el principio permite producir con un contexto íntegro.

El registro inicial no se sobrescribe al volver a consultar o registrar la misma decisión. Las fuentes admitidas son los requisitos, entregas y decisiones confirmadas efectivamente suministrados al productor; no tareas futuras ni fuentes inventadas.

## Cómo se reutiliza

Cada agente recibe hasta 24 decisiones confirmadas de las entregas que su contrato le permite leer. No se mezcla información de otros proyectos ni se añaden decisiones futuras. El pedido vigente conserva prioridad; proponer un cambio requiere explicar la causa y pasar por la revisión del proyecto.

Atlas recibe el estado de vigencia junto al motivo. Si no hay conexión de IA, el resumen factual distingue confirmadas e historia y, al consultar por decisiones o motivos, muestra hasta tres registros con sus fuentes. Una interpretación de IA sigue identificada como tal.

## Verificación

`packages/pipeline/test/memoria.test.ts` comprueba aprobación, versiones, cambios de requisitos y contenido, fuentes cambiadas o añadidas, contexto previo a la producción, continuaciones, registros antiguos, simulaciones, transmisión al productor y consulta factual.

Con nube falsa iniciada, prepara y comprueba la vista móvil:

```bash
ANONYMO_NUBE=1 SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_KEY=x SUPABASE_BUCKET=proyectos ANONYMO_PROYECTOS=/tmp/anonymo-pruebas/memoria node --experimental-strip-types scripts/pruebas/memoria.ts
CHROMIUM=/usr/bin/chromium node scripts/pruebas/e2e-memoria.mjs
```

## Límites

La aprobación es de la entrega completa, no un nuevo permiso para publicar o actuar. No hay migración que confirme decisiones antiguas ni memoria global de agencia. La comprobación de dependencias cubre las fuentes directas; la propagación transitiva y la calibración semántica con IA real siguen pendientes. Esta memoria no modifica por sí misma las políticas comerciales ni el software de producción.
