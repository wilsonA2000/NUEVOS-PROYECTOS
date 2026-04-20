# VeriHome Testing Suite

Este documento describe la suite completa de testing automatizado para VeriHome, incluyendo tests unitarios, de integración y E2E.

## 📋 Tipos de Tests Implementados

### 1. Tests Unitarios (Jest + React Testing Library)
- **Componentes React**: Tests de renderizado, interacciones y props
- **Hooks personalizados**: Tests de lógica de estado y efectos
- **Servicios API**: Tests de llamadas HTTP y manejo de errores
- **Utilidades**: Tests de funciones helper y validaciones

### 2. Tests de Integración
- **Flujos completos**: Combinación de componentes y hooks
- **Contextos**: Tests de providers y estado global
- **APIs mockeadas**: Simulación de respuestas del backend

### 3. Tests E2E (Cypress)
- **Flujos de usuario**: Navegación completa de la aplicación
- **Autenticación**: Login, registro, logout
- **Gestión de propiedades**: CRUD completo
- **Búsqueda y filtros**: Funcionalidades de búsqueda

## 🚀 Comandos de Testing

### Tests Unitarios
```bash
# Ejecutar todos los tests
npm run test

# Tests en modo watch
npm run test:watch

# Tests con coverage
npm run test:coverage

# Tests específicos por categoría
npm run test:components    # Solo componentes
npm run test:hooks        # Solo hooks
npm run test:services     # Solo servicios
npm run test:auth         # Solo autenticación
npm run test:properties   # Solo propiedades

# Tests para CI/CD
npm run test:ci
```

### Tests E2E
```bash
# Abrir Cypress en modo interactivo
npm run test:e2e:open

# Ejecutar todos los tests E2E
npm run test:e2e

# Tests E2E con interfaz visible
npm run test:e2e:headed

# Tests de componentes con Cypress
npm run test:component
```

### Suite Completa
```bash
# Ejecutar todos los tipos de test
npm run test:full

# Optimización completa (incluye tests)
npm run optimize
```

## 📁 Estructura de Archivos

```
frontend/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   └── __tests__/
│   │   │       ├── Login.test.tsx
│   │   │       └── Register.test.tsx
│   │   └── properties/
│   │       └── __tests__/
│   │           ├── PropertyForm.test.tsx
│   │           └── PropertyList.test.tsx
│   ├── hooks/
│   │   └── __tests__/
│   │       ├── useAuth.test.ts
│   │       └── useProperties.test.ts
│   ├── services/
│   │   └── __tests__/
│   │       ├── authService.test.ts
│   │       └── propertyService.test.ts
│   ├── __mocks__/
│   │   ├── handlers.ts      # MSW handlers
│   │   ├── server.ts        # MSW server setup
│   │   └── api.ts          # API mocks
│   └── setupTests.ts       # Jest setup
├── cypress/
│   ├── e2e/
│   │   ├── auth-flow.cy.ts
│   │   └── property-management.cy.ts
│   ├── support/
│   │   ├── commands.ts     # Custom commands
│   │   └── e2e.ts         # Global setup
│   └── fixtures/
│       ├── user.json
│       └── properties.json
├── jest.config.cjs         # Jest configuration
└── cypress.config.ts       # Cypress configuration
```

## 🧪 Coverage Goals

### Umbrales de Coverage Actuales
- **Líneas**: 80%
- **Funciones**: 80%
- **Branches**: 80%
- **Statements**: 80%

### Componentes Críticos (Coverage > 90%)
- Componentes de autenticación
- Formularios de propiedades
- Hooks de estado crítico
- Servicios API principales

## 🔧 Configuración

### Jest Setup (`jest.config.cjs`)
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### Cypress Setup (`cypress.config.ts`)
```typescript
export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5176',
    defaultCommandTimeout: 10000,
    env: {
      apiUrl: 'http://localhost:8000/api/v1'
    }
  }
});
```

## 🎯 Tests Críticos Implementados

### Autenticación
- ✅ Login exitoso con credenciales válidas
- ✅ Manejo de errores de credenciales inválidas
- ✅ Validación de campos requeridos
- ✅ Registro de usuarios (tenant/landlord)
- ✅ Logout y limpieza de sesión
- ✅ Manejo de token expirado
- ✅ Rutas protegidas

### Propiedades
- ✅ Listado de propiedades con paginación
- ✅ Búsqueda y filtros
- ✅ Detalles de propiedad individual
- ✅ Creación de propiedades (landlord)
- ✅ Edición y eliminación
- ✅ Toggle de favoritos
- ✅ Vista de mapa
- ✅ Gestión de imágenes

### Contratos
- ✅ Creación de contratos
- ✅ Firma digital
- ✅ Estados de contrato
- ✅ Documentos adjuntos

### Pagos
- ✅ Procesamiento de pagos
- ✅ Validaciones de monto
- ✅ Historial de pagos
- ✅ Estados de transacción

### Mensajería
- ✅ Envío de mensajes
- ✅ Lista de conversaciones
- ✅ Notificaciones

## 🛠️ Mocking Strategy

### API Mocking (MSW)
- Interceptación de requests HTTP
- Respuestas realistas del backend
- Simulación de errores y edge cases
- Handlers organizados por módulo

### Component Mocking
- Mapbox GL para componentes de mapa
- File upload para carga de imágenes
- External libraries (Stripe, PayPal)

## 📊 CI/CD Integration

### GitHub Actions Pipeline
```yaml
- name: Run Tests
  run: |
    npm run test:ci
    npm run test:e2e
    
- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```

### Pre-commit Hooks
```json
{
  "pre-commit": [
    "npm run lint:fix",
    "npm run type-check",
    "npm run test:ci"
  ]
}
```

## 🔍 Debugging Tests

### Jest Debugging
```bash
# Debug mode
npm run test -- --detectOpenHandles --forceExit

# Specific test file
npm run test Login.test.tsx

# Watch mode with coverage
npm run test:watch -- --coverage
```

### Cypress Debugging
```bash
# Open with DevTools
npm run cypress:open

# Debug mode
DEBUG=cypress:* npm run test:e2e

# Screenshots on failure
npm run test:e2e -- --config screenshotOnRunFailure=true
```

## 📝 Writing New Tests

### Component Test Template
```typescript
describe('ComponentName', () => {
  beforeEach(() => {
    // Setup mocks
  });

  it('should render correctly', () => {
    render(<ComponentName />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const user = userEvent.setup();
    render(<ComponentName />);
    
    await user.click(screen.getByRole('button'));
    
    expect(mockFunction).toHaveBeenCalled();
  });
});
```

### E2E Test Template
```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    cy.login(); // Custom command
  });

  it('should complete user flow', () => {
    cy.visit('/feature');
    cy.get('[data-testid="element"]').click();
    cy.contains('Success Message').should('be.visible');
  });
});
```

## 🎯 Best Practices

### 1. Test Organization
- Un test por funcionalidad específica
- Describe blocks descriptivos
- Setup/teardown apropiado

### 2. Assertions
- Usar matchers específicos de jest-dom
- Verificar comportamiento, no implementación
- Tests independientes entre sí

### 3. Data Test IDs
```tsx
// Usar data-testid para elementos críticos
<button data-testid="submit-button">Submit</button>
```

### 4. Async Testing
```typescript
// Esperar elementos async
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});
```

### 5. Error Testing
- Simular errores de red
- Validar mensajes de error
- Probar edge cases

## 📈 Monitoring y Reporting

### Coverage Reports
- HTML report en `coverage/lcov-report/`
- Coverage badge en README
- Trending de coverage por PR

### Test Results
- JUnit XML para CI/CD
- Screenshots de fallos en Cypress
- Logs detallados para debugging

## 🔄 Maintenance

### Actualizaciones Regulares
- Dependencias de testing
- Fixtures con datos actualizados
- Mocks sincronizados con API real

### Review de Tests
- Code review incluye tests
- Refactoring de tests obsoletos
- Optimización de performance

---

Para más información, consulta la documentación específica de cada herramienta:
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Cypress Documentation](https://docs.cypress.io)
- [MSW Documentation](https://mswjs.io/docs/)
