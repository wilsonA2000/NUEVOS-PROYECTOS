# Simplicidad y anti-sobreingeniería — VeriHome

Guía corta para mantener la plataforma simple y evitar que la complejidad
accidental vuelva a acumularse. Surgió de la auditoría de 2026-06-21 (ver
`~/.claude/plans/expressive-gliding-comet.md`).

## Reglas (anti-recaída)

1. **No crear versiones nuevas conviviendo con las viejas.** Prohibido
   `Componente2`, `EnhancedX`, `NewX`, `OptimizedX` si ya existe `X`. Se **edita
   en sitio** o se **borra el viejo** en el mismo PR. (Estos nombres fueron el
   síntoma #1 de cruft acumulado.)
2. **Borrar > comentar > dejar.** Código muerto no se comenta "por si acaso":
   está en git. Se borra.
3. **No reescribir monolitos que funcionan.** Extraer helpers PUROS (sin estado)
   solo cuando ya estás tocando el archivo por una feature. Nunca un big-bang
   "refactor de elegancia": eso es otra forma de sobreingeniería y mete bugs.
4. **`any` solo para código nuevo bajo presión real**, y con un TODO. No
   perseguir los `any` viejos en masa (bajo ROI, alto riesgo).
5. **No tocar la complejidad ESENCIAL** sin un plan dedicado: dualidad
   `Contract`/`LandlordControlledContract` (sync por UUID), orquestación
   biométrica (`biometric_service`, `ProfessionalBiometricFlow`),
   `WorkflowActionAPIView`. Son frágiles y de negocio.

## Cómo detectar cruft (correr periódicamente)

```bash
cd frontend && node scripts/detect-cruft.mjs
```
Reporta: **huérfanos** (0 imports no-test → candidatos a borrar), **monolitos**
(>700 líneas) y **nombres versionados**. Los huérfanos son CANDIDATOS:
re-verifica el gate antes de borrar (imports lazy/barrel/uso por JSX) y **nunca
borres un test que pasa** (es cobertura, no cruft).

## Red de seguridad (regresión cero) — correr ante cualquier limpieza

```bash
cd frontend && npx tsc --noEmit && npm run build && npx jest
BASE_URL=http://localhost node frontend/scripts/route-walker.mjs   # smoke E2E
source venv_ubuntu/bin/activate && python manage.py test           # backend
```
Borra/consolida en **commits pequeños**; si algo se rompe, se ve y se revierte.

## Resultado de la auditoría 2026-06-21
- Eliminadas **~18.000 líneas** de código muerto frontend (router viejo,
  páginas/messages, ~28 componentes huérfanos) — cero cambio funcional.
- Backend: revisado; los "candidatos" (PSE, tests legacy, comandos) resultaron
  **falsos positivos / cobertura real** → no se borró nada (la complejidad
  backend es mayormente esencial).
- Diferido a propósito (riesgo > valor, sin necesidad disparadora): consolidar
  `websocketService` (vivo en notificaciones), wrappers biométricos (flujo
  activo), split de monolitos y helper de webhooks de pago.
