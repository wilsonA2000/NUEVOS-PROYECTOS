# 🧪 GUÍA DE TESTING - FLUJO BIOMÉTRICO CORREGIDO

**Fecha**: 5 de Octubre, 2025
**Fix Aplicado**: Corrección de stale closure en ProfessionalBiometricFlow.tsx
**Estado**: ✅ Listo para testing

---

## 🎯 OBJETIVO DEL TEST

Verificar que el flujo biométrico completo funciona correctamente end-to-end después del fix aplicado:

- ✅ Arrendatario completa 4 pasos → Sistema actualiza estados → Arrendador puede proceder
- ✅ Arrendador completa 4 pasos → Contrato se activa → **Nace a la vida jurídica**

---

## 📋 PRE-REQUISITOS

### Servidores Corriendo:

```bash
# Backend Django (Puerto 8000)
cd "/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS"
python3 manage.py runserver

# Frontend React (Puerto 5173)
cd "/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS/frontend"
npm run dev
```

### Usuarios de Prueba:

Necesitas dos usuarios:
1. **Arrendador** (landlord)
2. **Arrendatario** (tenant)

**Opción 1 - Usar usuarios existentes**:
- Email: `admin@verihome.com` / Password: `admin123` (si es landlord)
- Email: Buscar en base de datos un tenant

**Opción 2 - Crear usuarios nuevos** (si es necesario):
```python
python3 manage.py shell

from django.contrib.auth import get_user_model
User = get_user_model()

# Crear landlord
landlord = User.objects.create_user(
    email='landlord_test@test.com',
    password='test123',
    first_name='Landlord',
    last_name='Test',
    user_type='landlord',
    is_email_verified=True
)

# Crear tenant
tenant = User.objects.create_user(
    email='tenant_test@test.com',
    password='test123',
    first_name='Tenant',
    last_name='Test',
    user_type='tenant',
    is_email_verified=True
)
```

---

## 🧪 PASO A PASO DEL TEST

### FASE 1: PREPARACIÓN

#### 1.1 Verificar que existe un contrato en estado correcto

```bash
# Abrir Django shell
python3 manage.py shell
```

```python
from contracts.models import Contract

# Buscar contratos en estados biométricos
contracts = Contract.objects.filter(
    status__in=['pending_tenant_biometric', 'pending_landlord_biometric', 'tenant_approved']
)

print(f"Contratos disponibles: {contracts.count()}")

# Mostrar el primero
if contracts.exists():
    c = contracts.first()
    print(f"Contrato: {c.contract_number}")
    print(f"ID: {c.id}")
    print(f"Estado: {c.status}")
    print(f"Landlord: {c.primary_party.email}")
    print(f"Tenant: {c.secondary_party.email}")
    print(f"\nURL para tenant: http://localhost:5173/app/contracts/biometric/{c.id}")
```

**Si NO hay contratos disponibles**, crea uno usando el script o manualmente desde el frontend.

---

### FASE 2: TESTING DEL ARRENDATARIO

#### 2.1 Login como Arrendatario

1. Abrir navegador en: `http://localhost:5173`
2. Login con credenciales de tenant
3. **IMPORTANTE**: Abrir DevTools (F12) → Pestaña Console

#### 2.2 Navegar al Contrato

- Ir a: `http://localhost:5173/app/contracts/biometric/{contract_id}`
- O navegar desde el dashboard de contratos del tenant

#### 2.3 Completar Flujo Biométrico (4 Pasos)

**📸 PASO 1: Captura Facial**
- Tomar foto frontal del rostro
- Click en "Continuar"
- **Verificar en consola**:
  ```
  🔥 handleStepComplete called: { stepIndex: 0, totalSteps: 4, isLastStep: false }
  ➡️ Avanzando al siguiente paso: 1
  ```

**📄 PASO 2: Verificación de Documento**
- Subir PDF del documento
- Tomar foto con documento junto al rostro
- Click en "Continuar"
- **Verificar en consola**:
  ```
  🔥 handleStepComplete called: { stepIndex: 1, totalSteps: 4, isLastStep: false }
  ➡️ Avanzando al siguiente paso: 2
  ```

**🎙️ PASO 3: Grabación de Voz**
- Grabar frase de verificación
- Click en "Continuar"
- **Verificar en consola**:
  ```
  🔥 handleStepComplete called: { stepIndex: 2, totalSteps: 4, isLastStep: false }
  ➡️ Avanzando al siguiente paso: 3
  ```

**✍️ PASO 4: Firma Digital**
- Firmar en el canvas
- Aceptar términos y condiciones
- Click en "Firmar Digitalmente"
- **⚠️ CRÍTICO - VERIFICAR EN CONSOLA**:
  ```
  🔥 handleStepComplete called: { stepIndex: 3, totalSteps: 4, isLastStep: true }
  ✅ ÚLTIMO PASO DETECTADO - Preparando para completar flujo
  📦 All biometric data collected: { face_capture: {...}, document_verification: {...}, voice_recording: {...}, digital_signature: {...} }
  🚀 Calling onComplete with allData

  🎉 BiometricAuthenticationPage: Autenticación biométrica completada
  📦 Data recibida de ProfessionalBiometricFlow: {...}
  🚀 Llamando a POST /contracts/{contract_id}/complete-auth/
  ✅ Respuesta del servidor: {...}
  🔍 Determinando tipo de usuario: {...}
  ✅ Tipo de usuario determinado: tenant
  ➡️ Redirigiendo a dashboard de tenant
  ```

#### 2.4 Verificar Resultado

**✅ Comportamiento CORRECTO esperado**:
- Sistema redirige a: `/app/contracts/tenant`
- Mensaje mostrado: "✅ Autenticación completada. Esperando autenticación del arrendador."
- **NO vuelve al paso 1** ✅
- **NO muestra loop infinito** ✅

**❌ Comportamiento INCORRECTO (si aún existe)**:
- Sistema vuelve al paso 1
- No hay redirección
- No se muestra mensaje de éxito

#### 2.5 Verificar Estado en Base de Datos

```python
from contracts.models import Contract

contract = Contract.objects.get(id='contract_id_aqui')
print(f"Estado del contrato: {contract.status}")
# Debe ser: 'pending_landlord_biometric'

# Verificar autenticación del tenant
from contracts.models import BiometricAuthentication
tenant_auth = BiometricAuthentication.objects.filter(
    contract=contract,
    user=contract.secondary_party
).first()

if tenant_auth:
    print(f"Estado auth tenant: {tenant_auth.status}")  # Debe ser: 'completed'
    print(f"Confianza: {tenant_auth.overall_confidence_score}")  # Debe ser > 0.7
```

---

### FASE 3: TESTING DEL ARRENDADOR

#### 3.1 Logout y Login como Arrendador

1. Logout del tenant
2. Login con credenciales de landlord
3. **IMPORTANTE**: Mantener DevTools (F12) abierto

#### 3.2 Navegar al Contrato

- Ir a: `http://localhost:5173/app/contracts/biometric/{contract_id}`
- O navegar desde el dashboard de contratos del landlord

#### 3.3 Verificar que Puede Iniciar

**✅ Comportamiento CORRECTO**:
- El sistema permite iniciar la autenticación biométrica
- Se muestra el flujo de 4 pasos
- **NO hay mensaje de "Esperando al arrendatario"** ✅

**❌ Comportamiento INCORRECTO**:
- Sistema bloquea al landlord
- Mensaje: "No es tu turno"
- No puede iniciar flujo

#### 3.4 Completar Flujo Biométrico (4 Pasos)

Repetir los mismos 4 pasos que el tenant:
1. Captura Facial
2. Verificación de Documento
3. Grabación de Voz
4. Firma Digital

**⚠️ VERIFICAR EN CONSOLA DEL PASO 4**:
```
🔥 handleStepComplete called: { stepIndex: 3, totalSteps: 4, isLastStep: true }
✅ ÚLTIMO PASO DETECTADO - Preparando para completar flujo
📦 All biometric data collected: {...}
🚀 Calling onComplete with allData

🎉 BiometricAuthenticationPage: Autenticación biométrica completada
🚀 Llamando a POST /contracts/{contract_id}/complete-auth/
✅ Respuesta del servidor: {...}
✅ Tipo de usuario determinado: landlord
🎉 Redirigiendo a dashboard principal - Contrato activo
```

#### 3.5 Verificar Resultado Final

**✅ Comportamiento CORRECTO**:
- Sistema redirige a: `/app/contracts`
- Mensaje mostrado: "🎉 ¡Contrato firmado y activo! El contrato ha nacido a la vida jurídica."
- **NO vuelve al paso 1** ✅
- Contrato visible en dashboard como ACTIVO ✅

#### 3.6 Verificar Estado Final en Base de Datos

```python
from contracts.models import Contract, LandlordControlledContract

contract = Contract.objects.get(id='contract_id_aqui')
print(f"Estado del contrato: {contract.status}")
# ✅ Debe ser: 'active'

# Verificar autenticación del landlord
from contracts.models import BiometricAuthentication
landlord_auth = BiometricAuthentication.objects.filter(
    contract=contract,
    user=contract.primary_party
).first()

if landlord_auth:
    print(f"Estado auth landlord: {landlord_auth.status}")  # Debe ser: 'completed'
    print(f"Confianza: {landlord_auth.overall_confidence_score}")  # Debe ser > 0.7

# Verificar LandlordControlledContract
try:
    lc = LandlordControlledContract.objects.get(id=contract.id)
    print(f"\nLandlordControlledContract:")
    print(f"  Workflow status: {lc.workflow_status}")  # Debe ser: 'active'
    print(f"  Is active: {lc.is_active}")  # Debe ser: True
    print(f"  Activation date: {lc.activation_date}")  # Debe tener fecha
    print("\n🎉 ¡CONTRATO NACE A LA VIDA JURÍDICA!")
except Exception as e:
    print(f"Error: {e}")
```

---

## 🔍 LOGS DEL BACKEND A VERIFICAR

Durante el testing, verificar en la consola del servidor Django:

**Cuando el Tenant completa**:
```
INFO: Completando autenticación biométrica {auth_id}
INFO: Autenticación biométrica completada exitosamente. Confianza general: 0.87
INFO: 🔄 Sequential progression - User: tenant, Current status: pending_tenant_biometric
INFO: ✅ Tenant completed biometric (no guarantor) → Now landlord's turn
INFO: ✅ Sequential progression completed - New status: pending_landlord_biometric
```

**Cuando el Landlord completa**:
```
INFO: Completando autenticación biométrica {auth_id}
INFO: Autenticación biométrica completada exitosamente. Confianza general: 0.89
INFO: 🔄 Sequential progression - User: landlord, Current status: pending_landlord_biometric
INFO: ✅ Landlord completed biometric → All biometrics completed, contract activated
INFO: 🎉 LandlordContract: ACTIVADO - Nace a la vida jurídica
INFO: ✅ LandlordControlledContract sincronizado: active
INFO: ✅ Sequential progression completed - New status: all_biometrics_completed
```

---

## ✅ CRITERIOS DE ÉXITO

El fix está funcionando correctamente si:

### Para el Arrendatario:
- ✅ Completa los 4 pasos sin volver al inicio
- ✅ Ve en consola: "✅ ÚLTIMO PASO DETECTADO"
- ✅ Ve en consola: "🚀 Calling onComplete"
- ✅ Redirige a `/app/contracts/tenant`
- ✅ Mensaje: "Esperando autenticación del arrendador"
- ✅ Estado BD: `pending_landlord_biometric`

### Para el Arrendador:
- ✅ Puede iniciar su autenticación (no bloqueado)
- ✅ Completa los 4 pasos sin volver al inicio
- ✅ Ve en consola: "✅ ÚLTIMO PASO DETECTADO"
- ✅ Ve en consola: "🚀 Calling onComplete"
- ✅ Redirige a `/app/contracts`
- ✅ Mensaje: "¡Contrato firmado y activo!"
- ✅ Estado BD: `active`
- ✅ LandlordControlledContract: `is_active = True`

### En Backend:
- ✅ Logs muestran progresión secuencial correcta
- ✅ Sincronización con LandlordControlledContract exitosa
- ✅ Estados actualizados correctamente

---

## 🐛 TROUBLESHOOTING

### Si el tenant vuelve al paso 1 después de la firma:

1. **Verificar en consola**:
   - ¿Aparece "✅ ÚLTIMO PASO DETECTADO"?
     - ❌ No → El fix no se aplicó correctamente, verificar archivo
     - ✅ Sí → Continuar
   - ¿Aparece "🚀 Calling onComplete"?
     - ❌ No → Problema en el setTimeout, verificar código
     - ✅ Sí → Continuar
   - ¿Aparece "🎉 BiometricAuthenticationPage: Autenticación biométrica completada"?
     - ❌ No → onComplete no está conectado, verificar props
     - ✅ Sí → Continuar

2. **Verificar archivos modificados**:
   ```bash
   cd "/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS/frontend"

   # Verificar que el fix está aplicado
   grep -n "stepIndex === 3" src/components/contracts/ProfessionalBiometricFlow.tsx
   # Debe mostrar línea 117: if (stepIndex === 3) {
   ```

3. **Recompilar frontend**:
   ```bash
   cd "/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS/frontend"
   npm run dev
   # Hard refresh en navegador: Ctrl+Shift+R
   ```

### Si el landlord no puede iniciar:

1. **Verificar estado del contrato en BD**:
   ```python
   contract = Contract.objects.get(id='...')
   print(contract.status)
   # Debe ser 'pending_landlord_biometric'
   ```

2. **Verificar autenticación del tenant**:
   ```python
   tenant_auth = BiometricAuthentication.objects.filter(
       contract=contract, user=contract.secondary_party
   ).first()
   print(tenant_auth.status if tenant_auth else "No existe")
   # Debe ser 'completed'
   ```

---

## 📝 CHECKLIST FINAL

- [ ] Servidores corriendo (backend + frontend)
- [ ] Usuarios tenant y landlord disponibles
- [ ] Contrato en estado biométrico disponible
- [ ] DevTools abierto en navegador
- [ ] **TENANT**: Completa 4 pasos sin loop
- [ ] **TENANT**: Logs correctos en consola
- [ ] **TENANT**: Redirección exitosa
- [ ] **TENANT**: Estado BD correcto
- [ ] **LANDLORD**: Puede iniciar flujo
- [ ] **LANDLORD**: Completa 4 pasos sin loop
- [ ] **LANDLORD**: Logs correctos en consola
- [ ] **LANDLORD**: Redirección exitosa
- [ ] **LANDLORD**: Contrato activo en BD
- [ ] **BACKEND**: Logs de progresión secuencial
- [ ] **FINAL**: Contrato nace a la vida jurídica ✅

---

**FIN DE LA GUÍA DE TESTING**

Si todos los checks están ✅, el fix está funcionando correctamente y el flujo biométrico está completamente operacional.
