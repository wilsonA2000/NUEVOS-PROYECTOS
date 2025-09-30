# 🛠️ Scripts de VeriHome

Este directorio contiene todos los scripts de utilidades del proyecto VeriHome organizados por categoría.

## 📁 Estructura

### 🗄️ `/database/`
Scripts relacionados con la gestión de la base de datos:
- `clean_database_auto.py` - Limpieza automática de la base de datos
- `clean_database_properties.py` - Limpieza específica de propiedades
- `reset_match_process.py` - Reinicia el proceso de matching
- `database_config.py` - Configuración de la base de datos

### 🐛 `/debug/`
Scripts para debugging y diagnóstico:
- `debug_video_issue.py` - Debug de problemas con videos
- `diagnose_auth_issue.py` - Diagnóstico de problemas de autenticación

### ⚙️ `/maintenance/`
Scripts de mantenimiento del sistema:
- `force_refresh_all.js` - Fuerza la actualización de todos los componentes

## 🚀 Uso

Para ejecutar cualquier script:

```bash
# Scripts de Python
python scripts/database/clean_database_auto.py

# Scripts de JavaScript/Node
node scripts/maintenance/force_refresh_all.js
```

## 📝 Notas

- Siempre hacer backup antes de ejecutar scripts de database
- Los scripts de debug pueden generar logs adicionales
- Verificar permisos antes de ejecutar scripts de mantenimiento

---

**VeriHome Scripts Directory** - Organizado por categorías para mejor mantenimiento
