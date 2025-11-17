# 📋 PLAN DE ACCIÓN - PRÓXIMOS PASOS

**Fecha**: 13 de Octubre, 2025  
**Contexto**: Post-implementación de optimizaciones  
**Estado Actual**: ✅ Quick Wins completados - Listo para validación

---

## 🎯 FASE 1: VALIDACIÓN INMEDIATA (HOY - 1-2 horas)

### **Prioridad: 🔥 CRÍTICA**

#### 1. ✅ Ejecutar Commit de Optimizaciones
```bash
cd /mnt/c/Users/wilso/Desktop/NUEVOS\ PROYECTOS
./commit_optimizations.sh
```
**Tiempo estimado**: 2 minutos  
**Dependencias**: Git disponible  
**Resultado esperado**: Commit creado con mensaje descriptivo

---

#### 2. 🧪 Testing Manual - Frontend

##### a) PropertyForm con Mapbox (Leaflet eliminado)
```bash
# Iniciar servidor frontend
cd frontend
npm run dev
```
**Pasos a probar**:
- [ ] Navegar a `/properties/new` o `/properties/{id}/edit`
- [ ] Verificar que el mapa de Mapbox carga correctamente
- [ ] Intentar buscar una dirección con el geocoder
- [ ] Arrastrar el marcador del mapa
- [ ] Verificar que la latitud/longitud se actualiza
- [ ] **Resultado esperado**: Mapa funciona perfectamente sin Leaflet

**Tiempo estimado**: 5 minutos

---

##### b) Dashboard con Chart.js (Recharts eliminado)
```bash
# Ya debe estar corriendo npm run dev
```
**Pasos a probar**:
- [ ] Login como landlord: `admin@verihome.com` / `admin123`
- [ ] Navegar al Dashboard
- [ ] Verificar que los gráficos cargan (Line, Bar, Doughnut)
- [ ] Interactuar con los gráficos (hover, click)
- [ ] Verificar que no hay errores en consola
- [ ] **Resultado esperado**: Gráficos funcionan con Chart.js

**Tiempo estimado**: 5 minutos

---

##### c) Exportación Excel (XLSX lazy loading)
```bash
# Buscar componentes que usen exportToExcel
cd frontend
grep -r "exportToExcel" src/ --include="*.tsx"
```
**Pasos a probar**:
- [ ] Identificar qué componente tiene exportación
- [ ] Navegar a ese componente
- [ ] Click en botón de exportar/descargar
- [ ] Verificar que el archivo Excel se descarga
- [ ] Abrir Network tab en DevTools
- [ ] Confirmar que XLSX se carga dinámicamente (chunk separado)
- [ ] **Resultado esperado**: Excel se exporta correctamente, XLSX carga on-demand

**Tiempo estimado**: 8 minutos

---

#### 3. 🧪 Testing Manual - Backend

##### a) Matching Endpoints (Queries optimizadas)
```bash
# Iniciar servidor backend con Django Debug Toolbar
cd /mnt/c/Users/wilso/Desktop/NUEVOS\ PROYECTOS
python3 manage.py runserver

# En otro terminal, instalar Django Debug Toolbar si no está
pip install django-debug-toolbar
```

**Configurar Debug Toolbar** (si no está):
```python
# verihome/settings.py - Agregar a INSTALLED_APPS
'debug_toolbar',

# Agregar a MIDDLEWARE
'debug_toolbar.middleware.DebugToolbarMiddleware',

# Agregar configuración
INTERNAL_IPS = ['127.0.0.1', 'localhost']
```

**Pasos a probar**:
- [ ] Login como tenant o landlord
- [ ] Navegar a `/app/matching` o `/app/contracts`
- [ ] Abrir Django Debug Toolbar (ícono en la derecha)
- [ ] Click en "SQL" tab
- [ ] Verificar número de queries
- [ ] **Resultado esperado**: ~3 queries en lugar de ~50
- [ ] **Tiempo de respuesta esperado**: <100ms

**Tiempo estimado**: 10 minutos

---

##### b) Verificar Response Time
```bash
# Usar curl para medir tiempo de respuesta
curl -w "@-" -o /dev/null -s "http://localhost:8000/api/v1/matching/match-requests/" \
  -H "Authorization: Bearer YOUR_TOKEN" <<'EOF'
    time_namelookup:  %{time_namelookup}\n
       time_connect:  %{time_connect}\n
    time_appconnect:  %{time_appconnect}\n
   time_pretransfer:  %{time_pretransfer}\n
      time_redirect:  %{time_redirect}\n
 time_starttransfer:  %{time_starttransfer}\n
                    ----------\n
         time_total:  %{time_total}\n
