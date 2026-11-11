# Mapa de la agencia (sistema/67)

ANONYMO funciona como una agencia completa de nivel mundial: Jay y Luna deciden, los 22 agentes producen y Atlas reparte el trabajo. Este documento es el norte del producto: qué funciones tiene la agencia, en qué estado está cada una y en qué orden se construye.

[plan-agencia.md](plan-agencia.md) es otra cosa: el estado técnico de la infraestructura (reservas, publicación, chat).

Propuesta completa, con la investigación y las fuentes: documento «ANONYMO: la agencia completa, en un solo sistema» (11 nov 2026, en las artifacts de Jay).

## El recorrido del cliente

```
Encontrar (Imán, Sonda) → Cerrar el pedido (Atlas, Ledger) → Producir (marca y web) → Entregar (portal)
                                   ↑                                                     │
                     siguiente pedido                                                cada mes
                                   │                                                     ↓
                         Informe del mes (Pulso) ←───── Contenido mensual (Faro, Chispa, Rhea) ← Video (Corte, Faro, Eco)

Debajo de todo: Calidad (Prisma, Trofeo) y Taller (criterio, banco, conexiones).
```

Un cliente no termina al entregar la web: el contenido y el video de cada mes lo mantienen, y el informe del mes abre el siguiente pedido.

## Funciones y estado

| Función de una agencia | En ANONYMO | Agentes | Estado (0.67) | Falta |
|---|---|---|---|---|
| Nuevos negocios | Clientes nuevos (`/estudio/clientes`) | Imán, Sonda | Primera versión | Muestra automática, seguimiento con fechas, tanda diaria de 20 como máximo |
| Atención al cliente | Ficha del cliente + portal | Atlas, Tempo | Portal por proyecto; no hay ficha de cliente | Una ficha por cliente con toda su historia |
| Planificación y estrategia | Fase 1 · Arranque | Nova, Sonda | Funciona | Usar lo que Imán ya sabe del cliente |
| Presupuesto y finanzas | Números, propuesta | Ledger | Funciona | Facturas y cobros; margen real contra estimado |
| Marca | Fases 2 y 3 | Verba, Mira, Rhea, Kine, Eco | Funciona, calidad por calibrar | Calibración con el criterio de Jay |
| Web | Fase 4 | Orla, Lumen, Vector, Tempo | Funciona, diseño todavía con aire de plantilla | Panel de diseño que rehace (HANDOFF, prioridad 2); publicar con un botón |
| Contenido y redes (mensual) | Departamento de contenido | Faro, Chispa, Rhea | No existe en ANONYMO | Volver multi-cliente el planificador de Jay (`Jaywrkr/JAYCONTENTPLANNER`) |
| Video | `/estudio/video` | Corte, Faro, Eco | Edición lista (0.66) | Guion antes de grabar; que edite Corte y no Atlas |
| Foto, shootings y eventos | Producción con Luna | Lente, Escena | Solo dentro del lanzamiento | Moodboard y plan de rodaje |
| Calidad, premios y datos | Fase 6 · Jurado, banco | Prisma, Trofeo, Pulso | Banco listo; falta calibrar | Las decisiones de Jay y Luna alimentan al juez; informe mensual al cliente |
| Mejorar la casa | Taller | Atlas | Criterio, banco, conexiones y métricas sueltos en el menú | Agruparlos fuera del trabajo diario |

## Quién decide qué

| Momento | Decide |
|---|---|
| A quién escribirle hoy | Jay |
| Precio y alcance | Jay |
| Cada fase de marca y web | Jay, o Luna si se le asigna |
| Calendario de contenido del mes | Luna |
| Corte final de un video | Luna |
| Shooting o evento | Luna |
| Publicar o mandar al cliente | Quien aprobó |

Por confirmar con Luna.

## Contenido mensual: cómo va a funcionar

Sale del planificador de @jaywrkr (series por día, 28 días con opción A y B, captions, historias, piezas derivadas por red, revisión semanal, vista del día) y del de Coresolutions (`Jaywrkr/core-contenido`). El ciclo por cliente:

1. Reglas de la marca: el kit de marca que ya existe, más sus reglas de diseño.
2. Series fijas por día y fechas importantes del rubro (Faro).
3. Mes con opción A y B por día (Faro y Rhea escriben; Mira y Kine generan las piezas con código).
4. Revisión interna de Prisma contra las reglas.
5. Aprobación del mes completo por el cliente en su portal, no post por post.
6. Vista del día para publicar, con descargas y captions.
7. Informe del mes (Pulso), que alimenta el mes siguiente.

## Orden de construcción

Una fase por rama. No empieza hasta que la anterior está en `main` y Jay la usó.

| Fase | Qué entra | Se acepta si |
|---|---|---|
| 1 · Pulir lo que existe | Reglas de [experiencia.md](experiencia.md): volver a la misma pestaña, avisos fuera de la dirección, una sola espera y confirmación, menú en dos niveles, barra de celular nueva | Una prueba recorre todas las acciones del proyecto desde cada pestaña y en todas vuelve a la misma; Atrás funciona; nada se sale de 390 px en celular |
| 2 · Un solo cliente | Ficha de cliente: prospecto, pedidos, proyectos, videos, contenido y kit de marca | Del prospecto se llega al proyecto y del proyecto se vuelve al prospecto, con la misma historia |
| 3 · Cada función con sus agentes | Corte edita y Faro escribe guiones en video; Sonda prepara cada prospecto; tanda diaria; muestra automática | Un pedido de video pasa Atlas → Faro → Corte con cada paso firmado |
| 4 · Contenido mensual | El planificador vuelto multi-cliente | El mes de Coresolutions sale en ANONYMO igual o mejor que en su planificador |
| 5 · Celular como herramienta de campo | App instalable, «Compartir a ANONYMO», pedido por voz, aprobar de una en una | Una foto de la galería llega a la ficha del cliente correcto en menos de 3 toques |
| 6 · Calidad que aprende | Calibración por disciplina; panel que rehace; las decisiones alimentan el banco | En 10 piezas seguidas, el panel y Jay coinciden en 8 o más |
| Después | Publicar webs con un botón, publicar en redes, facturas, shootings y eventos | — |

## Riesgo conocido: WhatsApp

WhatsApp restringe cuentas que escriben a desconocidos en masa. Imán propone una tanda corta por día (20 como máximo), con cada mensaje distinto y enviado a mano por Jay. Nunca se envía solo.
