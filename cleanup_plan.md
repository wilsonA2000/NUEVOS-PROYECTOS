# Plan de Limpieza del Proyecto VeriHome

## 🚨 PROBLEMAS IDENTIFICADOS

### 1. DUPLICIDADES CRÍTICAS
- **2 Frontends diferentes**: `frontend/` vs `verihome-demo/`
- **3 package.json**: Raíz, frontend/, verihome-demo/
- **2 Dockerfiles**: Raíz y frontend/
- **2 nginx.conf**: Raíz y frontend/
- **3 node_modules**: Raíz, frontend/, verihome-demo/
- **2 dist/**: Raíz y verihome-demo/
- **3 directorios estáticos**: static/, staticfiles/, staticjs/

### 2. CÓDIGO OBSOLETO
- **15 archivos de test** en la raíz
- **Archivos de log** grandes (redis_1750017917.txt - 44KB)
- **Archivos comprimidos** (agent_workspace.zip - 37MB)
- **Directorios vacíos**: -p/, .qodo/, staticjs/, templatesaccount/

### 3. INCONSISTENCIAS
- **Diferentes gestores de paquetes**: npm vs pnpm
- **Diferentes frameworks UI**: Material-UI vs Tailwind CSS
- **Configuraciones de build diferentes**

## 📋 PLAN DE ACCIÓN

### FASE 1: DECIDIR QUÉ FRONTEND MANTENER
**RECOMENDACIÓN**: Mantener `frontend/` (Material-UI) y eliminar `verihome-demo/`

### FASE 2: ELIMINAR CÓDIGO OBSOLETO
```bash
# Eliminar archivos de test obsoletos
rm test_*.py
rm test_email.py
rm test_connection.py

# Eliminar archivos grandes obsoletos
rm redis_1750017917.txt
rm agent_workspace.zip

# Eliminar directorios vacíos
rm -rf -p/
rm -rf .qodo/
rm -rf staticjs/
rm -rf templatesaccount/

# Eliminar archivos de documentación obsoletos
rm todo.md
rm *.md (excepto README.md y archivos importantes)
```

### FASE 3: LIMPIAR DUPLICIDADES
```bash
# Eliminar frontend alternativo
rm -rf verihome-demo/

# Eliminar node_modules de la raíz
rm -rf node_modules/
rm package.json
rm package-lock.json

# Eliminar dist de la raíz
rm -rf dist/

# Eliminar static duplicado
rm -rf static/
```

### FASE 4: CONSOLIDAR CONFIGURACIONES
```bash
# Mover Dockerfile del frontend a la raíz
mv frontend/Dockerfile ./Dockerfile.frontend

# Mover nginx.conf del frontend a la raíz
mv frontend/nginx.conf ./nginx.frontend.conf

# Actualizar docker-compose.yml para usar las configuraciones correctas
```

### FASE 5: VERIFICAR SINCRONIZACIÓN
```bash
# Verificar que solo hay un frontend
ls -la frontend/

# Verificar que las dependencias están correctas
cd frontend && npm list

# Verificar que el build funciona
cd frontend && npm run build
```

## 🎯 RESULTADO ESPERADO

### Estructura Final Limpia:
```
verihome/
├── frontend/           # Único frontend (Material-UI)
├── verihome/          # Configuración Django
├── core/              # App core
├── users/             # App usuarios
├── properties/        # App propiedades
├── contracts/         # App contratos
├── payments/          # App pagos
├── messaging/         # App mensajería
├── ratings/           # App calificaciones
├── templates/         # Templates Django
├── staticfiles/       # Archivos estáticos recolectados
├── media/             # Archivos multimedia
├── requirements.txt   # Dependencias Python
├── manage.py          # Django management
├── Dockerfile         # Docker principal
├── docker-compose.yml # Docker compose
├── nginx.conf         # Nginx principal
└── README.md          # Documentación
```

## ⚠️ ADVERTENCIAS

1. **Hacer backup** antes de eliminar archivos
2. **Verificar** que el frontend elegido funciona correctamente
3. **Probar** todas las funcionalidades después de la limpieza
4. **Actualizar** documentación y scripts de deployment

## 🔄 PRÓXIMOS PASOS

1. Confirmar qué frontend mantener
2. Ejecutar el plan de limpieza
3. Verificar que todo funciona
4. Actualizar scripts de deployment
5. Documentar la nueva estructura 