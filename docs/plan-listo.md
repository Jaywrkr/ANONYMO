# Plan: el estudio listo para vender

Acordado con Jay el 23 de noviembre de 2026. No se vende con el estudio hasta cumplir las 5 condiciones.

## Cuándo está «listo»

1. Una web pasa de pedido a publicada sin arreglos a mano.
2. Tres webs de prueba (salud, legal, belleza) sacan 8 o más con la rúbrica fija de Jay y Luna.
3. Cuando algo falla, el estudio lo dice claro y se puede seguir sin perder trabajo.
4. Jay y Luna hacen su día completo desde el celular, cada uno viendo solo lo suyo.
5. Las pruebas corren solas en cada rama.

## Etapas

### 1 · Robustez (sistema/104-robustez)
- [x] Pruebas automáticas en cada rama (`sistema/**`, `web/**`, PR y a mano). CI en verde por primera vez desde el 4 nov.
- [x] Aviso cuando un proyecto lleva 3 días o más esperando (fila en rojo; la campana avisa a los 3, 7 y 14 días).
- [x] Prueba real de recuperación (comparar copia, confirmar por escrito, revisión nueva, proyecto en pausa) en CI con PostgreSQL real.
- [x] Error real de producción: `ENOSPC` en capturas del banco.
- [x] Código muerto: 3D, `/sala`, textos en inglés de la web de la agencia, componentes sin uso.
- [ ] Piloto de punta a punta con el proyecto de los odontólogos (datos reales: se hace con Jay).

### 2 · Calidad
- Rúbrica fija de Jay y Luna.
- 3 casos ficticios fijos (salud, legal, belleza).
- Quitar el «aire de plantilla».
- Calibrar al juez con esa rúbrica.
- Revisiones automáticas antes de entregar.

### 3 · Funcional (empieza sentándose con Luna)
- Inicio propio para Jay y para Luna.
- Menú corto (ocultar, no borrar).
- Una sola vista de proyecto en vez de 8 subpáginas.

### 4 · Vender
- Flujo corto de 3 pasos para la web de $390.
- Cobro.
- Ventas como primera pantalla.
