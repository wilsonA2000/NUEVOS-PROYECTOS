#!/usr/bin/env python3
"""
Script para probar todas las rutas de API principales de VeriHome.
Verifica que las rutas existan y respondan correctamente.
"""

import requests
import json
from datetime import datetime

# Configuración
API_BASE_URL = "http://127.0.0.1:8000/api/v1"
TIMEOUT = 10

def test_route(url, method="GET", data=None, expected_status=None, description=""):
    """Prueba una ruta específica."""
    print(f"\n🔗 Probando: {description}")
    print(f"   URL: {method} {url}")
    
    try:
        if method == "GET":
            response = requests.get(url, timeout=TIMEOUT)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=TIMEOUT)
        elif method == "PUT":
            response = requests.put(url, json=data, timeout=TIMEOUT)
        elif method == "DELETE":
            response = requests.delete(url, timeout=TIMEOUT)
        
        status = response.status_code
        print(f"   Status: {status}")
        
        # Determinar si es exitoso
        if expected_status:
            success = status == expected_status
        else:
            # Para rutas que requieren autenticación, 401 es esperado
            # Para rutas públicas, 200 es esperado
            success = status in [200, 201, 401, 403]
        
        if success:
            print(f"   ✅ ✅ Ruta funciona correctamente")
        else:
            print(f"   ❌ ❌ Ruta falló - Status inesperado: {status}")
            if response.text:
                print(f"   Response: {response.text[:200]}...")
        
        return success
        
    except requests.exceptions.RequestException as e:
        print(f"   ❌ ❌ Error de conexión: {e}")
        return False

def main():
    print("=" * 60)
    print("🧪 INICIANDO PRUEBAS DE RUTAS DE API")
    print("=" * 60)
    print(f"ℹ️  Servidor: {API_BASE_URL}")
    print(f"ℹ️  Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Lista de rutas a probar
    routes_to_test = [
        # Rutas de autenticación
        (f"{API_BASE_URL}/auth/login/", "POST", {"email": "test@test.com", "password": "test"}, 401, "Login (credenciales inválidas)"),
        (f"{API_BASE_URL}/auth/me/", "GET", None, 401, "Obtener usuario actual (sin autenticación)"),
        (f"{API_BASE_URL}/auth/register/", "POST", {"email": "test@test.com", "password": "test"}, 400, "Registro (datos incompletos)"),
        (f"{API_BASE_URL}/auth/logout/", "POST", None, 401, "Logout (sin autenticación)"),
        
        # Rutas de usuarios
        (f"{API_BASE_URL}/users/notifications/", "GET", None, 401, "Notificaciones de usuario (sin autenticación)"),
        (f"{API_BASE_URL}/users/profile/", "GET", None, 401, "Perfil de usuario (sin autenticación)"),
        (f"{API_BASE_URL}/users/settings/", "GET", None, 401, "Configuración de usuario (sin autenticación)"),
        
        # Rutas de propiedades
        (f"{API_BASE_URL}/properties/properties/", "GET", None, 401, "Lista de propiedades (sin autenticación)"),
        
        # Rutas de contratos
        (f"{API_BASE_URL}/contracts/contracts/", "GET", None, 401, "Lista de contratos (sin autenticación)"),
        (f"{API_BASE_URL}/contracts/templates/", "GET", None, 401, "Plantillas de contratos (sin autenticación)"),
        
        # Rutas de mensajes
        (f"{API_BASE_URL}/messages/messages/", "GET", None, 401, "Lista de mensajes (sin autenticación)"),
        (f"{API_BASE_URL}/messages/threads/", "GET", None, 401, "Hilos de mensajes (sin autenticación)"),
        (f"{API_BASE_URL}/messages/conversations/", "GET", None, 401, "Conversaciones (sin autenticación)"),
        (f"{API_BASE_URL}/messages/unread-count/", "GET", None, 401, "Contador de mensajes no leídos (sin autenticación)"),
        
        # Rutas de pagos
        (f"{API_BASE_URL}/payments/transactions/", "GET", None, 401, "Transacciones (sin autenticación)"),
        (f"{API_BASE_URL}/payments/payment-methods/", "GET", None, 401, "Métodos de pago (sin autenticación)"),
        (f"{API_BASE_URL}/payments/invoices/", "GET", None, 401, "Facturas (sin autenticación)"),
        (f"{API_BASE_URL}/payments/escrow-accounts/", "GET", None, 401, "Cuentas de depósito (sin autenticación)"),
        (f"{API_BASE_URL}/payments/payment-plans/", "GET", None, 401, "Planes de pago (sin autenticación)"),
        (f"{API_BASE_URL}/payments/installments/", "GET", None, 401, "Cuotas (sin autenticación)"),
        (f"{API_BASE_URL}/payments/stats/balance/", "GET", None, 401, "Estadísticas de balance (sin autenticación)"),
        (f"{API_BASE_URL}/payments/stats/dashboard/", "GET", None, 401, "Estadísticas del dashboard (sin autenticación)"),
        
        # Rutas de calificaciones
        (f"{API_BASE_URL}/ratings/ratings/", "GET", None, 401, "Lista de calificaciones (sin autenticación)"),
        
        # Rutas de core
        (f"{API_BASE_URL}/core/notifications/", "GET", None, 401, "Notificaciones del sistema (sin autenticación)"),
        (f"{API_BASE_URL}/core/activity-logs/", "GET", None, 401, "Logs de actividad (sin autenticación)"),
        (f"{API_BASE_URL}/core/system-alerts/", "GET", None, 401, "Alertas del sistema (sin autenticación)"),
        (f"{API_BASE_URL}/core/stats/dashboard/", "GET", None, 401, "Estadísticas del dashboard (sin autenticación)"),
        (f"{API_BASE_URL}/core/stats/overview/", "GET", None, 401, "Estadísticas generales (sin autenticación)"),
    ]
    
    # Contadores
    total_routes = len(routes_to_test)
    successful_routes = 0
    failed_routes = 0
    
    print(f"\n🔗 Probando {total_routes} rutas de API...")
    
    # Probar cada ruta
    for url, method, data, expected_status, description in routes_to_test:
        if test_route(url, method, data, expected_status, description):
            successful_routes += 1
        else:
            failed_routes += 1
    
    # Resumen
    print("\n" + "=" * 60)
    print("📊 RESUMEN DE PRUEBAS")
    print("=" * 60)
    print(f"✅ Rutas exitosas: {successful_routes}/{total_routes}")
    print(f"❌ Rutas fallidas: {failed_routes}/{total_routes}")
    print(f"📈 Porcentaje de éxito: {(successful_routes/total_routes)*100:.1f}%")
    
    if failed_routes == 0:
        print("\n🎉 ¡Todas las rutas están funcionando correctamente!")
        print("✅ El frontend debería poder conectarse sin problemas")
    else:
        print(f"\n⚠️  {failed_routes} rutas necesitan atención")
        print("🔧 Revisa los errores arriba para identificar problemas")
    
    print("\n" + "=" * 60)
    print("🧪 PRUEBAS COMPLETADAS")
    print("=" * 60)

if __name__ == "__main__":
    main() 