# 🚀 VeriHome - Guía de Inicio de Servidores

## 📋 Requisitos Previos

- Python 3.8+ instalado
- Node.js 18+ instalado
- PostgreSQL (opcional, SQLite como fallback)
- Redis (opcional, memoria local como fallback)

---

## ⚡ Inicio Rápido (3 Terminales)

### **Terminal 1: Backend Django**
```bash
cd /mnt/c/Users/wilso/Desktop/NUEVOS\ PROYECTOS

# Activar entorno virtual (si lo usas)
# source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate     # Windows

# Iniciar servidor
python manage.py runserver

# ✅ Backend listo en: http://localhost:8000
```

### **Terminal 2: Frontend React**
```bash
cd /mnt/c/Users/wilso/Desktop/NUEVOS\ PROYECTOS/frontend

# Instalar dependencias (primera vez)
npm install

# Iniciar servidor de desarrollo
npm run dev

# ✅ Frontend listo en: http://localhost:5173
```

### **Terminal 3: Tests E2E (Playwright)**
```bash
cd /mnt/c/Users/wilso/Desktop/NUEVOS\ PROYECTOS

# Ejecutar script automático
./run_tests.sh

# O ejecutar tests directamente
cd frontend
npx playwright test contract-workflow --headed
```

---

## 🎭 Opciones de Testing con Playwright

### **1. Tests con UI Visible (Recomendado para desarrollo)**
```bash
cd frontend
npx playwright test contract-workflow --headed
```
**Qué hace:**
- ✅ Abre navegadores visibles
- ✅ Puedes ver cada paso en tiempo real
- ✅ Genera screenshots automáticos
- ✅ Perfecto para debugging

### **2. Tests en Background (Rápido)**
```bash
cd frontend
npx playwright test contract-workflow
```
**Qué hace:**
- ✅ Ejecuta tests sin abrir navegador
- ✅ Más rápido que modo headed
- ✅ Genera screenshots y videos en fallos
- ✅ Perfecto para CI/CD

### **3. Tests con UI Interactiva (Debugging)**
```bash
cd frontend
npx playwright test contract-workflow --ui
```
**Qué hace:**
- ✅ Abre UI interactiva de Playwright
- ✅ Puedes pausar/continuar tests
- ✅ Ver timeline de ejecución
- ✅ Debugging avanzado

### **4. Ver Reporte HTML**
```bash
cd frontend
npx playwright show-report
```
**Qué hace:**
- ✅ Abre reporte HTML en navegador
- ✅ Ver todos los screenshots generados
- ✅ Ver videos de tests fallidos
- ✅ Revisar traces interactivos

---

## 📸 Screenshots Generados Automáticamente

Ubicación: `frontend/playwright-report/screenshots/`

| Screenshot | Descripción |
|------------|-------------|
| `admin-logged-in.png` | Landlord autenticado ✅ |
| `letefon100-logged-in.png` | Tenant autenticado ✅ |
| `01-properties-list.png` | Lista de propiedades 🏠 |
| `02-property-detail.png` | Detalle de propiedad 🔍 |
| `03-match-request-form.png` | Formulario de match 📝 |
| `04-match-request-sent.png` | Match enviado ✅ |
| `05-tenant-matches-dashboard.png` | Dashboard tenant 📊 |
| `06-landlord-matches-pending.png` | Matches pendientes 📋 |
| `07-match-accepted.png` | Match aceptado ✅ |
| `08-document-upload-modal.png` | Subida de documentos 📄 |
| `09-contracts-list.png` | Lista de contratos 📑 |
| `10-contract-form-start.png` | Formulario de contrato 📝 |
| `11-contract-step1-filled.png` | Paso 1 completado ✅ |
| `12-contract-step2.png` | Paso 2 (propiedad) 🏠 |
| `13-contract-pdf-preview.png` | Preview del PDF 📄 |
| `14-contract-editor.png` | Editor de contratos ✏️ |
| `15-contract-pdf-modal.png` | Modal PDF en editor 🖼️ |

**Total: 17 screenshots + videos (en fallos)**

---

## 🔍 Verificar que Todo Esté Funcionando

### **Check 1: Backend**
```bash
curl http://localhost:8000/api/v1/

# ✅ Debe retornar JSON con mensaje de API
```

### **Check 2: Frontend**
```bash
curl http://localhost:5173

# ✅ Debe retornar HTML de la app
```

### **Check 3: Login Manual**
Abre navegador en `http://localhost:5173/login`

**Credenciales de prueba:**
- **Landlord**: admin@verihome.com / admin123
- **Tenant**: letefon100@gmail.com / admin123

---

## 🐛 Solución de Problemas

### **Error: "Port 8000 already in use"**
```bash
# Linux/Mac
lsof -ti:8000 | xargs kill -9

# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### **Error: "Port 5173 already in use"**
```bash
# Linux/Mac
lsof -ti:5173 | xargs kill -9

# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

### **Error: "Module not found" en Frontend**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### **Error: "Database doesn't exist"**
```bash
# Correr migraciones
python manage.py migrate

# O crear superusuario
python manage.py createsuperuser
```

### **Error: Playwright no encuentra navegadores**
```bash
cd frontend
npx playwright install
```

---

## 📊 Flujo Completo de Testing

```
1. Iniciar Backend (Terminal 1)
   ↓
2. Iniciar Frontend (Terminal 2)
   ↓
3. Verificar que ambos respondan
   ↓
4. Ejecutar Tests de Playwright (Terminal 3)
   ↓
5. Ver screenshots generados
   ↓
6. Ver reporte HTML
```

### **Comando Todo-en-Uno:**
```bash
# Iniciar servidores y ejecutar tests
./run_tests.sh
```

---

## 🎯 Casos de Uso

### **Desarrollo Normal:**
```bash
# Terminal 1
python manage.py runserver

# Terminal 2
cd frontend && npm run dev

# Trabajar normalmente en tu código
```

### **Testing Manual:**
- Abre `http://localhost:5173`
- Navega manualmente por la app
- Prueba el flujo de contratos

### **Testing Automatizado:**
```bash
# Terminal 3
cd frontend
npx playwright test contract-workflow --headed
```
- Observa cómo se ejecuta automáticamente
- Revisa screenshots generados
- Ve el reporte HTML

### **Antes de un Commit:**
```bash
# Ejecutar tests para asegurar que nada se rompió
cd frontend
npx playwright test
npm run lint
npm run type-check
npm run build
```

---

## 💡 Tips Pro

### **1. Hot Reload:**
Tanto backend como frontend tienen hot reload:
- **Backend**: Django recarga automáticamente al cambiar `.py`
- **Frontend**: Vite recarga automáticamente al cambiar `.tsx/.ts`

### **2. Logs en Tiempo Real:**
```bash
# Backend: Ver logs de Django en Terminal 1
# Frontend: Ver logs de Vite en Terminal 2
# Tests: Ver logs de Playwright en Terminal 3
```

### **3. Debugging:**
```bash
# Backend
python manage.py runserver --verbosity 2

# Frontend
npm run dev -- --debug

# Tests
npx playwright test --debug
```

### **4. Performance:**
```bash
# Ver métricas de performance en reporte Playwright
cd frontend
npx playwright show-report
```

---

## 🎉 ¡Listo para Probar!

Sigue los pasos en orden:
1. ✅ Terminal 1: Backend
2. ✅ Terminal 2: Frontend
3. ✅ Terminal 3: Tests

Y disfruta viendo cómo Playwright ejecuta todo el flujo automáticamente mientras generar evidencia visual completa. 🚀

---

**Última actualización**: Noviembre 18, 2025
**Maintainer**: VeriHome Development Team
