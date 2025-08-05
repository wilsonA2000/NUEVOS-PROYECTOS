"""
Tests unitarios para los modelos del módulo de propiedades.
"""

import uuid
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import date, timedelta

from properties.models import (
    Property, PropertyImage, PropertyVideo, PropertyAmenity, 
    PropertyInquiry, PropertyFavorite, PropertyView
)

User = get_user_model()


class PropertyModelTest(TestCase):
    """Tests para el modelo Property."""
    
    def setUp(self):
        """Configuración inicial para los tests."""
        self.landlord = User.objects.create_user(
            email='landlord@test.com',
            password='testpass123',
            first_name='Juan',
            last_name='Pérez',
            user_type='landlord'
        )
        
        self.property_data = {
            'landlord': self.landlord,
            'title': 'Apartamento en el centro',
            'description': 'Hermoso apartamento en el centro de la ciudad',
            'property_type': 'apartment',
            'listing_type': 'rent',
            'status': 'available',
            'address': 'Calle Principal 123',
            'city': 'Ciudad de México',
            'state': 'CDMX',
            'country': 'México',
            'postal_code': '06000',
            'bedrooms': 2,
            'bathrooms': 1,
            'half_bathrooms': 0,
            'total_area': 80.0,
            'built_area': 75.0,
            'parking_spaces': 1,
            'floors': 5,
            'floor_number': 3,
            'year_built': 2020,
            'rent_price': Decimal('15000.00'),
            'security_deposit': Decimal('30000.00'),
            'minimum_lease_term': 12,
            'pets_allowed': True,
            'smoking_allowed': False,
            'furnished': True,
            'utilities_included': ['electricity', 'water'],
            'property_features': ['balcony', 'closet'],
            'nearby_amenities': ['supermarket', 'park'],
            'transportation': ['metro', 'bus'],
            'available_from': date.today(),
            'is_featured': False,
            'is_active': True
        }
    
    def test_create_property(self):
        """Test de creación de una propiedad."""
        property_obj = Property.objects.create(**self.property_data)
        
        self.assertIsInstance(property_obj.id, uuid.UUID)
        self.assertEqual(property_obj.title, 'Apartamento en el centro')
        self.assertEqual(property_obj.landlord, self.landlord)
        self.assertEqual(property_obj.status, 'available')
        self.assertEqual(property_obj.views_count, 0)
        self.assertEqual(property_obj.favorites_count, 0)
        self.assertTrue(property_obj.is_active)
        self.assertFalse(property_obj.is_featured)
    
    def test_property_string_representation(self):
        """Test de la representación en string de la propiedad."""
        property_obj = Property.objects.create(**self.property_data)
        expected = f"Apartamento en el centro - Ciudad de México, CDMX"
        self.assertEqual(str(property_obj), expected)
    
    def test_property_get_main_image(self):
        """Test para obtener la imagen principal de una propiedad."""
        property_obj = Property.objects.create(**self.property_data)
        
        # Sin imágenes
        self.assertIsNone(property_obj.get_main_image())
        
        # Con imagen principal
        image = PropertyImage.objects.create(
            property=property_obj,
            image='test_image.jpg',
            is_main=True
        )
        self.assertEqual(property_obj.get_main_image(), image.image.url)
    
    def test_property_validation(self):
        """Test de validaciones del modelo Property."""
        # Test: precio de renta debe ser positivo
        invalid_data = self.property_data.copy()
        invalid_data['rent_price'] = Decimal('-1000.00')
        
        with self.assertRaises(ValidationError):
            property_obj = Property(**invalid_data)
            property_obj.full_clean()
    
    def test_property_status_changes(self):
        """Test de cambios de estado de la propiedad."""
        property_obj = Property.objects.create(**self.property_data)
        
        # Cambiar a rentada
        property_obj.status = 'rented'
        property_obj.save()
        self.assertEqual(property_obj.status, 'rented')
        
        # Cambiar a mantenimiento
        property_obj.status = 'maintenance'
        property_obj.save()
        self.assertEqual(property_obj.status, 'maintenance')
    
    def test_property_activation_deactivation(self):
        """Test de activación y desactivación de propiedades."""
        property_obj = Property.objects.create(**self.property_data)
        
        # Desactivar
        property_obj.is_active = False
        property_obj.save()
        self.assertFalse(property_obj.is_active)
        
        # Reactivar
        property_obj.is_active = True
        property_obj.save()
        self.assertTrue(property_obj.is_active)


class PropertyImageModelTest(TestCase):
    """Tests para el modelo PropertyImage."""
    
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
    
    def test_create_property_image(self):
        """Test de creación de una imagen de propiedad."""
        image = PropertyImage.objects.create(
            property=self.property_obj,
            image='test_image.jpg',
            caption='Test Caption',
            is_main=True,
            order=1
        )
        
        self.assertIsInstance(image.id, uuid.UUID)
        self.assertEqual(image.property, self.property_obj)
        self.assertEqual(image.caption, 'Test Caption')
        self.assertTrue(image.is_main)
        self.assertEqual(image.order, 1)
    
    def test_property_image_string_representation(self):
        """Test de la representación en string de la imagen."""
        image = PropertyImage.objects.create(
            property=self.property_obj,
            image='test_image.jpg',
            caption='Test Caption'
        )
        expected = f"Imagen de Test Property - Test Caption"
        self.assertEqual(str(image), expected)
    
    def test_only_one_main_image_per_property(self):
        """Test para asegurar que solo hay una imagen principal por propiedad."""
        # Crear primera imagen principal
        image1 = PropertyImage.objects.create(
            property=self.property_obj,
            image='test_image1.jpg',
            is_main=True
        )
        
        # Crear segunda imagen principal
        image2 = PropertyImage.objects.create(
            property=self.property_obj,
            image='test_image2.jpg',
            is_main=True
        )
        
        # La primera imagen debería dejar de ser principal
        image1.refresh_from_db()
        self.assertFalse(image1.is_main)
        self.assertTrue(image2.is_main)


class PropertyVideoModelTest(TestCase):
    """Tests para el modelo PropertyVideo."""
    
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
    
    def test_create_property_video(self):
        """Test de creación de un video de propiedad."""
        video = PropertyVideo.objects.create(
            property=self.property_obj,
            video='test_video.mp4',
            thumbnail='test_thumbnail.jpg',
            title='Test Video',
            description='Test Video Description',
            duration=120,
            is_main=True,
            order=1
        )
        
        self.assertIsInstance(video.id, uuid.UUID)
        self.assertEqual(video.property, self.property_obj)
        self.assertEqual(video.title, 'Test Video')
        self.assertEqual(video.duration, 120)
        self.assertTrue(video.is_main)
    
    def test_property_video_string_representation(self):
        """Test de la representación en string del video."""
        video = PropertyVideo.objects.create(
            property=self.property_obj,
            video='test_video.mp4',
            title='Test Video'
        )
        expected = f"Video de Test Property - Test Video"
        self.assertEqual(str(video), expected)


class PropertyAmenityModelTest(TestCase):
    """Tests para el modelo PropertyAmenity."""
    
    def test_create_amenity(self):
        """Test de creación de una amenidad."""
        amenity = PropertyAmenity.objects.create(
            name='Piscina',
            category='recreation',
            icon='pool',
            description='Piscina comunitaria',
            is_active=True
        )
        
        self.assertEqual(amenity.name, 'Piscina')
        self.assertEqual(amenity.category, 'recreation')
        self.assertEqual(amenity.icon, 'pool')
        self.assertTrue(amenity.is_active)
    
    def test_amenity_string_representation(self):
        """Test de la representación en string de la amenidad."""
        amenity = PropertyAmenity.objects.create(
            name='Gimnasio',
            category='recreation'
        )
        self.assertEqual(str(amenity), 'Gimnasio')
    
    def test_amenity_unique_name(self):
        """Test de que el nombre de amenidad debe ser único."""
        PropertyAmenity.objects.create(
            name='Estacionamiento',
            category='parking'
        )
        
        with self.assertRaises(Exception):  # IntegrityError
            PropertyAmenity.objects.create(
                name='Estacionamiento',
                category='parking'
            )


class PropertyInquiryModelTest(TestCase):
    """Tests para el modelo PropertyInquiry."""
    
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
    
    def test_create_inquiry(self):
        """Test de creación de una consulta."""
        inquiry = PropertyInquiry.objects.create(
            property=self.property_obj,
            inquirer=self.tenant,
            subject='Consulta sobre la propiedad',
            message='Me interesa esta propiedad, ¿podría visitarla?',
            preferred_contact_method='email',
            move_in_date=date.today() + timedelta(days=30),
            lease_duration=12,
            budget_min=Decimal('12000.00'),
            budget_max=Decimal('18000.00'),
            status='new'
        )
        
        self.assertEqual(inquiry.property, self.property_obj)
        self.assertEqual(inquiry.inquirer, self.tenant)
        self.assertEqual(inquiry.status, 'new')
        self.assertEqual(inquiry.preferred_contact_method, 'email')
    
    def test_inquiry_string_representation(self):
        """Test de la representación en string de la consulta."""
        inquiry = PropertyInquiry.objects.create(
            property=self.property_obj,
            inquirer=self.tenant,
            subject='Test Inquiry',
            message='Test message'
        )
        expected = f"Consulta sobre Test Property - Test Inquiry"
        self.assertEqual(str(inquiry), expected)
    
    def test_inquiry_status_changes(self):
        """Test de cambios de estado de la consulta."""
        inquiry = PropertyInquiry.objects.create(
            property=self.property_obj,
            inquirer=self.tenant,
            subject='Test Inquiry',
            message='Test message'
        )
        
        # Cambiar a contactado
        inquiry.status = 'contacted'
        inquiry.save()
        self.assertEqual(inquiry.status, 'contacted')
        
        # Cambiar a visita programada
        inquiry.status = 'viewing_scheduled'
        inquiry.save()
        self.assertEqual(inquiry.status, 'viewing_scheduled')
        
        # Cerrar consulta
        inquiry.status = 'closed'
        inquiry.save()
        self.assertEqual(inquiry.status, 'closed')


class PropertyFavoriteModelTest(TestCase):
    """Tests para el modelo PropertyFavorite."""
    
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
    
    def test_create_favorite(self):
        """Test de creación de un favorito."""
        favorite = PropertyFavorite.objects.create(
            property=self.property_obj,
            user=self.tenant,
            notes='Me gusta esta propiedad'
        )
        
        self.assertEqual(favorite.property, self.property_obj)
        self.assertEqual(favorite.user, self.tenant)
        self.assertEqual(favorite.notes, 'Me gusta esta propiedad')
    
    def test_favorite_string_representation(self):
        """Test de la representación en string del favorito."""
        favorite = PropertyFavorite.objects.create(
            property=self.property_obj,
            user=self.tenant
        )
        expected = f"Favorito de Test Property - María García"
        self.assertEqual(str(favorite), expected)
    
    def test_unique_favorite_per_user_property(self):
        """Test de que un usuario no puede tener el mismo favorito dos veces."""
        PropertyFavorite.objects.create(
            property=self.property_obj,
            user=self.tenant
        )
        
        with self.assertRaises(Exception):  # IntegrityError
            PropertyFavorite.objects.create(
                property=self.property_obj,
                user=self.tenant
            )


class PropertyViewModelTest(TestCase):
    """Tests para el modelo PropertyView."""
    
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
    
    def test_create_property_view(self):
        """Test de creación de una vista de propiedad."""
        view = PropertyView.objects.create(
            property=self.property_obj,
            user=self.tenant,
            ip_address='192.168.1.1',
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            session_key='test_session_key'
        )
        
        self.assertEqual(view.property, self.property_obj)
        self.assertEqual(view.user, self.tenant)
        self.assertEqual(view.ip_address, '192.168.1.1')
        self.assertIsNotNone(view.viewed_at)
    
    def test_property_view_string_representation(self):
        """Test de la representación en string de la vista."""
        view = PropertyView.objects.create(
            property=self.property_obj,
            user=self.tenant,
            ip_address='192.168.1.1'
        )
        expected = f"Test Property - María García"
        self.assertEqual(str(view), expected)
    
    def test_property_view_without_user(self):
        """Test de vista de propiedad sin usuario (solo IP)."""
        view = PropertyView.objects.create(
            property=self.property_obj,
            ip_address='192.168.1.1',
            user_agent='Mozilla/5.0'
        )
        
        self.assertIsNone(view.user)
        self.assertEqual(view.ip_address, '192.168.1.1')
        expected = f"Test Property - IP: 192.168.1.1"
        self.assertEqual(str(view), expected) 