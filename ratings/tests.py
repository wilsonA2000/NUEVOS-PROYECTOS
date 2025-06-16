"""
Pruebas para el sistema de calificaciones de VeriHome.
"""

from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import Rating, RatingCategory, RatingResponse, UserRatingProfile
from contracts.models import Contract

User = get_user_model()


class RatingModelTests(TestCase):
    """Pruebas para los modelos de calificaciones."""
    
    def setUp(self):
        """Configuración inicial para las pruebas."""
        # Crear usuarios
        self.landlord = User.objects.create_user(
            email='landlord@example.com',
            password='testpass123',
            first_name='Propietario',
            last_name='Test',
            user_type='landlord'
        )
        
        self.tenant = User.objects.create_user(
            email='tenant@example.com',
            password='testpass123',
            first_name='Inquilino',
            last_name='Test',
            user_type='tenant'
        )
        
        # Crear un contrato ficticio
        self.contract = Contract.objects.create(
            primary_party=self.landlord,
            secondary_party=self.tenant,
            contract_type='rental',
            title='Contrato de prueba',
            content='Contenido del contrato',
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timezone.timedelta(days=365),
            status='fully_signed'
        )
        
        # Crear una calificación
        self.rating = Rating.objects.create(
            reviewer=self.tenant,
            reviewee=self.landlord,
            rating_type='tenant_to_landlord',
            overall_rating=8,
            title='Buen arrendador',
            review_text='Muy buena experiencia con este arrendador.',
            contract=self.contract
        )
        
        # Crear categorías de calificación
        self.category1 = RatingCategory.objects.create(
            rating=self.rating,
            category='communication',
            score=9
        )
        
        self.category2 = RatingCategory.objects.create(
            rating=self.rating,
            category='responsiveness',
            score=7
        )
    
    def test_rating_creation(self):
        """Probar la creación de una calificación."""
        self.assertEqual(self.rating.overall_rating, 8)
        self.assertEqual(self.rating.reviewer, self.tenant)
        self.assertEqual(self.rating.reviewee, self.landlord)
        self.assertEqual(self.rating.rating_type, 'tenant_to_landlord')
    
    def test_rating_categories(self):
        """Probar las categorías de calificación."""
        categories = self.rating.category_ratings.all()
        self.assertEqual(categories.count(), 2)
        self.assertEqual(categories.get(category='communication').score, 9)
        self.assertEqual(categories.get(category='responsiveness').score, 7)
    
    def test_rating_response(self):
        """Probar la respuesta a una calificación."""
        response = RatingResponse.objects.create(
            rating=self.rating,
            responder=self.landlord,
            response_text='Gracias por tu calificación.'
        )
        
        self.assertEqual(response.responder, self.landlord)
        self.assertEqual(response.rating, self.rating)
    
    def test_user_rating_profile(self):
        """Probar el perfil de calificaciones de usuario."""
        profile, created = UserRatingProfile.objects.get_or_create(user=self.landlord)
        profile.update_statistics()
        
        self.assertEqual(profile.total_ratings_received, 1)
        self.assertEqual(profile.average_rating, 8.0)
    
    def test_stars_display(self):
        """Probar la representación visual de estrellas."""
        self.assertEqual(self.rating.get_stars_display(), '★★★★★★★★☆☆')


class RatingViewTests(TestCase):
    """Pruebas para las vistas de calificaciones."""
    
    def setUp(self):
        """Configuración inicial para las pruebas."""
        # Crear usuarios
        self.landlord = User.objects.create_user(
            email='landlord@example.com',
            password='testpass123',
            first_name='Propietario',
            last_name='Test',
            user_type='landlord'
        )
        
        self.tenant = User.objects.create_user(
            email='tenant@example.com',
            password='testpass123',
            first_name='Inquilino',
            last_name='Test',
            user_type='tenant'
        )
        
        # Crear un contrato ficticio
        self.contract = Contract.objects.create(
            primary_party=self.landlord,
            secondary_party=self.tenant,
            contract_type='rental',
            title='Contrato de prueba',
            content='Contenido del contrato',
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timezone.timedelta(days=365),
            status='fully_signed'
        )
        
        # Crear una calificación
        self.rating = Rating.objects.create(
            reviewer=self.tenant,
            reviewee=self.landlord,
            rating_type='tenant_to_landlord',
            overall_rating=8,
            title='Buen arrendador',
            review_text='Muy buena experiencia con este arrendador.',
            contract=self.contract
        )
        
        # Iniciar sesión
        self.client.login(email='tenant@example.com', password='testpass123')
    
    def test_rating_dashboard_view(self):
        """Probar la vista del panel de calificaciones."""
        response = self.client.get(reverse('ratings:dashboard'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'ratings/dashboard.html')
    
    def test_user_ratings_view(self):
        """Probar la vista de calificaciones de un usuario."""
        response = self.client.get(
            reverse('ratings:user_ratings', kwargs={'user_id': self.landlord.id})
        )
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'ratings/user_ratings.html')
        self.assertContains(response, 'Buen arrendador')
    
    def test_rating_detail_view(self):
        """Probar la vista detallada de una calificación."""
        response = self.client.get(
            reverse('ratings:rating_detail', kwargs={'rating_id': self.rating.id})
        )
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'ratings/rating_detail.html')
        self.assertContains(response, 'Buen arrendador')
        self.assertContains(response, 'Muy buena experiencia')