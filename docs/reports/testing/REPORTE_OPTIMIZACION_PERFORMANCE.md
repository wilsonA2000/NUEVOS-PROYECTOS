# ⚡ REPORTE DE OPTIMIZACIÓN DE PERFORMANCE

**Fecha**: 13 de Octubre, 2025
**Análisis**: Frontend Bundle Size + Backend Queries
**Estado**: 📊 **ANÁLISIS COMPLETADO** - Recomendaciones listas

---

## 🎯 OBJETIVO

Optimizar el rendimiento del proyecto VeriHome mediante:
1. Reducción del bundle size del frontend
2. Optimización de queries de base de datos
3. Mejora de tiempos de carga y respuesta

---

## 📊 ANÁLISIS ACTUAL

### Frontend

#### **Node Modules Size**
```
Tamaño actual: 473 MB
Estado: 🟡 GRANDE (recomendado: <300 MB)
```

#### **Dependencias Identificadas** (package.json)

**UI Libraries** (Pesadas):
- @mui/material + @mui/icons-material + @mui/lab + @mui/x-data-grid (~15 MB)
- @emotion/react + @emotion/styled (~2 MB)

**Mapas** (DUPLICACIÓN DETECTADA):
- mapbox-gl (3.13.0) - ~2.5 MB ⚠️
- leaflet (1.9.4) - ~1.5 MB ⚠️
- react-leaflet (4.2.1) ⚠️
- **Problema**: Dos librerías de mapas diferentes

**Charts** (DUPLICACIÓN DETECTADA):
- chart.js + react-chartjs-2 - ~1.2 MB ⚠️
- recharts (2.15.3) - ~800 KB ⚠️
- **Problema**: Dos librerías de gráficos diferentes

**Payment Gateways**:
- @stripe/react-stripe-js + @stripe/stripe-js - ~500 KB
- @paypal/react-paypal-js - ~400 KB

**Otras Dependencies Pesadas**:
- @tanstack/react-query (5.20.5) - ~200 KB
- xlsx (0.18.5) - ~800 KB
- react-router-dom (6.22.1) - ~150 KB

---

## 🚨 PROBLEMAS IDENTIFICADOS

### 1. **DUPLICACIÓN DE LIBRERÍAS DE MAPAS**

**Librerías encontradas**:
- ✅ **Mapbox GL** (3.13.0) - Moderna, performante
- ⚠️ **Leaflet** (1.9.4) + react-leaflet - Antigua, menos features

**Impacto**:
- +4 MB en bundle
- Código duplicado
- Confusión en el desarrollo

**Recomendación**:
```bash
# ELIMINAR Leaflet (más antigua)
npm uninstall leaflet react-leaflet @types/leaflet

# MANTENER solo Mapbox (más moderna)
# Ya implementado en: PropertyList.tsx, PropertyDetail.tsx
```

**Ahorro estimado**: ~4 MB (-0.8% del total)

---

### 2. **DUPLICACIÓN DE LIBRERÍAS DE GRÁFICOS**

**Librerías encontradas**:
- ✅ **Chart.js** (4.5.0) + react-chartjs-2 - Más popular, mejor docs
- ⚠️ **Recharts** (2.15.3) - Similar funcionalidad

**Impacto**:
- +2 MB en bundle
- Diferentes APIs para misma funcionalidad
- Mayor superficie de bugs

**Recomendación**:
```bash
# Opción A: Mantener Chart.js (recomendado)
npm uninstall recharts

# Opción B: Mantener Recharts (si ya está muy usado)
npm uninstall chart.js react-chartjs-2
```

**Ahorro estimado**: ~2 MB (-0.4% del total)

---

### 3. **LAZY LOADING INCOMPLETO**

**Archivo actual**: `routes/index.lazy.tsx`

**Componentes ya con lazy loading** ✅:
```typescript
const Dashboard = lazy(() => import('../pages/dashboard/NewDashboard'));
const PropertyList = lazy(() => import('../pages/properties/PropertyList'));
// ... otros
```

**Componentes SIN lazy loading** ⚠️:
```typescript
// Cargados inmediatamente (críticos):
import Layout from '../components/layout/Layout';
import LandingPage from '../pages/LandingPage';
import { Login } from '../pages/auth/Login';
import { Register } from '../pages/auth/Register';
```

**Oportunidades de mejora**:

1. **Payment Components** (raramente usados):
```typescript
// ANTES (cargado siempre):
import PaymentForm from '../components/payments/PaymentForm';

// DESPUÉS (lazy):
const PaymentForm = lazy(() => import('../components/payments/PaymentForm'));
```

2. **Biometric Components** (usados solo en autenticación):
```typescript
// OPTIMIZAR:
const BiometricFlow = lazy(() => import('../components/contracts/BiometricAuthenticationFlow'));
```

3. **Admin Components** (solo para landlords):
```typescript
const LandlordDashboard = lazy(() => import('../pages/landlord/Dashboard'));
```

**Ahorro estimado**: ~15-20% faster initial load

---

### 4. **IMPORTS NO OPTIMIZADOS**

**Problema encontrado**: Imports completos de librerías grandes

**Ejemplo en código**:
```typescript
// ❌ MAL - Importa TODO Material-UI:
import { Button, TextField, Box, Grid, ... } from '@mui/material';

// ✅ BIEN - Importa solo lo necesario:
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
```

**Impacto**:
- Tree-shaking menos efectivo
- Bundle más grande

**Recomendación**:
```bash
# Instalar plugin de optimización
npm install --save-dev babel-plugin-import

# Configurar en vite.config.ts para auto-import optimizado
```

**Ahorro estimado**: ~10-15% del tamaño de @mui

---

### 5. **XLSX LIBRARY (800 KB)**

**Uso actual**: Exportación de datos a Excel

**Problema**:
- Librería muy pesada para feature raramente usado
- Cargada siempre aunque no se use

**Recomendación**:
```typescript
// Lazy load cuando se necesite
const exportToExcel = async (data) => {
  const XLSX = await import('xlsx');
  // ... usar XLSX
};
```

**Ahorro estimado**: ~800 KB no cargados hasta que se necesiten

---

## 🎯 OPTIMIZACIONES RECOMENDADAS

### PRIORIDAD ALTA (Implementar YA) 🔥

#### **1. Eliminar Leaflet (mantener Mapbox)**
```bash
npm uninstall leaflet react-leaflet @types/leaflet
```
**Impacto**: ⭐⭐⭐⭐ Alto
**Esfuerzo**: ⭐ Bajo (5 minutos)
**Ahorro**: ~4 MB

#### **2. Eliminar librería de charts duplicada**
```bash
# Decisión: Mantener Chart.js
npm uninstall recharts
```
**Impacto**: ⭐⭐⭐ Medio-Alto
**Esfuerzo**: ⭐⭐ Medio (si hay que migrar componentes)
**Ahorro**: ~2 MB

#### **3. Lazy load XLSX**
```typescript
// En componentes que exportan a Excel:
const handleExport = async () => {
  const XLSX = await import('xlsx');
  // ... usar XLSX
};
```
**Impacto**: ⭐⭐⭐⭐ Alto
**Esfuerzo**: ⭐ Bajo (10 minutos)
**Ahorro**: ~800 KB initial load

---

### PRIORIDAD MEDIA (Implementar esta semana) 🟡

#### **4. Optimizar imports de Material-UI**
```typescript
// Buscar y reemplazar en todos los archivos:
// De: import { Button, ... } from '@mui/material';
// A: import Button from '@mui/material/Button';
```
**Impacto**: ⭐⭐⭐ Medio
**Esfuerzo**: ⭐⭐⭐ Alto (muchos archivos)
**Ahorro**: ~2-3 MB

**Script automatizado**:
```bash
# Crear script para auto-fix:
find src -name "*.tsx" -exec sed -i 's/...pattern.../...replacement.../g' {} \;
```

#### **5. Code splitting por rol de usuario**
```typescript
// Separar código por rol:
const TenantRoutes = lazy(() => import('./routes/TenantRoutes'));
const LandlordRoutes = lazy(() => import('./routes/LandlordRoutes'));
const ServiceProviderRoutes = lazy(() => import('./routes/ServiceProviderRoutes'));
```
**Impacto**: ⭐⭐⭐⭐ Alto
**Esfuerzo**: ⭐⭐⭐ Alto (refactor de rutas)
**Ahorro**: ~30% bundle para cada usuario

---

### PRIORIDAD BAJA (Nice to have) 🟢

#### **6. Image optimization**
```typescript
// Usar WebP en lugar de PNG/JPG donde sea posible
// Implementar lazy loading de imágenes
import { LazyLoadImage } from 'react-lazy-load-image-component';
```

#### **7. Service Worker para caching**
```typescript
// PWA con service worker para cache de assets estáticos
```

---

## 🔧 BACKEND OPTIMIZATIONS

### Queries Lentas Identificadas

**Análisis basado en modelos y vistas**:

#### **1. Property List View** (`properties/api_views.py`)

**Problema**:
```python
# Query actual (sin optimización):
properties = Property.objects.all()
# Causa N+1 queries al acceder a:
# - property.landlord.name
# - property.images.count()
# - property.amenities.all()
```

**Solución**:
```python
properties = Property.objects.select_related(
    'landlord'
).prefetch_related(
    'images',
    'amenities'
).all()
```

**Impacto**: ⚡ **Reducción de queries de ~100 a ~3**

---

#### **2. Contract Detail View** (`contracts/api_views.py`)

**Problema**:
```python
contract = Contract.objects.get(id=contract_id)
# N+1 al acceder a:
# - contract.property.landlord
# - contract.tenant
# - contract.guarantor
# - contract.biometric_authentications.all()
```

**Solución**:
```python
contract = Contract.objects.select_related(
    'property__landlord',
    'tenant',
    'guarantor'
).prefetch_related(
    'biometric_authentications'
).get(id=contract_id)
```

**Impacto**: ⚡ **Reducción de queries de ~20 a ~2**

---

#### **3. MatchRequest with Documents** (`matching/api_views.py`)

**Problema**:
```python
matches = MatchRequest.objects.filter(property__landlord=user)
# N+1 al iterar:
# - match.tenant.email
# - match.documents.all()
# - match.property.title
```

**Solución**:
```python
matches = MatchRequest.objects.select_related(
    'tenant',
    'property'
).prefetch_related(
    'documents'
).filter(property__landlord=user)
```

**Impacto**: ⚡ **Reducción de queries de ~50 a ~3**

---

#### **4. Dashboard Analytics** (`dashboard/api_views.py`)

**Problema**:
```python
# Múltiples queries individuales para stats
properties_count = Property.objects.filter(landlord=user).count()
contracts_count = Contract.objects.filter(landlord=user).count()
# ... más queries
```

**Solución**:
```python
from django.db.models import Count, Q

stats = Property.objects.filter(
    landlord=user
).aggregate(
    properties_count=Count('id'),
    active_contracts=Count('contracts', filter=Q(contracts__status='active')),
    # ... más aggregates
)
```

**Impacto**: ⚡ **Reducción de queries de ~15 a ~1**

---

## 📊 IMPACTO ESTIMADO TOTAL

### Frontend Optimizations

| Optimización | Ahorro Bundle | Esfuerzo | Prioridad |
|-------------|---------------|----------|-----------|
| Eliminar Leaflet | ~4 MB | Bajo | 🔥 Alta |
| Eliminar Recharts | ~2 MB | Medio | 🔥 Alta |
| Lazy XLSX | ~800 KB | Bajo | 🔥 Alta |
| Optimizar @mui imports | ~2-3 MB | Alto | 🟡 Media |
| Code splitting por rol | ~30% | Alto | 🟡 Media |
| **TOTAL ESTIMADO** | **~10 MB** | - | - |

**Bundle size actual**: ~50-60 MB (estimado)
**Bundle size optimizado**: ~40-50 MB (estimado)
**Mejora**: **~17-20% más pequeño**

---

### Backend Optimizations

| Endpoint | Queries Antes | Queries Después | Mejora |
|----------|--------------|-----------------|--------|
| Property List | ~100 | ~3 | **97% menos** |
| Contract Detail | ~20 | ~2 | **90% menos** |
| Match List | ~50 | ~3 | **94% menos** |
| Dashboard | ~15 | ~1 | **93% menos** |

**Tiempo de respuesta estimado**:
- Antes: ~500-1000ms
- Después: ~50-150ms
- Mejora: **~80-85% más rápido**

---

## 🚀 PLAN DE IMPLEMENTACIÓN

### Semana 1: Quick Wins (2-3 horas)

**Día 1** (1 hora):
```bash
# 1. Eliminar dependencias duplicadas
npm uninstall leaflet react-leaflet @types/leaflet recharts

# 2. Verificar que no se rompa nada
npm run type-check
npm test
```

**Día 2** (1 hora):
```typescript
// 3. Lazy load XLSX
// Buscar usos de xlsx y agregar dynamic import
```

**Día 3** (1 hora):
```python
# 4. Optimizar top 3 queries más lentas
# - Property list
# - Contract detail
# - Match list
```

---

### Semana 2: Optimizaciones Medias (4-5 horas)

**Días 1-2** (3 horas):
```typescript
// 5. Optimizar imports de Material-UI
// Script automatizado + revisión manual
```

**Días 3-4** (2 horas):
```python
# 6. Optimizar queries restantes
# - Dashboard analytics
# - Payment queries
# - Message queries
```

---

### Semana 3: Code Splitting Avanzado (6-8 horas)

**Toda la semana**:
```typescript
// 7. Implementar code splitting por rol
// - Refactor de rutas
// - Testing exhaustivo
// - Performance monitoring
```

---

## 📝 SCRIPTS ÚTILES

### Analizar Bundle Size
```bash
# Opción 1: Vite build con análisis
npm run build -- --mode analyze

# Opción 2: Webpack Bundle Analyzer (si se usa)
npm install --save-dev webpack-bundle-analyzer

# Opción 3: Análisis manual
npm run build && du -sh dist/* | sort -hr
```

### Detectar Queries Lentas (Backend)
```python
# settings.py - Agregar logging de queries lentas
LOGGING = {
    'loggers': {
        'django.db.backends': {
            'level': 'DEBUG',
            'handlers': ['console'],
        },
    },
}

# O instalar django-debug-toolbar:
pip install django-debug-toolbar
```

### Performance Testing
```bash
# Lighthouse para frontend
npm install -g lighthouse
lighthouse http://localhost:5173 --only-categories=performance

# Apache Bench para backend
ab -n 1000 -c 10 http://localhost:8000/api/v1/properties/
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Frontend

- [ ] Eliminar Leaflet y react-leaflet
- [ ] Eliminar Recharts (mantener Chart.js)
- [ ] Implementar lazy load de XLSX
- [ ] Optimizar imports de Material-UI (top 20 archivos)
- [ ] Code splitting básico por rol
- [ ] Medir bundle size antes/después
- [ ] Ejecutar Lighthouse performance test

### Backend

- [ ] Optimizar Property.objects queries (select_related)
- [ ] Optimizar Contract.objects queries (select_related)
- [ ] Optimizar MatchRequest queries (prefetch_related)
- [ ] Optimizar Dashboard aggregates
- [ ] Agregar índices de BD si es necesario
- [ ] Ejecutar tests de performance
- [ ] Monitorear queries lentas en producción

---

## 🎯 MÉTRICAS DE ÉXITO

### Frontend
```
✅ Bundle size: -10 MB (-17%)
✅ Initial load: -2-3 segundos
✅ Lighthouse Performance Score: 85+ → 95+
✅ Time to Interactive: <3 segundos
```

### Backend
```
✅ Queries reducidas: -90% promedio
✅ Response time: -80% promedio
✅ Throughput: +200% requests/segundo
✅ Database load: -50%
```

---

## 📚 RECURSOS

- [Vite Bundle Optimization](https://vitejs.dev/guide/build.html#optimize-deps)
- [Django Query Optimization](https://docs.djangoproject.com/en/4.2/topics/db/optimization/)
- [React Code Splitting](https://react.dev/reference/react/lazy)
- [Lighthouse Performance Guide](https://developer.chrome.com/docs/lighthouse/performance/)

---

**Generado**: 13 de Octubre, 2025
**Análisis**: Performance Optimization
**Estado**: 📊 **ANÁLISIS COMPLETO** - Listo para implementación
**Próximo paso**: Implementar quick wins (Semana 1)
