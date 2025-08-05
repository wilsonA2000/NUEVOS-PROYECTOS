"""
Tests de integración para las vistas API del módulo de propiedades.
"""

import uuid
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.utils import timezone
from datetime import date

from properties.models import (
    Property, PropertyImage, PropertyVideo, PropertyAmenity, 
    PropertyInquiry, PropertyFavorite, PropertyView
)

User = get_user_model()


class PropertyAPIViewSetTest(TestCase):
    """Tests para PropertyViewSet."""
    
    def setUp(self):
        """Configuración inicial para los tests."""
        self.client = APIClient()
        
        # Crear usuarios de prueba
        self.landlord = User.objects.create_user(
            email='landlord@test.com',
            password='testpass123',
            first_name='Juan',
            last_name='Pérez',
            user_type='landlord'
        )
        
        self.tenant = User.objects.create_user(
            email='tenant@test.com',
            password='testpass123',
            first_name='María',
            last_name='García',
            user_type='tenant'
        )
        
        self.admin = User.objects.create_user(
            email='admin@test.com',
            password='testpass123',
            first_name='Admin',
            last_name='User',
            user_type='landlord',
            is_staff=True,
            is_superuser=True
        )
        
        # Crear propiedad de prueba
        self.property_obj = Property.objects.create(
            landlord=self.landlord,
            title='Apartamento de Prueba',
            description='Descripción del apartamento de prueba',
            property_type='apartment',
            listing_type='rent',
            status='available',
            address='Calle de Prueba 123',
            city='Ciudad de Prueba',
            state='Estado de Prueba',
            country='México',
            postal_code='12345',
            bedrooms=2,
            bathrooms=1,
            total_area=80.0,
            rent_price=Decimal('15000.00'),
            minimum_lease_term=12,
            is_active=True
        )
        
        # URLs
        self.list_url = reverse('api:property-list')
        self.detail_url = reverse('api:property-detail', args=[self.property_obj.id])
    
    def test_list_properties_authenticated_tenant(self):
        """Test de listado de propiedades para arrendatario autenticado."""
        self.client.force_authenticate(user=self.tenant)
        response = self.client.get(self.list_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 1)
        
        property_data = response.data['results'][0]
        self.assertEqual(property_data['title'], 'Apartamento de Prueba')
        self.assertEqual(property_data['status'], 'available')
        self.assertTrue(property_data['is_active'])
    
    def test_list_properties_authenticated_landlord(self):
        """Test de listado de propiedades para arrendador autenticado."""
        self.client.force_authenticate(user=self.landlord)
        response = self.client.get(self.list_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 1)
        
        # El arrendador debe ver su propiedad
        property_data = response.data['results'][0]
        self.assertEqual(property_data['title'], 'Apartamento de Prueba')
        self.assertEqual(property_data['landlord']['email'], 'landlord@test.com')
    
    def test_list_properties_unauthenticated(self):
        """Test de listado de propiedades sin autenticación."""
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_retrieve_property_authenticated(self):
        """Test de obtención de detalle de propiedad autenticado."""
        self.client.force_authenticate(user=self.tenant)
        response = self.client.get(self.detail_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Apartamento de Prueba')
        self.assertEqual(response.data['property_type'], 'apartment')
        self.assertEqual(response.data['status'], 'available')
    
    def test_retrieve_property_unauthenticated(self):
        """Test de obtención de detalle de propiedad sin autenticación."""
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_create_property_landlord(self):
        """Test de creación de propiedad por arrendador."""
        self.client.force_authenticate(user=self.landlord)
        
        property_data = {
            'title': 'Nuevo Apartamento',
            'description': 'Descripción del nuevo apartamento',
            'property_type': 'apartment',
            'listing_type': 'rent',
            'address': 'Nueva Dirección 456',
            'city': 'Nueva Ciudad',
            'state': 'Nuevo Estado',
            'country': 'México',
            'postal_code': '54321',
            'bedrooms': 3,
            'bathrooms': 2,
            'total_area': 100.0,
            'rent_price': '20000.00',
            'minimum_lease_term': 12,
            'pets_allowed': True,
            'furnished': False,
            'utilities_included': ['electricity', 'water'],
            'property_features': ['balcony', 'closet'],
            'nearby_amenities': ['supermarket', 'park'],
            'transportation': ['metro', 'bus']
        }
        
        response = self.client.post(self.list_url, property_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'Nuevo Apartamento')
        self.assertEqual(response.data['landlord']['email'], 'landlord@test.com')
        self.assertEqual(response.data['status'], 'available')  # Estado por defecto
        self.assertTrue(response.data['is_active'])  # Activo por defecto
    
    def test_create_property_tenant_forbidden(self):
        """Test de que arrendatario no puede crear propiedades."""
        self.client.force_authenticate(user=self.tenant)
        
        property_data = {
            'title': 'Propiedad de Arrendatario',
            'description': 'Esta propiedad no debería crearse',
            'property_type': 'apartment',
            'listing_type': 'rent',
            'address': 'Dirección Test',
            'city': 'Ciudad Test',
            'state': 'Estado Test',
            'country': 'México',
            'postal_code': '12345',
            'bedrooms': 2,
            'bathrooms': 1,
            'total_area': 80.0,
            'rent_price': '15000.00',
            'minimum_lease_term': 12
        }
        
        response = self.client.post(self.list_url, property_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_update_property_owner(self):
        """Test de actualización de propiedad por su propietario."""
        self.client.force_authenticate(user=self.landlord)
        
        update_data = {
            'title': 'Apartamento Actualizado',
            'rent_price': '18000.00',
            'bedrooms': 3
        }
        
        response = self.client.patch(self.detail_url, update_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Apartamento Actualizado')
        self.assertEqual(response.data['rent_price'], '18000.00')
        self.assertEqual(response.data['bedrooms'], 3)
    
    def test_update_property_non_owner_forbidden(self):
        """Test de que no propietario no puede actualizar propiedad."""
        self.client.force_authenticate(user=self.tenant)
        
        update_data = {
            'title': 'Propiedad Modificada Ilegalmente',
            'rent_price': '5000.00'
        }
        
        response = self.client.patch(self.detail_url, update_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_delete_property_owner(self):
        """Test de eliminación de propiedad por su propietario."""
        self.client.force_authenticate(user=self.landlord)
        response = self.client.delete(self.detail_url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Property.objects.filter(id=self.property_obj.id).exists())
    
    def test_delete_property_non_owner_forbidden(self):
        """Test de que no propietario no puede eliminar propiedad."""
        self.client.force_authenticate(user=self.tenant)
        response = self.client.delete(self.detail_url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Property.objects.filter(id=self.property_obj.id).exists())
    
    def test_filter_properties_by_type(self):
        """Test de filtrado de propiedades por tipo."""
        self.client.force_authenticate(user=self.tenant)
        
        # Crear propiedad adicional de tipo diferente
        Property.objects.create(
            landlord=self.landlord,
            title='Casa de Prueba',
            description='Descripción de la casa',
            property_type='house',
            listing_type='rent',
            status='available',
            address='Dirección Casa',
            city='Ciudad Casa',
            state='Estado Casa',
            country='México',
            postal_code='54321',
            bedrooms=3,
            bathrooms=2,
            total_area=150.0,
            rent_price=Decimal('25000.00'),
            minimum_lease_term=12,
            is_active=True
        )
        
        # Filtrar por apartamentos
        response = self.client.get(f"{self.list_url}?property_type=apartment")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['property_type'], 'apartment')
        
        # Filtrar por casas
        response = self.client.get(f"{self.list_url}?property_type=house")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['property_type'], 'house')
    
    def test_search_properties(self):
        """Test de búsqueda de propiedades."""
        self.client.force_authenticate(user=self.tenant)
        
        response = self.client.get(f"{self.list_url}?search=Apartamento")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertIn('Apartamento', response.data['results'][0]['title'])
    
    def test_order_properties(self):
        """Test de ordenamiento de propiedades."""
        self.client.force_authenticate(user=self.tenant)
        
        # Crear propiedad adicional con precio diferente
        Property.objects.create(
            landlord=self.landlord,
            title='Apartamento Barato',
            description='Apartamento económico',
            property_type='apartment',
            listing_type='rent',
            status='available',
            address='Dirección Barata',
            city='Ciudad Barata',
            state='Estado Barato',
            country='México',
            postal_code='11111',
            bedrooms=1,
            bathrooms=1,
            total_area=50.0,
            rent_price=Decimal('8000.00'),
            minimum_lease_term=12,
            is_active=True
        )
        
        # Ordenar por precio ascendente
        response = self.client.get(f"{self.list_url}?ordering=rent_price")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
        self.assertEqual(response.data['results'][0]['rent_price'], '8000.00')
        self.assertEqual(response.data['results'][1]['rent_price'], '15000.00')
        
        # Ordenar por precio descendente
        response = self.client.get(f"{self.list_url}?ordering=-rent_price")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['results'][0]['rent_price'], '15000.00')
        self.assertEqual(response.data['results'][1]['rent_price'], '8000.00')


class PropertyInquiryAPIViewSetTest(TestCase):
    """Tests para PropertyInquiryViewSet."""
    
    def setUp(self):
        """Configuración inicial para los tests."""
        self.client = APIClient()
        
        # Crear usuarios
        self.landlord = User.objects.create_user(
            email='landlord@test.com',
            password='testpass123',
            first_name='Juan',
            last_name='Pérez',
            user_type='landlord'
        )
        
        self.tenant = User.objects.create_user(
            email='tenant@test.com',
            password='testpass123',
            first_name='María',
            last_name='García',
            user_type='tenant'
        )
        
        # Crear propiedad
        self.property_obj = Property.objects.create(
            landlord=self.landlord,
            title='Apartamento de Prueba',
            description='Descripción del apartamento',
            property_type='apartment',
            listing_type='rent',
            status='available',
            address='Calle de Prueba 123',
            city='Ciudad de Prueba',
            state='Estado de Prueba',
            country='México',
            postal_code='12345',
            bedrooms=2,
            bathrooms=1,
            total_area=80.0,
            rent_price=Decimal('15000.00'),
            minimum_lease_term=12,
            is_active=True
        )
        
        # Crear consulta
        self.inquiry_obj = PropertyInquiry.objects.create(
            property=self.property_obj,
            inquirer=self.tenant,
            subject='Consulta de prueba',
            message='Me interesa esta propiedad',
            preferred_contact_method='email',
            status='new'
        )
        
        # URLs
        self.list_url = reverse('api:inquiry-list')
        self.detail_url = reverse('api:inquiry-detail', args=[self.inquiry_obj.id])
    
    def test_list_inquiries_landlord(self):
        """Test de listado de consultas para arrendador."""
        self.client.force_authenticate(user=self.landlord)
        response = self.client.get(self.list_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['subject'], 'Consulta de prueba')
    
    def test_list_inquiries_tenant(self):
        """Test de listado de consultas para arrendatario."""
        self.client.force_authenticate(user=self.tenant)
        response = self.client.get(self.list_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['subject'], 'Consulta de prueba')
    
    def test_create_inquiry_tenant(self):
        """Test de creación de consulta por arrendatario."""
        self.client.force_authenticate(user=self.tenant)
        
        inquiry_data = {
            'property': self.property_obj.id,
            'subject': 'Nueva Consulta',
            'message': 'Me interesa mucho esta propiedad',
            'preferred_contact_method': 'phone',
            'move_in_date': date.today().isoformat(),
            'lease_duration': 12,
            'budget_min': '12000.00',
            'budget_max': '18000.00'
        }
        
        response = self.client.post(self.list_url, inquiry_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['subject'], 'Nueva Consulta')
        self.assertEqual(response.data['inquirer']['email'], 'tenant@test.com')
        self.assertEqual(response.data['status'], 'new')
    
    def test_create_inquiry_landlord_forbidden(self):
        """Test de que arrendador no puede crear consultas sobre sus propias propiedades."""
        self.client.force_authenticate(user=self.landlord)
        
        inquiry_data = {
            'property': self.property_obj.id,
            'subject': 'Consulta de Arrendador',
            'message': 'Esta consulta no debería crearse',
            'preferred_contact_method': 'email'
        }
        
        response = self.client.post(self.list_url, inquiry_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_update_inquiry_status_landlord(self):
        """Test de actualización de estado de consulta por arrendador."""
        self.client.force_authenticate(user=self.landlord)
        
        update_data = {
            'status': 'contacted',
            'response': 'Gracias por tu interés, te contactaré pronto.'
        }
        
        response = self.client.patch(self.detail_url, update_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'contacted')
        self.assertIn('Gracias por tu interés', response.data['response'])


class PropertyFavoriteAPIViewSetTest(TestCase):
    """Tests para PropertyFavoriteViewSet."""
    
    def setUp(self):
        """Configuración inicial para los tests."""
        self.client = APIClient()
        
        # Crear usuarios
        self.landlord = User.objects.create_user(
            email='landlord@test.com',
            password='testpass123',
            first_name='Juan',
            last_name='Pérez',
            user_type='landlord'
        )
        
        self.tenant = User.objects.create_user(
            email='tenant@test.com',
            password='testpass123',
            first_name='María',
            last_name='García',
            user_type='tenant'
        )
        
        # Crear propiedad
        self.property_obj = Property.objects.create(
            landlord=self.landlord,
            title='Apartamento de Prueba',
            description='Descripción del apartamento',
            property_type='apartment',
            listing_type='rent',
            status='available',
            address='Calle de Prueba 123',
            city='Ciudad de Prueba',
            state='Estado de Prueba',
            country='México',
            postal_code='12345',
            bedrooms=2,
            bathrooms=1,
            total_area=80.0,
            rent_price=Decimal('15000.00'),
            minimum_lease_term=12,
            is_active=True
        )
        
        # Crear favorito
        self.favorite_obj = PropertyFavorite.objects.create(
            property=self.property_obj,
            user=self.tenant,
            notes='Me gusta esta propiedad'
        )
        
        # URLs
        self.list_url = reverse('api:favorite-list')
        self.detail_url = reverse('api:favorite-detail', args=[self.favorite_obj.id])
    
    def test_list_favorites_tenant(self):
        """Test de listado de favoritos para arrendatario."""
        self.client.force_authenticate(user=self.tenant)
        response = self.client.get(self.list_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['notes'], 'Me gusta esta propiedad')
    
    def test_create_favorite_tenant(self):
        """Test de creación de favorito por arrendatario."""
        self.client.force_authenticate(user=self.tenant)
        
        # Crear nueva propiedad para favorito
        new_property = Property.objects.create(
            landlord=self.landlord,
            title='Nueva Propiedad',
            description='Descripción de nueva propiedad',
            property_type='house',
            listing_type='rent',
            status='available',
            address='Nueva Dirección',
            city='Nueva Ciudad',
            state='Nuevo Estado',
            country='México',
            postal_code='54321',
            bedrooms=3,
            bathrooms=2,
            total_area=120.0,
            rent_price=Decimal('20000.00'),
            minimum_lease_term=12,
            is_active=True
        )
        
        favorite_data = {
            'property': new_property.id,
            'notes': 'Nuevo favorito'
        }
        
        response = self.client.post(self.list_url, favorite_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['notes'], 'Nuevo favorito')
        self.assertEqual(response.data['user']['email'], 'tenant@test.com')
    
    def test_delete_favorite_owner(self):
        """Test de eliminación de favorito por su propietario."""
        self.client.force_authenticate(user=self.tenant)
        response = self.client.delete(self.detail_url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(PropertyFavorite.objects.filter(id=self.favorite_obj.id).exists())


class PropertySearchAPITest(TestCase):
    """Tests para PropertySearchAPIView."""
    
    def setUp(self):
        """Configuración inicial para los tests."""
        self.client = APIClient()
        
        # Crear usuarios
        self.landlord = User.objects.create_user(
            email='landlord@test.com',
            password='testpass123',
            first_name='Juan',
            last_name='Pérez',
            user_type='landlord'
        )
        
        self.tenant = User.objects.create_user(
            email='tenant@test.com',
            password='testpass123',
            first_name='María',
            last_name='García',
            user_type='tenant'
        )
        
        # Crear propiedades de prueba
        self.property1 = Property.objects.create(
            landlord=self.landlord,
            title='Apartamento Centro',
            description='Apartamento en el centro de la ciudad',
            property_type='apartment',
            listing_type='rent',
            status='available',
            address='Centro 123',
            city='Ciudad de México',
            state='CDMX',
            country='México',
            postal_code='06000',
            bedrooms=2,
            bathrooms=1,
            total_area=80.0,
            rent_price=Decimal('15000.00'),
            minimum_lease_term=12,
            is_active=True
        )
        
        self.property2 = Property.objects.create(
            landlord=self.landlord,
            title='Casa Suburbios',
            description='Casa en los suburbios',
            property_type='house',
            listing_type='rent',
            status='available',
            address='Suburbios 456',
            city='Guadalajara',
            state='Jalisco',
            country='México',
            postal_code='44100',
            bedrooms=3,
            bathrooms=2,
            total_area=150.0,
            rent_price=Decimal('25000.00'),
            minimum_lease_term=12,
            is_active=True
        )
        
        # URL
        self.search_url = reverse('api:api_property_search')
    
    def test_search_by_query(self):
        """Test de búsqueda por texto."""
        self.client.force_authenticate(user=self.tenant)
        
        response = self.client.get(f"{self.search_url}?query=Centro")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertIn('Centro', response.data['results'][0]['title'])
    
    def test_search_by_property_type(self):
        """Test de búsqueda por tipo de propiedad."""
        self.client.force_authenticate(user=self.tenant)
        
        response = self.client.get(f"{self.search_url}?property_type=apartment")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['property_type'], 'apartment')
    
    def test_search_by_price_range(self):
        """Test de búsqueda por rango de precio."""
        self.client.force_authenticate(user=self.tenant)
        
        response = self.client.get(f"{self.search_url}?min_price=10000&max_price=20000")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['rent_price'], '15000.00')
    
    def test_search_by_city(self):
        """Test de búsqueda por ciudad."""
        self.client.force_authenticate(user=self.tenant)
        
        response = self.client.get(f"{self.search_url}?city=Ciudad de México")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['city'], 'Ciudad de México')
    
    def test_search_combined_filters(self):
        """Test de búsqueda con múltiples filtros."""
        self.client.force_authenticate(user=self.tenant)
        
        response = self.client.get(
            f"{self.search_url}?property_type=apartment&min_price=10000&max_price=20000&bedrooms=2"
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['property_type'], 'apartment')
        self.assertEqual(response.data['results'][0]['bedrooms'], 2)


class PropertyStatsAPITest(TestCase):
    """Tests para PropertyStatsAPIView."""
    
    def setUp(self):
        """Configuración inicial para los tests."""
        self.client = APIClient()
        
        # Crear usuarios
        self.landlord = User.objects.create_user(
            email='landlord@test.com',
            password='testpass123',
            first_name='Juan',
            last_name='Pérez',
            user_type='landlord'
        )
        
        self.tenant = User.objects.create_user(
            email='tenant@test.com',
            password='testpass123',
            first_name='María',
            last_name='García',
            user_type='tenant'
        )
        
        # Crear propiedades de prueba
        self.property1 = Property.objects.create(
            landlord=self.landlord,
            title='Propiedad 1',
            description='Descripción 1',
            property_type='apartment',
            listing_type='rent',
            status='available',
            address='Dirección 1',
            city='Ciudad 1',
            state='Estado 1',
            country='México',
            postal_code='12345',
            bedrooms=2,
            bathrooms=1,
            total_area=80.0,
            rent_price=Decimal('15000.00'),
            minimum_lease_term=12,
            is_active=True
        )
        
        self.property2 = Property.objects.create(
            landlord=self.landlord,
            title='Propiedad 2',
            description='Descripción 2',
            property_type='house',
            listing_type='rent',
            status='rented',
            address='Dirección 2',
            city='Ciudad 2',
            state='Estado 2',
            country='México',
            postal_code='54321',
            bedrooms=3,
            bathrooms=2,
            total_area=150.0,
            rent_price=Decimal('25000.00'),
            minimum_lease_term=12,
            is_active=True
        )
        
        # Crear vistas y favoritos
        PropertyView.objects.create(
            property=self.property1,
            user=self.tenant,
            ip_address='192.168.1.1'
        )
        
        PropertyFavorite.objects.create(
            property=self.property1,
            user=self.tenant
        )
        
        # URL
        self.stats_url = reverse('api:api_property_stats')
    
    def test_property_stats_authenticated(self):
        """Test de obtención de estadísticas de propiedades."""
        self.client.force_authenticate(user=self.tenant)
        response = self.client.get(self.stats_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_properties', response.data)
        self.assertIn('available_properties', response.data)
        self.assertIn('rented_properties', response.data)
        self.assertIn('total_views', response.data)
        self.assertIn('total_favorites', response.data)
        self.assertIn('average_price', response.data)
        self.assertIn('occupancy_rate', response.data)
        
        # Verificar valores específicos
        self.assertEqual(response.data['total_properties'], 2)
        self.assertEqual(response.data['available_properties'], 1)
        self.assertEqual(response.data['rented_properties'], 1)
        self.assertEqual(response.data['total_views'], 1)
        self.assertEqual(response.data['total_favorites'], 1)
        self.assertEqual(response.data['average_price'], '20000.00')
        self.assertEqual(response.data['occupancy_rate'], 50.0)
    
    def test_property_stats_unauthenticated(self):
        """Test de obtención de estadísticas sin autenticación."""
        response = self.client.get(self.stats_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED) 