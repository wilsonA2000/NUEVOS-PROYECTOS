#!/usr/bin/env python3
"""
Script de testing completo para todos los endpoints de la API de VeriHome.
AGENTE 1 - BACKEND API TESTING
Este script usa urllib para evitar conflictos con el módulo 'requests' local.
"""

import os
import sys
import json
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime
from typing import Dict, List, Tuple
from collections import defaultdict

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)

import django
django.setup()

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

# Configuración
BASE_URL = "http://localhost:8000/api/v1"
ADMIN_EMAIL = "admin@verihome.com"
ADMIN_PASSWORD = "admin123"

# Colores para terminal
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

class APITester:
    def __init__(self):
        self.results = {
            'success': [],
            'failed': [],
            'warnings': []
        }
        self.auth_token = None
        self.test_user_id = None

    def log(self, message: str, level: str = "INFO"):
        """Log con colores"""
        color = Colors.BLUE
        if level == "SUCCESS":
            color = Colors.GREEN
        elif level == "ERROR":
            color = Colors.RED
        elif level == "WARNING":
            color = Colors.YELLOW
        print(f"{color}[{level}]{Colors.RESET} {message}")

    def get_or_create_admin_token(self):
        """Obtener token JWT para admin"""
        User = get_user_model()
        try:
            admin = User.objects.filter(email=ADMIN_EMAIL).first()
            if not admin:
                self.log("Creando usuario admin...", "INFO")
                admin = User.objects.create_superuser(
                    email=ADMIN_EMAIL,
                    password=ADMIN_PASSWORD,
                    first_name="Admin",
                    last_name="VeriHome"
                )

            refresh = RefreshToken.for_user(admin)
            self.auth_token = str(refresh.access_token)
            self.test_user_id = str(admin.id)
            self.log(f"Token obtenido para admin: {admin.email}", "SUCCESS")
            return True
        except Exception as e:
            self.log(f"Error obteniendo token admin: {str(e)}", "ERROR")
            return False

    def make_request(self, method: str, url: str, headers: dict = None,
                    data: dict = None) -> Tuple[int, dict]:
        """Hacer request HTTP usando urllib"""
        if headers is None:
            headers = {}

        try:
            # Preparar datos
            if data and method in ['POST', 'PUT', 'PATCH']:
                data = json.dumps(data).encode('utf-8')
                headers['Content-Type'] = 'application/json'
                headers['Content-Length'] = str(len(data))

            # Crear request
            req = urllib.request.Request(url, data=data, headers=headers, method=method)

            # Ejecutar request
            with urllib.request.urlopen(req, timeout=10) as response:
                status_code = response.getcode()
                response_data = json.loads(response.read().decode('utf-8'))
                return status_code, response_data

        except urllib.error.HTTPError as e:
            try:
                response_data = json.loads(e.read().decode('utf-8'))
            except:
                response_data = {'error': e.reason}
            return e.code, response_data

        except urllib.error.URLError as e:
            return 0, {'error': 'Connection error', 'reason': str(e.reason)}

        except Exception as e:
            return 0, {'error': str(e)}

    def test_endpoint(self, method: str, endpoint: str, expected_status: int = 200,
                     data: dict = None, requires_auth: bool = True) -> Tuple[bool, str, dict]:
        """Test individual de un endpoint"""
        url = f"{BASE_URL}{endpoint}"
        headers = {}

        if requires_auth and self.auth_token:
            headers['Authorization'] = f'Bearer {self.auth_token}'

        try:
            status_code, response_data = self.make_request(method, url, headers, data)

            if status_code == 0:
                return False, f"❌ Error de conexión: {response_data.get('error', 'Unknown')}", response_data

            status_ok = status_code == expected_status

            if status_ok:
                message = f"✅ {status_code}"
            else:
                message = f"❌ {status_code} (esperado {expected_status})"

            return status_ok, message, response_data

        except Exception as e:
            return False, f"❌ Error: {str(e)[:100]}", {}

    def run_tests(self):
        """Ejecutar todos los tests"""
        self.log("=" * 80, "INFO")
        self.log("INICIANDO TESTING COMPLETO DE APIs DE VERIHOME", "INFO")
        self.log("=" * 80, "INFO")

        if not self.get_or_create_admin_token():
            self.log("No se pudo obtener token de autenticación. Abortando.", "ERROR")
            return

        self.log("\n1. TESTING USERS & AUTH APIs", "INFO")
        self.test_users_auth()

        self.log("\n2. TESTING PROPERTIES APIs", "INFO")
        self.test_properties()

        self.log("\n3. TESTING CONTRACTS APIs", "INFO")
        self.test_contracts()

        self.log("\n4. TESTING MATCHING APIs", "INFO")
        self.test_matching()

        self.log("\n5. TESTING MESSAGING APIs", "INFO")
        self.test_messaging()

        self.log("\n6. TESTING PAYMENTS APIs", "INFO")
        self.test_payments()

        self.log("\n7. TESTING SERVICES APIs", "INFO")
        self.test_services()

        self.log("\n8. TESTING RATINGS APIs", "INFO")
        self.test_ratings()

        self.log("\n9. TESTING DASHBOARD APIs", "INFO")
        self.test_dashboard()

        self.log("\n10. TESTING REQUESTS APIs", "INFO")
        self.test_requests()

        self.generate_report()

    def test_users_auth(self):
        """Test Users & Auth endpoints"""
        tests = [
            ('POST', '/users/auth/login/', 200, {'email': ADMIN_EMAIL, 'password': ADMIN_PASSWORD}, False),
            ('GET', '/users/auth/me/', 200, None, True),
            ('GET', '/users/profile/', 200, None, True),
            ('GET', '/users/dashboard/', 200, None, True),
            ('GET', '/users/users/', 200, None, True),
            ('GET', '/users/notifications/', 200, None, True),
            ('GET', '/users/activity-logs/', 200, None, True),
            ('GET', '/users/landlord-profiles/', 200, None, True),
            ('GET', '/users/tenant-profiles/', 200, None, True),
        ]

        for method, endpoint, expected, data, auth in tests:
            success, message, response = self.test_endpoint(method, endpoint, expected, data, auth)
            self._record_result(success, f"{method} {endpoint}", message, response)

    def test_properties(self):
        """Test Properties endpoints"""
        tests = [
            ('GET', '/properties/', 200, None, False),
            ('GET', '/properties/search/', 200, None, False),
            ('GET', '/properties/filters/', 200, None, False),
            ('GET', '/properties/featured/', 200, None, False),
            ('GET', '/properties/trending/', 200, None, False),
            ('GET', '/properties/stats/', 200, None, True),
            ('GET', '/properties/amenities/', 200, None, False),
            ('GET', '/properties/inquiries/', 200, None, True),
            ('GET', '/properties/favorites/', 200, None, True),
            ('GET', '/properties/property-images/', 200, None, False),
            ('GET', '/properties/property-videos/', 200, None, False),
        ]

        for method, endpoint, expected, data, auth in tests:
            success, message, response = self.test_endpoint(method, endpoint, expected, data, auth)
            self._record_result(success, f"{method} {endpoint}", message, response)

    def test_contracts(self):
        """Test Contracts endpoints"""
        tests = [
            ('GET', '/contracts/contracts/', 200, None, True),
            ('GET', '/contracts/unified-contracts/', 200, None, True),
            ('GET', '/contracts/templates/', 200, None, True),
            ('GET', '/contracts/landlord/my-contracts/', 200, None, True),
            ('GET', '/contracts/matched-candidates/', 200, None, True),
            ('GET', '/contracts/tenant/my-contracts/', 200, None, True),
            ('GET', '/contracts/tenant-processes/', 200, None, True),
            ('GET', '/contracts/stats/', 200, None, True),
            ('GET', '/contracts/reports/expiring/', 200, None, True),
            ('GET', '/contracts/reports/pending-signatures/', 200, None, True),
            ('GET', '/contracts/signatures/', 200, None, True),
            ('GET', '/contracts/documents/', 200, None, True),
        ]

        for method, endpoint, expected, data, auth in tests:
            success, message, response = self.test_endpoint(method, endpoint, expected, data, auth)
            self._record_result(success, f"{method} {endpoint}", message, response)

    def test_matching(self):
        """Test Matching endpoints"""
        tests = [
            ('GET', '/matching/requests/', 200, None, True),
            ('GET', '/matching/criteria/', 200, None, True),
            ('GET', '/matching/notifications/', 200, None, True),
            ('GET', '/matching/dashboard/', 200, None, True),
            ('GET', '/matching/statistics/', 200, None, True),
            ('GET', '/matching/analytics/', 200, None, True),
            ('GET', '/matching/potential-matches/', 200, None, True),
            ('GET', '/matching/landlord-recommendations/', 200, None, True),
        ]

        for method, endpoint, expected, data, auth in tests:
            success, message, response = self.test_endpoint(method, endpoint, expected, data, auth)
            self._record_result(success, f"{method} {endpoint}", message, response)

    def test_messaging(self):
        """Test Messaging endpoints"""
        tests = [
            ('GET', '/messages/threads/', 200, None, True),
            ('GET', '/messages/messages/', 200, None, True),
            ('GET', '/messages/folders/', 200, None, True),
            ('GET', '/messages/stats/', 200, None, True),
            ('GET', '/messages/unread-count/', 200, None, True),
            ('GET', '/messages/templates/', 200, None, True),
            ('GET', '/messages/conversations/', 200, None, True),
        ]

        for method, endpoint, expected, data, auth in tests:
            success, message, response = self.test_endpoint(method, endpoint, expected, data, auth)
            self._record_result(success, f"{method} {endpoint}", message, response)

    def test_payments(self):
        """Test Payments endpoints"""
        tests = [
            ('GET', '/payments/transactions/', 200, None, True),
            ('GET', '/payments/payments/', 200, None, True),
            ('GET', '/payments/payment-methods/', 200, None, True),
            ('GET', '/payments/invoices/', 200, None, True),
            ('GET', '/payments/escrow-accounts/', 200, None, True),
            ('GET', '/payments/payment-plans/', 200, None, True),
            ('GET', '/payments/rent-schedules/', 200, None, True),
            ('GET', '/payments/stats/', 200, None, True),
            ('GET', '/payments/stats/balance/', 200, None, True),
            ('GET', '/payments/stats/dashboard/', 200, None, True),
            ('GET', '/payments/pse/banks/', 200, None, False),
        ]

        for method, endpoint, expected, data, auth in tests:
            success, message, response = self.test_endpoint(method, endpoint, expected, data, auth)
            self._record_result(success, f"{method} {endpoint}", message, response)

    def test_services(self):
        """Test Services endpoints"""
        tests = [
            ('GET', '/services/categories/', 200, None, False),
            ('GET', '/services/services/', 200, None, False),
            ('GET', '/services/requests/', 200, None, True),
            ('GET', '/services/popular/', 200, None, False),
            ('GET', '/services/featured/', 200, None, False),
            ('GET', '/services/most-requested/', 200, None, False),
            ('GET', '/services/search/', 200, None, False),
        ]

        for method, endpoint, expected, data, auth in tests:
            success, message, response = self.test_endpoint(method, endpoint, expected, data, auth)
            self._record_result(success, f"{method} {endpoint}", message, response)

    def test_ratings(self):
        """Test Ratings endpoints"""
        tests = [
            ('GET', '/ratings/ratings/', 200, None, False),
            ('GET', '/ratings/ratings/categories/', 200, None, False),
            ('GET', '/ratings/advanced/', 200, None, True),
            ('GET', '/ratings/analytics/', 200, None, True),
            ('GET', '/ratings/stats/', 200, None, False),
            ('GET', '/ratings/moderation/', 200, None, True),
            ('GET', '/ratings/invitations/', 200, None, True),
        ]

        for method, endpoint, expected, data, auth in tests:
            success, message, response = self.test_endpoint(method, endpoint, expected, data, auth)
            self._record_result(success, f"{method} {endpoint}", message, response)

    def test_dashboard(self):
        """Test Dashboard endpoints"""
        tests = [
            ('GET', '/dashboard/stats/', 200, None, True),
            ('GET', '/dashboard/charts/', 200, None, True),
            ('GET', '/dashboard/v2/widgets/', 200, None, True),
            ('GET', '/dashboard/v2/layouts/', 200, None, True),
            ('GET', '/dashboard/v2/data/', 200, None, True),
            ('GET', '/dashboard/v2/analytics/', 200, None, True),
            ('GET', '/dashboard/v2/performance/', 200, None, True),
        ]

        for method, endpoint, expected, data, auth in tests:
            success, message, response = self.test_endpoint(method, endpoint, expected, data, auth)
            self._record_result(success, f"{method} {endpoint}", message, response)

    def test_requests(self):
        """Test Requests endpoints"""
        tests = [
            ('GET', '/requests/api/base/', 200, None, True),
            ('GET', '/requests/api/property-interest/', 200, None, True),
            ('GET', '/requests/api/services/', 200, None, True),
            ('GET', '/requests/api/contracts/', 200, None, True),
            ('GET', '/requests/api/maintenance/', 200, None, True),
            ('GET', '/requests/api/notifications/', 200, None, True),
        ]

        for method, endpoint, expected, data, auth in tests:
            success, message, response = self.test_endpoint(method, endpoint, expected, data, auth)
            self._record_result(success, f"{method} {endpoint}", message, response)

    def _record_result(self, success: bool, endpoint: str, message: str, response: dict):
        """Registrar resultado de test"""
        result = {
            'endpoint': endpoint,
            'message': message,
            'timestamp': datetime.now().isoformat(),
            'response_sample': str(response)[:200] if response else None
        }

        if success:
            self.results['success'].append(result)
            self.log(f"  {endpoint}: {message}", "SUCCESS")
        else:
            if 'Timeout' in message or 'Connection' in message:
                self.results['warnings'].append(result)
                self.log(f"  {endpoint}: {message}", "WARNING")
            else:
                self.results['failed'].append(result)
                self.log(f"  {endpoint}: {message}", "ERROR")

    def generate_report(self):
        """Generar reporte final en markdown"""
        self.log("\n" + "=" * 80, "INFO")
        self.log("GENERANDO REPORTE FINAL", "INFO")
        self.log("=" * 80, "INFO")

        total = len(self.results['success']) + len(self.results['failed']) + len(self.results['warnings'])
        success_rate = (len(self.results['success']) / total * 100) if total > 0 else 0

        self.log(f"\nTotal de endpoints testeados: {total}", "INFO")
        self.log(f"✅ Exitosos: {len(self.results['success'])}", "SUCCESS")
        self.log(f"❌ Fallidos: {len(self.results['failed'])}", "ERROR")
        self.log(f"⚠️ Warnings: {len(self.results['warnings'])}", "WARNING")
        self.log(f"Tasa de éxito: {success_rate:.1f}%", "INFO")

        report_path = os.path.join(os.path.dirname(__file__), "REPORTE_TESTING_APIS.md")

        with open(report_path, 'w', encoding='utf-8') as f:
            f.write("# REPORTE DE TESTING DE APIs - VERIHOME\n\n")
            f.write(f"**Fecha:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write("**Agente:** AGENTE 1 - BACKEND API TESTING\n\n")

            f.write("## RESUMEN EJECUTIVO\n\n")
            f.write(f"- **Total de endpoints testeados:** {total}\n")
            f.write(f"- **✅ Exitosos:** {len(self.results['success'])}\n")
            f.write(f"- **❌ Fallidos:** {len(self.results['failed'])}\n")
            f.write(f"- **⚠️ Warnings:** {len(self.results['warnings'])}\n")
            f.write(f"- **Tasa de éxito:** {success_rate:.1f}%\n\n")

            f.write("## TABLA RESUMEN POR MÓDULO\n\n")
            f.write("| Módulo | Total | Exitosos | Fallidos | Warnings | Estado |\n")
            f.write("|--------|-------|----------|----------|----------|--------|\n")

            modules = self._group_by_module()
            for module, stats in sorted(modules.items()):
                status = "✅" if stats['failed'] == 0 else "❌" if stats['success'] == 0 else "⚠️"
                f.write(f"| {module} | {stats['total']} | {stats['success']} | {stats['failed']} | {stats['warnings']} | {status} |\n")

            f.write("\n## ✅ APIS FUNCIONANDO CORRECTAMENTE\n\n")
            if self.results['success']:
                for result in self.results['success']:
                    f.write(f"- **{result['endpoint']}**: {result['message']}\n")
            else:
                f.write("*No hay APIs funcionando correctamente.*\n")

            f.write("\n## ❌ APIS CON ERRORES\n\n")
            if self.results['failed']:
                for result in self.results['failed']:
                    f.write(f"### {result['endpoint']}\n")
                    f.write(f"- **Error:** {result['message']}\n")
                    f.write(f"- **Timestamp:** {result['timestamp']}\n")
                    if result['response_sample']:
                        f.write(f"- **Respuesta:** `{result['response_sample']}`\n")
                    f.write("\n")
            else:
                f.write("*No hay errores críticos.*\n")

            f.write("\n## ⚠️ APIS CON WARNINGS\n\n")
            if self.results['warnings']:
                for result in self.results['warnings']:
                    f.write(f"### {result['endpoint']}\n")
                    f.write(f"- **Warning:** {result['message']}\n")
                    f.write(f"- **Timestamp:** {result['timestamp']}\n")
                    f.write("\n")
            else:
                f.write("*No hay warnings.*\n")

            f.write("\n## RECOMENDACIONES\n\n")

            if self.results['failed']:
                f.write("### Errores Críticos\n\n")
                connection_errors = [r for r in self.results['failed'] if 'conexión' in r['message'].lower() or 'Connection' in r['message']]
                auth_errors = [r for r in self.results['failed'] if '401' in r['message'] or '403' in r['message']]
                not_found = [r for r in self.results['failed'] if '404' in r['message']]
                server_errors = [r for r in self.results['failed'] if '500' in r['message']]

                if connection_errors:
                    f.write(f"- **{len(connection_errors)} endpoints con error de conexión:** Verificar que el servidor esté corriendo.\n")
                if auth_errors:
                    f.write(f"- **{len(auth_errors)} endpoints con error de autenticación:** Revisar permisos y configuración JWT.\n")
                if not_found:
                    f.write(f"- **{len(not_found)} endpoints no encontrados:** Verificar URLs y enrutamiento.\n")
                if server_errors:
                    f.write(f"- **{len(server_errors)} errores del servidor:** Revisar logs de Django para detalles.\n")

            if success_rate > 90:
                f.write("\n### Estado General\n\n")
                f.write("✅ **El sistema está funcionando correctamente.** La mayoría de APIs responden como se espera.\n")
            elif success_rate > 70:
                f.write("\n### Estado General\n\n")
                f.write("⚠️ **El sistema tiene algunos problemas.** Se recomienda revisar los errores reportados.\n")
            else:
                f.write("\n### Estado General\n\n")
                f.write("❌ **El sistema tiene problemas serios.** Se requiere atención inmediata.\n")

            f.write("\n---\n\n")
            f.write("**Nota:** Este reporte fue generado automáticamente por el Agente 1 de testing.\n")

        self.log(f"\n✅ Reporte guardado en: {report_path}", "SUCCESS")

    def _group_by_module(self) -> Dict[str, Dict[str, int]]:
        """Agrupar resultados por módulo"""
        modules = defaultdict(lambda: {'total': 0, 'success': 0, 'failed': 0, 'warnings': 0})

        for result in self.results['success']:
            module = self._extract_module(result['endpoint'])
            modules[module]['total'] += 1
            modules[module]['success'] += 1

        for result in self.results['failed']:
            module = self._extract_module(result['endpoint'])
            modules[module]['total'] += 1
            modules[module]['failed'] += 1

        for result in self.results['warnings']:
            module = self._extract_module(result['endpoint'])
            modules[module]['total'] += 1
            modules[module]['warnings'] += 1

        return dict(modules)

    def _extract_module(self, endpoint: str) -> str:
        """Extraer nombre del módulo del endpoint"""
        parts = endpoint.split()
        if len(parts) >= 2:
            path = parts[1].strip('/')
            if path.startswith('/'):
                path = path[1:]
            module = path.split('/')[0] if '/' in path else path
            return module.upper()
        return "UNKNOWN"

if __name__ == '__main__':
    tester = APITester()
    tester.run_tests()
