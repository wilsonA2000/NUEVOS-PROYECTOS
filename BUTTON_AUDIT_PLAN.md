# Plan — Auditoría de Botones y Formularios (Perfil · Ajustes · Hoja de Vida)

**Fecha**: 2026-04-12
**Alcance**: probar por Playwright TODOS los botones interactivos y formularios
de las páginas `/app/profile`, `/app/settings`, `/app/resume`, `/app/resume/edit`
para los roles **arrendador** y **arrendatario**. Detectar botones que no
responden, forms que no guardan, endpoints que fallan.

---

## 1. Estrategia

**Un spec nuevo**: `frontend/playwright/tests/button-audit.spec.ts` con 2 casos
grandes (landlord y tenant). Cada caso visita las 4 páginas y ejercita cada
acción documentada en el mapa de exploración.

**Enfoque "seguridad primero"**: cada test NO depende del anterior. Seed
idempotente (`minimal` mode) al inicio. Modificaciones reversibles (rellenar
con valor válido, guardar, restaurar al default).

**Cobertura de acciones** (por mapa exhaustivo):
- **Profile**: 27 campos editables comunes + 4 landlord-only + 5 tenant-only + `Guardar Cambios`, `Cancelar`, subir avatar
- **Settings**: 4 accordions (Notificaciones, Privacidad, Preferencias, Seguridad) con ~18 controles + `Guardar Ajustes`
- **Resume**: botón `Editar` / `Crear Hoja de Vida` + 6 cards display
- **ResumeEdit**: 7 cards de formulario con ~30 campos + `Guardar Cambios`, `Cancelar`

**Total acciones**: ~90 por usuario · ~180 entre los 2 roles.

---

## 2. Archivos a crear

### 2.1 `frontend/playwright/tests/button-audit.spec.ts` (NUEVO)

Estructura:
```typescript
test('CASO A · Landlord: audita botones de perfil/ajustes/resume', async ({ browser }) => {
  const seed = runSeed('minimal');
  const ctx = createRunContext('e2e-logs/buttons');
  const bctx = await browser.newContext({ recordVideo: ... });
  const page = await bctx.newPage();
  attachLoggers(page, 'landlord', ctx);

  await uiLogin(page, ctx, 'landlord', seed.landlord_email, seed.password);

  // === Profile ===
  await auditProfilePage(page, ctx, 'landlord');

  // === Settings ===
  await auditSettingsPage(page, ctx, 'landlord');

  // === Resume (display) ===
  await auditResumePage(page, ctx, 'landlord');

  // === Resume Edit ===
  await auditResumeEditPage(page, ctx, 'landlord');

  // Resumen final con contadores
  writeSummary(ctx, 'landlord');
});

test('CASO B · Tenant: audita botones de perfil/ajustes/resume', async ({ browser }) => {
  // idéntico al anterior pero con tenant
});
```

### 2.2 `frontend/playwright/helpers/button-auditor.ts` (NUEVO)

Helper que para cada acción:
1. Marca `action:started` en `steps.jsonl`
2. Ejecuta el click / fill / select
3. Captura screenshot
4. Escucha la response API asociada (si aplica)
5. Marca `action:ok` / `action:fail` con status HTTP y body preview
6. Agrega al contador final: `{total, ok, fail, not_found, slow}`

Interfaz:
```typescript
interface AuditAction {
  name: string;                    // "profile:edit-first-name"
  selector: string | { role, name }; // Playwright locator
  kind: 'click' | 'fill' | 'select' | 'check' | 'upload';
  value?: string;                  // para fill/select
  expectedApi?: { method: string; pathMatch: RegExp };
  skipIfNotFound?: boolean;        // no fallar si el selector no existe
}

async function runAudit(page, ctx, actor, actions: AuditAction[]): Promise<AuditSummary>;
```

---

## 3. Qué se audita por página

### 3.1 Profile (`/app/profile`)
- [ ] **Tab "Editar Perfil"** existe y se puede activar
- [ ] Subir avatar con imagen de fixture
- [ ] Rellenar cada campo de texto/número (27 comunes + role-specific)
- [ ] Cambiar cada `<select>` a un valor válido
- [ ] Toggle de cada checkbox
- [ ] Click en `Guardar Cambios` → esperar `PATCH /users/profile/` **200**
- [ ] Reload y verificar que los valores persisten
- [ ] Click en `Cancelar` → valores se restauran

### 3.2 Settings (`/app/settings`)
- [ ] Cada accordion abre (`aria-expanded=true`)
- [ ] Toggle de **todas** las switches (Notificaciones × 6, Privacidad × 3, Seguridad × 2)
- [ ] Cambio de idioma, zona horaria, moneda, tema
- [ ] Click en `Guardar Ajustes` → esperar `PUT /users/settings/` **200**
- [ ] Reload y verificar persistencia
- [ ] Toggle UserStatusSelector (online/away/busy/offline)

### 3.3 Resume display (`/app/resume`)
- [ ] Si no hay resume → aparece `Crear Hoja de Vida`, click navega a `/app/resume/edit`
- [ ] Si existe → aparece `Editar`, click navega a `/app/resume/edit`
- [ ] Las 6 cards display se renderizan sin crash
- [ ] Porcentaje de completitud se muestra
- [ ] Botón volver funciona

### 3.4 ResumeEdit (`/app/resume/edit`)
- [ ] Rellenar cada card (Personal, Educativa, Laboral, Financiera, Emergencia, Referencias, Adicional)
- [ ] Probar campos condicionales (`evictionDetails` solo si `evictionHistory=true`)
- [ ] Validaciones client-side: email inválido, fecha futura en `graduationYear`, número negativo en `monthlySalary`
- [ ] Click `Guardar Cambios` → `PUT /users/resume/` **200** (fallback a `POST` si no existe aún)
- [ ] Reload `/app/resume` y verificar que los datos están
- [ ] Click `Cancelar` → navega a `/app/resume` sin guardar

### 3.5 Validaciones cruzadas
- [ ] El cambio de `monthly_income` en Profile se refleja en Resume `currentSalary` (o similar)?
- [ ] El avatar subido se ve en el header global
- [ ] El nombre actualizado se ve en el sidebar

---

## 4. Hallazgos esperados (hipótesis para buscar)

Basado en las sesiones previas registradas en memoria y los bugs descubiertos
en la auditoría E2E de contratos:

| Hipótesis | Validación |
|---|---|
| Algunos `<select>` MUI no disparan `onChange` confiable | Probar 2-3 selects por página |
| Upload de avatar puede fallar por CORS en dev | Monitorear `POST /users/avatar/` |
| `Cancelar` en ResumeEdit podría no restaurar state local | Probar modificar + cancelar + reentrar |
| Campos condicionales pueden no mostrar/ocultar bien | Toggle `evictionHistory` y ver `evictionDetails` |
| Guardar con validación fallida muestra error claro | Meter email inválido y verificar mensaje |
| El backend puede devolver 500 en campos específicos | Log de todos los responses ≥400 |
| Landlord ve campos tenant o viceversa | Verificar que `family_size` NO aparece en landlord |

---

## 5. Outputs

Por run (cada caso genera su propio `run-<timestamp>/`):

```
frontend/e2e-logs/buttons/run-<timestamp>/
├── summary.json              # { actor, total, ok, fail, not_found, slow }
├── steps.jsonl               # cada acción con status y duración
├── landlord-console.jsonl    # o tenant-console.jsonl
├── landlord-requests.jsonl
├── landlord-responses.jsonl
├── screenshots/              # 1 por acción (~90)
│   ├── 01-profile-load.png
│   ├── 02-profile-edit-first-name.png
│   ├── ...
└── videos/<actor>/*.webm
```

Y un **reporte consolidado** al final de la suite:
```
BUTTON_AUDIT_RESULTS.md
├── Tabla resumen por página y rol
├── Lista de botones/campos que NO funcionaron (con evidencia)
├── Errores de consola detectados
├── APIs que devolvieron ≥400
└── Sugerencias concretas de fix
```

---

## 6. Archivos a consultar sin modificar

- `frontend/src/pages/Profile.tsx` (ya mapeado)
- `frontend/src/pages/Settings.tsx`
- `frontend/src/pages/Resume.tsx`
- `frontend/src/pages/ResumeEdit.tsx`
- `frontend/src/services/userService.ts` / `authService.ts`
- `users/api_views.py` + `users/api_urls.py` (para validar endpoints reales)

---

## 7. Flujo de ejecución

```bash
# 1. Asegurar servers (ya corriendo post-merge)
curl -sS -o /dev/null -w "back:%{http_code}\n" http://localhost:8000/api/v1/
curl -sS -o /dev/null -w "front:%{http_code}\n" http://localhost:5173/

# 2. Correr solo la suite de botones
cd frontend
npx playwright test --config=playwright.config.e2e-real.ts --grep "CASO (A|B)"

# 3. Ver resultados
cat ../e2e-logs/buttons/run-*/summary.json | tail -2
cat ../BUTTON_AUDIT_RESULTS.md
```

---

## 8. Criterios de éxito

- [ ] Los 2 casos (landlord + tenant) corren a término sin timeout
- [ ] Summary final tiene `fail = 0` (si hay fails, están documentados con evidencia)
- [ ] Todas las acciones críticas (`Guardar Cambios`, `Guardar Ajustes`) responden 200
- [ ] `BUTTON_AUDIT_RESULTS.md` tiene tabla completa + lista priorizada de bugs nuevos

---

## 9. Esfuerzo estimado

| Paso | Tiempo |
|---|---|
| Crear `button-auditor.ts` helper | 30 min |
| Crear `button-audit.spec.ts` con 2 casos | 1 h |
| Primera ejecución + debug selectores (muchos serán frágiles) | 1 h |
| Segunda ejecución limpia + generar reporte | 30 min |
| Redactar `BUTTON_AUDIT_RESULTS.md` con hallazgos | 30 min |
| **Total** | **~3.5 h** |

Si la suite descubre bugs nuevos, se agregan a `FINDINGS.md` como
**BUG-BTN-XX** con la misma clasificación P0/P1/P2.

---

## 10. Orden de ejecución

1. **Ahora**: validar el plan con usuario
2. Crear helpers + spec
3. Correr primera vez (descubrir selectores frágiles)
4. Pulir selectores, re-correr
5. Generar `BUTTON_AUDIT_RESULTS.md`
6. Commit con mensaje: `test(e2e): auditoría de botones perfil/settings/resume · N bugs descubiertos`
7. Si hay bugs P0 nuevos → repetir ciclo fixes + re-audit
