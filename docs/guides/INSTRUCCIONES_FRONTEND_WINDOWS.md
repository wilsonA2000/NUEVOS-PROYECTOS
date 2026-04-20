# 🚀 INSTRUCCIONES: Iniciar Frontend desde Windows

**Fecha**: 14 de Octubre, 2025
**Problema detectado**: I/O errors en WSL con node_modules en `/mnt/c/`
**Solución**: Ejecutar desde terminal nativa de Windows

---

## ✅ ESTADO ACTUAL

### Backend: ✅ CORRIENDO
```
✅ Django server: http://127.0.0.1:8000/
✅ Debug Toolbar: Configurado
✅ Pillow/PIL: Funcionando correctamente
✅ Redis fallback: Activo (cache local + InMemoryChannelLayer)
```

### Frontend: ⚠️ REQUIERE TERMINAL WINDOWS
Error en WSL: `EIO: i/o error` al leer archivos de node_modules

---

## 📋 PASOS PARA INICIAR FRONTEND

### Opción 1: Terminal Windows (PowerShell o CMD)

1. **Abre PowerShell o CMD** (no WSL/Ubuntu):
   - Presiona `Win + R`
   - Escribe `powershell` o `cmd`
   - Presiona Enter

2. **Navega al directorio del proyecto**:
   ```powershell
   cd "C:\Users\wilso\Desktop\NUEVOS PROYECTOS\frontend"
   ```

3. **Inicia el servidor de desarrollo**:
   ```powershell
   npm run dev
   ```

4. **Espera a ver**:
   ```
   ➜  Local:   http://localhost:5173/
   ➜  press h to show help
   ```

5. **Abre tu navegador**:
   ```
   http://localhost:5173
   ```

---

### Opción 2: Terminal Windows (usando npx directamente)

Si `npm run dev` no funciona:

```powershell
cd "C:\Users\wilso\Desktop\NUEVOS PROYECTOS\frontend"
npx vite
```

---

### Opción 3: Visual Studio Code Terminal

1. Abre VS Code
2. Abre el proyecto: `C:\Users\wilso\Desktop\NUEVOS PROYECTOS`
3. Abre terminal (`` Ctrl+` ``)
4. **Cambia a PowerShell** (esquina superior derecha del terminal)
5. Ejecuta:
   ```powershell
   cd frontend
   npm run dev
   ```

---

## 🧪 PRUEBAS A REALIZAR (Una vez frontend corriendo)

### PRUEBA 1: PropertyForm con Mapbox ✅
**URL**: http://localhost:5173/app/properties/new

**Verificar**:
- [ ] Mapa Mapbox carga (no Leaflet)
- [ ] No hay errores de "leaflet" en Console (F12)
- [ ] Geocoder funciona (buscar "Bogotá, Colombia")
- [ ] Marcador se puede arrastrar
- [ ] Zoom funciona

---

### PRUEBA 2: Dashboard con Chart.js ✅
**URL**: http://localhost:5173/app/dashboard

**Verificar**:
- [ ] Gráficos Chart.js cargan (no Recharts)
- [ ] No hay errores de "recharts" en Console
- [ ] Tooltips funcionan al hacer hover
- [ ] Gráficos interactivos

---

### PRUEBA 3: Backend - Debug Toolbar ✅
**Backend ya está corriendo**: http://127.0.0.1:8000

**Pasos**:
1. Abre el navegador: http://localhost:5173
2. Login con: `admin@verihome.com` / `admin123`
3. Ve a la sección **Matching** o **Solicitudes**
4. Abre DevTools (F12) → **Network** tab
5. Busca peticiones a `/api/v1/matching/match-requests/`
6. Verifica que el response time sea < 200ms

**Alternativamente** (desde navegador directo al backend):
1. Ve a: http://127.0.0.1:8000/api/v1/matching/match-requests/
2. Verás JSON de respuesta
3. Si hay Django Debug Toolbar visible (barra lateral derecha):
   - Click en **SQL**
   - Verifica ~3 queries (antes eran ~50)

---

### PRUEBA 4: XLSX Lazy Loading ✅
**Verificar en Network tab**:
- [ ] Al cargar dashboard: No aparece chunk de XLSX
- [ ] Al exportar datos: Aparece nuevo chunk JS con XLSX

---

## 📊 VERIFICACIONES AUTOMÁTICAS YA COMPLETADAS ✅

```
✅ Leaflet eliminado (solo mocks en tests)
✅ Recharts eliminado completamente
✅ XLSX lazy loading implementado
✅ 13 MB node_modules reducido
✅ 3/3 ViewSets backend optimizados
✅ Django Debug Toolbar configurado
✅ Pillow reinstalado y funcionando
✅ Backend servidor corriendo
```

---

## 🔧 TROUBLESHOOTING

### Si frontend no inicia en Windows:

1. **Reinstalar dependencias** (desde PowerShell):
   ```powershell
   cd "C:\Users\wilso\Desktop\NUEVOS PROYECTOS\frontend"
   Remove-Item node_modules -Recurse -Force
   Remove-Item package-lock.json -Force
   npm install
   npm run dev
   ```

2. **Verificar versión de Node**:
   ```powershell
   node --version  # Debe ser >= v18
   npm --version   # Debe ser >= v9
   ```

3. **Limpiar caché de npm**:
   ```powershell
   npm cache clean --force
   npm install
   ```

### Si backend no responde:

El backend ya está corriendo, pero si necesitas reiniciarlo:

```bash
# En terminal WSL/Ubuntu
cd /mnt/c/Users/wilso/Desktop/NUEVOS\ PROYECTOS
python3 manage.py runserver
```

---

## 📝 DOCUMENTACIÓN COMPLETA DISPONIBLE

- **`GUIA_TESTING_MANUAL_PASO_A_PASO.md`** - Guía detallada completa
- **`REPORTE_VERIFICACION_AUTOMATICA.md`** - Resultados de verificación automática
- **`RESUMEN_TAREAS_AUTOMATICAS_COMPLETADAS.md`** - Resumen de todo lo ejecutado

---

## ✅ SIGUIENTE PASO

1. **Ejecuta frontend desde Windows** (PowerShell/CMD)
2. **Realiza las 4 pruebas** listadas arriba
3. **Documenta resultados** (qué funcionó, qué no)
4. **Ejecutar commit** cuando git esté disponible: `./commit_optimizations.sh`

---

**Creado**: 14 de Octubre, 2025
**Problema**: WSL I/O errors con node_modules
**Solución**: Terminal Windows nativa
**Backend**: ✅ Corriendo en http://127.0.0.1:8000/
