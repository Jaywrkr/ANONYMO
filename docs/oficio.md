# Oficio de la agencia · 0.54

Para que las entregas tengan nivel de estudio líder y no de plantilla. Código: `packages/pipeline/src/oficio.ts` y `plantillas.ts`.

## Qué recibe cada agente
- **Estándar de su disciplina** (web, identidad y logo, naming, contenido y redes, textos): cómo se hace bien, lo que se hace hoy y lo que delata trabajo genérico o de principiante.
- **Cómo comunica su rubro**: tono, códigos visuales, lo que pega y lo genérico. Once rubros; si nadie eligió plantilla, el rubro se reconoce por las palabras del pedido (`rubroDe`).
- **Criterio de la casa**: el estándar de Jay y Luna, editable en Estudio → Criterio de la casa. Se guarda en la nube en `_agencia/criterio.json`, con revisión para no pisar cambios.
- **La rúbrica con la que lo van a calificar**, para que se revise antes de entregar.

## Cómo califica el revisor
A quien produce la pieza principal (Orla, Vector, Mira, Verba, Faro, Chispa, Corte, Rhea en tono) se le suman las condiciones `oficio-*` de su disciplina. El revisor toma el rol de su disciplina (por ejemplo, director de arte de un estudio que gana Awwwards) y usa esta escala: 9–10 premiable, 8 estudio líder, 6–7 correcto pero genérico, 5 o menos principiante. Si aparece un recurso de plantilla de la lista, la nota no pasa de 6. Menos de 8 vuelve a hacerse con los arreglos concretos (hasta dos correcciones, como ya estaba).

Las condiciones de oficio se agregan en la revisión y no cambian la huella de contexto: las entregas ya verificadas no se invalidan. Lo nuevo se aplica desde la próxima entrega o al pedir otra revisión.

## Límites
Esto mejora el criterio, no garantiza el resultado: la calidad real se mide con entregas reales y la mirada de Jay. Lo gráfico de redes y el logo final siguen necesitando herramientas de imagen y vector, y un toque de dirección humana. Calibrar con casos aceptados y rechazados por Jay es el siguiente paso.

## Pruebas
`packages/pipeline/test/oficio.test.ts` (rubro, textos por disciplina, rúbrica, criterio con revisión, y que el pedido real a la IA y el revisor reciben el oficio). Con `nube.sh` levantado:

```bash
ANONYMO_NUBE=1 SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_KEY=x SUPABASE_BUCKET=proyectos ANONYMO_PROYECTOS=/tmp/anonymo-pruebas/oficio node --experimental-strip-types scripts/pruebas/oficio.ts
node scripts/pruebas/e2e-oficio.mjs   # edita el criterio, lo guarda y comprueba que le llega al agente con su oficio y su rubro
```
