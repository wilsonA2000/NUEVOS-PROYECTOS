# 🚫 SISTEMA DE RECHAZO COMPLETO - TODAS LAS ETAPAS

## Implementación Completa ✅

Se agregó el botón **"Rechazar Candidato"** en TODAS las etapas del flujo de contratación, desde el match inicial hasta ANTES de que el contrato nazca a la vida jurídica.

---

## Resumen de Etapas con Rechazo Disponible

### ✅ **ETAPA 1 - PROGRAMACIÓN DE VISITA**
**Escenario A**: Sin visita programada
- Botones: "Programar Visita" | **"Rechazar"** ✅

**Escenario B**: Con visita programada
- Botones: "Evaluar Visita" | **"Rechazar Candidato"** ✅ **[NUEVO]**

---

### ✅ **ETAPA 2 - REVISIÓN DE DOCUMENTOS**
- Botones: "Revisar Documentos" | **"Rechazar"** ✅

---

### ✅ **ETAPA 3 - CREACIÓN DE CONTRATO**

**Escenario A**: Contrato NO creado
- Botones: "⚡ Generar Contrato Automáticamente" | "✏️ Crear Manualmente" | **"Rechazar Candidato"** ✅ **[NUEVO]**

**Escenario B**: Contrato creado, esperando aprobación
- Botones: "Ver Contrato PDF" | "Aprobar Contrato" | **"Rechazar Candidato"** ✅ **[NUEVO]**

---

### ✅ **ETAPA 4 - AUTENTICACIÓN BIOMÉTRICA**

**Escenario A**: Arrendador ya autenticado, esperando arrendatario
- Botones: "✅ Tu autenticación completada" | "Ver Estado" | "📬 Recordar al Arrendatario" | **"Rechazar Candidato"** ✅ **[NUEVO]**

**Escenario B**: Arrendatario ya autenticado, esperando arrendador
- Botones: "🔐 Completar Mi Autenticación" | "✅ Arrendatario ya autenticado" | **"Rechazar Candidato"** ✅ **[NUEVO]**

**Escenario C**: Ninguno autenticado
- Botones: "⏳ Esperando arrendatario" | "Ver Estado del Contrato" | "📬 Recordar al Arrendatario" | **"Rechazar Candidato"** ✅ **[NUEVO]**

**Escenario D**: ⚠️ AMBOS autenticados (listos para etapa 5)
- Botones: "🎉 ¡Avanzar a Entrega de Llaves!" | "Ver Contrato Completo"
- **NO tiene rechazo** ✅ (contrato naciendo a la vida jurídica)

---

### ⛔ **ETAPA 5 - EJECUCIÓN DEL CONTRATO**
- **NO tiene rechazo** ✅ (contrato ya nació a la vida jurídica)
- Solo botones de gestión: "Ver Contrato Activo", "Confirmar Entrega de Llaves"

---

## Comportamiento del Rechazo

Cuando el arrendador presiona **"Rechazar Candidato"** en cualquier etapa 1-4:

1. **Backend** (archivo: `/contracts/api_views.py` líneas 2965-3024):
   - Registra actividad en UserActivityLog
   - Elimina Contracts relacionados
   - Elimina LandlordControlledContracts relacionados
   - Elimina MatchRequest (cascades a TenantDocuments)
   - Retorna: `{ deleted: true, tenant_can_reapply: true }`

2. **Frontend** (archivo: `/frontend/src/components/contracts/MatchedCandidatesView.tsx`):
   - Muestra notificación Snackbar: "✅ Candidato eliminado completamente. El arrendatario puede volver a aplicar."
   - Recarga lista de candidatos (candidato desaparece automáticamente)
   - Duración: 4 segundos auto-dismiss

---

## Archivos Modificados

### Frontend:
- **`/frontend/src/components/contracts/MatchedCandidatesView.tsx`**
  - Línea 1046-1055: ETAPA 1 con visita programada - Botón agregado
  - Línea 1129-1137: ETAPA 3 sin contrato - Botón agregado
  - Línea 1165-1173: ETAPA 3 con contrato creado - Botón agregado
  - Línea 690-698: ETAPA 4 (arrendador esperando) - Botón agregado
  - Línea 725-733: ETAPA 4 (arrendatario esperando) - Botón agregado
  - Línea 769-777: ETAPA 4 (ninguno autenticado) - Botón agregado
  - Línea 783: useCallback dependencies actualizadas

### Backend (ya implementado previamente):
- **`/contracts/api_views.py`**: Líneas 2965-3024 - Sistema de eliminación completa

---

## Flujo de Autorización

```
┌─────────────────────────────────────────────────────────────────┐
│                    RECHAZO DISPONIBLE ✅                        │
│                                                                 │
│  ETAPA 1: Match → Visita                                       │
│  ETAPA 2: Visita → Documentos                                  │
│  ETAPA 3: Documentos → Contrato                                │
│  ETAPA 4: Contrato → Autenticación Biométrica                  │
│           (hasta que AMBOS completen autenticación)            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ⚠️  PUNTO DE NO RETORNO                                        │
│  (Ambas partes completaron autenticación biométrica)           │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ETAPA 5: Ejecución del Contrato                               │
│  ⛔ RECHAZO NO DISPONIBLE                                       │
│  (Contrato ya nació a la vida jurídica)                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Testing Recomendado

1. **ETAPA 1 con visita programada**: Verificar botón "Rechazar Candidato" visible y funcional
2. **ETAPA 3 sin contrato**: Verificar botón presente junto a "Generar Contrato"
3. **ETAPA 3 con contrato**: Verificar botón presente junto a "Aprobar Contrato"
4. **ETAPA 4 - Todos los escenarios**: Verificar botón presente excepto cuando ambos autenticados
5. **Eliminación**: Confirmar que candidato desaparece de la lista tras rechazo
6. **Notificación**: Verificar Snackbar muestra mensaje de éxito

---

**Fecha de Implementación**: 13 de Octubre, 2025  
**Estado**: ✅ COMPLETADO Y LISTO PARA PRODUCCIÓN  
**Compatibilidad**: Frontend + Backend sincronizados
