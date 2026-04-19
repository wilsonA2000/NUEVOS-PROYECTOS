"""
Script para configurar Django Debug Toolbar automáticamente
"""

settings_file = 'verihome/settings.py'
urls_file = 'verihome/urls.py'

print("🔧 Configurando Django Debug Toolbar...")

# Leer settings.py
with open(settings_file, 'r', encoding='utf-8') as f:
    settings_content = f.read()

# Verificar si ya está configurado
if 'debug_toolbar' in settings_content:
    print("✅ Debug Toolbar ya está configurado en settings.py")
else:
    print("📝 Agregando Debug Toolbar a settings.py...")
    
    # Agregar a INSTALLED_APPS
    if "INSTALLED_APPS = [" in settings_content:
        settings_content = settings_content.replace(
            "INSTALLED_APPS = [",
            "INSTALLED_APPS = [\n    'debug_toolbar',  # Django Debug Toolbar para monitoreo de queries"
        )
    
    # Agregar MIDDLEWARE
    if "MIDDLEWARE = [" in settings_content:
        settings_content = settings_content.replace(
            "MIDDLEWARE = [",
            "MIDDLEWARE = [\n    'debug_toolbar.middleware.DebugToolbarMiddleware',  # Debug Toolbar (debe estar arriba)"
        )
    
    # Agregar INTERNAL_IPS al final
    if "INTERNAL_IPS" not in settings_content:
        settings_content += "\n\n# Django Debug Toolbar\nINTERNAL_IPS = ['127.0.0.1', 'localhost']\n"
    
    # Guardar settings.py
    with open(settings_file, 'w', encoding='utf-8') as f:
        f.write(settings_content)
    
    print("✅ Settings.py actualizado")

# Configurar urls.py
print("\n📝 Configurando URLs...")
with open(urls_file, 'r', encoding='utf-8') as f:
    urls_content = f.read()

if '__debug__' in urls_content and 'debug_toolbar' in urls_content:
    print("✅ Debug Toolbar ya está configurado en urls.py")
else:
    # Agregar import si no existe
    if 'from django.conf import settings' not in urls_content:
        urls_content = urls_content.replace(
            'from django.urls import',
            'from django.conf import settings\nfrom django.urls import'
        )
    
    # Agregar configuración al final
    if "if settings.DEBUG:" not in urls_content or 'debug_toolbar' not in urls_content:
        urls_content += """\n
# Django Debug Toolbar (solo en DEBUG mode)
if settings.DEBUG:
    try:
        import debug_toolbar
        urlpatterns = [
            path('__debug__/', include(debug_toolbar.urls)),
        ] + urlpatterns
    except ImportError:
        pass
"""
    
    with open(urls_file, 'w', encoding='utf-8') as f:
        f.write(urls_content)
    
    print("✅ URLs.py actualizado")

print("\n✅ Django Debug Toolbar configurado exitosamente!")
print("📊 Reinicia el servidor para ver la toolbar en http://localhost:8000")
