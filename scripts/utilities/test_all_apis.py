#!/usr/bin/env python3
"""
Script de testing completo para todos los endpoints de la API de VeriHome.
AGENTE 1 - BACKEND API TESTING
"""

import os
import sys
from datetime import datetime
from typing import Dict, Tuple
from collections import defaultdict

# Configurar Django ANTES de importar requests
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "verihome.settings")
project_root = os.path.dirname(os.path.abspath(__file__))

# Remover el directorio 'requests' del path si existe para evitar conflictos
requests_dir = os.path.join(project_root, "requests")
if requests_dir in sys.path:
    sys.path.remove(requests_dir)

# Insertar el root del proyecto
sys.path.insert(0, project_root)

import django

django.setup()

# AHORA importar requests HTTP library
try:
    import requests as http_requests
except ImportError:
    print(
        "ERROR: requests library no está instalada. Instalar con: pip install requests"
    )
    sys.exit(1)

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

# Configuración
BASE_URL = "http://localhost:8000/api/v1"
ADMIN_EMAIL = "admin@verihome.com"
ADMIN_PASSWORD = "admin123"


# Colores para terminal
class Colors:
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    RESET = "\033[0m"


class APITester:
    def __init__(self):
        self.results = {"success": [], "failed": [], "warnings": []}
        self.auth_token = None
        self.test_user_id = None
        self.test_property_id = None
        self.test_contract_id = None

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
            # Buscar o crear admin
            admin = User.objects.filter(email=ADMIN_EMAIL).first()
            if not admin:
                self.log("Creando usuario admin...", "INFO")
                admin = User.objects.create_superuser(
                    email=ADMIN_EMAIL,
                    password=ADMIN_PASSWORD,
                    first_name="Admin",
                    last_name="VeriHome",
                )

            # Generar token
            refresh = RefreshToken.for_user(admin)
            self.auth_token = str(refresh.access_token)
            self.test_user_id = str(admin.id)
            self.log(f"Token obtenido para admin: {admin.email}", "SUCCESS")
            return True
        except Exception as e:
            self.log(f"Error obteniendo token admin: {str(e)}", "ERROR")
            return False

    def test_endpoint(
        self,
        method: str,
        endpoint: str,
        expected_status: int = 200,
        data: dict = None,
        requires_auth: bool = True,
        files: dict = None,
    ) -> Tuple[bool, str, dict]:
        """Test individual de un endpoint"""
        url = f"{BASE_URL}{endpoint}"
        headers = {}

        if requires_auth and self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"

        try:
            if method == "GET":
                response = http_requests.get(url, headers=headers, timeout=10)
            elif method == "POST":
                if files:
                    response = http_requests.post(
                        url, headers=headers, data=data, files=files, timeout=10
                    )
                else:
                    headers["Content-Type"] = "application/json"
                    response = http_requests.post(
                        url, headers=headers, json=data, timeout=10
                    )
            elif method == "PUT":
                headers["Content-Type"] = "application/json"
                response = http_requests.put(
                    url, headers=headers, json=data, timeout=10
                )
            elif method == "PATCH":
                headers["Content-Type"] = "application/json"
                response = http_requests.patch(
                    url, headers=headers, json=data, timeout=10
                )
            elif method == "DELETE":
                response = http_requests.delete(url, headers=headers, timeout=10)
            else:
                return False, f"Método HTTP no soportado: {method}", {}

            # Verificar status code
            status_ok = response.status_code == expected_status

            # Intentar parsear JSON
            try:
                response_data = response.json()
            except Exception:
                response_data = {"raw": response.text[:200]}

            # Mensaje de resultado
            if status_ok:
                message = f"✅ {response.status_code}"
            else:
                message = f"❌ {response.status_code} (esperado {expected_status})"

            return status_ok, message, response_data

        except http_requests.exceptions.ConnectionError:
            return False, "❌ Error de conexión - ¿Servidor corriendo?", {}
        except http_requests.exceptions.Timeout:
            return False, "⚠️ Timeout - Respuesta lenta", {}
        except Exception as e:
            return False, f"❌ Error: {str(e)[:100]}", {}

    def run_tests(self):
        """Ejecutar todos los tests"""
        self.log("=" * 80, "INFO")
        self.log("INICIANDO TESTING COMPLETO DE APIs DE VERIHOME", "INFO")
        self.log("=" * 80, "INFO")

        # 0. Obtener token de autenticación
        if not self.get_or_create_admin_token():
            self.log("No se pudo obtener token de autenticación. Abortando.", "ERROR")
            return

        # 1. USERS & AUTH APIs
        self.log("\n1. TESTING USERS & AUTH APIs", "INFO")
        self.test_users_auth()

        # 2. PROPERTIES APIs
        self.log("\n2. TESTING PROPERTIES APIs", "INFO")
        self.test_properties()

        # 3. CONTRACTS APIs
        self.log("\n3. TESTING CONTRACTS APIs", "INFO")
        self.test_contracts()

        # 4. MATCHING APIs
        self.log("\n4. TESTING MATCHING APIs", "INFO")
        self.test_matching()

        # 5. MESSAGING APIs
        self.log("\n5. TESTING MESSAGING APIs", "INFO")
        self.test_messaging()

        # 6. PAYMENTS APIs
        self.log("\n6. TESTING PAYMENTS APIs", "INFO")
        self.test_payments()

        # 7. SERVICES APIs
        self.log("\n7. TESTING SERVICES APIs", "INFO")
        self.test_services()

        # 8. RATINGS APIs
        self.log("\n8. TESTING RATINGS APIs", "INFO")
        self.test_ratings()

        # 9. DASHBOARD APIs
        self.log("\n9. TESTING DASHBOARD APIs", "INFO")
        self.test_dashboard()

        # 10. REQUESTS APIs
        self.log("\n10. TESTING REQUESTS APIs", "INFO")
        self.test_requests()

        # Generar reporte
        self.generate_report()

    def test_users_auth(self):
        """Test Users & Auth endpoints"""
        tests = [
            # Auth endpoints
            (
                "POST",
                "/users/auth/login/",
                200,
                {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
                False,
            ),
            ("GET", "/users/auth/me/", 200, None, True),
            ("GET", "/users/profile/", 200, None, True),
            ("GET", "/users/dashboard/", 200, None, True),
            # User CRUD
            ("GET", "/users/users/", 200, None, True),
            # Notifications
            ("GET", "/users/notifications/", 200, None, True),
            # Activity logs
            ("GET", "/users/activity-logs/", 200, None, True),
        ]

        for method, endpoint, expected, data, auth in tests:
            success, message, response = self.test_endpoint(
                method, endpoint, expected, data, auth
            )
            self._record_result(success, f"{method} {endpoint}", message, response)

    def test_properties(self):
        """Test Properties endpoints"""
        tests = [
            # Property CRUD
            ("GET", "/properties/", 200, None, False),
            ("GET", "/properties/search/", 200, None, False),
            ("GET", "/properties/filters/", 200, None, False),
            ("GET", "/properties/featured/", 200, None, False),
            ("GET", "/properties/trending/", 200, None, False),
            ("GET", "/properties/stats/", 200, None, True),
            # Amenities
            ("GET", "/properties/amenities/", 200, None, False),
            # Inquiries
            ("GET", "/properties/inquiries/", 200, None, True),
            # Favorites
            ("GET", "/properties/favorites/", 200, None, True),
        ]

        for method, endpoint, expected, data, auth in tests:
            success, message, response = self.test_endpoint(
                method, endpoint, expected, data, auth
            )
            self._record_result(success, f"{method} {endpoint}", message, response)

    def test_contracts(self):
        """Test Contracts endpoints"""
        tests = [
            # Contract CRUD
            ("GET", "/contracts/contracts/", 200, None, True),
            ("GET", "/contracts/templates/", 200, None, True),
            # Landlord contracts
            ("GET", "/contracts/landlord/my-contracts/", 200, None, True),
            ("GET", "/contracts/matched-candidates/", 200, None, True),
            # Tenant contracts
            ("GET", "/contracts/tenant/my-contracts/", 200, None, True),
            ("GET", "/contracts/tenant-processes/", 200, None, True),
            # Stats
            ("GET", "/contracts/stats/", 200, None, True),
            # Reports
            ("GET", "/contracts/reports/expiring/", 200, None, True),
            ("GET", "/contracts/reports/pending-signatures/", 200, None, True),
        ]

        for method, endpoint, expected, data, auth in tests:
            success, message, response = self.test_endpoint(
                method, endpoint, expected, data, auth
            )
            self._record_result(success, f"{method} {endpoint}", message, response)

    def test_matching(self):
        """Test Matching endpoints"""
        tests = [
            # Match requests
            ("GET", "/matching/requests/", 200, None, True),
            ("GET", "/matching/criteria/", 200, None, True),
            ("GET", "/matching/notifications/", 200, None, True),
            # Advanced matching
            ("GET", "/matching/dashboard/", 200, None, True),
            ("GET", "/matching/statistics/", 200, None, True),
            ("GET", "/matching/analytics/", 200, None, True),
            # Recommendations
            ("GET", "/matching/potential-matches/", 200, None, True),
            ("GET", "/matching/landlord-recommendations/", 200, None, True),
        ]

        for method, endpoint, expected, data, auth in tests:
            success, message, response = self.test_endpoint(
                method, endpoint, expected, data, auth
            )
            self._record_result(success, f"{method} {endpoint}", message, response)

    def test_messaging(self):
        """Test Messaging endpoints"""
        tests = [
            # Threads & messages
            ("GET", "/messages/threads/", 200, None, True),
            ("GET", "/messages/messages/", 200, None, True),
            ("GET", "/messages/folders/", 200, None, True),
            # Stats
            ("GET", "/messages/stats/", 200, None, True),
            ("GET", "/messages/unread-count/", 200, None, True),
            # Templates
            ("GET", "/messages/templates/", 200, None, True),
            # Conversations
            ("GET", "/messages/conversations/", 200, None, True),
        ]

        for method, endpoint, expected, data, auth in tests:
            success, message, response = self.test_endpoint(
                method, endpoint, expected, data, auth
            )
            self._record_result(success, f"{method} {endpoint}", message, response)

    def test_payments(self):
        """Test Payments endpoints"""
        tests = [
            # Transactions & payments
            ("GET", "/payments/transactions/", 200, None, True),
            ("GET", "/payments/payments/", 200, None, True),
            ("GET", "/payments/payment-methods/", 200, None, True),
            ("GET", "/payments/invoices/", 200, None, True),
            # Escrow
            ("GET", "/payments/escrow-accounts/", 200, None, True),
            # Payment plans
            ("GET", "/payments/payment-plans/", 200, None, True),
            ("GET", "/payments/rent-schedules/", 200, None, True),
            # Stats
            ("GET", "/payments/stats/", 200, None, True),
            ("GET", "/payments/stats/balance/", 200, None, True),
            ("GET", "/payments/stats/dashboard/", 200, None, True),
            # PSE banks
            ("GET", "/payments/pse/banks/", 200, None, False),
        ]

        for method, endpoint, expected, data, auth in tests:
            success, message, response = self.test_endpoint(
                method, endpoint, expected, data, auth
            )
            self._record_result(success, f"{method} {endpoint}", message, response)

    def test_services(self):
        """Test Services endpoints"""
        tests = [
            # Services & categories
            ("GET", "/services/categories/", 200, None, False),
            ("GET", "/services/services/", 200, None, False),
            ("GET", "/services/requests/", 200, None, True),
            # Featured services
            ("GET", "/services/popular/", 200, None, False),
            ("GET", "/services/featured/", 200, None, False),
            ("GET", "/services/most-requested/", 200, None, False),
            # Search
            ("GET", "/services/search/", 200, None, False),
        ]

        for method, endpoint, expected, data, auth in tests:
            success, message, response = self.test_endpoint(
                method, endpoint, expected, data, auth
            )
            self._record_result(success, f"{method} {endpoint}", message, response)

    def test_ratings(self):
        """Test Ratings endpoints"""
        tests = [
            # Ratings CRUD
            ("GET", "/ratings/ratings/", 200, None, False),
            ("GET", "/ratings/ratings/categories/", 200, None, False),
            # Advanced ratings
            ("GET", "/ratings/advanced/", 200, None, True),
            ("GET", "/ratings/analytics/", 200, None, True),
            ("GET", "/ratings/stats/", 200, None, False),
            # Moderation
            ("GET", "/ratings/moderation/", 200, None, True),
            # Invitations
            ("GET", "/ratings/invitations/", 200, None, True),
        ]

        for method, endpoint, expected, data, auth in tests:
            success, message, response = self.test_endpoint(
                method, endpoint, expected, data, auth
            )
            self._record_result(success, f"{method} {endpoint}", message, response)

    def test_dashboard(self):
        """Test Dashboard endpoints"""
        tests = [
            # Basic dashboard
            ("GET", "/dashboard/stats/", 200, None, True),
            ("GET", "/dashboard/charts/", 200, None, True),
            # Advanced widgets (v2)
            ("GET", "/dashboard/v2/widgets/", 200, None, True),
            ("GET", "/dashboard/v2/layouts/", 200, None, True),
            ("GET", "/dashboard/v2/data/", 200, None, True),
            ("GET", "/dashboard/v2/analytics/", 200, None, True),
            ("GET", "/dashboard/v2/performance/", 200, None, True),
        ]

        for method, endpoint, expected, data, auth in tests:
            success, message, response = self.test_endpoint(
                method, endpoint, expected, data, auth
            )
            self._record_result(success, f"{method} {endpoint}", message, response)

    def test_requests(self):
        """Test Requests endpoints"""
        tests = [
            # Request types
            ("GET", "/requests/api/base/", 200, None, True),
            ("GET", "/requests/api/property-interest/", 200, None, True),
            ("GET", "/requests/api/services/", 200, None, True),
            ("GET", "/requests/api/contracts/", 200, None, True),
            ("GET", "/requests/api/maintenance/", 200, None, True),
            ("GET", "/requests/api/notifications/", 200, None, True),
        ]

        for method, endpoint, expected, data, auth in tests:
            success, message, response = self.test_endpoint(
                method, endpoint, expected, data, auth
            )
            self._record_result(success, f"{method} {endpoint}", message, response)

    def _record_result(
        self, success: bool, endpoint: str, message: str, response: dict
    ):
        """Registrar resultado de test"""
        result = {
            "endpoint": endpoint,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "response_sample": str(response)[:200] if response else None,
        }

        if success:
            self.results["success"].append(result)
            self.log(f"  {endpoint}: {message}", "SUCCESS")
        else:
            # Determinar si es warning o error
            if "Timeout" in message or "lenta" in message.lower():
                self.results["warnings"].append(result)
                self.log(f"  {endpoint}: {message}", "WARNING")
            else:
                self.results["failed"].append(result)
                self.log(f"  {endpoint}: {message}", "ERROR")

    def generate_report(self):
        """Generar reporte final en markdown"""
        self.log("\n" + "=" * 80, "INFO")
        self.log("GENERANDO REPORTE FINAL", "INFO")
        self.log("=" * 80, "INFO")

        total = (
            len(self.results["success"])
            + len(self.results["failed"])
            + len(self.results["warnings"])
        )
        success_rate = (len(self.results["success"]) / total * 100) if total > 0 else 0

        # Resumen en consola
        self.log(f"\nTotal de endpoints testeados: {total}", "INFO")
        self.log(f"✅ Exitosos: {len(self.results['success'])}", "SUCCESS")
        self.log(f"❌ Fallidos: {len(self.results['failed'])}", "ERROR")
        self.log(f"⚠️ Warnings: {len(self.results['warnings'])}", "WARNING")
        self.log(f"Tasa de éxito: {success_rate:.1f}%", "INFO")

        # Generar reporte markdown
        report_path = os.path.join(os.path.dirname(__file__), "REPORTE_TESTING_APIS.md")

        with open(report_path, "w", encoding="utf-8") as f:
            f.write("# REPORTE DE TESTING DE APIs - VERIHOME\n\n")
            f.write(f"**Fecha:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write("**Agente:** AGENTE 1 - BACKEND API TESTING\n\n")

            f.write("## RESUMEN EJECUTIVO\n\n")
            f.write(f"- **Total de endpoints testeados:** {total}\n")
            f.write(f"- **✅ Exitosos:** {len(self.results['success'])}\n")
            f.write(f"- **❌ Fallidos:** {len(self.results['failed'])}\n")
            f.write(f"- **⚠️ Warnings:** {len(self.results['warnings'])}\n")
            f.write(f"- **Tasa de éxito:** {success_rate:.1f}%\n\n")

            # Tabla resumen por módulo
            f.write("## TABLA RESUMEN POR MÓDULO\n\n")
            f.write("| Módulo | Total | Exitosos | Fallidos | Warnings | Estado |\n")
            f.write("|--------|-------|----------|----------|----------|--------|\n")

            modules = self._group_by_module()
            for module, stats in sorted(modules.items()):
                status = (
                    "✅"
                    if stats["failed"] == 0
                    else "❌"
                    if stats["success"] == 0
                    else "⚠️"
                )
                f.write(
                    f"| {module} | {stats['total']} | {stats['success']} | {stats['failed']} | {stats['warnings']} | {status} |\n"
                )

            # Detalles de APIs exitosas
            f.write("\n## ✅ APIS FUNCIONANDO CORRECTAMENTE\n\n")
            if self.results["success"]:
                for result in self.results["success"]:
                    f.write(f"- **{result['endpoint']}**: {result['message']}\n")
            else:
                f.write("*No hay APIs funcionando correctamente.*\n")

            # Detalles de APIs con errores
            f.write("\n## ❌ APIS CON ERRORES\n\n")
            if self.results["failed"]:
                for result in self.results["failed"]:
                    f.write(f"### {result['endpoint']}\n")
                    f.write(f"- **Error:** {result['message']}\n")
                    f.write(f"- **Timestamp:** {result['timestamp']}\n")
                    if result["response_sample"]:
                        f.write(f"- **Respuesta:** `{result['response_sample']}`\n")
                    f.write("\n")
            else:
                f.write("*No hay errores críticos.*\n")

            # Detalles de warnings
            f.write("\n## ⚠️ APIS CON WARNINGS\n\n")
            if self.results["warnings"]:
                for result in self.results["warnings"]:
                    f.write(f"### {result['endpoint']}\n")
                    f.write(f"- **Warning:** {result['message']}\n")
                    f.write(f"- **Timestamp:** {result['timestamp']}\n")
                    f.write("\n")
            else:
                f.write("*No hay warnings.*\n")

            # Recomendaciones
            f.write("\n## RECOMENDACIONES\n\n")

            if self.results["failed"]:
                f.write("### Errores Críticos\n\n")
                # Agrupar errores por tipo
                connection_errors = [
                    r
                    for r in self.results["failed"]
                    if "conexión" in r["message"].lower()
                ]
                auth_errors = [
                    r
                    for r in self.results["failed"]
                    if "401" in r["message"] or "403" in r["message"]
                ]
                not_found = [r for r in self.results["failed"] if "404" in r["message"]]
                server_errors = [
                    r for r in self.results["failed"] if "500" in r["message"]
                ]

                if connection_errors:
                    f.write(
                        f"- **{len(connection_errors)} endpoints con error de conexión:** Verificar que el servidor esté corriendo.\n"
                    )
                if auth_errors:
                    f.write(
                        f"- **{len(auth_errors)} endpoints con error de autenticación:** Revisar permisos y configuración JWT.\n"
                    )
                if not_found:
                    f.write(
                        f"- **{len(not_found)} endpoints no encontrados:** Verificar URLs y enrutamiento.\n"
                    )
                if server_errors:
                    f.write(
                        f"- **{len(server_errors)} errores del servidor:** Revisar logs de Django para detalles.\n"
                    )

            if self.results["warnings"]:
                f.write("\n### Performance\n\n")
                f.write(
                    f"- **{len(self.results['warnings'])} endpoints con timeouts o respuestas lentas.**\n"
                )
                f.write("- Considerar optimizar consultas de base de datos.\n")
                f.write("- Implementar caching donde sea posible.\n")

            if success_rate > 90:
                f.write("\n### Estado General\n\n")
                f.write(
                    "✅ **El sistema está funcionando correctamente.** La mayoría de APIs responden como se espera.\n"
                )
            elif success_rate > 70:
                f.write("\n### Estado General\n\n")
                f.write(
                    "⚠️ **El sistema tiene algunos problemas.** Se recomienda revisar los errores reportados.\n"
                )
            else:
                f.write("\n### Estado General\n\n")
                f.write(
                    "❌ **El sistema tiene problemas serios.** Se requiere atención inmediata.\n"
                )

            f.write("\n---\n")
            f.write(
                "\n**Nota:** Este reporte fue generado automáticamente por el Agente 1 de testing.\n"
            )

        self.log(f"\n✅ Reporte guardado en: {report_path}", "SUCCESS")

    def _group_by_module(self) -> Dict[str, Dict[str, int]]:
        """Agrupar resultados por módulo"""
        modules = defaultdict(
            lambda: {"total": 0, "success": 0, "failed": 0, "warnings": 0}
        )

        for result in self.results["success"]:
            module = self._extract_module(result["endpoint"])
            modules[module]["total"] += 1
            modules[module]["success"] += 1

        for result in self.results["failed"]:
            module = self._extract_module(result["endpoint"])
            modules[module]["total"] += 1
            modules[module]["failed"] += 1

        for result in self.results["warnings"]:
            module = self._extract_module(result["endpoint"])
            modules[module]["total"] += 1
            modules[module]["warnings"] += 1

        return dict(modules)

    def _extract_module(self, endpoint: str) -> str:
        """Extraer nombre del módulo del endpoint"""
        parts = endpoint.split()
        if len(parts) >= 2:
            path = parts[1].strip("/")
            if path.startswith("/"):
                path = path[1:]
            module = path.split("/")[0] if "/" in path else path
            return module.upper()
        return "UNKNOWN"


if __name__ == "__main__":
    tester = APITester()
    tester.run_tests()
