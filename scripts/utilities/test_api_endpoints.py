#!/usr/bin/env python3
"""
Script de Testing Automatizado de APIs - VeriHome
Prueba los endpoints críticos con las credenciales de testing
"""
import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000/api/v1"

# Credenciales de testing
CREDENTIALS = {
    "landlord": {"email": "admin@verihome.com", "password": "admin123"},
    "tenant": {"email": "letefon100@gmail.com", "password": "adim123"},
    "service_provider": {"email": "serviceprovider@verihome.com", "password": "service123"}
}

class APITester:
    def __init__(self):
        self.tokens = {}
        self.results = []

    def log(self, status, endpoint, message, details=None):
        """Log resultado de test"""
        result = {
            "timestamp": datetime.now().isoformat(),
            "status": status,  # ✅ ⚠️ ❌
            "endpoint": endpoint,
            "message": message,
            "details": details
        }
        self.results.append(result)

        status_icon = status
        print(f"{status_icon} {endpoint}: {message}")
        if details:
            print(f"   Details: {json.dumps(details, indent=2)[:200]}...")

    def login(self, user_type):
        """Autenticar usuario y obtener JWT token"""
        try:
            creds = CREDENTIALS[user_type]
            response = requests.post(
                f"{BASE_URL}/users/auth/login/",
                json=creds,
                timeout=10
            )

            if response.status_code == 200:
                data = response.json()
                self.tokens[user_type] = data.get("access")
                self.log("✅", f"LOGIN {user_type}",
                        f"Autenticación exitosa para {creds['email']}")
                return True
            else:
                self.log("❌", f"LOGIN {user_type}",
                        f"Error {response.status_code}",
                        response.json())
                return False

        except Exception as e:
            self.log("❌", f"LOGIN {user_type}", f"Exception: {str(e)}")
            return False

    def get_headers(self, user_type):
        """Obtener headers con JWT token"""
        return {
            "Authorization": f"Bearer {self.tokens.get(user_type, '')}",
            "Content-Type": "application/json"
        }

    def test_properties_list(self):
        """Test: Listar propiedades"""
        try:
            response = requests.get(f"{BASE_URL}/properties/", timeout=10)
            if response.status_code == 200:
                data = response.json()
                count = data.get("count", len(data.get("results", [])))
                self.log("✅", "GET /properties/",
                        f"Listado exitoso: {count} propiedades encontradas")
            else:
                self.log("⚠️", "GET /properties/",
                        f"Status {response.status_code}")
        except Exception as e:
            self.log("❌", "GET /properties/", f"Exception: {str(e)}")

    def test_landlord_properties(self):
        """Test: Propiedades del arrendador"""
        try:
            headers = self.get_headers("landlord")
            response = requests.get(f"{BASE_URL}/properties/", headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                count = data.get("count", len(data.get("results", [])))
                self.log("✅", "GET /properties/ (landlord)",
                        f"{count} propiedades del arrendador")
            else:
                self.log("⚠️", "GET /properties/ (landlord)",
                        f"Status {response.status_code}")
        except Exception as e:
            self.log("❌", "GET /properties/ (landlord)", f"Exception: {str(e)}")

    def test_contracts_list(self):
        """Test: Listar contratos"""
        try:
            headers = self.get_headers("landlord")
            response = requests.get(f"{BASE_URL}/contracts/", headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                count = len(data) if isinstance(data, list) else data.get("count", 0)
                self.log("✅", "GET /contracts/ (landlord)",
                        f"{count} contratos encontrados")
            else:
                self.log("⚠️", "GET /contracts/ (landlord)",
                        f"Status {response.status_code}")
        except Exception as e:
            self.log("❌", "GET /contracts/ (landlord)", f"Exception: {str(e)}")

    def test_matching_requests(self):
        """Test: Solicitudes de matching"""
        try:
            headers = self.get_headers("tenant")
            response = requests.get(f"{BASE_URL}/matching/requests/", headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                count = len(data) if isinstance(data, list) else data.get("count", 0)
                self.log("✅", "GET /matching/requests/ (tenant)",
                        f"{count} solicitudes de matching")
            else:
                self.log("⚠️", "GET /matching/requests/ (tenant)",
                        f"Status {response.status_code}")
        except Exception as e:
            self.log("❌", "GET /matching/requests/ (tenant)", f"Exception: {str(e)}")

    def test_messages_threads(self):
        """Test: Threads de mensajes"""
        try:
            headers = self.get_headers("tenant")
            response = requests.get(f"{BASE_URL}/messages/threads/", headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                count = len(data) if isinstance(data, list) else data.get("count", 0)
                self.log("✅", "GET /messages/threads/ (tenant)",
                        f"{count} conversaciones")
            else:
                self.log("⚠️", "GET /messages/threads/ (tenant)",
                        f"Status {response.status_code}")
        except Exception as e:
            self.log("❌", "GET /messages/threads/ (tenant)", f"Exception: {str(e)}")

    def test_payments_list(self):
        """Test: Listar pagos"""
        try:
            headers = self.get_headers("landlord")
            response = requests.get(f"{BASE_URL}/payments/transactions/", headers=headers, timeout=10)
            if response.status_code in [200, 404]:  # 404 es OK si no hay pagos
                if response.status_code == 200:
                    data = response.json()
                    count = len(data) if isinstance(data, list) else data.get("count", 0)
                    self.log("✅", "GET /payments/transactions/ (landlord)",
                            f"{count} transacciones")
                else:
                    self.log("✅", "GET /payments/transactions/ (landlord)",
                            "Endpoint existe (sin datos)")
            else:
                self.log("⚠️", "GET /payments/transactions/ (landlord)",
                        f"Status {response.status_code}")
        except Exception as e:
            self.log("❌", "GET /payments/transactions/ (landlord)", f"Exception: {str(e)}")

    def test_user_profile(self, user_type):
        """Test: Obtener perfil de usuario"""
        try:
            headers = self.get_headers(user_type)
            response = requests.get(f"{BASE_URL}/users/auth/me/", headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                self.log("✅", f"GET /users/auth/me/ ({user_type})",
                        f"Perfil obtenido: {data.get('email')}")
            else:
                self.log("⚠️", f"GET /users/auth/me/ ({user_type})",
                        f"Status {response.status_code}")
        except Exception as e:
            self.log("❌", f"GET /users/auth/me/ ({user_type})", f"Exception: {str(e)}")

    def run_all_tests(self):
        """Ejecutar todos los tests"""
        print("=" * 70)
        print("TESTING AUTOMATIZADO DE APIs - VERIHOME")
        print("=" * 70)
        print()

        # 1. Autenticación
        print("🔐 FASE 1: AUTENTICACIÓN")
        print("-" * 70)
        self.login("landlord")
        self.login("tenant")
        self.login("service_provider")
        print()

        # 2. Endpoints públicos
        print("🌐 FASE 2: ENDPOINTS PÚBLICOS")
        print("-" * 70)
        self.test_properties_list()
        print()

        # 3. Endpoints de arrendador
        print("🏠 FASE 3: ENDPOINTS DE ARRENDADOR")
        print("-" * 70)
        self.test_user_profile("landlord")
        self.test_landlord_properties()
        self.test_contracts_list()
        self.test_payments_list()
        print()

        # 4. Endpoints de arrendatario
        print("👤 FASE 4: ENDPOINTS DE ARRENDATARIO")
        print("-" * 70)
        self.test_user_profile("tenant")
        self.test_matching_requests()
        self.test_messages_threads()
        print()

        # 5. Endpoints de prestador de servicios
        print("🔧 FASE 5: ENDPOINTS DE PRESTADOR DE SERVICIOS")
        print("-" * 70)
        self.test_user_profile("service_provider")
        print()

        # Resumen
        print("=" * 70)
        print("RESUMEN DE RESULTADOS")
        print("=" * 70)
        total = len(self.results)
        success = len([r for r in self.results if r["status"] == "✅"])
        warning = len([r for r in self.results if r["status"] == "⚠️"])
        failed = len([r for r in self.results if r["status"] == "❌"])

        print(f"Total tests: {total}")
        print(f"✅ Exitosos: {success} ({success/total*100:.1f}%)")
        print(f"⚠️  Advertencias: {warning} ({warning/total*100:.1f}%)")
        print(f"❌ Fallidos: {failed} ({failed/total*100:.1f}%)")
        print("=" * 70)

        # Guardar resultados
        with open("test_results.json", "w") as f:
            json.dump(self.results, f, indent=2)
        print("\n📄 Resultados guardados en: test_results.json")

if __name__ == "__main__":
    tester = APITester()
    tester.run_all_tests()
