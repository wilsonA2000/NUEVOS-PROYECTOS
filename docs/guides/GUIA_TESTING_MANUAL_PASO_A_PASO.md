# 🧪 GUÍA DE TESTING MANUAL - PASO A PASO

**Fecha**: 13 de Octubre, 2025
**Objetivo**: Validar optimizaciones implementadas
**Tiempo estimado**: 30-40 minutos
**Prerequisitos**: Servidores iniciados

---

## 📋 CHECKLIST DE PREPARACIÓN

Antes de empezar, asegúrate de tener:

- [ ] Backend corriendo en http://localhost:8000
- [ ] Frontend corriendo en http://localhost:5173
- [ ] Navegador con DevTools abierto (F12)
- [ ] Credenciales de prueba listas:
  - Landlord: `admin@verihome.com` / `admin123`
  - Tenant: (si existe usuario tenant de prueba)

---

## 🚀 PASO 0: INICIAR SERVIDORES

### Terminal 1 - Backend:
```bash
cd /mnt/c/Users/wilso/Desktop/NUEVOS\ PROYECTOS
python3 manage.py runserver
```

**Espera a ver**:
```
Starting development server at http://127.0.0.1:8000/
Quit the server with CONTROL-C.
```

### Terminal 2 - Frontend:
```bash
cd /mnt/c/Users/wilso/Desktop/NUEVOS\ PROYECTOS/frontend
npm run dev
```

**Espera a ver**:
```
➜  Local:   http://localhost:5173/
➜  press h to show help
```

**✅ Checkpoint**: Ambos servidores corriendo sin errores

---

## 🧪 PRUEBA 1: PropertyForm con Mapbox (Leaflet eliminado)

### **Objetivo**: Verificar que Mapbox funciona correctamente sin Leaflet

### Paso 1.1: Navegar a PropertyForm
1. Abre tu navegador: http://localhost:5173
2. Login con: `admin@verihome.com` / `admin123`
3. Una vez dentro, navega a: **Propiedades** → **Nueva Propiedad**
   - O directamente: http://localhost:5173/app/properties/new

### Paso 1.2: Abrir DevTools
1. Presiona **F12** para abrir DevTools
2. Ve a la pestaña **Console**
3. Ve a la pestaña **Network**

### Paso 1.3: Verificar el Mapa
**Busca en la página**:
- [ ] ¿Ves un mapa interactivo cargando?
- [ ] ¿El mapa muestra Colombia (centro por defecto)?
- [ ] ¿Hay un marcador rojo en el mapa?

**En Console (F12)**:
- [ ] ¿No hay errores relacionados con "leaflet"?
- [ ] ¿No hay errores de "Cannot find module 'leaflet'"?
- [ ] ¿Sólo hay referencias a "mapbox-gl"?

### Paso 1.4: Probar Funcionalidad del Mapa
1. **Buscar dirección**:
   - En el campo de búsqueda del mapa (geocoder)
   - Escribe: "Bogotá, Colombia"
   - Presiona Enter
   - [ ] ¿El mapa se mueve a Bogotá?
   - [ ] ¿El marcador se coloca en Bogotá?

2. **Arrastrar marcador**:
   - Click y arrastra el marcador rojo
   - [ ] ¿Se puede arrastrar?
   - [ ] ¿Los campos de Latitud/Longitud se actualizan?

3. **Zoom del mapa**:
   - Usa scroll del mouse en el mapa
   - [ ] ¿Funciona el zoom in/out?

### Paso 1.5: Verificar Network (sin Leaflet)
**En la pestaña Network (F12)**:
1. Filtra por "leaflet" en el search box
2. [ ] ¿No hay archivos "leaflet.js" o "leaflet.css" cargando?
3. Filtra por "mapbox"
4. [ ] ¿Ves archivos "mapbox-gl.js" y "mapbox-gl.css"?

### ✅ Resultado Esperado PRUEBA 1:
```
✅ Mapa Mapbox carga correctamente
✅ 0 errores de Leaflet en console
✅ 0 archivos Leaflet en Network
✅ Geocoder funciona
✅ Marcador draggable funciona
✅ Zoom funciona
```

---

## 🧪 PRUEBA 2: Dashboard con Chart.js (Recharts eliminado)

### **Objetivo**: Verificar que gráficos Chart.js funcionan sin Recharts

### Paso 2.1: Navegar al Dashboard
1. Desde el menú lateral, click en **Dashboard**
   - O directamente: http://localhost:5173/app/dashboard

### Paso 2.2: Identificar Gráficos
**Busca en la página**:
- [ ] ¿Ves gráficos de líneas (Line charts)?
- [ ] ¿Ves gráficos de barras (Bar charts)?
- [ ] ¿Ves gráficos circulares (Doughnut charts)?

### Paso 2.3: Verificar Console (sin Recharts)
**En Console (F12)**:
- [ ] ¿No hay errores relacionados con "recharts"?
- [ ] ¿No hay errores de "Cannot find module 'recharts'"?
- [ ] ¿Sólo hay referencias a "chart.js" si hay logs?

### Paso 2.4: Probar Interactividad de Gráficos
1. **Hover sobre gráficos**:
   - Pasa el mouse sobre puntos en gráficos de línea
   - [ ] ¿Aparecen tooltips con datos?
   - Pasa el mouse sobre barras
   - [ ] ¿Aparecen tooltips?

2. **Click en leyenda** (si hay):
   - [ ] ¿Se ocultan/muestran datasets al hacer click?

### Paso 2.5: Verificar Network (sin Recharts)
**En la pestaña Network (F12)**:
1. Recarga la página (Ctrl+R)
2. Filtra por "recharts" en search box
3. [ ] ¿No hay archivos "recharts" cargando?
4. Filtra por "chart"
5. [ ] ¿Ves chunks de JavaScript con Chart.js?

### ✅ Resultado Esperado PRUEBA 2:
```
✅ Gráficos Chart.js cargan correctamente
✅ 0 errores de Recharts en console
✅ 0 archivos Recharts en Network
✅ Tooltips funcionan en hover
✅ Interactividad de gráficos funciona
```

---

## 🧪 PRUEBA 3: Debug Toolbar + Queries Optimizadas

### **Objetivo**: Verificar que queries están optimizadas (50→3)

### Paso 3.1: Ver Django Debug Toolbar
1. Ve a cualquier página del backend en el navegador
   - Ejemplo: http://localhost:8000/admin/
2. [ ] ¿Ves un panel de Django Debug Toolbar en el lado derecho?
   - Debe verse como una barra vertical con iconos

### Paso 3.2: Navegar a Matching (frontend)
1. En el frontend: http://localhost:5173
2. Login como landlord: `admin@verihome.com` / `admin123`
3. Ve a la sección **Matching** o **Solicitudes**
   - Busca en el menú: "Match Requests", "Solicitudes", etc.

### Paso 3.3: Ver Queries en Debug Toolbar
**Si navegas páginas del backend directamente**:
1. Ve a: http://localhost:8000/api/v1/matching/match-requests/
2. Deberías ver JSON de respuesta
3. [ ] ¿Ves Django Debug Toolbar en la página?
4. Click en **"SQL"** en el toolbar
5. [ ] ¿Cuántas queries se ejecutaron?
   - **Meta**: ~3 queries (antes eran ~50)

### Paso 3.4: Verificar Queries Específicas
**En el panel SQL de Debug Toolbar**:
1. Busca queries que digan "SELECT ... FROM matching_matchrequest"
2. [ ] ¿Ves "JOIN" en las queries?
   - Ejemplo: `INNER JOIN users_user ON ...`
   - Ejemplo: `INNER JOIN properties_property ON ...`
3. [ ] ¿El número total de queries es bajo? (~2-5 queries)

### Paso 3.5: Comparar con Console del Frontend
**En Console del navegador (F12) con frontend**:
1. Ve a Network tab
2. Filtra por "match-requests" o "matching"
3. Click en la petición API
4. Ve a "Preview" o "Response"
5. Mira el header "X-Debug-SQL-Queries" si existe
6. [ ] ¿El response time es rápido? (<200ms)

### ✅ Resultado Esperado PRUEBA 3:
```
✅ Django Debug Toolbar visible
✅ ~3 queries ejecutadas (antes ~50)
✅ Queries tienen JOINs (select_related funcionando)
✅ Response time < 200ms
✅ No hay queries N+1 visibles
```

---

## 🧪 PRUEBA 4: XLSX Lazy Loading (Opcional)

### **Objetivo**: Verificar que XLSX solo se carga al exportar

### Paso 4.1: Buscar Funcionalidad de Export
1. Navega por el dashboard o cualquier vista con datos
2. Busca botones de **"Exportar"**, **"Download"**, **"Excel"**
3. Si no encuentras, puedes skipear esta prueba

### Paso 4.2: Verificar Network Antes de Export
**En Network tab (F12)**:
1. Recarga la página
2. Filtra por "xlsx"
3. [ ] ¿No hay archivos "xlsx" cargando inicialmente?

### Paso 4.3: Ejecutar Export
1. Click en botón de Exportar/Download
2. Espera a que se genere el archivo
3. [ ] ¿Se descargó un archivo .xlsx?

### Paso 4.4: Verificar Network Después de Export
**En Network tab (F12)**:
1. Mira nuevamente los requests
2. Filtra por "xlsx" o busca chunks nuevos
3. [ ] ¿Ahora aparece un chunk JavaScript nuevo?
   - Debe tener nombre como "chunk-[hash].js" o similar
   - Contiene el código de XLSX

### ✅ Resultado Esperado PRUEBA 4:
```
✅ XLSX no carga al inicio
✅ XLSX carga solo al exportar (lazy)
✅ Archivo Excel se descarga correctamente
✅ Chunk dinámico visible en Network
```

---

## 📊 RESUMEN DE RESULTADOS

### PRUEBA 1 - PropertyForm + Mapbox:
- [ ] Pasó ✅
- [ ] Falló ❌ (detallar problema): _________________

### PRUEBA 2 - Dashboard + Chart.js:
- [ ] Pasó ✅
- [ ] Falló ❌ (detallar problema): _________________

### PRUEBA 3 - Debug Toolbar + Queries:
- [ ] Pasó ✅
- [ ] Falló ❌ (detallar problema): _________________

### PRUEBA 4 - XLSX Lazy Loading:
- [ ] Pasó ✅
- [ ] Falló ❌ (detallar problema): _________________
- [ ] No aplicable (no hay export) ⚠️

---

## 🎯 CRITERIOS DE ÉXITO GLOBAL

Para considerar las optimizaciones exitosas:

**Mínimo Requerido**:
- ✅ PRUEBA 1: Mapbox funciona (Leaflet no presente)
- ✅ PRUEBA 2: Chart.js funciona (Recharts no presente)
- ✅ PRUEBA 3: Queries optimizadas (~3 en lugar de ~50)

**Bonus**:
- ✅ PRUEBA 4: XLSX lazy loading funciona

**Estado Final**:
- [ ] ✅ TODAS LAS PRUEBAS PASARON
- [ ] ⚠️ ALGUNAS PRUEBAS FALLARON (reportar)

---

## 🐛 TROUBLESHOOTING

### Si Mapbox no carga:
1. Verifica token en `.env`: `VITE_MAPBOX_TOKEN=...`
2. Recarga la página con Ctrl+Shift+R (hard reload)
3. Revisa Console para errores específicos

### Si Chart.js no carga:
1. Verifica que Dashboard imports Chart.js correctamente
2. Revisa Console para errores
3. Verifica que componentes existen en `src/pages/dashboard/`

### Si Debug Toolbar no aparece:
1. Verifica que `DEBUG=True` en settings.py
2. Verifica que `INTERNAL_IPS` incluye `127.0.0.1`
3. Reinicia el servidor Django

### Si Queries no están optimizadas:
1. Verifica que cambios se aplicaron en `matching/api_views.py`
2. Busca `select_related` en el archivo
3. Reinicia el servidor Django

---

## 📝 NOTAS ADICIONALES

- **Performance**: Si encuentras lentitud, anótalo
- **Errores**: Copia el error completo de Console
- **Screenshots**: Toma capturas si algo no funciona

---

**Próximo paso después del testing**: Ejecutar `./commit_optimizations.sh`

---

**Creado**: 13 de Octubre, 2025
**Tipo**: Guía de Testing Manual
**Usuario**: Testing de optimizaciones
**Duración estimada**: 30-40 minutos
