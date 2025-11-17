# 🚀 INSTRUCCIONES PARA INICIAR TESTING MANUAL

## PASO 1: Abrir Terminales

Necesitas **2 terminales abiertas**:

### Terminal 1 - Backend Django:
```bash
cd /mnt/c/Users/wilso/Desktop/NUEVOS\ PROYECTOS
python3 manage.py runserver
```

**Espera a ver este mensaje**:
```
Django version 4.2.7, using settings 'verihome.settings'
Starting development server at http://127.0.0.1:8000/
Quit the server with CONTROL-C.
```

### Terminal 2 - Frontend React:
```bash
cd /mnt/c/Users/wilso/Desktop/NUEVOS\ PROYECTOS/frontend
npm run dev
```

**Espera a ver este mensaje**:
```
  VITE v5.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

---

## PASO 2: Verificar que Funcionan

1. **Backend**: Abre en navegador: http://localhost:8000/admin/
   - ✅ Si ves la página de login de Django Admin = Funciona

2. **Frontend**: Abre en navegador: http://localhost:5173/
   - ✅ Si ves la landing page o login de VeriHome = Funciona

---

## PASO 3: Iniciar Pruebas

Una vez ambos servidores estén corriendo:

1. Abre la guía completa:
   ```bash
   cat GUIA_TESTING_MANUAL_PASO_A_PASO.md
   ```

2. O sigue estas instrucciones rápidas:

---

## 🧪 PRUEBAS RÁPIDAS (Resumen)

### ✅ PRUEBA 1: Mapbox (5 minutos)
1. Login: http://localhost:5173 (`admin@verihome.com` / `admin123`)
2. Ve a: **Propiedades → Nueva Propiedad**
3. Verifica:
   - [ ] Mapa carga correctamente
   - [ ] Puedes buscar direcciones
   - [ ] Puedes arrastrar el marcador
   - [ ] No hay errores de "leaflet" en Console (F12)

### ✅ PRUEBA 2: Chart.js (5 minutos)
1. Ve a: **Dashboard**
2. Verifica:
   - [ ] Gráficos se muestran (líneas, barras, circulares)
   - [ ] Hover muestra tooltips
   - [ ] No hay errores de "recharts" en Console (F12)

### ✅ PRUEBA 3: Queries Optimizadas (10 minutos)
1. Ve a: http://localhost:8000/api/v1/matching/match-requests/
   - (Necesitas estar autenticado en Django admin)
2. Busca Django Debug Toolbar en el lado derecho
3. Click en "SQL"
4. Verifica:
   - [ ] ~3 queries totales (antes eran ~50)
   - [ ] Queries tienen JOINs (select_related funcionando)

---

## 🎯 CRITERIOS DE ÉXITO

**MÍNIMO para considerar éxito**:
- ✅ Mapbox funciona sin Leaflet
- ✅ Chart.js funciona sin Recharts
- ✅ Queries reducidas a ~3

**Si todas pasan**: ✅ **OPTIMIZACIONES EXITOSAS**

---

## 📸 QUÉ REPORTAR

Si algo falla, reporta:
1. **Qué prueba falló** (Prueba 1, 2 o 3)
2. **Qué error ves** (copia de Console)
3. **Captura de pantalla** (opcional)

---

## 💡 TIPS

- **F12** abre DevTools en el navegador
- **Console tab** muestra errores JavaScript
- **Network tab** muestra archivos cargando
- **Ctrl+Shift+R** hace hard reload (limpia cache)

---

**Tiempo total estimado**: 20-30 minutos

**¿Listo para empezar?** Abre las 2 terminales y sigue las instrucciones!

