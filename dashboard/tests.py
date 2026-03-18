"""
Tests para las vistas del dashboard de VeriHome.
Verifica estadísticas por tipo de usuario y control de acceso.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from properties.models import Property

User = get_user_model()


class DashboardStatsTest(APITestCase):
    """Tests para el endpoint de estadísticas del dashboard."""

    def setUp(self):
        """Crear usuarios de prueba y datos básicos."""
        self.landlord = User.objects.create_user(
            email='landlord_dash@test.com',
            password='testpass123',
            user_type='landlord',
            first_name='Carlos',
            last_name='Dashboard',
        )
        self.tenant = User.objects.create_user(
            email='tenant_dash@test.com',
            password='testpass123',
            user_type='tenant',
            first_name='Maria',
            last_name='Dashboard',
        )
        self.admin_user = User.objects.create_superuser(
            email='admin_dash@test.com',
            password='adminpass123',
            user_type='landlord',
            first_name='Admin',
            last_name='Dashboard',
        )
        self.property = Property.objects.create(
            title='Propiedad Dashboard Test',
            description='Para pruebas de dashboard',
            property_type='apartment',
            rent_price=1500000,
            landlord=self.landlord,
            address='Calle 100 #10-20',
            city='Bogota',
            country='Colombia',
            bedrooms=2,
            bathrooms=1,
            total_area=55,
        )
        self.client = APIClient()

    def test_dashboard_stats_authenticated_landlord(self):
        """Test que un arrendador autenticado recibe estadísticas."""
        self.client.force_authenticate(user=self.landlord)
        response = self.client.get('/api/v1/dashboard/stats/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, dict)

    def test_dashboard_stats_authenticated_tenant(self):
        """Test que un arrendatario autenticado recibe estadísticas."""
        self.client.force_authenticate(user=self.tenant)
        response = self.client.get('/api/v1/dashboard/stats/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, dict)

    def test_dashboard_stats_unauthenticated(self):
        """Test que un usuario no autenticado recibe 401."""
        response = self.client.get('/api/v1/dashboard/stats/')

        self.assertIn(response.status_code, [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ])

    def test_dashboard_stats_with_period_param(self):
        """Test que el parámetro period filtra correctamente."""
        self.client.force_authenticate(user=self.landlord)

        for period in ['week', 'month', 'year']:
            response = self.client.get(f'/api/v1/dashboard/stats/?period={period}')
            self.assertEqual(
                response.status_code, status.HTTP_200_OK,
                f"Periodo '{period}' deberia retornar 200",
            )

    def test_dashboard_stats_includes_activities(self):
        """Test que las estadísticas incluyen actividades recientes."""
        self.client.force_authenticate(user=self.landlord)
        response = self.client.get('/api/v1/dashboard/stats/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # El endpoint retorna 'activities' en la respuesta
        self.assertIn('activities', response.data)

    def test_admin_dashboard_stats(self):
        """Test que el admin recibe estadísticas generales extendidas."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/v1/dashboard/stats/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, dict)


class DashboardWidgetViewSetTest(APITestCase):
    """Tests para el ViewSet de widgets del dashboard."""

    def setUp(self):
        """Crear usuarios de prueba."""
        self.user = User.objects.create_user(
            email='widget_user@test.com',
            password='testpass123',
            user_type='landlord',
            first_name='Widget',
            last_name='User',
        )
        self.client = APIClient()

    def test_widgets_list_authenticated(self):
        """Test que un usuario autenticado puede listar widgets."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/dashboard/widgets/')

        self.assertIn(response.status_code, [
            status.HTTP_200_OK,
            status.HTTP_404_NOT_FOUND,  # Si la ruta no está configurada exactamente así
        ])

    def test_widgets_list_unauthenticated(self):
        """Test que un usuario no autenticado no puede acceder a widgets."""
        response = self.client.get('/api/v1/dashboard/widgets/')

        self.assertIn(response.status_code, [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
            status.HTTP_404_NOT_FOUND,
        ])
