"""
Tests para las vistas tradicionales del módulo de propiedades.
"""

import uuid
from decimal import Decimal
from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from datetime import date

from properties.models import (
    Property, PropertyImage, PropertyVideo, PropertyAmenity, 
    PropertyInquiry, PropertyFavorite, PropertyView
)

User = get_user_model()


class PropertyViewsTest(TestCase):
    """Tests para las vistas de propiedades."""
    
    def setUp(self):
        """Configuración inicial para los tests."""
        self.client = Client()
        
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
    
    def test_property_list_view_authenticated(self):
        """Test de vista de listado de propiedades autenticado."""
        self.client.force_login(self.tenant)
        response = self.client.get(reverse('properties:list'))
        
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'properties/list.html')
        self.assertIn('properties', response.context)
        self.assertEqual(len(response.context['properties']), 1)
        self.assertEqual(response.context['properties'][0].title, 'Apartamento de Prueba')
    
    def test_property_list_view_unauthenticated(self):
        """Test de vista de listado de propiedades sin autenticación."""
        response = self.client.get(reverse('properties:list'))
        
        # Debe redirigir a login
        self.assertEqual(response.status_code, 302)
        self.assertIn('login', response.url)
    
    def test_property_detail_view_authenticated(self):
        """Test de vista de detalle de propiedad autenticado."""
        self.client.force_login(self.tenant)
        response = self.client.get(
            reverse('properties:detail', args=[self.property_obj.id])
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'properties/detail.html')
        self.assertIn('property', response.context)
        self.assertEqual(response.context['property'].title, 'Apartamento de Prueba')
    
    def test_property_detail_view_unauthenticated(self):
        """Test de vista de detalle de propiedad sin autenticación."""
        response = self.client.get(
            reverse('properties:detail', args=[self.property_obj.id])
        )
        
        # Debe redirigir a login
        self.assertEqual(response.status_code, 302)
        self.assertIn('login', response.url)
    
    def test_property_detail_view_not_found(self):
        """Test de vista de detalle de propiedad inexistente."""
        self.client.force_login(self.tenant)
        fake_id = uuid.uuid4()
        response = self.client.get(reverse('properties:detail', args=[fake_id]))
        
        self.assertEqual(response.status_code, 404)
    
    def test_my_properties_view_landlord(self):
        """Test de vista de mis propiedades para arrendador."""
        self.client.force_login(self.landlord)
        response = self.client.get(reverse('properties:my_properties'))
        
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'properties/my_properties.html')
        self.assertIn('properties', response.context)
        self.assertEqual(len(response.context['properties']), 1)
        self.assertEqual(response.context['properties'][0].title, 'Apartamento de Prueba')
    
    def test_my_properties_view_tenant_forbidden(self):
        """Test de que arrendatario no puede acceder a mis propiedades."""
        self.client.force_login(self.tenant)
        response = self.client.get(reverse('properties:my_properties'))
        
        # Debe redirigir o mostrar error 403
        self.assertIn(response.status_code, [302, 403])
    
    def test_featured_properties_view(self):
        """Test de vista de propiedades destacadas."""
        # Marcar propiedad como destacada
        self.property_obj.is_featured = True
        self.property_obj.save()
        
        self.client.force_login(self.tenant)
        response = self.client.get(reverse('properties:featured'))
        
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'properties/featured.html')
        self.assertIn('properties', response.context)
        self.assertEqual(len(response.context['properties']), 1)
        self.assertTrue(response.context['properties'][0].is_featured)
    
    def test_property_gallery_view(self):
        """Test de vista de galería de propiedad."""
        self.client.force_login(self.tenant)
        response = self.client.get(
            reverse('properties:gallery', args=[self.property_obj.id])
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'properties/gallery.html')
        self.assertIn('property', response.context)
        self.assertEqual(response.context['property'].title, 'Apartamento de Prueba')
    
    def test_property_amenities_view(self):
        """Test de vista de amenidades de propiedad."""
        self.client.force_login(self.tenant)
        response = self.client.get(
            reverse('properties:amenities', args=[self.property_obj.id])
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'properties/amenities.html')
        self.assertIn('property', response.context)
        self.assertEqual(response.context['property'].title, 'Apartamento de Prueba')


class PropertyManagementViewsTest(TestCase):
    """Tests para las vistas de gestión de propiedades."""
    
    def setUp(self):
        """Configuración inicial para los tests."""
        self.client = Client()
        
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
    
    def test_create_property_view_landlord(self):
        """Test de vista de creación de propiedad para arrendador."""
        self.client.force_login(self.landlord)
        response = self.client.get(reverse('properties:create'))
        
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'properties/create.html')
    
    def test_create_property_view_tenant_forbidden(self):
        """Test de que arrendatario no puede acceder a crear propiedad."""
        self.client.force_login(self.tenant)
        response = self.client.get(reverse('properties:create'))
        
        # Debe redirigir o mostrar error 403
        self.assertIn(response.status_code, [302, 403])
    
    def test_edit_property_view_owner(self):
        """Test de vista de edición de propiedad para propietario."""
        self.client.force_login(self.landlord)
        response = self.client.get(
            reverse('properties:edit', args=[self.property_obj.id])
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'properties/edit.html')
        self.assertIn('property', response.context)
        self.assertEqual(response.context['property'].title, 'Apartamento de Prueba')
    
    def test_edit_property_view_non_owner_forbidden(self):
        """Test de que no propietario no puede editar propiedad."""
        self.client.force_login(self.tenant)
        response = self.client.get(
            reverse('properties:edit', args=[self.property_obj.id])
        )
        
        # Debe redirigir o mostrar error 403
        self.assertIn(response.status_code, [302, 403])
    
    def test_delete_property_view_owner(self):
        """Test de vista de eliminación de propiedad para propietario."""
        self.client.force_login(self.landlord)
        response = self.client.get(
            reverse('properties:delete', args=[self.property_obj.id])
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'properties/delete.html')
        self.assertIn('property', response.context)
    
    def test_delete_property_view_non_owner_forbidden(self):
        """Test de que no propietario no puede eliminar propiedad."""
        self.client.force_login(self.tenant)
        response = self.client.get(
            reverse('properties:delete', args=[self.property_obj.id])
        )
        
        # Debe redirigir o mostrar error 403
        self.assertIn(response.status_code, [302, 403])
    
    def test_activate_property_view_owner(self):
        """Test de activación de propiedad por propietario."""
        # Desactivar propiedad primero
        self.property_obj.is_active = False
        self.property_obj.save()
        
        self.client.force_login(self.landlord)
        response = self.client.post(
            reverse('properties:activate', args=[self.property_obj.id])
        )
        
        # Debe redirigir después de activar
        self.assertEqual(response.status_code, 302)
        
        # Verificar que la propiedad está activa
        self.property_obj.refresh_from_db()
        self.assertTrue(self.property_obj.is_active)
    
    def test_deactivate_property_view_owner(self):
        """Test de desactivación de propiedad por propietario."""
        self.client.force_login(self.landlord)
        response = self.client.post(
            reverse('properties:deactivate', args=[self.property_obj.id])
        )
        
        # Debe redirigir después de desactivar
        self.assertEqual(response.status_code, 302)
        
        # Verificar que la propiedad está inactiva
        self.property_obj.refresh_from_db()
        self.assertFalse(self.property_obj.is_active)


class PropertyInteractionViewsTest(TestCase):
    """Tests para las vistas de interacción con propiedades."""
    
    def setUp(self):
        """Configuración inicial para los tests."""
        self.client = Client()
        
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
    
    def test_property_inquiry_view_tenant(self):
        """Test de vista de consulta de propiedad para arrendatario."""
        self.client.force_login(self.tenant)
        response = self.client.get(
            reverse('properties:inquire', args=[self.property_obj.id])
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'properties/inquire.html')
        self.assertIn('property', response.context)
        self.assertEqual(response.context['property'].title, 'Apartamento de Prueba')
    
    def test_property_inquiry_view_landlord_forbidden(self):
        """Test de que arrendador no puede consultar sus propias propiedades."""
        self.client.force_login(self.landlord)
        response = self.client.get(
            reverse('properties:inquire', args=[self.property_obj.id])
        )
        
        # Debe redirigir o mostrar error 403
        self.assertIn(response.status_code, [302, 403])
    
    def test_add_to_favorites_view_tenant(self):
        """Test de agregar a favoritos para arrendatario."""
        self.client.force_login(self.tenant)
        response = self.client.post(
            reverse('properties:add_favorite', args=[self.property_obj.id])
        )
        
        # Debe redirigir después de agregar
        self.assertEqual(response.status_code, 302)
        
        # Verificar que se creó el favorito
        favorite = PropertyFavorite.objects.filter(
            property=self.property_obj,
            user=self.tenant
        ).first()
        self.assertIsNotNone(favorite)
    
    def test_remove_from_favorites_view_tenant(self):
        """Test de quitar de favoritos para arrendatario."""
        # Crear favorito primero
        favorite = PropertyFavorite.objects.create(
            property=self.property_obj,
            user=self.tenant,
            notes='Test favorite'
        )
        
        self.client.force_login(self.tenant)
        response = self.client.post(
            reverse('properties:remove_favorite', args=[self.property_obj.id])
        )
        
        # Debe redirigir después de quitar
        self.assertEqual(response.status_code, 302)
        
        # Verificar que se eliminó el favorito
        self.assertFalse(
            PropertyFavorite.objects.filter(id=favorite.id).exists()
        )
    
    def test_my_favorites_view_tenant(self):
        """Test de vista de mis favoritos para arrendatario."""
        # Crear favorito
        PropertyFavorite.objects.create(
            property=self.property_obj,
            user=self.tenant,
            notes='Test favorite'
        )
        
        self.client.force_login(self.tenant)
        response = self.client.get(reverse('properties:my_favorites'))
        
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'properties/my_favorites.html')
        self.assertIn('favorites', response.context)
        self.assertEqual(len(response.context['favorites']), 1)
        self.assertEqual(response.context['favorites'][0].property.title, 'Apartamento de Prueba')
    
    def test_share_property_view(self):
        """Test de vista de compartir propiedad."""
        self.client.force_login(self.tenant)
        response = self.client.get(
            reverse('properties:share', args=[self.property_obj.id])
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'properties/share.html')
        self.assertIn('property', response.context)
        self.assertEqual(response.context['property'].title, 'Apartamento de Prueba')
    
    def test_report_property_view(self):
        """Test de vista de reportar propiedad."""
        self.client.force_login(self.tenant)
        response = self.client.get(
            reverse('properties:report', args=[self.property_obj.id])
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'properties/report.html')
        self.assertIn('property', response.context)
        self.assertEqual(response.context['property'].title, 'Apartamento de Prueba')


class PropertySearchViewsTest(TestCase):
    """Tests para las vistas de búsqueda de propiedades."""
    
    def setUp(self):
        """Configuración inicial para los tests."""
        self.client = Client()
        
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
            description='Apartamento en el centro',
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
    
    def test_property_search_view(self):
        """Test de vista de búsqueda de propiedades."""
        self.client.force_login(self.tenant)
        response = self.client.get(reverse('properties:search'))
        
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'properties/search.html')
    
    def test_property_search_with_query(self):
        """Test de búsqueda con parámetros."""
        self.client.force_login(self.tenant)
        response = self.client.get(
            f"{reverse('properties:search')}?q=Centro&property_type=apartment"
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'properties/search.html')
        self.assertIn('properties', response.context)
        self.assertEqual(len(response.context['properties']), 1)
        self.assertEqual(response.context['properties'][0].title, 'Apartamento Centro')
    
    def test_property_map_view(self):
        """Test de vista de mapa de propiedades."""
        self.client.force_login(self.tenant)
        response = self.client.get(reverse('properties:map'))
        
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'properties/map.html')
        self.assertIn('properties', response.context)
        self.assertEqual(len(response.context['properties']), 2)
    
    def test_advanced_filters_view(self):
        """Test de vista de filtros avanzados."""
        self.client.force_login(self.tenant)
        response = self.client.get(reverse('properties:advanced_filters'))
        
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'properties/advanced_filters.html')
    
    def test_saved_searches_view(self):
        """Test de vista de búsquedas guardadas."""
        self.client.force_login(self.tenant)
        response = self.client.get(reverse('properties:saved_searches'))
        
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'properties/saved_searches.html')
    
    def test_property_alerts_view(self):
        """Test de vista de alertas de propiedades."""
        self.client.force_login(self.tenant)
        response = self.client.get(reverse('properties:alerts'))
        
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'properties/alerts.html')


class PropertyComparisonViewsTest(TestCase):
    """Tests para las vistas de comparación de propiedades."""
    
    def setUp(self):
        """Configuración inicial para los tests."""
        self.client = Client()
        
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
            title='Apartamento 1',
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
            title='Apartamento 2',
            description='Descripción 2',
            property_type='apartment',
            listing_type='rent',
            status='available',
            address='Dirección 2',
            city='Ciudad 2',
            state='Estado 2',
            country='México',
            postal_code='54321',
            bedrooms=3,
            bathrooms=2,
            total_area=120.0,
            rent_price=Decimal('20000.00'),
            minimum_lease_term=12,
            is_active=True
        )
    
    def test_compare_properties_view(self):
        """Test de vista de comparación de propiedades."""
        self.client.force_login(self.tenant)
        response = self.client.get(reverse('properties:compare'))
        
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'properties/compare.html')
    
    def test_add_to_comparison_view(self):
        """Test de agregar propiedad a comparación."""
        self.client.force_login(self.tenant)
        response = self.client.post(
            reverse('properties:add_to_comparison', args=[self.property1.id])
        )
        
        # Debe redirigir después de agregar
        self.assertEqual(response.status_code, 302)
    
    def test_remove_from_comparison_view(self):
        """Test de quitar propiedad de comparación."""
        self.client.force_login(self.tenant)
        response = self.client.post(
            reverse('properties:remove_from_comparison', args=[self.property1.id])
        )
        
        # Debe redirigir después de quitar
        self.assertEqual(response.status_code, 302)


class PropertyInquiryManagementViewsTest(TestCase):
    """Tests para las vistas de gestión de consultas."""
    
    def setUp(self):
        """Configuración inicial para los tests."""
        self.client = Client()
        
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
    
    def test_received_inquiries_view_landlord(self):
        """Test de vista de consultas recibidas para arrendador."""
        self.client.force_login(self.landlord)
        response = self.client.get(reverse('properties:received_inquiries'))
        
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'properties/received_inquiries.html')
        self.assertIn('inquiries', response.context)
        self.assertEqual(len(response.context['inquiries']), 1)
        self.assertEqual(response.context['inquiries'][0].subject, 'Consulta de prueba')
    
    def test_received_inquiries_view_tenant_forbidden(self):
        """Test de que arrendatario no puede ver consultas recibidas."""
        self.client.force_login(self.tenant)
        response = self.client.get(reverse('properties:received_inquiries'))
        
        # Debe redirigir o mostrar error 403
        self.assertIn(response.status_code, [302, 403])
    
    def test_inquiry_detail_view_landlord(self):
        """Test de vista de detalle de consulta para arrendador."""
        self.client.force_login(self.landlord)
        response = self.client.get(
            reverse('properties:inquiry_detail', args=[self.inquiry_obj.id])
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'properties/inquiry_detail.html')
        self.assertIn('inquiry', response.context)
        self.assertEqual(response.context['inquiry'].subject, 'Consulta de prueba')
    
    def test_inquiry_detail_view_tenant(self):
        """Test de vista de detalle de consulta para arrendatario."""
        self.client.force_login(self.tenant)
        response = self.client.get(
            reverse('properties:inquiry_detail', args=[self.inquiry_obj.id])
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'properties/inquiry_detail.html')
        self.assertIn('inquiry', response.context)
        self.assertEqual(response.context['inquiry'].subject, 'Consulta de prueba')
    
    def test_respond_inquiry_view_landlord(self):
        """Test de vista de respuesta a consulta para arrendador."""
        self.client.force_login(self.landlord)
        response = self.client.get(
            reverse('properties:respond_inquiry', args=[self.inquiry_obj.id])
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'properties/respond_inquiry.html')
        self.assertIn('inquiry', response.context)
        self.assertEqual(response.context['inquiry'].subject, 'Consulta de prueba')
    
    def test_respond_inquiry_view_tenant_forbidden(self):
        """Test de que arrendatario no puede responder consultas."""
        self.client.force_login(self.tenant)
        response = self.client.get(
            reverse('properties:respond_inquiry', args=[self.inquiry_obj.id])
        )
        
        # Debe redirigir o mostrar error 403
        self.assertIn(response.status_code, [302, 403])


class PropertyStatsViewsTest(TestCase):
    """Tests para las vistas de estadísticas de propiedades."""
    
    def setUp(self):
        """Configuración inicial para los tests."""
        self.client = Client()
        
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
        
        # Crear vista y favorito
        PropertyView.objects.create(
            property=self.property_obj,
            user=self.tenant,
            ip_address='192.168.1.1'
        )
        
        PropertyFavorite.objects.create(
            property=self.property_obj,
            user=self.tenant
        )
    
    def test_property_stats_view_owner(self):
        """Test de vista de estadísticas de propiedad para propietario."""
        self.client.force_login(self.landlord)
        response = self.client.get(
            reverse('properties:stats', args=[self.property_obj.id])
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'properties/stats.html')
        self.assertIn('property', response.context)
        self.assertEqual(response.context['property'].title, 'Apartamento de Prueba')
    
    def test_property_stats_view_non_owner_forbidden(self):
        """Test de que no propietario no puede ver estadísticas."""
        self.client.force_login(self.tenant)
        response = self.client.get(
            reverse('properties:stats', args=[self.property_obj.id])
        )
        
        # Debe redirigir o mostrar error 403
        self.assertIn(response.status_code, [302, 403])
    
    def test_export_property_pdf_view_owner(self):
        """Test de exportación de propiedad a PDF para propietario."""
        self.client.force_login(self.landlord)
        response = self.client.get(
            reverse('properties:export_pdf', args=[self.property_obj.id])
        )
        
        # Debe devolver PDF o redirigir
        self.assertIn(response.status_code, [200, 302])
    
    def test_export_property_pdf_view_non_owner_forbidden(self):
        """Test de que no propietario no puede exportar propiedad."""
        self.client.force_login(self.tenant)
        response = self.client.get(
            reverse('properties:export_pdf', args=[self.property_obj.id])
        )
        
        # Debe redirigir o mostrar error 403
        self.assertIn(response.status_code, [302, 403]) 