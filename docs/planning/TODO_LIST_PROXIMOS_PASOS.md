# ✅ TODO LIST - PRÓXIMOS PASOS

**Fecha**: 13 de Octubre, 2025
**Estado Actual**: Quick Wins completados - Listo para validación

---

## 🔥 PRIORIDAD CRÍTICA (HOY - 1-2 horas)

### FASE 1: Validación Inmediata

#### [ ] 1. Ejecutar Commit de Optimizaciones
```bash
cd /mnt/c/Users/wilso/Desktop/NUEVOS\ PROYECTOS
./commit_optimizations.sh
```
**Tiempo**: 2 minutos

---

#### [ ] 2. Testing Manual - Frontend

##### [ ] a) PropertyForm con Mapbox (Leaflet eliminado)
- Iniciar: `cd frontend && npm run dev`
- Navegar a `/properties/new`
- Verificar que mapa Mapbox carga correctamente
- Probar geocoder y arrastrar marcador
- **Esperado**: Mapa funciona sin Leaflet

**Tiempo**: 5 minutos

##### [ ] b) Dashboard con Chart.js (Recharts eliminado)
- Login: `admin@verihome.com` / `admin123`
- Verificar gráficos cargan (Line, Bar, Doughnut)
- Verificar no hay errores en consola
- **Esperado**: Gráficos funcionan con Chart.js

**Tiempo**: 5 minutos

##### [ ] c) Exportación Excel (XLSX lazy loading)
- Buscar: `grep -r "exportToExcel" frontend/src/`
- Intentar exportar datos a Excel
- Verificar en Network tab que XLSX carga dinámicamente
- **Esperado**: Excel exporta correctamente

**Tiempo**: 8 minutos

---

#### [ ] 3. Testing Manual - Backend

##### [ ] a) Matching Endpoints (Queries optimizadas)
- Instalar Django Debug Toolbar: `pip install django-debug-toolbar`
- Configurar en `settings.py` (ver documentación)
- Login y navegar a `/app/matching`
- Verificar en Debug Toolbar: ~3 queries (antes ~50)
- **Esperado**: Respuesta < 100ms

**Tiempo**: 10 minutos

##### [ ] b) Verificar Response Time
```bash
# Medir tiempo de respuesta
curl -w "\ntime_total: %{time_total}\n" \
  -o /dev/null -s \
  "http://localhost:8000/api/v1/matching/match-requests/" \
  -H "Authorization: Bearer TOKEN"
```
**Esperado**: < 100ms (antes ~500ms)

**Tiempo**: 5 minutos

---

## 🟡 PRIORIDAD ALTA (HOY - 30 minutos)

### FASE 2: Métricas y Monitoreo

#### [ ] 4. Medir Bundle Size Real
```bash
cd frontend
npm run build
du -h dist/ | tail -1
ls -lh dist/assets/*.js
```
**Meta**: 12-14% menor que antes, < 50 MB total

**Tiempo**: 5 minutos

---

#### [ ] 5. Lighthouse Performance Test
```bash
npm install -g lighthouse
lighthouse http://localhost:5173 \
  --only-categories=performance \
  --output=html \
  --output-path=./lighthouse-report.html
```
**Meta**: Performance Score > 85

**Tiempo**: 10 minutos

---

#### [ ] 6. Configurar Django Debug Toolbar

**Agregar a `settings.py`**:
```python
INSTALLED_APPS = [
    'debug_toolbar',  # Agregar
    # ...
]

MIDDLEWARE = [
    'debug_toolbar.middleware.DebugToolbarMiddleware',  # Arriba
    # ...
]

INTERNAL_IPS = ['127.0.0.1', 'localhost']
```

**Agregar a `urls.py`**:
```python
if settings.DEBUG:
    import debug_toolbar
    urlpatterns = [
        path('__debug__/', include(debug_toolbar.urls)),
    ] + urlpatterns
```

**Tiempo**: 10 minutos

---

## 🟢 PRIORIDAD MEDIA (Esta semana - 4-6 horas)

### FASE 3: Optimizaciones Adicionales

#### [ ] 7. Optimizar Material-UI Imports (2-3 MB ahorro)

**Cambiar de**:
```typescript
// MAL
import { Box, Button, Card } from '@mui/material';
```

**A**:
```typescript
// BIEN
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
```

**Archivos prioritarios**:
- `src/components/ratings/RatingForm.tsx` (12 imports)
- `src/components/ratings/ReviewsList.tsx` (12 imports)

**Script automatizado**:
```bash
cd frontend
npx @mui/codemod@latest v5.0.0/optimal-imports src/
```

**Tiempo**: 2-3 horas manual, 30 min automatizado

---

#### [ ] 8. Code Splitting por Rol de Usuario (30% reducción)

**Crear archivos**:
- `src/routes/roles/TenantRoutes.tsx`
- `src/routes/roles/LandlordRoutes.tsx`
- `src/routes/roles/ServiceProviderRoutes.tsx`

**Implementar lazy loading por rol**:
```typescript
const TenantRoutes = lazy(() => import('./roles/TenantRoutes'));
const LandlordRoutes = lazy(() => import('./roles/LandlordRoutes'));

// En router:
{user.user_type === 'tenant' && <TenantRoutes />}
{user.user_type === 'landlord' && <LandlordRoutes />}
```

**Tiempo**: 2-3 horas

---

#### [ ] 9. Completar Optimizaciones Backend

##### [ ] a) Contract queries
```python
# contracts/api_views.py
Contract.objects.select_related(
    'property', 'property__landlord', 'tenant', 'guarantor'
).prefetch_related('biometric_authentications', 'documents')
```

##### [ ] b) Payment queries
```python
# payments/api_views.py
Payment.objects.select_related(
    'contract', 'contract__property', 'payer'
)
```

##### [ ] c) Message queries
```python
Message.objects.select_related('sender', 'thread')
    .prefetch_related('thread__participants')
```

**Tiempo**: 1-2 horas

---

## 🔵 PRIORIDAD BAJA (Próximas 2 semanas)

### FASE 4: Production Readiness

#### [ ] 10. Security Hardening
- [ ] Configurar HTTPS
- [ ] Secure cookies
- [ ] CORS específico
- [ ] Rate limiting
- [ ] Input validation

**Tiempo**: 3-4 horas

---

#### [ ] 11. Configurar Sentry APM
```bash
pip install sentry-sdk[django]
```

```python
# settings.py
import sentry_sdk
sentry_sdk.init(
    dsn="YOUR_SENTRY_DSN",
    traces_sample_rate=1.0,
)
```

**Tiempo**: 1 hora

---

#### [ ] 12. CI/CD Pipeline
- [ ] GitHub Actions para tests
- [ ] Auto-deploy a staging
- [ ] Manual approval para production
- [ ] Lighthouse CI

**Tiempo**: 4-6 horas

---

#### [ ] 13. Performance Baseline
- [ ] Establecer métricas de referencia
- [ ] Configurar alertas
- [ ] Dashboard de métricas
- [ ] Weekly reports

**Tiempo**: 2-3 horas

---

## 📊 RESUMEN DE TAREAS

### HOY (Crítico):
- [ ] 1. Ejecutar commit
- [ ] 2. Testing manual frontend (3 pruebas)
- [ ] 3. Testing manual backend (2 pruebas)
- [ ] 4. Medir bundle size
- [ ] 5. Lighthouse test
- [ ] 6. Configurar Debug Toolbar

**Total**: ~1-2 horas

---

### ESTA SEMANA (Importante):
- [ ] 7. Optimizar Material-UI imports
- [ ] 8. Code splitting por rol
- [ ] 9. Completar queries backend

**Total**: ~4-6 horas

---

### PRÓXIMAS 2 SEMANAS (Preparación producción):
- [ ] 10. Security hardening
- [ ] 11. Sentry APM
- [ ] 12. CI/CD pipeline
- [ ] 13. Performance baseline

**Total**: ~10-14 horas

---

## 🎯 ORDEN RECOMENDADO DE EJECUCIÓN

1. **Commit** (2 min)
2. **Testing manual completo** (30 min)
3. **Métricas** (25 min)
4. **Material-UI optimization** (2-3 horas)
5. **Code splitting** (2-3 horas)
6. **Backend queries** (1-2 horas)
7. **Security + Production** (próximas semanas)

---

## ✅ CRITERIOS DE ÉXITO

### Validación Inmediata:
- ✅ Commit creado exitosamente
- ✅ 0 errores en testing manual
- ✅ Bundle 12-14% menor confirmado
- ✅ Response time < 100ms
- ✅ Lighthouse score > 85

### Esta Semana:
- ✅ Material-UI optimizado
- ✅ Code splitting funcionando
- ✅ Todas queries optimizadas

### Próximas 2 Semanas:
- ✅ Security audit passed
- ✅ Sentry monitoreando
- ✅ CI/CD functional
- ✅ Baseline establecido

---

**Generado**: 13 de Octubre, 2025
**Tipo**: TODO List Ejecutable
**Seguir**: Orden de prioridades
**Empezar por**: Fase 1 - Validación Inmediata
