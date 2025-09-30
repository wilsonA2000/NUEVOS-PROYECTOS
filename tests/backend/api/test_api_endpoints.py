#!/usr/bin/env python
"""
Script para verificar que todas las APIs del backend respondan correctamente.
"""

import requests
import json
from datetime import datetime

# Configuración
BASE_URL = "http://localhost:8000/api/v1"
AUTH_URL = f"{BASE_URL}/auth/login/"

# Credenciales de prueba
TEST_USER = "admin@verihome.com"
TEST_PASSWORD = "admin123"

# Colores para output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def print_success(msg):
    print(f"{Colors.GREEN}✓ {msg}{Colors.END}")

def print_error(msg):
    print(f"{Colors.RED}✗ {msg}{Colors.END}")

def print_info(msg):
    print(f"{Colors.BLUE}ℹ {msg}{Colors.END}")

def print_warning(msg):
    print(f"{Colors.YELLOW}⚠ {msg}{Colors.END}")

def get_auth_token():
    """Obtener token de autenticación"""
    print_info("Autenticando usuario...")
    try:
        response = requests.post(AUTH_URL, json={
            "email": TEST_USER,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            print_success(f"Autenticación exitosa para {TEST_USER}")
            return data.get("access")
        else:
            print_error(f"Error de autenticación: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print_error(f"Error conectando al servidor: {e}")
        return None

def test_endpoint(session, method, endpoint, name, data=None):
    """Probar un endpoint específico"""
    url = f"{BASE_URL}{endpoint}"
    
    try:
        if method == "GET":
            response = session.get(url)
        elif method == "POST":
            response = session.post(url, json=data)
        elif method == "PUT":
            response = session.put(url, json=data)
        elif method == "PATCH":
            response = session.patch(url, json=data)
        elif method == "DELETE":
            response = session.delete(url)
        
        if response.status_code in [200, 201, 204]:
            print_success(f"{method} {endpoint} - {name}")
            return True
        elif response.status_code == 404:
            print_warning(f"{method} {endpoint} - {name} (404 Not Found)")
            return False
        elif response.status_code == 403:
            print_warning(f"{method} {endpoint} - {name} (403 Forbidden)")
            return False
        else:
            print_error(f"{method} {endpoint} - {name} ({response.status_code})")
            if response.text:
                try:
                    error_data = response.json()
                    print(f"  Error: {json.dumps(error_data, indent=2)}")
                except:
                    print(f"  Error: {response.text[:200]}")
            return False
    except requests.exceptions.ConnectionError:
        print_error(f"{method} {endpoint} - Error de conexión")
        return False
    except Exception as e:
        print_error(f"{method} {endpoint} - Error: {e}")
        return False

def main():
    """Función principal"""
    print("\n" + "="*60)
    print("VERIFICACIÓN DE ENDPOINTS API - VERIHOME")
    print(f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Base URL: {BASE_URL}")
    print("="*60 + "\n")
    
    # Obtener token
    token = get_auth_token()
    if not token:
        print_error("No se pudo obtener token de autenticación. Abortando pruebas.")
        return
    
    # Crear sesión con headers de autenticación
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    })
    
    # Definir endpoints a probar
    endpoints_to_test = [
        # === USUARIOS ===
        ("GET", "/users/profile/", "Perfil de usuario"),
        ("GET", "/users/users/", "Lista de usuarios"),
        ("GET", "/users/activity-logs/", "Logs de actividad"),
        
        # === PROPIEDADES ===
        ("GET", "/properties/properties/", "Lista de propiedades"),
        ("GET", "/properties/amenities/", "Amenidades"),
        ("GET", "/properties/favorites/", "Propiedades favoritas"),
        ("GET", "/properties/filters/", "Filtros de propiedades"),
        ("GET", "/properties/stats/", "Estadísticas de propiedades"),
        
        # === CONTRATOS ===
        ("GET", "/contracts/contracts/", "Lista de contratos"),
        ("GET", "/contracts/templates/", "Plantillas de contratos"),
        ("GET", "/contracts/signatures/", "Firmas digitales"),
        ("GET", "/contracts/amendments/", "Enmiendas"),
        ("GET", "/contracts/renewals/", "Renovaciones"),
        ("GET", "/contracts/terminations/", "Terminaciones"),
        ("GET", "/contracts/documents/", "Documentos"),
        ("GET", "/contracts/stats/", "Estadísticas de contratos"),
        
        # === MENSAJERÍA ===
        ("GET", "/messages/messages/", "Lista de mensajes"),
        ("GET", "/messages/threads/", "Hilos de conversación"),
        ("GET", "/messages/folders/", "Carpetas"),
        ("GET", "/messages/templates/", "Plantillas de mensajes"),
        ("GET", "/messages/unread-count/", "Conteo de no leídos"),
        ("GET", "/messages/stats/", "Estadísticas de mensajería"),
        
        # === PAGOS ===
        ("GET", "/payments/payments/", "Lista de pagos"),
        ("GET", "/payments/invoices/", "Facturas"),
        ("GET", "/payments/escrow-accounts/", "Cuentas de garantía"),
        ("GET", "/payments/payment-methods/", "Métodos de pago"),
        ("GET", "/payments/stats/", "Estadísticas de pagos"),
        
        # === CALIFICACIONES ===
        ("GET", "/ratings/ratings/", "Lista de calificaciones"),
        ("GET", "/ratings/stats/", "Estadísticas de calificaciones"),
        
        # === MATCHING ===
        ("GET", "/matching/preferences/", "Preferencias de matching"),
        ("GET", "/matching/matches/", "Matches"),
        ("GET", "/matching/stats/", "Estadísticas de matching"),
        
        # === DASHBOARD ===
        ("GET", "/dashboard/stats/", "Estadísticas del dashboard"),
        ("GET", "/dashboard/widgets/", "Widgets del dashboard"),
    ]
    
    # Contadores
    total = len(endpoints_to_test)
    successful = 0
    failed = 0
    warnings = 0
    
    print(f"\nProbando {total} endpoints...\n")
    
    # Probar cada endpoint
    for method, endpoint, name in endpoints_to_test:
        result = test_endpoint(session, method, endpoint, name)
        if result:
            successful += 1
        else:
            if "404" in name or "403" in name:
                warnings += 1
            else:
                failed += 1
    
    # Resumen
    print("\n" + "="*60)
    print("RESUMEN DE PRUEBAS")
    print("="*60)
    print(f"Total de endpoints probados: {total}")
    print(f"{Colors.GREEN}Exitosos: {successful}{Colors.END}")
    print(f"{Colors.YELLOW}Advertencias: {warnings}{Colors.END}")
    print(f"{Colors.RED}Fallidos: {failed}{Colors.END}")
    print(f"\nPorcentaje de éxito: {(successful/total)*100:.1f}%")
    
    if failed > 0:
        print(f"\n{Colors.RED}⚠️  Hay {failed} endpoints que necesitan atención.{Colors.END}")
    else:
        print(f"\n{Colors.GREEN}✅ Todos los endpoints críticos están funcionando correctamente.{Colors.END}")

if __name__ == "__main__":
    main()