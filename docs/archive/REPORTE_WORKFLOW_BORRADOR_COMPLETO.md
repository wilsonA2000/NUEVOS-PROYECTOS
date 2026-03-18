# 🔍 REPORTE COMPLETO: Sistema de Workflow Etapa 2 → Etapa 3

**Fecha**: 17 de Noviembre, 2025
**Investigación**: Sistema de avance de workflow de documentos a creación de contrato

---

## ✅ HALLAZGOS CONFIRMADOS

### 1. ¿EXISTE sistema de BORRADOR?
**✅ SÍ EXISTE** - Completamente implementado

**Evidencia Backend:**
- Modelo: `LandlordControlledContract` con estado `status='draft'`
- Workflow: `draft` → `tenant_review` → `tenant_approved` → `ready_for_authentication`
- Archivo: `/contracts/models.py`

**Endpoints de visualización:**
- `GET /api/v1/contracts/{id}/preview-pdf/` - Preview genérico
- `GET /api/v1/contracts/landlord/contracts/{id}/preview_pdf/` - Preview del arrendador
- `GET /api/v1/contracts/tenant/contracts/{id}/contract_preview/` - Preview del arrendatario

**Endpoint de creación:**
- `POST /api/v1/contracts/landlord/contracts/` - Crea contrato en estado 'draft'
- Ubicación: `/contracts/landlord_api_views.py:94`

---

### 2. ¿EXISTE el botón "Generar Contrato Automáticamente"?
**✅ SÍ EXISTE** - Pero con condición problemática

**Ubicación Frontend:**
- Archivo: `/frontend/src/components/contracts/MatchedCandidatesView.tsx`
- Líneas: 1151-1163

**Función Backend:**
- Endpoint: `POST /api/v1/matching/requests/{id}/generate-contract/`
- Ubicación: `/matching/api_views.py:248-315`
- Función: `generate_contract()` - Genera contrato automáticamente desde match

**Integración Frontend:**
- Función: `handleGenerateContractAuto()` (línea 370)
- Servicio: `matchingService.generateContractFromMatch(candidate.id)`

---

## ❌ PROBLEMA RAÍZ IDENTIFICADO

### El Problema:
El botón "Generar Contrato Automáticamente" solo aparece cuando `workflow_stage === 3`, pero el sistema **NUNCA AVANZA AUTOMÁTICAMENTE** de etapa 2 a etapa 3.

### Evidencia del Código:

**Condición del botón (línea 1152):**
```typescript
{candidate.workflow_stage === 3 && !candidate.workflow_data.contract_created && (
  <Button onClick={() => handleGenerateContractAuto(candidate)}>
    ⚡ Generar Contrato Automáticamente
  </Button>
)}
```

**Botones disponibles en Etapa 2 (líneas 1127-1149):**
```typescript
{candidate.workflow_stage === 2 && (
  <>
    <Button onClick={() => handleReviewDocuments(candidate)}>
      Revisar Documentos
    </Button>
    <Button onClick={() => handleWorkflowAction(candidate, { type: 'reject' })}>
      Rechazar
    </Button>
  </>
)}
```

❌ **NO HAY BOTÓN PARA AVANZAR DE ETAPA 2 A ETAPA 3**

---

## 🔍 ANÁLISIS DEL FLUJO DE APROBACIÓN DE DOCUMENTOS

### Sistema de Detección (Backend):
Archivo: `/requests/document_api_views.py`

**Función `_calculate_stats` (líneas 425-466):**
```python
def _calculate_stats(self, uploaded_documents, checklist_data):
    # Calcula estadísticas
    total_approved = uploaded_documents.filter(status='approved').count()
    all_approved = all_required_uploaded and total_pending == 0 and total_rejected == 0
    can_proceed = all_approved  # ✅ DETECTA cuando puede proceder

    return {
        'all_approved': all_approved,
        'can_proceed': can_proceed,  # ✅ Flag disponible pero NO usado
    }
```

### Callback Frontend (Problema):
Archivo: `/frontend/src/components/contracts/MatchedCandidatesView.tsx`

**Líneas 1507-1510:**
```typescript
onAllApproved={() => {
  console.log('Todos los documentos aprobados!');
  // Opcional: cerrar modal automáticamente o mostrar mensaje
}}
```

❌ **SOLO IMPRIME LOG - NO ACTUALIZA WORKFLOW_STAGE**

### Componente de Revisión:
Archivo: `/frontend/src/components/contracts/LandlordDocumentReview.tsx`

**Líneas 201-202:**
```typescript
if (updatedData.all_approved && onAllApproved) {
  onAllApproved();  // ✅ SE LLAMA cuando todos aprueban
}
```

✅ **El callback SÍ se ejecuta** - pero la implementación está vacía

---

## 🔧 EL FLUJO ACTUAL vs EL ESPERADO

### Flujo ACTUAL (❌ Roto):
1. Arrendador acepta match → `workflow_stage = 2` ✅
2. Arrendatario sube documentos → `workflow_stage = 2` ✅
3. Arrendador revisa y aprueba TODOS los documentos ✅
4. Sistema detecta `all_approved = true` ✅
5. Se ejecuta `onAllApproved()` → Solo imprime log ❌
6. `workflow_stage` permanece en `2` ❌
7. Botón "Generar Contrato" **NO APARECE** (requiere stage 3) ❌
8. **ARRENDADOR BLOQUEADO** - No puede continuar ❌

### Flujo ESPERADO (✅ Correcto):
1. Arrendador acepta match → `workflow_stage = 2` ✅
2. Arrendatario sube documentos → `workflow_stage = 2` ✅
3. Arrendador revisa y aprueba TODOS los documentos ✅
4. Sistema detecta `all_approved = true` ✅
5. Se ejecuta `onAllApproved()` → **ACTUALIZA** `workflow_stage = 3` ✅
6. Card se actualiza mostrando "Etapa 3: Creación del Contrato" ✅
7. Botón "Generar Contrato Automáticamente" **APARECE** ✅
8. Arrendador hace clic → Genera borrador de contrato ✅

---

## 💡 SOLUCIÓN PROPUESTA

### Opción 1: Actualización Automática (RECOMENDADA)

**Backend - Crear nuevo endpoint:**
```
POST /api/v1/matching/requests/{id}/advance-to-contract-stage/
```

**Función:**
- Verifica que todos los documentos estén aprobados
- Actualiza `match_request.workflow_stage = 3`
- Actualiza `match_request.workflow_status = 'documents_approved'`
- Retorna datos actualizados del match

**Frontend - Modificar callback `onAllApproved`:**
```typescript
onAllApproved={async () => {
  try {
    // 1. Llamar endpoint para avanzar etapa
    const response = await matchingService.advanceToContractStage(
      selectedCandidateForDocuments.id
    );

    // 2. Actualizar estado local
    await refetchCandidates();

    // 3. Cerrar modal
    handleCloseDocumentsModal();

    // 4. Mostrar mensaje de éxito
    alert('✅ ¡Todos los documentos aprobados!\n\n' +
          'El proceso ha avanzado a Etapa 3: Creación del Contrato.\n' +
          'Ahora puedes generar el contrato automáticamente.');

  } catch (error) {
    console.error('Error avanzando etapa:', error);
  }
}}
```

### Opción 2: Botón Manual

Agregar botón adicional en Etapa 2 cuando `all_approved = true`:

```typescript
{candidate.workflow_stage === 2 && candidate.workflow_data.all_documents_approved && (
  <Button
    variant="contained"
    color="success"
    startIcon={<ForwardIcon />}
    onClick={() => handleAdvanceToContractStage(candidate)}
  >
    ✅ Continuar a Creación de Contrato
  </Button>
)}
```

---

## 📊 ARCHIVOS AFECTADOS

### Backend:
1. `/matching/api_views.py` - Agregar endpoint `advance-to-contract-stage`
2. `/matching/models.py` - Posible método helper `can_advance_to_stage_3()`
3. `/requests/document_api_views.py` - Ya tiene detección de `all_approved`

### Frontend:
1. `/frontend/src/components/contracts/MatchedCandidatesView.tsx` - Modificar `onAllApproved`
2. `/frontend/src/services/matchingService.ts` - Agregar `advanceToContractStage()`

---

## 🎯 PRIORIDAD

**CRÍTICA** - El arrendador no puede avanzar en el workflow después de aprobar documentos.

**Impacto:**
- ❌ Workflow completamente bloqueado en etapa 2
- ❌ Imposible generar contratos
- ❌ Imposible continuar con autenticación biométrica
- ❌ Sistema inutilizable para arrendadores

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Backend:
- [ ] Crear endpoint `POST /api/v1/matching/requests/{id}/advance-to-contract-stage/`
- [ ] Validar que todos los documentos requeridos estén aprobados
- [ ] Actualizar `workflow_stage = 3` y `workflow_status = 'documents_approved'`
- [ ] Retornar datos actualizados del match

### Frontend:
- [ ] Agregar función `advanceToContractStage()` en `matchingService.ts`
- [ ] Modificar callback `onAllApproved` en `MatchedCandidatesView.tsx`
- [ ] Implementar actualización de estado local tras avance de etapa
- [ ] Agregar feedback visual (mensaje de éxito, cierre de modal)

### Testing:
- [ ] Test: Aprobar todos los documentos → Verificar avance a etapa 3
- [ ] Test: Verificar aparición del botón "Generar Contrato Automáticamente"
- [ ] Test: Generar contrato desde etapa 3 → Verificar creación de borrador
- [ ] Test: Aprobar borrador → Verificar avance a etapa 4 (biométrica)

---

## 📝 NOTAS ADICIONALES

### Descubrimientos:
1. El sistema de detección de documentos aprobados **FUNCIONA CORRECTAMENTE**
2. El callback `onAllApproved` **SE EJECUTA** cuando corresponde
3. El problema es **ÚNICAMENTE** la implementación vacía del callback
4. El endpoint de generación de contrato ya existe y está funcional
5. El sistema de borrador está completamente implementado

### Confirmaciones:
- ✅ Sistema de borrador existe y funciona
- ✅ Endpoint de generación de contrato existe
- ✅ Botón de generación existe (pero condicionado a stage 3)
- ✅ Detección de documentos aprobados funciona
- ❌ Avance automático de etapa NO IMPLEMENTADO (causa del problema)

---

**Recomendación Final:**
Implementar **Opción 1 (Actualización Automática)** ya que:
- Mejora UX (sin clic adicional)
- Es consistente con el flujo esperado
- Reduce posibilidad de error del usuario
- Mantiene el workflow automático end-to-end

**Tiempo estimado de implementación:** 2-3 horas
**Complejidad:** Media
**Riesgo:** Bajo
