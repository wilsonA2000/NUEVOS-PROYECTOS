"""
Tests unitarios para los serializers del módulo de propiedades.
"""

import uuid
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from datetime import date

from properties.models import (
    Property, PropertyImage, PropertyVideo, PropertyAmenity, 
    PropertyInquiry, PropertyFavorite, PropertyView
)
from properties.serializers import (
    PropertySerializer, CreatePropertySerializer, UpdatePropertySerializer,
    PropertyImageSerializer, PropertyVideoSerializer, PropertyAmenitySerializer,
    PropertyInquirySerializer, PropertyFavoriteSerializer, PropertyViewSerializer,
    PropertySearchSerializer, PropertyStatsSerializer
)

User = get_user_model()


class PropertySerializerTest(TestCase):
    """Tests para PropertySerializer."""
    
    def setUp(self):
        """Configuración inicial para los tests."""
        self.landlord = User.objects.create_user(
            email='landlord@test.com',
            password='testpass123',
            first_name='Juan',
            last_name='Pérez',
            user_type='landlord'
        )
        
        self.property_obj = Property.objects.create(
            landlord=self.landlord,
            title='Apartamento en el centro',
            description='Hermoso apartamento en el centro de la ciudad',
            property_type='apartment',
            listing_type='rent',
            status='available',
            address='Calle Principal 123',
            city='Ciudad de México',
            state='CDMX',
            country='México',
            postal_code='06000',
            bedrooms=2,
            bathrooms=1,
            half_bathrooms=0,
            total_area=80.0,
            built_area=75.0,
            parking_spaces=1,
            floors=5,
            floor_number=3,
            year_built=2020,
            rent_price=Decimal('15000.00'),
            security_deposit=Decimal('30000.00'),
            minimum_lease_term=12,
            pets_allowed=True,
            smoking_allowed=False,
            furnished=True,
            utilities_included=['electricity', 'water'],
            property_features=['balcony', 'closet'],
            nearby_amenities=['supermarket', 'park'],
            transportation=['metro', 'bus'],
            available_from=date.today(),
            is_featured=False,
            is_active=True
        )
    
    def test_property_serialization(self):
        """Test de serialización de una propiedad."""
        serializer = PropertySerializer(self.property_obj)
        data = serializer.data
        
        self.assertEqual(data['title'], 'Apartamento en el centro')
        self.assertEqual(data['property_type'], 'apartment')
        self.assertEqual(data['status'], 'available')
        self.assertEqual(data['city'], 'Ciudad de México')
        self.assertEqual(data['rent_price'], '15000.00')
        self.assertEqual(data['bedrooms'], 2)
        self.assertEqual(data['bathrooms'], 1)
        self.assertTrue(data['pets_allowed'])
        self.assertFalse(data['smoking_allowed'])
        self.assertTrue(data['furnished'])
        self.assertEqual(data['utilities_included'], ['electricity', 'water'])
        self.assertEqual(data['property_features'], ['balcony', 'closet'])
        self.assertEqual(data['nearby_amenities'], ['supermarket', 'park'])
        self.assertEqual(data['transportation'], ['metro', 'bus'])
        self.assertTrue(data['is_active'])
        self.assertFalse(data['is_featured'])
        self.assertEqual(data['views_count'], 0)
        self.assertEqual(data['favorites_count'], 0)
    
    def test_property_serialization_with_landlord_info(self):
        """Test de serialización incluyendo información del arrendador."""
        serializer = PropertySerializer(self.property_obj)
        data = serializer.data
        
        self.assertIn('landlord', data)
        landlord_data = data['landlord']
        self.assertEqual(landlord_data['id'], str(self.landlord.id))
        self.assertEqual(landlord_data['email'], 'landlord@test.com')
        self.assertEqual(landlord_data['first_name'], 'Juan')
        self.assertEqual(landlord_data['last_name'], 'Pérez')
        self.assertEqual(landlord_data['user_type'], 'landlord')


class CreatePropertySerializerTest(TestCase):
    """Tests para CreatePropertySerializer."""
    
    def setUp(self):
        """Configuración inicial para los tests."""
        self.landlord = User.objects.create_user(
            email='landlord@test.com',
            password='testpass123',
            first_name='Juan',
            last_name='Pérez',
            user_type='landlord'
        )
        
        self.valid_data = {
            'title': 'Nuevo Apartamento',
            'description': 'Descripción del nuevo apartamento',
            'property_type': 'apartment',
            'listing_type': 'rent',
            'address': 'Nueva Dirección 456',
            'city': 'Guadalajara',
            'state': 'Jalisco',
            'country': 'México',
            'postal_code': '44100',
            'bedrooms': 3,
            'bathrooms': 2,
            'half_bathrooms': 1,
            'total_area': 100.0,
            'built_area': 95.0,
            'parking_spaces': 2,
            'floors': 8,
            'floor_number': 5,
            'year_built': 2021,
            'rent_price': '20000.00',
            'security_deposit': '40000.00',
            'minimum_lease_term': 12,
            'pets_allowed': True,
            'smoking_allowed': False,
            'furnished': False,
            'utilities_included': ['electricity', 'water', 'internet'],
            'property_features': ['balcony', 'closet', 'ac'],
            'nearby_amenities': ['supermarket', 'park', 'gym'],
            'transportation': ['metro', 'bus', 'bike_share'],
            'available_from': date.today().isoformat(),
            'is_featured': True
        }
    
    def test_create_property_serialization(self):
        """Test de serialización para crear una propiedad."""
        serializer = CreatePropertySerializer(data=self.valid_data)
        self.assertTrue(serializer.is_valid())
        
        property_obj = serializer.save(landlord=self.landlord)
        
        self.assertEqual(property_obj.title, 'Nuevo Apartamento')
        self.assertEqual(property_obj.landlord, self.landlord)
        self.assertEqual(property_obj.status, 'available')  # Estado por defecto
        self.assertTrue(property_obj.is_active)  # Activo por defecto
        self.assertTrue(property_obj.is_featured)
        self.assertEqual(property_obj.rent_price, Decimal('20000.00'))
        self.assertEqual(property_obj.utilities_included, ['electricity', 'water', 'internet'])
    
    def test_create_property_validation(self):
        """Test de validación al crear una propiedad."""
        # Test: título requerido
        invalid_data = self.valid_data.copy()
        del invalid_data['title']
        
        serializer = CreatePropertySerializer(data=invalid_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('title', serializer.errors)
        
        # Test: precio de renta debe ser positivo
        invalid_data = self.valid_data.copy()
        invalid_data['rent_price'] = '-1000.00'
        
        serializer = CreatePropertySerializer(data=invalid_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('rent_price', serializer.errors)
        
        # Test: número de habitaciones debe ser positivo
        invalid_data = self.valid_data.copy()
        invalid_data['bedrooms'] = -1
        
        serializer = CreatePropertySerializer(data=invalid_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('bedrooms', serializer.errors)


class UpdatePropertySerializerTest(TestCase):
    """Tests para UpdatePropertySerializer."""
    
    def setUp(self):
        """Configuración inicial para los tests."""
        self.landlord = User.objects.create_user(
            email='landlord@test.com',
            password='testpass123',
            first_name='Juan',
            last_name='Pérez',
            user_type='landlord'
        )
        
        self.property_obj = Property.objects.create(
            landlord=self.landlord,
            title='Apartamento Original',
            description='Descripción original',
            property_type='apartment',
            listing_type='rent',
            status='available',
            address='Dirección Original 123',
            city='Ciudad Original',
            state='Estado Original',
            country='México',
            postal_code='12345',
            bedrooms=2,
            bathrooms=1,
            total_area=80.0,
            rent_price=Decimal('15000.00'),
            minimum_lease_term=12,
            is_active=True
        )
    
    def test_update_property_serialization(self):
        """Test de serialización para actualizar una propiedad."""
        update_data = {
            'title': 'Apartamento Actualizado',
            'description': 'Descripción actualizada',
            'rent_price': '18000.00',
            'bedrooms': 3,
            'is_featured': True
        }
        
        serializer = UpdatePropertySerializer(
            self.property_obj, 
            data=update_data, 
            partial=True
        )
        self.assertTrue(serializer.is_valid())
        
        updated_property = serializer.save()
        
        self.assertEqual(updated_property.title, 'Apartamento Actualizado')
        self.assertEqual(updated_property.description, 'Descripción actualizada')
        self.assertEqual(updated_property.rent_price, Decimal('18000.00'))
        self.assertEqual(updated_property.bedrooms, 3)
        self.assertTrue(updated_property.is_featured)
        
        # Campos que no deberían cambiar
        self.assertEqual(updated_property.property_type, 'apartment')
        self.assertEqual(updated_property.city, 'Ciudad Original')
    
    def test_update_property_validation(self):
        """Test de validación al actualizar una propiedad."""
        # Test: precio no puede ser negativo
        invalid_data = {'rent_price': '-5000.00'}
        
        serializer = UpdatePropertySerializer(
            self.property_obj, 
            data=invalid_data, 
            partial=True
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('rent_price', serializer.errors)


class PropertyImageSerializerTest(TestCase):
    """Tests para PropertyImageSerializer."""
    
    def setUp(self):
        """Configuración inicial para los tests."""
        self.landlord = User.objects.create_user(
            email='landlord@test.com',
            password='testpass123',
            first_name='Juan',
            last_name='Pérez',
            user_type='landlord'
        )
        
        self.property_obj = Property.objects.create(
            landlord=self.landlord,
            title='Test Property',
            description='Test Description',
            property_type='apartment',
            listing_type='rent',
            status='available',
            address='Test Address',
            city='Test City',
            state='Test State',
            country='Test Country',
            postal_code='12345',
            bedrooms=2,
            bathrooms=1,
            total_area=80.0,
            rent_price=Decimal('15000.00'),
            minimum_lease_term=12
        )
        
        self.image_obj = PropertyImage.objects.create(
            property=self.property_obj,
            image='test_image.jpg',
            caption='Test Caption',
            is_main=True,
            order=1
        )
    
    def test_property_image_serialization(self):
        """Test de serialización de una imagen de propiedad."""
        serializer = PropertyImageSerializer(self.image_obj)
        data = serializer.data
        
        self.assertEqual(data['caption'], 'Test Caption')
        self.assertTrue(data['is_main'])
        self.assertEqual(data['order'], 1)
        self.assertIn('image', data)
        self.assertIn('property', data)
    
    def test_create_property_image(self):
        """Test de creación de una imagen de propiedad."""
        image_data = {
            'caption': 'Nueva Imagen',
            'is_main': False,
            'order': 2
        }
        
        serializer = PropertyImageSerializer(data=image_data)
        self.assertTrue(serializer.is_valid())
        
        image = serializer.save(property=self.property_obj)
        
        self.assertEqual(image.property, self.property_obj)
        self.assertEqual(image.caption, 'Nueva Imagen')
        self.assertFalse(image.is_main)
        self.assertEqual(image.order, 2)


class PropertyVideoSerializerTest(TestCase):
    """Tests para PropertyVideoSerializer."""
    
    def setUp(self):
        """Configuración inicial para los tests."""
        self.landlord = User.objects.create_user(
            email='landlord@test.com',
            password='testpass123',
            first_name='Juan',
            last_name='Pérez',
            user_type='landlord'
        )
        
        self.property_obj = Property.objects.create(
            landlord=self.landlord,
            title='Test Property',
            description='Test Description',
            property_type='apartment',
            listing_type='rent',
            status='available',
            address='Test Address',
            city='Test City',
            state='Test State',
            country='Test Country',
            postal_code='12345',
            bedrooms=2,
            bathrooms=1,
            total_area=80.0,
            rent_price=Decimal('15000.00'),
            minimum_lease_term=12
        )
        
        self.video_obj = PropertyVideo.objects.create(
            property=self.property_obj,
            video='test_video.mp4',
            thumbnail='test_thumbnail.jpg',
            title='Test Video',
            description='Test Video Description',
            duration=120,
            is_main=True,
            order=1
        )
    
    def test_property_video_serialization(self):
        """Test de serialización de un video de propiedad."""
        serializer = PropertyVideoSerializer(self.video_obj)
        data = serializer.data
        
        self.assertEqual(data['title'], 'Test Video')
        self.assertEqual(data['description'], 'Test Video Description')
        self.assertEqual(data['duration'], 120)
        self.assertTrue(data['is_main'])
        self.assertEqual(data['order'], 1)
        self.assertIn('video', data)
        self.assertIn('thumbnail', data)
        self.assertIn('property', data)


class PropertyInquirySerializerTest(TestCase):
    """Tests para PropertyInquirySerializer."""
    
    def setUp(self):
        """Configuración inicial para los tests."""
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
        
        self.property_obj = Property.objects.create(
            landlord=self.landlord,
            title='Test Property',
            description='Test Description',
            property_type='apartment',
            listing_type='rent',
            status='available',
            address='Test Address',
            city='Test City',
            state='Test State',
            country='Test Country',
            postal_code='12345',
            bedrooms=2,
            bathrooms=1,
            total_area=80.0,
            rent_price=Decimal('15000.00'),
            minimum_lease_term=12
        )
        
        self.inquiry_obj = PropertyInquiry.objects.create(
            property=self.property_obj,
            inquirer=self.tenant,
            subject='Test Inquiry',
            message='Test message',
            preferred_contact_method='email',
            status='new'
        )
    
    def test_property_inquiry_serialization(self):
        """Test de serialización de una consulta de propiedad."""
        serializer = PropertyInquirySerializer(self.inquiry_obj)
        data = serializer.data
        
        self.assertEqual(data['subject'], 'Test Inquiry')
        self.assertEqual(data['message'], 'Test message')
        self.assertEqual(data['preferred_contact_method'], 'email')
        self.assertEqual(data['status'], 'new')
        self.assertIn('property', data)
        self.assertIn('inquirer', data)
    
    def test_create_property_inquiry(self):
        """Test de creación de una consulta de propiedad."""
        inquiry_data = {
            'subject': 'Nueva Consulta',
            'message': 'Me interesa esta propiedad',
            'preferred_contact_method': 'phone',
            'move_in_date': date.today().isoformat(),
            'lease_duration': 12,
            'budget_min': '12000.00',
            'budget_max': '18000.00'
        }
        
        serializer = PropertyInquirySerializer(data=inquiry_data)
        self.assertTrue(serializer.is_valid())
        
        inquiry = serializer.save(
            property=self.property_obj,
            inquirer=self.tenant
        )
        
        self.assertEqual(inquiry.property, self.property_obj)
        self.assertEqual(inquiry.inquirer, self.tenant)
        self.assertEqual(inquiry.subject, 'Nueva Consulta')
        self.assertEqual(inquiry.preferred_contact_method, 'phone')
        self.assertEqual(inquiry.status, 'new')  # Estado por defecto


class PropertyFavoriteSerializerTest(TestCase):
    """Tests para PropertyFavoriteSerializer."""
    
    def setUp(self):
        """Configuración inicial para los tests."""
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
        
        self.property_obj = Property.objects.create(
            landlord=self.landlord,
            title='Test Property',
            description='Test Description',
            property_type='apartment',
            listing_type='rent',
            status='available',
            address='Test Address',
            city='Test City',
            state='Test State',
            country='Test Country',
            postal_code='12345',
            bedrooms=2,
            bathrooms=1,
            total_area=80.0,
            rent_price=Decimal('15000.00'),
            minimum_lease_term=12
        )
        
        self.favorite_obj = PropertyFavorite.objects.create(
            property=self.property_obj,
            user=self.tenant,
            notes='Me gusta esta propiedad'
        )
    
    def test_property_favorite_serialization(self):
        """Test de serialización de un favorito de propiedad."""
        serializer = PropertyFavoriteSerializer(self.favorite_obj)
        data = serializer.data
        
        self.assertEqual(data['notes'], 'Me gusta esta propiedad')
        self.assertIn('property', data)
        self.assertIn('user', data)
        self.assertIn('created_at', data)
    
    def test_create_property_favorite(self):
        """Test de creación de un favorito de propiedad."""
        favorite_data = {
            'notes': 'Nuevo favorito'
        }
        
        serializer = PropertyFavoriteSerializer(data=favorite_data)
        self.assertTrue(serializer.is_valid())
        
        favorite = serializer.save(
            property=self.property_obj,
            user=self.tenant
        )
        
        self.assertEqual(favorite.property, self.property_obj)
        self.assertEqual(favorite.user, self.tenant)
        self.assertEqual(favorite.notes, 'Nuevo favorito')


class PropertyViewSerializerTest(TestCase):
    """Tests para PropertyViewSerializer."""
    
    def setUp(self):
        """Configuración inicial para los tests."""
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
        
        self.property_obj = Property.objects.create(
            landlord=self.landlord,
            title='Test Property',
            description='Test Description',
            property_type='apartment',
            listing_type='rent',
            status='available',
            address='Test Address',
            city='Test City',
            state='Test State',
            country='Test Country',
            postal_code='12345',
            bedrooms=2,
            bathrooms=1,
            total_area=80.0,
            rent_price=Decimal('15000.00'),
            minimum_lease_term=12
        )
        
        self.view_obj = PropertyView.objects.create(
            property=self.property_obj,
            user=self.tenant,
            ip_address='192.168.1.1',
            user_agent='Mozilla/5.0',
            session_key='test_session'
        )
    
    def test_property_view_serialization(self):
        """Test de serialización de una vista de propiedad."""
        serializer = PropertyViewSerializer(self.view_obj)
        data = serializer.data
        
        self.assertEqual(data['ip_address'], '192.168.1.1')
        self.assertEqual(data['user_agent'], 'Mozilla/5.0')
        self.assertEqual(data['session_key'], 'test_session')
        self.assertIn('property', data)
        self.assertIn('user', data)
        self.assertIn('viewed_at', data)


class PropertySearchSerializerTest(TestCase):
    """Tests para PropertySearchSerializer."""
    
    def test_property_search_serialization(self):
        """Test de serialización de búsqueda de propiedades."""
        search_data = {
            'query': 'apartamento centro',
            'property_type': 'apartment',
            'min_price': '10000.00',
            'max_price': '25000.00',
            'bedrooms': 2,
            'city': 'Ciudad de México',
            'pets_allowed': True,
            'furnished': False
        }
        
        serializer = PropertySearchSerializer(data=search_data)
        self.assertTrue(serializer.is_valid())
        
        data = serializer.validated_data
        self.assertEqual(data['query'], 'apartamento centro')
        self.assertEqual(data['property_type'], 'apartment')
        self.assertEqual(data['min_price'], Decimal('10000.00'))
        self.assertEqual(data['max_price'], Decimal('25000.00'))
        self.assertEqual(data['bedrooms'], 2)
        self.assertEqual(data['city'], 'Ciudad de México')
        self.assertTrue(data['pets_allowed'])
        self.assertFalse(data['furnished'])
    
    def test_property_search_validation(self):
        """Test de validación de búsqueda de propiedades."""
        # Test: precio mínimo no puede ser mayor que máximo
        invalid_data = {
            'min_price': '25000.00',
            'max_price': '10000.00'
        }
        
        serializer = PropertySearchSerializer(data=invalid_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('non_field_errors', serializer.errors)


class PropertyStatsSerializerTest(TestCase):
    """Tests para PropertyStatsSerializer."""
    
    def test_property_stats_serialization(self):
        """Test de serialización de estadísticas de propiedades."""
        stats_data = {
            'total_properties': 100,
            'available_properties': 75,
            'rented_properties': 20,
            'maintenance_properties': 5,
            'total_views': 1500,
            'total_favorites': 300,
            'average_price': Decimal('18000.00'),
            'occupancy_rate': 75.5
        }
        
        serializer = PropertyStatsSerializer(data=stats_data)
        self.assertTrue(serializer.is_valid())
        
        data = serializer.validated_data
        self.assertEqual(data['total_properties'], 100)
        self.assertEqual(data['available_properties'], 75)
        self.assertEqual(data['rented_properties'], 20)
        self.assertEqual(data['maintenance_properties'], 5)
        self.assertEqual(data['total_views'], 1500)
        self.assertEqual(data['total_favorites'], 300)
        self.assertEqual(data['average_price'], Decimal('18000.00'))
        self.assertEqual(data['occupancy_rate'], 75.5) 