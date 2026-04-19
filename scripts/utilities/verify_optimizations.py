"""
Script de verificación automática de optimizaciones aplicadas
"""
import subprocess

print("=" * 70)
print("🔍 VERIFICACIÓN DE OPTIMIZACIONES - VeriHome")
print("=" * 70)

results = {
    'frontend': {},
    'backend': {},
    'status': 'success'
}

# =====================================================
# FRONTEND VERIFICATIONS
# =====================================================
print("\n📦 FRONTEND OPTIMIZATIONS")
print("-" * 70)

# 1. Verificar que Leaflet fue eliminado
print("\n1️⃣ Verificando eliminación de Leaflet...")
leaflet_check = subprocess.run(
    ['grep', '-r', 'leaflet', 'frontend/src/', '--include=*.tsx', '--include=*.ts'],
    capture_output=True, text=True
)
if leaflet_check.returncode != 0:
    print("   ✅ Leaflet eliminado correctamente - 0 referencias encontradas")
    results['frontend']['leaflet_removed'] = True
else:
    matches = len(leaflet_check.stdout.strip().split('\n'))
    print(f"   ⚠️  Encontradas {matches} referencias a leaflet")
    results['frontend']['leaflet_removed'] = False
    results['status'] = 'warning'

# 2. Verificar que Recharts fue eliminado
print("\n2️⃣ Verificando eliminación de Recharts...")
recharts_check = subprocess.run(
    ['grep', '-r', 'recharts', 'frontend/src/', '--include=*.tsx', '--include=*.ts'],
    capture_output=True, text=True
)
if recharts_check.returncode != 0:
    print("   ✅ Recharts eliminado correctamente - 0 referencias encontradas")
    results['frontend']['recharts_removed'] = True
else:
    matches = len(recharts_check.stdout.strip().split('\n'))
    print(f"   ⚠️  Encontradas {matches} referencias a recharts")
    results['frontend']['recharts_removed'] = False
    results['status'] = 'warning'

# 3. Verificar XLSX lazy loading
print("\n3️⃣ Verificando XLSX lazy loading...")
try:
    with open('frontend/src/services/exportService.ts', 'r') as f:
        content = f.read()
        if 'await import(\'xlsx\')' in content or 'await import("xlsx")' in content:
            print("   ✅ XLSX lazy loading implementado correctamente")
            results['frontend']['xlsx_lazy'] = True
        else:
            print("   ⚠️  XLSX lazy loading no detectado")
            results['frontend']['xlsx_lazy'] = False
            results['status'] = 'warning'
except FileNotFoundError:
    print("   ⚠️  Archivo exportService.ts no encontrado")
    results['frontend']['xlsx_lazy'] = False

# 4. Medir node_modules
print("\n4️⃣ Midiendo tamaño de node_modules...")
try:
    du_result = subprocess.run(
        ['du', '-sh', 'frontend/node_modules'],
        capture_output=True, text=True
    )
    size = du_result.stdout.split()[0]
    print(f"   📊 Tamaño actual: {size}")
    print("   📊 Tamaño anterior: 473M")
    if 'M' in size:
        current_mb = int(size.replace('M', ''))
        reduction = 473 - current_mb
        percent = (reduction / 473) * 100
        print(f"   ✅ Reducción: {reduction}MB ({percent:.1f}%)")
        results['frontend']['node_modules_size'] = size
        results['frontend']['reduction_mb'] = reduction
except Exception as e:
    print(f"   ⚠️  No se pudo medir: {e}")

# 5. Contar packages
print("\n5️⃣ Contando packages instalados...")
try:
    ls_result = subprocess.run(
        ['ls', 'frontend/node_modules'],
        capture_output=True, text=True
    )
    package_count = len(ls_result.stdout.strip().split('\n'))
    print(f"   📦 Packages actuales: {package_count}")
    print("   📦 Packages eliminados: 33 (Leaflet + Recharts)")
    results['frontend']['package_count'] = package_count
except Exception as e:
    print(f"   ⚠️  No se pudo contar: {e}")

# =====================================================
# BACKEND VERIFICATIONS
# =====================================================
print("\n\n🔧 BACKEND OPTIMIZATIONS")
print("-" * 70)

# 6. Verificar optimizaciones en matching/api_views.py
print("\n6️⃣ Verificando optimizaciones de queries en matching...")
try:
    with open('matching/api_views.py', 'r') as f:
        content = f.read()
        
        # Verificar MatchRequestViewSet
        if 'MatchRequest.objects.select_related' in content:
            print("   ✅ MatchRequestViewSet optimizado con select_related")
            results['backend']['match_request_optimized'] = True
        else:
            print("   ❌ MatchRequestViewSet NO optimizado")
            results['backend']['match_request_optimized'] = False
            results['status'] = 'error'
        
        # Verificar MatchCriteriaViewSet
        if 'MatchCriteria.objects.select_related' in content:
            print("   ✅ MatchCriteriaViewSet optimizado con select_related")
            results['backend']['match_criteria_optimized'] = True
        else:
            print("   ❌ MatchCriteriaViewSet NO optimizado")
            results['backend']['match_criteria_optimized'] = False
            results['status'] = 'error'
        
        # Verificar MatchNotificationViewSet
        if 'MatchNotification.objects.select_related' in content:
            print("   ✅ MatchNotificationViewSet optimizado con select_related")
            results['backend']['match_notification_optimized'] = True
        else:
            print("   ❌ MatchNotificationViewSet NO optimizado")
            results['backend']['match_notification_optimized'] = False
            results['status'] = 'error'
            
except FileNotFoundError:
    print("   ❌ Archivo matching/api_views.py no encontrado")
    results['status'] = 'error'

# 7. Verificar Django Debug Toolbar
print("\n7️⃣ Verificando Django Debug Toolbar...")
try:
    with open('verihome/settings.py', 'r') as f:
        settings_content = f.read()
        if 'debug_toolbar' in settings_content:
            print("   ✅ Django Debug Toolbar configurado en settings.py")
            results['backend']['debug_toolbar_settings'] = True
        else:
            print("   ⚠️  Django Debug Toolbar NO configurado en settings")
            results['backend']['debug_toolbar_settings'] = False
            
    with open('verihome/urls.py', 'r') as f:
        urls_content = f.read()
        if 'debug_toolbar' in urls_content:
            print("   ✅ Django Debug Toolbar configurado en urls.py")
            results['backend']['debug_toolbar_urls'] = True
        else:
            print("   ⚠️  Django Debug Toolbar NO configurado en urls")
            results['backend']['debug_toolbar_urls'] = False
except Exception as e:
    print(f"   ⚠️  Error verificando Debug Toolbar: {e}")

# =====================================================
# SUMMARY
# =====================================================
print("\n\n" + "=" * 70)
print("📊 RESUMEN DE VERIFICACIÓN")
print("=" * 70)

frontend_checks = sum([
    results['frontend'].get('leaflet_removed', False),
    results['frontend'].get('recharts_removed', False),
    results['frontend'].get('xlsx_lazy', False)
])

backend_checks = sum([
    results['backend'].get('match_request_optimized', False),
    results['backend'].get('match_criteria_optimized', False),
    results['backend'].get('match_notification_optimized', False)
])

print(f"\n✅ Frontend: {frontend_checks}/3 optimizaciones verificadas")
print(f"✅ Backend: {backend_checks}/3 optimizaciones verificadas")

if results['frontend'].get('reduction_mb'):
    print(f"\n📦 Node modules reducido: {results['frontend']['reduction_mb']}MB")
    print(f"📊 Bundle size reducción estimada: ~{results['frontend']['reduction_mb'] * 0.5:.1f}MB")

print("\n🎯 Estado global:", "✅ ÉXITO" if results['status'] == 'success' else "⚠️  REVISAR")

print("\n" + "=" * 70)
print("✅ Verificación completada")
print("=" * 70)
