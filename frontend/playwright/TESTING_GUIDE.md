# 🎭 Guía de Testing E2E con Playwright

## 📋 Descripción

Este directorio contiene tests E2E (End-to-End) automatizados usando Playwright para validar el flujo completo de contratos en VeriHome.

## 🚀 Tests Implementados

### 1. **Contract Workflow Complete** (`contract-workflow.spec.ts`)

Tests que cubren el flujo completo de creación de contratos:

#### **Stage 1: Match Request Creation**
- ✅ Tenant login
- ✅ Navegar a propiedades
- ✅ Ver detalle de propiedad
- ✅ Crear solicitud de match
- ✅ Verificar en dashboard de matches
- 📸 **5 screenshots generados**

#### **Stage 2: Match Approval & Documents**
- ✅ Landlord login
- ✅ Aprobar solicitud de match
- ✅ Tenant sube documentos
- ✅ Landlord revisa documentos
- 📸 **4 screenshots generados**

#### **Stage 3: Contract Creation**
- ✅ Landlord crea borrador de contrato
- ✅ Completa formulario multi-step
- ✅ Preview de PDF del contrato
- ✅ Guarda borrador
- 📸 **5 screenshots generados**

#### **Contract Draft Editor**
- ✅ Editar contrato existente
- ✅ Ver PDF preview en modal
- ✅ Ver PDF preview en iframe
- 📸 **2 screenshots generados**

---

## 🛠️ Instalación

Si aún no tienes Playwright instalado:

```bash
cd frontend

# Instalar dependencias de Playwright
npm install -D @playwright/test

# Instalar navegadores
npx playwright install
```

---

## ▶️ Ejecutar Tests

### **Ejecutar TODOS los tests:**
```bash
npm run test:e2e
```

O directamente con Playwright:
```bash
npx playwright test
```

### **Ejecutar test específico:**
```bash
npx playwright test contract-workflow
```

### **Ejecutar con UI interactiva (Recomendado para desarrollo):**
```bash
npx playwright test --ui
```

### **Ejecutar en modo headed (ver navegador):**
```bash
npx playwright test --headed
```

### **Ejecutar solo en Chrome:**
```bash
npx playwright test --project=chromium
```

### **Ejecutar tests de un stage específico:**
```bash
# Solo Stage 1
npx playwright test -g "Stage 1"

# Solo Stage 2
npx playwright test -g "Stage 2"

# Solo Stage 3
npx playwright test -g "Stage 3"
```

---

## 📸 Screenshots y Videos

### **Ubicación de evidencias:**
- **Screenshots**: `playwright-report/screenshots/`
- **Videos**: `playwright-report/videos/` (solo en fallos)
- **Traces**: `playwright-report/traces/` (solo en retry)

### **Screenshots generados automáticamente:**

| Archivo | Descripción |
|---------|-------------|
| `admin-logged-in.png` | Landlord autenticado |
| `letefon100-logged-in.png` | Tenant autenticado |
| `01-properties-list.png` | Lista de propiedades |
| `02-property-detail.png` | Detalle de propiedad |
| `03-match-request-form.png` | Formulario de match |
| `04-match-request-sent.png` | Confirmación de match enviado |
| `05-tenant-matches-dashboard.png` | Dashboard de tenant |
| `06-landlord-matches-pending.png` | Matches pendientes (landlord) |
| `07-match-accepted.png` | Match aceptado |
| `08-document-upload-modal.png` | Modal de subida de documentos |
| `09-contracts-list.png` | Lista de contratos |
| `10-contract-form-start.png` | Formulario de contrato (inicio) |
| `11-contract-step1-filled.png` | Paso 1 completado |
| `12-contract-step2.png` | Paso 2 (detalles propiedad) |
| `13-contract-pdf-preview.png` | Preview del PDF |
| `14-contract-editor.png` | Editor de contratos |
| `15-contract-pdf-modal.png` | Modal PDF en editor |

---

## 📊 Ver Reporte HTML

Después de ejecutar los tests, genera un reporte HTML interactivo:

```bash
npx playwright show-report
```

Esto abre un navegador con:
- ✅ Tests pasados/fallidos
- 📸 Screenshots de cada paso
- 🎥 Videos de tests fallidos
- 📈 Tiempos de ejecución
- 🔍 Traces interactivos (click para debugging)

---

## 🐛 Debugging

### **Modo Debug:**
```bash
npx playwright test --debug
```

### **Ejecutar con Inspector de Playwright:**
```bash
npx playwright test --debug --headed
```

### **Ver trace de un test específico:**
```bash
npx playwright show-trace playwright-report/traces/trace.zip
```

---

## ⚙️ Configuración

La configuración está en `playwright.config.ts`:

### **Puertos configurados:**
- **Frontend**: `http://localhost:5173`
- **Backend**: `http://localhost:8000`

### **Browsers configurados:**
- Desktop: Chrome, Firefox, Safari
- Mobile: Chrome (Pixel 5), Safari (iPhone 12)

### **Timeouts:**
- Test timeout: 60 segundos
- Expect timeout: 10 segundos

---

## 📝 Credenciales de Testing

```typescript
// Arrendador (Landlord)
Email: admin@verihome.com
Password: admin123

// Arrendatario (Tenant)
Email: letefon100@gmail.com
Password: adim123
```

---

## 🔄 CI/CD Integration

Para integrar en CI/CD (GitHub Actions, GitLab CI, etc.):

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: |
          cd frontend
          npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: frontend/playwright-report/
```

---

## 🎯 Casos de Uso

### **1. Testing Manual Automatizado**
En lugar de hacer clic manualmente por 20 minutos para probar el flujo completo, ejecuta:
```bash
npx playwright test contract-workflow --headed
```
Y **observa cómo se ejecuta automáticamente** todo el flujo mientras tomas café ☕

### **2. Regression Testing**
Antes de hacer deploy, ejecuta:
```bash
npx playwright test
```
Para asegurar que nada se rompió en el flujo crítico.

### **3. Visual Testing**
Revisa los screenshots generados en `playwright-report/screenshots/` para ver exactamente cómo se ve cada paso del flujo.

### **4. Performance Testing**
Playwright registra tiempos de navegación y renders. Revisa el reporte HTML para identificar pasos lentos.

---

## 🚧 Próximos Tests a Implementar

- [ ] Test de autenticación biométrica completa
- [ ] Test de aprobación de documentos por arrendador
- [ ] Test de rechazo de solicitudes
- [ ] Test de edición de contratos
- [ ] Test de generación automática de contratos
- [ ] Test de flujo con codeudor
- [ ] Test responsive (mobile)
- [ ] Test de performance (load times)

---

## 💡 Tips y Best Practices

### **1. Usar selectores data-testid:**
```tsx
// En componentes:
<button data-testid="submit-match-request">Enviar</button>

// En tests:
await page.click('[data-testid="submit-match-request"]');
```

### **2. Esperar a que cargue la página:**
```typescript
await page.waitForLoadState('networkidle');
```

### **3. Tomar screenshots en pasos críticos:**
```typescript
await page.screenshot({
  path: 'evidence/critical-step.png',
  fullPage: true
});
```

### **4. Manejo de modales:**
```typescript
// Esperar a que aparezca el modal
await page.waitForSelector('[role="dialog"]');

// Interactuar con el modal
await page.fill('[role="dialog"] input[name="field"]', 'value');

// Cerrar modal
await page.click('[role="dialog"] button:has-text("Cerrar")');
```

---

## 📚 Recursos

- [Documentación de Playwright](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Selectors Guide](https://playwright.dev/docs/selectors)
- [API Reference](https://playwright.dev/docs/api/class-test)

---

## 🎉 Resultado Final

Al ejecutar `npx playwright test`, obtendrás:

✅ **16 screenshots** del flujo completo
✅ **Videos** de cualquier test fallido
✅ **Reporte HTML** interactivo con timeline
✅ **Traces** para debugging detallado
✅ **Validación automática** de todo el workflow

**¡Es como tener un QA tester automatizado trabajando 24/7!** 🤖

---

**Última actualización**: Noviembre 18, 2025
**Versión**: 1.0.0
**Maintainer**: VeriHome Development Team
