"""
Tests para los endpoints de mantenimiento del sistema.
Verifica health check, limpieza de logs, cache y permisos de acceso.
"""

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

User = get_user_model()


class HealthCheckTest(APITestCase):
    """Tests para el endpoint público de health check."""

    def test_health_check_returns_ok(self):
        """Test que el health check público retorna status saludable.

        El endpoint `/api/v1/core/health/` es un probe liveness/readiness
        (Kubernetes-friendly): devuelve `status='healthy'` si db + redis
        responden, `unhealthy` (503) en caso contrario. El payload incluye
        `checks` y `failed` para diagnóstico.
        """
        response = self.client.get("/api/v1/core/health/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "healthy")
        self.assertIn("checks", response.data)
        self.assertIn("failed", response.data)
        self.assertEqual(response.data["failed"], [])

    def test_health_check_no_auth_required(self):
        """Test que el health check no requiere autenticación."""
        # Sin autenticación
        response = self.client.get("/api/v1/core/health/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class MaintenanceHealthCheckTest(APITestCase):
    """Tests para el endpoint de health check de mantenimiento (admin only)."""

    def setUp(self):
        """Crear usuarios de prueba."""
        self.admin_user = User.objects.create_superuser(
            email="admin_maint@test.com",
            password="adminpass123",
            user_type="landlord",
            first_name="Admin",
            last_name="Maintenance",
        )
        self.regular_user = User.objects.create_user(
            email="user_maint@test.com",
            password="testpass123",
            user_type="tenant",
            first_name="Regular",
            last_name="User",
        )
        self.client = APIClient()

    def test_maintenance_health_check_admin(self):
        """Test que admin recibe health check completo del sistema."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get("/api/v1/core/maintenance/health/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("overall", response.data)
        self.assertIn("database", response.data)
        self.assertIn(response.data["database"]["status"], ["healthy", "unhealthy"])

    def test_maintenance_health_check_non_admin(self):
        """Test que usuario regular no puede acceder al health check de mantenimiento."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get("/api/v1/core/maintenance/health/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_maintenance_health_check_unauthenticated(self):
        """Test que usuario no autenticado no puede acceder."""
        response = self.client.get("/api/v1/core/maintenance/health/")

        self.assertIn(
            response.status_code,
            [
                status.HTTP_401_UNAUTHORIZED,
                status.HTTP_403_FORBIDDEN,
            ],
        )

    def test_health_check_includes_redis_status(self):
        """Test que el health check incluye estado de Redis."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get("/api/v1/core/maintenance/health/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("redis", response.data)
        # Redis puede estar en fallback, así que aceptamos healthy o fallback
        self.assertIn(response.data["redis"]["status"], ["healthy", "fallback"])

    def test_health_check_includes_storage_status(self):
        """Test que el health check incluye estado de almacenamiento."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get("/api/v1/core/maintenance/health/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("storage", response.data)


class MaintenanceClearLogsTest(APITestCase):
    """Tests para el endpoint de limpieza de logs."""

    def setUp(self):
        """Crear usuarios de prueba."""
        self.admin_user = User.objects.create_superuser(
            email="admin_logs@test.com",
            password="adminpass123",
            user_type="landlord",
            first_name="Admin",
            last_name="Logs",
        )
        self.regular_user = User.objects.create_user(
            email="user_logs@test.com",
            password="testpass123",
            user_type="tenant",
            first_name="Regular",
            last_name="Logs",
        )
        self.client = APIClient()

    def test_clear_logs_requires_admin(self):
        """Test que solo admin puede limpiar logs."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.post("/api/v1/core/maintenance/clear-logs/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_clear_logs_unauthenticated(self):
        """Test que usuario no autenticado no puede limpiar logs."""
        response = self.client.post("/api/v1/core/maintenance/clear-logs/")

        self.assertIn(
            response.status_code,
            [
                status.HTTP_401_UNAUTHORIZED,
                status.HTTP_403_FORBIDDEN,
            ],
        )

    def test_clear_logs_admin_success(self):
        """Test que admin puede limpiar logs exitosamente."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post("/api/v1/core/maintenance/clear-logs/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("deleted_count", response.data)
        self.assertIsInstance(response.data["deleted_count"], int)

    def test_clear_logs_requires_post(self):
        """Test que la limpieza de logs solo acepta POST."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get("/api/v1/core/maintenance/clear-logs/")

        self.assertIn(
            response.status_code,
            [
                status.HTTP_405_METHOD_NOT_ALLOWED,
                status.HTTP_403_FORBIDDEN,
            ],
        )


class MaintenanceClearCacheTest(APITestCase):
    """Tests para el endpoint de limpieza de cache."""

    def setUp(self):
        """Crear usuarios de prueba."""
        self.admin_user = User.objects.create_superuser(
            email="admin_cache@test.com",
            password="adminpass123",
            user_type="landlord",
            first_name="Admin",
            last_name="Cache",
        )
        self.regular_user = User.objects.create_user(
            email="user_cache@test.com",
            password="testpass123",
            user_type="tenant",
            first_name="Regular",
            last_name="Cache",
        )
        self.client = APIClient()

    def test_clear_cache_requires_admin(self):
        """Test que solo admin puede limpiar cache."""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.post("/api/v1/core/maintenance/clear-cache/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_clear_cache_admin_success(self):
        """Test que admin puede limpiar cache exitosamente."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post("/api/v1/core/maintenance/clear-cache/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("message", response.data)

    def test_clear_cache_unauthenticated(self):
        """Test que usuario no autenticado no puede limpiar cache."""
        response = self.client.post("/api/v1/core/maintenance/clear-cache/")

        self.assertIn(
            response.status_code,
            [
                status.HTTP_401_UNAUTHORIZED,
                status.HTTP_403_FORBIDDEN,
            ],
        )


class MaintenanceClearSessionsTest(APITestCase):
    """Tests para el endpoint de limpieza de sesiones expiradas."""

    def setUp(self):
        self.admin_user = User.objects.create_superuser(
            email="admin_sessions@test.com",
            password="adminpass123",
            user_type="landlord",
            first_name="Admin",
            last_name="Sessions",
        )
        self.client = APIClient()

    def test_clear_sessions_admin_success(self):
        """Test que admin puede limpiar sesiones expiradas."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post("/api/v1/core/maintenance/clear-sessions/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("deleted_count", response.data)

    def test_clear_sessions_requires_admin(self):
        """Test que usuario regular no puede limpiar sesiones."""
        regular = User.objects.create_user(
            email="regular_sessions@test.com",
            password="testpass123",
            user_type="tenant",
            first_name="Regular",
            last_name="Sessions",
        )
        self.client.force_authenticate(user=regular)
        response = self.client.post("/api/v1/core/maintenance/clear-sessions/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class MaintenanceOptimizeDBTest(APITestCase):
    """Tests para el endpoint de optimización de base de datos."""

    def setUp(self):
        self.admin_user = User.objects.create_superuser(
            email="admin_optdb@test.com",
            password="adminpass123",
            user_type="landlord",
            first_name="Admin",
            last_name="OptDB",
        )
        self.client = APIClient()

    def test_optimize_db_admin_success(self):
        """Test que admin puede optimizar la base de datos."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post("/api/v1/core/maintenance/optimize-db/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("message", response.data)

    def test_optimize_db_requires_admin(self):
        """Test que usuario regular no puede optimizar la BD."""
        regular = User.objects.create_user(
            email="regular_optdb@test.com",
            password="testpass123",
            user_type="tenant",
            first_name="Regular",
            last_name="OptDB",
        )
        self.client.force_authenticate(user=regular)
        response = self.client.post("/api/v1/core/maintenance/optimize-db/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
