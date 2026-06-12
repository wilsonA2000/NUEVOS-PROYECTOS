# NEXT_SESSION.md — VeriHome

**Última actualización**: 2026-06-11 (Fase 0 ejecutada)

## La fuente de verdad es `PLAN_PRODUCCION.md`

Todo el camino a producción (fases, casillas, decisiones cerradas) vive
ahí. Este archivo solo dice dónde quedamos.

## Estado actual

- **Fase 0 completada**: working tree limpio, 4 commits, push pendiente
  de verificación CI.
- Baseline verificado: backend **971/971 OK** (+3 skip) · tsc 0 errores ·
  build 42s · Jest **813/813** (ya no cuelga — era bug de WSL).
- Puerto backend estandarizado: **8000** (proxy Vite corregido).

## Próximo paso

**Fase 1, casilla 1.1 (Autenticación)**: arrancar backend en 8000 +
`npm run dev`, correr specs de auth y recorrido manual. Ver método
completo en `PLAN_PRODUCCION.md` § Fase 1.

## Historial

El NEXT_SESSION histórico (fases O/P/biométrico 2026-04) está en
`docs/history/NEXT_SESSION_hasta_2026-04-21.md`.
