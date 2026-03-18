# Playwright E2E Tests - VeriHome

Tests automatizados end-to-end para VeriHome usando Playwright.

## 📦 Instalación

```bash
# Instalar Playwright
npm install -D @playwright/test

# Instalar browsers
npx playwright install
```

## 🚀 Ejecutar Tests

```bash
# Todos los tests
npx playwright test

# Tests específicos
npx playwright test 01-auth
npx playwright test 02-property-crud

# Con UI (headed mode)
npx playwright test --headed

# Con debug
npx playwright test --debug

# Test específico en modo debug
npx playwright test 01-auth --debug

# Solo en Chrome
npx playwright test --project=chromium
```

## 📊 Ver Reportes

```bash
# Ver reporte HTML
npx playwright show-report
```

## 🎯 Estructura

```
playwright/
├── tests/
│   ├── 01-auth.spec.ts              # Tests de autenticación
│   ├── 02-property-crud.spec.ts     # Tests CRUD de propiedades
│   ├── 03-contract-workflow.spec.ts # Tests de flujo de contratos
│   └── 04-matching-messages.spec.ts # Tests de matching y mensajería
├── fixtures/
│   └── test-data.ts                 # Datos de prueba
└── README.md
```

## ⚙️ Configuración

Configuración en `playwright.config.ts`:
- Base URL: `http://localhost:5173`
- Timeout: 60 segundos por test
- Browsers: Chrome, Firefox, Safari
- Screenshots: On failure
- Video: On first retry
- Trace: On first retry

## 📝 Credenciales de Testing

Definidas en `fixtures/test-data.ts`:
- **Arrendador**: admin@verihome.com / admin123
- **Arrendatario**: letefon100@gmail.com / adim123
- **Prestador**: serviceprovider@verihome.com / service123

## ✅ Tests Implementados

### 01-auth.spec.ts
- ✅ Login como landlord
- ✅ Login como tenant
- ✅ Error en credenciales inválidas
- ✅ Logout

### 02-property-crud.spec.ts
- ✅ Crear nueva propiedad con imágenes

### 03-contract-workflow.spec.ts
- ⚠️ Smoke test básico (expandir según necesidad)

### 04-matching-messages.spec.ts
- ✅ Crear match request como tenant
- ✅ Acceder a módulo de mensajes

## 🔧 Troubleshooting

**Error: "Browser not found"**
```bash
npx playwright install
```

**Error: "Cannot find baseURL"**
- Asegúrate de que el dev server esté corriendo en `http://localhost:5173`

**Tests timeout**
- Aumenta timeout en `playwright.config.ts`
- Verifica que backend esté corriendo

## 🎯 Próximos Pasos

Tests pendientes de implementar:
- [ ] Flujo biométrico completo (5 pasos)
- [ ] Upload de imágenes drag & drop
- [ ] Sistema de pagos (Stripe/PayPal)
- [ ] WebSocket real-time messaging
- [ ] Dashboard de análisis

## 📚 Documentación

- [Playwright Docs](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Guía Testing Manual](../GUIA_TESTING_MANUAL_DETALLADA.md)
