# PLAN DE ACCIÓN - FIXES Y MEJORAS PRIORIZADAS
**Fecha**: 16 de noviembre de 2025
**Versión**: 1.0.0
**Basado en**: Auditoría Completa de Frontend + Testing Manual

---

## RESUMEN EJECUTIVO

**Total de issues identificados**: 16
**Clasificación por prioridad**:
- **P0 (Bloqueantes)**: 3 issues - **CRÍTICO**
- **P1 (Altos)**: 5 issues - **URGENTE**
- **P2 (Medios)**: 8 issues - **IMPORTANTE**

**Tiempo estimado total**: 12-16 horas de desarrollo

---

## SEMANA 1: P0 - PROBLEMAS BLOQUEANTES (6-8 horas)

### ✅ DÍA 1: Corregir APIs Faltantes

#### FIX #1: MatchedCandidatesView - 3 APIs Backend

**Archivo**: `frontend/src/components/contracts/MatchedCandidatesView.tsx`
**Líneas**: 549, 612, 624
**Tiempo estimado**: 3 horas

**Backend (2h)**:
```python
# contracts/api_views.py

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_biometric_reminder(request, contract_id):
    """Enviar recordatorio de autenticación biométrica"""
    contract = get_object_or_404(Contract, id=contract_id)
    tenant = contract.tenant

    # Enviar email/notification
    send_notification(
        user=tenant,
        title="Recordatorio: Completa tu autenticación biométrica",
        message=f"El contrato {contract.contract_number} requiere tu autenticación",
        type="biometric_reminder"
    )

    return Response({"message": "Recordatorio enviado"}, status=200)

@api_view(['POST'])
def confirm_key_delivery(request, contract_id):
    """Confirmar entrega de llaves"""
    contract = get_object_or_404(Contract, id=contract_id)
    contract.keys_delivered = True
    contract.keys_delivered_date = timezone.now()
    contract.save()

    return Response({"message": "Llaves entregadas confirmadas"}, status=200)

@api_view(['POST'])
def start_contract_execution(request, contract_id):
    """Iniciar ejecución del contrato"""
    contract = get_object_or_404(Contract, id=contract_id)
    contract.execution_started = True
    contract.execution_start_date = timezone.now()
    contract.status = 'active'
    contract.save()

    return Response({"message": "Ejecución iniciada"}, status=200)
```

**Frontend (1h)**:
```typescript
// contractService.ts
export const sendBiometricReminder = (contractId: string) =>
  api.post(`/contracts/${contractId}/send-biometric-reminder/`);

export const confirmKeyDelivery = (contractId: string) =>
  api.post(`/contracts/${contractId}/confirm-key-delivery/`);

export const startContractExecution = (contractId: string) =>
  api.post(`/contracts/${contractId}/start-execution/`);
```

```typescript
// MatchedCandidatesView.tsx - línea 549
const handleSendBiometricReminder = useCallback(async (candidate) => {
  try {
    await contractService.sendBiometricReminder(contractId);
    alert(`Recordatorio enviado a ${tenantName}`);
  } catch (error) {
    console.error(error);
  }
}, []);

// Repetir para líneas 612 y 624
```

**URLs**:
```python
# contracts/urls.py
path('<uuid:contract_id>/send-biometric-reminder/', send_biometric_reminder),
path('<uuid:contract_id>/confirm-key-delivery/', confirm_key_delivery),
path('<uuid:contract_id>/start-execution/', start_contract_execution),
```

---

#### FIX #2: ContractDraftEditor - 3 TODOs

**Archivo**: `frontend/src/components/contracts/ContractDraftEditor.tsx`
**Líneas**: 449, 599, 673
**Tiempo estimado**: 2 horas

**Línea 449 - PDF Preview**:
```typescript
const handlePreviewPDF = async () => {
  try {
    setPreviewDialogOpen(true);

    // Usar endpoint existente de PDF
    const pdfUrl = `${API_BASE_URL}/contracts/${contractId}/preview-pdf/`;
    window.open(pdfUrl, '_blank');
  } catch (error) {
    console.error('Error generating PDF preview:', error);
  }
};
```

**Línea 599 - Step Content Rendering**:
```typescript
// Copiar de LandlordContractForm.tsx líneas 450-850
const renderStepContent = (step: number) => {
  switch (step) {
    case 0: return <LandlordInfoStep data={contractData} onChange={handleFieldChange} />;
    case 1: return <PropertyDetailsStep data={contractData} onChange={handleFieldChange} />;
    case 2: return <EconomicTermsStep data={contractData} onChange={handleFieldChange} />;
    case 3: return <ContractTermsStep data={contractData} onChange={handleFieldChange} />;
    case 4: return <GuaranteesStep data={contractData} onChange={handleFieldChange} />;
    case 5: return <ClausesStep data={contractData} onChange={handleFieldChange} />;
    case 6: return <ReviewStep data={contractData} />;
    default: return null;
  }
};

// Reemplazar línea 599
<Box sx={{ minHeight: 400 }}>
  {renderStepContent(activeStep)}
</Box>
```

**Línea 673 - PDF Preview Component**:
```typescript
<DialogContent>
  <iframe
    src={`${API_BASE_URL}/contracts/${contractId}/preview-pdf/`}
    width="100%"
    height="600px"
    title="Vista Previa del Contrato"
  />
</DialogContent>
```

---

#### FIX #3: requestService - Base URL Incorrecta

**Archivo**: `frontend/src/services/requestService.ts`
**Línea**: 196
**Tiempo estimado**: 5 minutos

```typescript
// ANTES (línea 196)
private baseUrl = '/requests/api';  // ❌ INCORRECTO

// DESPUÉS
private baseUrl = '/requests';  // ✅ CORRECTO
```

**Testing**:
```bash
curl http://localhost:8000/api/v1/requests/base/ -H "Authorization: Bearer TOKEN"
# Debería retornar 200 en lugar de 404
```

---

### ✅ DÍA 2: Seguridad y Limpieza Crítica

#### FIX #4: PaymentForm - Hardcoded API Keys

**Archivo**: `frontend/src/components/payments/PaymentForm.tsx`
**Líneas**: 72-78
**Tiempo estimado**: 1 hora

**Problema**:
```typescript
// ANTES (INSEGURO)
const PAYMENT_CONFIG = {
  stripe: {
    publishableKey: process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_example',  // ❌
  },
};
```

**Solución**:
```typescript
// DESPUÉS (SEGURO)
const getStripeKey = (): string => {
  const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error('VITE_STRIPE_PUBLISHABLE_KEY is not configured. Check your .env file.');
  }
  return key;
};

const getPayPalClientId = (): string => {
  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
  if (!clientId) {
    throw new Error('VITE_PAYPAL_CLIENT_ID is not configured. Check your .env file.');
  }
  return clientId;
};

const PAYMENT_CONFIG = {
  stripe: {
    publishableKey: getStripeKey(),
  },
  paypal: {
    clientId: getPayPalClientId(),
    environment: import.meta.env.MODE === 'production' ? 'production' : 'sandbox',
  },
};
```

**Agregar a .env**:
```bash
# frontend/.env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
VITE_PAYPAL_CLIENT_ID=sb_YOUR_CLIENT_ID_HERE
```

**Actualizar .gitignore**:
```
.env
.env.local
.env.production
```

---

#### FIX #5: PropertyImage - Limpiar console.log()

**Archivo**: `frontend/src/components/common/PropertyImage.tsx`
**Líneas**: 50, 59, 62, 67, 71, 79, 84, 97, 107, 117, 138, 142, 152, 167, 174
**Tiempo estimado**: 15 minutos

**Solución automatizada**:
```typescript
// Opción 1: Remover todos los console.log completamente
// Buscar y reemplazar: console.log(.*); → (vacío)

// Opción 2: Condicionar a development
const isDev = import.meta.env.MODE === 'development';

const log = (...args: any[]) => {
  if (isDev) console.log(...args);
};

// Reemplazar todos los console.log() con log()
```

**Script de limpieza**:
```bash
# Remover todos los console.log en PropertyImage.tsx
sed -i '/console.log/d' frontend/src/components/common/PropertyImage.tsx
```

---

## SEMANA 2: P1 - PROBLEMAS ALTOS (4-6 horas)

### FIX #6: Verificar useOptimizedWebSocketContext

**Archivo**: `frontend/src/components/messaging/ChatWindow.tsx`
**Línea**: 69
**Tiempo estimado**: 30 minutos

**Verificación**:
```bash
# Buscar si el hook existe
find frontend/src -name "*OptimizedWebSocketContext*"
```

**Si NO existe**:
```typescript
// ANTES
import { useOptimizedWebSocketContext } from '../../contexts/OptimizedWebSocketContext';

// DESPUÉS
import { websocketService } from '../../services/websocketService';

// Reemplazar uso del hook con el servicio
const { subscribe, send } = websocketService;
```

---

### FIX #7-11: Limpieza General (2 horas)

**FIX #7**: Remover console.log() en BiometricAuthenticationFlow.tsx
**FIX #8**: Remover console.log() en ProfessionalBiometricFlow.tsx
**FIX #9**: Remover código comentado en MatchesDashboard.tsx
**FIX #10**: Implementar TODO en PropertyDetail.tsx (favorite API)
**FIX #11**: Integrar Sentry en ErrorBoundary.tsx

---

## SEMANA 3-4: P2 - TECH DEBT Y OPTIMIZACIÓN (6-8 horas)

### FIX #12: Refactorizar PropertyForm.tsx

**Tiempo estimado**: 4 horas

**Dividir en sub-componentes**:
```
PropertyForm.tsx (orquestador - 200 líneas)
├── PropertyBasicInfoForm.tsx       (150 líneas)
├── PropertyLocationForm.tsx        (100 líneas)
├── PropertyDetailsForm.tsx         (150 líneas)
├── PropertyAmenitiesForm.tsx       (100 líneas)
└── PropertyReviewStep.tsx          (100 líneas)
```

---

### FIX #13-16: Tests y Documentación (4 horas)

**FIX #13**: Agregar tests para useContracts.ts
**FIX #14**: Agregar tests para useMatchRequests.ts
**FIX #15**: Agregar tests para matchingService.ts
**FIX #16**: Documentar componentes complejos

---

## TESTING POST-FIXES

Después de cada fix, ejecutar:

```bash
# Tests unitarios
npm run test

# Tests E2E
npx playwright test

# Linting
npm run lint

# Type checking
npm run type-check

# Build
npm run build
```

---

## CHECKLIST DE IMPLEMENTACIÓN

### P0 - Bloqueantes (CRÍTICO)

- [ ] FIX #1: Implementar 3 APIs faltantes (MatchedCandidatesView)
  - [ ] Backend: send_biometric_reminder
  - [ ] Backend: confirm_key_delivery
  - [ ] Backend: start_contract_execution
  - [ ] Frontend: Integrar APIs
  - [ ] Testing: Probar flujo completo

- [ ] FIX #2: Completar TODOs en ContractDraftEditor
  - [ ] PDF preview (línea 449)
  - [ ] Step rendering (línea 599)
  - [ ] PDF iframe (línea 673)
  - [ ] Testing: Editar contrato

- [ ] FIX #3: Corregir baseUrl en requestService
  - [ ] Cambiar '/requests/api' → '/requests'
  - [ ] Testing: Probar endpoints de solicitudes

### P1 - Altos (URGENTE)

- [ ] FIX #4: Remover hardcoded API keys
  - [ ] Implementar getters con validación
  - [ ] Agregar variables a .env
  - [ ] Actualizar .gitignore
  - [ ] Testing: Verificar que falla si .env no existe

- [ ] FIX #5: Limpiar console.log() en PropertyImage
  - [ ] Remover 15+ console.log()
  - [ ] Testing: Verificar que imágenes cargan correctamente

- [ ] FIX #6: Verificar useOptimizedWebSocketContext
  - [ ] Buscar archivo de contexto
  - [ ] Reemplazar si no existe
  - [ ] Testing: WebSocket funciona

### P2 - Tech Debt (IMPORTANTE)

- [ ] FIX #7-11: Limpieza general
- [ ] FIX #12: Refactorizar PropertyForm
- [ ] FIX #13-16: Tests y documentación

---

## SCRIPTS ÚTILES

### Script de limpieza automatizada:
```bash
#!/bin/bash
# clean_console_logs.sh

echo "Limpiando console.log() de archivos críticos..."

# PropertyImage.tsx
sed -i '/console.log/d' frontend/src/components/common/PropertyImage.tsx

# BiometricAuthenticationFlow.tsx
sed -i '/console.log/d' frontend/src/components/contracts/BiometricAuthenticationFlow.tsx

# ProfessionalBiometricFlow.tsx
sed -i '/console.log/d' frontend/src/components/contracts/ProfessionalBiometricFlow.tsx

echo "✅ Limpieza completada"
```

### Verificar builds después de fixes:
```bash
#!/bin/bash
# verify_fixes.sh

set -e

echo "🔍 Verificando fixes..."

# Type check
npm run type-check

# Linting
npm run lint

# Tests unitarios
npm run test:ci

# Build
npm run build

echo "✅ Todas las verificaciones pasaron"
```

---

## MÉTRICAS DE ÉXITO

### Pre-Fixes (Estado Actual)
- ✅ Componentes funcionales: 92%
- ⚠️ TODOs pendientes: 6
- ❌ APIs faltantes: 3
- 🧹 console.log(): 20+
- 🔐 Hardcoded credentials: 1

### Post-Fixes (Estado Esperado)
- ✅ Componentes funcionales: 98%+
- ✅ TODOs pendientes: 0
- ✅ APIs faltantes: 0
- ✅ console.log(): 0
- ✅ Hardcoded credentials: 0

---

## DOCUMENTOS RELACIONADOS

- **Auditoría Frontend**: `REPORTE_AUDITORIA_FRONTEND.md`
- **Guía Testing Manual**: `GUIA_TESTING_MANUAL_DETALLADA.md`
- **Tests Playwright**: `frontend/playwright/README.md`

---

**Fin del Plan de Acción**

Sigue este plan secuencialmente (P0 → P1 → P2) para maximizar el impacto y minimizar riesgos.
