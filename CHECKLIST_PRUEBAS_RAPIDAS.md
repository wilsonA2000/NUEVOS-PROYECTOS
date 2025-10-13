# ✅ CHECKLIST DE PRUEBAS RÁPIDAS - FLUJO BIOMÉTRICO

**Fecha**: 5 de Octubre, 2025
**Fixes Aplicados**:
1. ✅ Stale closure en ProfessionalBiometricFlow.tsx
2. ✅ Orden de URLs en contracts/api_urls.py (404 fix)

---

## 🎯 PRUEBA RÁPIDA DEL ARRENDATARIO

### Pre-requisitos:
- [ ] Servidor Django corriendo en puerto 8000
- [ ] Frontend corriendo en puerto 5173
- [ ] DevTools abierto (F12) → Pestaña Console
- [ ] Login como tenant: `letefon100@gmail.com`

### ID del Contrato a probar:
```
055e0039-fbaa-4d07-a2f9-5a6e3f1cc6f1
```

### URL directa:
```
http://localhost:5173/app/contracts/biometric/055e0039-fbaa-4d07-a2f9-5a6e3f1cc6f1
```

---

## 📋 PASOS A SEGUIR:

### 1. **Captura Facial** ✅
- [ ] Tomar foto frontal
- [ ] Click "Continuar"
- [ ] **VERIFICAR EN CONSOLA**:
  ```
  🔥 handleStepComplete called: { stepIndex: 0, ... }
  ➡️ Avanzando al siguiente paso: 1
  ```

### 2. **Verificación de Documento** ✅
- [ ] Subir PDF (cualquier PDF funciona)
- [ ] Tomar foto con documento
- [ ] Click "Continuar"
- [ ] **VERIFICAR EN CONSOLA**:
  ```
  🔥 handleStepComplete called: { stepIndex: 1, ... }
  ➡️ Avanzando al siguiente paso: 2
  ```

### 3. **Grabación de Voz** ✅
- [ ] Grabar frase de identificación
- [ ] Click "Continuar"
- [ ] Grabar frase cultural
- [ ] Click "Continuar"
- [ ] **VERIFICAR EN CONSOLA**:
  ```
  🔥 handleStepComplete called: { stepIndex: 2, ... }
  ➡️ Avanzando al siguiente paso: 3
  ```

### 4. **Firma Digital** 🔥 **CRÍTICO**
- [ ] Firmar en el canvas
- [ ] Aceptar términos y condiciones
- [ ] Click "Firmar Digitalmente"

### **LOGS ESPERADOS EN CONSOLA** (LO MÁS IMPORTANTE):

```javascript
🔥 handleStepComplete called: { stepIndex: 3, totalSteps: 4, isLastStep: true }
✅ ÚLTIMO PASO DETECTADO - Preparando para completar flujo
📦 All biometric data collected: { face_capture: {...}, ... }
🚀 Calling onComplete with allData

🎉 BiometricAuthenticationPage: Autenticación biométrica completada
📦 Data recibida de ProfessionalBiometricFlow: {...}
🚀 Llamando a POST /contracts/055e0039-fbaa-4d07-a2f9-5a6e3f1cc6f1/complete-auth/
✅ Respuesta del servidor: {...}
🔍 Determinando tipo de usuario: {...}
✅ Tipo de usuario determinado: tenant
➡️ Redirigiendo a dashboard de tenant
```

### **SI VES ESTO, EL FIX FUNCIONÓ** ✅

---

## ❌ **LOGS DE ERROR A BUSCAR:**

Si ves alguno de estos, reportar inmediatamente:

```javascript
// ❌ ERROR 404 (debería estar resuelto)
Failed to load resource: the server responded with a status of 404

// ❌ Loop infinito (debería estar resuelto)
🔥 handleStepComplete called: { stepIndex: 3, ... }
(sin "✅ ÚLTIMO PASO DETECTADO")

// ❌ No llama onComplete (debería estar resuelto)
(no aparece "🚀 Calling onComplete")
```

---

## ✅ **RESULTADO ESPERADO:**

### Frontend:
- [ ] Redirige a `/app/contracts/tenant`
- [ ] Muestra mensaje: "✅ Autenticación completada. Esperando autenticación del arrendador."
- [ ] **NO vuelve al paso 1** (loop resuelto)
- [ ] **NO muestra error 404** (URL fix aplicado)

### Backend (opcional verificar):
```python
# Django shell
from contracts.models import Contract
contract = Contract.objects.get(id='055e0039-fbaa-4d07-a2f9-5a6e3f1cc6f1')
print(contract.status)
# Debería ser: 'pending_landlord_biometric'
```

---

## 🎉 **SI TODO ESTÁ ✅:**

El flujo biométrico del arrendatario está funcionando correctamente.

**SIGUIENTE PASO**: Probar el flujo del arrendador (login como `admin@verihome.com`)

---

## 📸 **SCREENSHOTS ÚTILES:**

Si hay algún error, tomar screenshot de:
1. Consola del navegador (F12)
2. Mensaje de error en pantalla
3. Network tab mostrando la petición fallida

---

**¡Buena suerte con las pruebas!** 🚀

Si todo funciona, habremos completado exitosamente la corrección del flujo biométrico end-to-end.
