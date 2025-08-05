import pytest
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from decimal import Decimal
from datetime import date, timedelta

from users.models import UserProfile, TenantProfile, LandlordProfile, ServiceProviderProfile
from properties.models import Property, PropertyImage, PropertyFeature
from contracts.models import Contract, ContractSignature
from payments.models import Payment, Transaction, Invoice
from ratings.models import Rating, RatingProfile
from messaging.models import Conversation, Message

User = get_user_model()


class UserModelTestCase(TestCase):
    """Test cases for User model and related profiles"""
    
    def setUp(self):
        self.user_data = {
            'email': 'test@verihome.com',
            'first_name': 'Test',
            'last_name': 'User',
            'password': 'testpassword123'
        }
    
    def test_create_user_with_email(self):
        """Test creating a user with email"""
        user = User.objects.create_user(**self.user_data)
        
        self.assertEqual(user.email, self.user_data['email'])
        self.assertEqual(user.first_name, self.user_data['first_name'])
        self.assertEqual(user.last_name, self.user_data['last_name'])
        self.assertTrue(user.check_password(self.user_data['password']))
        self.assertFalse(user.is_verified)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
    
    def test_create_user_without_email_raises_error(self):
        """Test that creating user without email raises ValueError"""
        with self.assertRaises(ValueError):
            User.objects.create_user(
                email='',
                first_name='Test',
                last_name='User',
                password='testpassword123'
            )
    
    def test_create_superuser(self):
        """Test creating a superuser"""
        superuser = User.objects.create_superuser(
            email='admin@verihome.com',
            first_name='Admin',
            last_name='User',
            password='adminpassword123'
        )
        
        self.assertTrue(superuser.is_staff)
        self.assertTrue(superuser.is_superuser)
        self.assertTrue(superuser.is_verified)
    
    def test_user_string_representation(self):
        """Test user string representation"""
        user = User.objects.create_user(**self.user_data)
        expected_str = f"{user.first_name} {user.last_name} ({user.email})"
        self.assertEqual(str(user), expected_str)
    
    def test_user_profile_creation(self):
        """Test that user profile is created automatically"""
        user = User.objects.create_user(**self.user_data)
        self.assertTrue(hasattr(user, 'profile'))
        self.assertIsInstance(user.profile, UserProfile)
    
    def test_tenant_profile_creation(self):
        """Test creating a tenant profile"""
        user = User.objects.create_user(**self.user_data)
        tenant_profile = TenantProfile.objects.create(
            user=user,
            occupation='Software Engineer',
            monthly_income=Decimal('5000000'),
            preferred_location='Zona Rosa'
        )
        
        self.assertEqual(tenant_profile.user, user)
        self.assertEqual(tenant_profile.occupation, 'Software Engineer')
        self.assertEqual(tenant_profile.monthly_income, Decimal('5000000'))
    
    def test_landlord_profile_creation(self):
        """Test creating a landlord profile"""
        user = User.objects.create_user(**self.user_data)
        landlord_profile = LandlordProfile.objects.create(
            user=user,
            company_name='Real Estate Co.',
            tax_id='123456789',
            bank_account='1234567890'
        )
        
        self.assertEqual(landlord_profile.user, user)
        self.assertEqual(landlord_profile.company_name, 'Real Estate Co.')
        self.assertEqual(landlord_profile.tax_id, '123456789')


class PropertyModelTestCase(TestCase):
    """Test cases for Property model"""
    
    def setUp(self):
        self.landlord = User.objects.create_user(
            email='landlord@verihome.com',
            first_name='Landlord',
            last_name='User',
            password='password123'
        )
        
        self.property_data = {
            'title': 'Beautiful Apartment',
            'description': 'A beautiful apartment in the city center',
            'property_type': 'apartment',
            'listing_type': 'rent',
            'address': 'Calle 85 #14-32',
            'city': 'Bogotá',
            'state': 'Cundinamarca',
            'country': 'Colombia',
            'latitude': Decimal('4.6097'),
            'longitude': Decimal('-74.0817'),
            'bedrooms': 2,
            'bathrooms': 2,
            'total_area': Decimal('85.5'),
            'rent_price': Decimal('1500000'),
            'landlord': self.landlord
        }
    
    def test_create_property(self):
        """Test creating a property"""
        property_obj = Property.objects.create(**self.property_data)
        
        self.assertEqual(property_obj.title, self.property_data['title'])
        self.assertEqual(property_obj.landlord, self.landlord)
        self.assertEqual(property_obj.status, 'available')  # default status
        self.assertTrue(property_obj.is_active)  # default is_active
        self.assertFalse(property_obj.is_featured)  # default is_featured
    
    def test_property_string_representation(self):
        """Test property string representation"""
        property_obj = Property.objects.create(**self.property_data)
        expected_str = f"{property_obj.title} - {property_obj.city}"
        self.assertEqual(str(property_obj), expected_str)
    
    def test_property_price_validation(self):
        """Test that property price cannot be negative"""
        self.property_data['rent_price'] = Decimal('-1000')
        
        with self.assertRaises(ValidationError):
            property_obj = Property(**self.property_data)
            property_obj.full_clean()
    
    def test_property_area_validation(self):
        """Test that property area cannot be zero or negative"""
        self.property_data['total_area'] = Decimal('0')
        
        with self.assertRaises(ValidationError):
            property_obj = Property(**self.property_data)
            property_obj.full_clean()
    
    def test_property_get_absolute_url(self):
        """Test property get_absolute_url method"""
        property_obj = Property.objects.create(**self.property_data)
        expected_url = f"/properties/{property_obj.id}/"
        self.assertEqual(property_obj.get_absolute_url(), expected_url)
    
    def test_property_is_available(self):
        """Test property availability check"""
        property_obj = Property.objects.create(**self.property_data)
        
        # Property should be available by default
        self.assertTrue(property_obj.is_available())
        
        # Set property as rented
        property_obj.status = 'rented'
        property_obj.save()
        self.assertFalse(property_obj.is_available())
    
    def test_property_images_relationship(self):
        """Test property images relationship"""
        property_obj = Property.objects.create(**self.property_data)
        
        # Create property images
        image1 = PropertyImage.objects.create(
            property=property_obj,
            image='path/to/image1.jpg',
            is_main=True
        )
        image2 = PropertyImage.objects.create(
            property=property_obj,
            image='path/to/image2.jpg',
            is_main=False
        )
        
        self.assertEqual(property_obj.images.count(), 2)
        self.assertEqual(property_obj.get_main_image(), image1)


class ContractModelTestCase(TestCase):
    """Test cases for Contract model"""
    
    def setUp(self):
        self.landlord = User.objects.create_user(
            email='landlord@verihome.com',
            first_name='Landlord',
            last_name='User',
            password='password123'
        )
        
        self.tenant = User.objects.create_user(
            email='tenant@verihome.com',
            first_name='Tenant',
            last_name='User',
            password='password123'
        )
        
        self.property = Property.objects.create(
            title='Test Property',
            description='A test property',
            property_type='apartment',
            listing_type='rent',
            address='Test Address',
            city='Bogotá',
            state='Cundinamarca',
            country='Colombia',
            latitude=Decimal('4.6097'),
            longitude=Decimal('-74.0817'),
            bedrooms=2,
            bathrooms=2,
            total_area=Decimal('85.5'),
            rent_price=Decimal('1500000'),
            landlord=self.landlord
        )
    
    def test_create_contract(self):
        """Test creating a contract"""
        contract = Contract.objects.create(
            property=self.property,
            landlord=self.landlord,
            tenant=self.tenant,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=365),
            monthly_rent=Decimal('1500000'),
            security_deposit=Decimal('1500000'),
            status='draft'
        )
        
        self.assertEqual(contract.property, self.property)
        self.assertEqual(contract.landlord, self.landlord)
        self.assertEqual(contract.tenant, self.tenant)
        self.assertEqual(contract.status, 'draft')
    
    def test_contract_string_representation(self):
        """Test contract string representation"""
        contract = Contract.objects.create(
            property=self.property,
            landlord=self.landlord,
            tenant=self.tenant,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=365),
            monthly_rent=Decimal('1500000'),
            security_deposit=Decimal('1500000'),
            status='draft'
        )
        
        expected_str = f"Contract {contract.id} - {self.property.title}"
        self.assertEqual(str(contract), expected_str)
    
    def test_contract_duration_calculation(self):
        """Test contract duration calculation"""
        start_date = date.today()
        end_date = start_date + timedelta(days=365)
        
        contract = Contract.objects.create(
            property=self.property,
            landlord=self.landlord,
            tenant=self.tenant,
            start_date=start_date,
            end_date=end_date,
            monthly_rent=Decimal('1500000'),
            security_deposit=Decimal('1500000'),
            status='draft'
        )
        
        self.assertEqual(contract.get_duration_days(), 365)
    
    def test_contract_is_active(self):
        """Test contract active status"""
        # Create an active contract
        active_contract = Contract.objects.create(
            property=self.property,
            landlord=self.landlord,
            tenant=self.tenant,
            start_date=date.today() - timedelta(days=30),
            end_date=date.today() + timedelta(days=335),
            monthly_rent=Decimal('1500000'),
            security_deposit=Decimal('1500000'),
            status='active'
        )
        
        self.assertTrue(active_contract.is_currently_active())
        
        # Create an expired contract
        expired_contract = Contract.objects.create(
            property=self.property,
            landlord=self.landlord,
            tenant=self.tenant,
            start_date=date.today() - timedelta(days=400),
            end_date=date.today() - timedelta(days=35),
            monthly_rent=Decimal('1500000'),
            security_deposit=Decimal('1500000'),
            status='expired'
        )
        
        self.assertFalse(expired_contract.is_currently_active())


class PaymentModelTestCase(TestCase):
    """Test cases for Payment model"""
    
    def setUp(self):
        self.landlord = User.objects.create_user(
            email='landlord@verihome.com',
            first_name='Landlord',
            last_name='User',
            password='password123'
        )
        
        self.tenant = User.objects.create_user(
            email='tenant@verihome.com',
            first_name='Tenant',
            last_name='User',
            password='password123'
        )
        
        self.property = Property.objects.create(
            title='Test Property',
            description='A test property',
            property_type='apartment',
            listing_type='rent',
            address='Test Address',
            city='Bogotá',
            state='Cundinamarca',
            country='Colombia',
            bedrooms=2,
            bathrooms=2,
            total_area=Decimal('85.5'),
            rent_price=Decimal('1500000'),
            landlord=self.landlord
        )
        
        self.contract = Contract.objects.create(
            property=self.property,
            landlord=self.landlord,
            tenant=self.tenant,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=365),
            monthly_rent=Decimal('1500000'),
            security_deposit=Decimal('1500000'),
            status='active'
        )
    
    def test_create_payment(self):
        """Test creating a payment"""
        payment = Payment.objects.create(
            contract=self.contract,
            payer=self.tenant,
            payee=self.landlord,
            amount=Decimal('1500000'),
            payment_type='rent',
            status='pending',
            due_date=date.today() + timedelta(days=30)
        )
        
        self.assertEqual(payment.contract, self.contract)
        self.assertEqual(payment.payer, self.tenant)
        self.assertEqual(payment.payee, self.landlord)
        self.assertEqual(payment.amount, Decimal('1500000'))
        self.assertEqual(payment.status, 'pending')
    
    def test_payment_string_representation(self):
        """Test payment string representation"""
        payment = Payment.objects.create(
            contract=self.contract,
            payer=self.tenant,
            payee=self.landlord,
            amount=Decimal('1500000'),
            payment_type='rent',
            status='pending',
            due_date=date.today() + timedelta(days=30)
        )
        
        expected_str = f"Payment {payment.id} - {payment.amount} ({payment.payment_type})"
        self.assertEqual(str(payment), expected_str)
    
    def test_payment_is_overdue(self):
        """Test payment overdue status"""
        # Create overdue payment
        overdue_payment = Payment.objects.create(
            contract=self.contract,
            payer=self.tenant,
            payee=self.landlord,
            amount=Decimal('1500000'),
            payment_type='rent',
            status='pending',
            due_date=date.today() - timedelta(days=5)
        )
        
        self.assertTrue(overdue_payment.is_overdue())
        
        # Create future payment
        future_payment = Payment.objects.create(
            contract=self.contract,
            payer=self.tenant,
            payee=self.landlord,
            amount=Decimal('1500000'),
            payment_type='rent',
            status='pending',
            due_date=date.today() + timedelta(days=30)
        )
        
        self.assertFalse(future_payment.is_overdue())


class RatingModelTestCase(TestCase):
    """Test cases for Rating model"""
    
    def setUp(self):
        self.rater = User.objects.create_user(
            email='rater@verihome.com',
            first_name='Rater',
            last_name='User',
            password='password123'
        )
        
        self.rated = User.objects.create_user(
            email='rated@verihome.com',
            first_name='Rated',
            last_name='User',
            password='password123'
        )
    
    def test_create_rating(self):
        """Test creating a rating"""
        rating = Rating.objects.create(
            rater=self.rater,
            rated_user=self.rated,
            score=8,
            comment='Great landlord, very responsive!',
            category='landlord'
        )
        
        self.assertEqual(rating.rater, self.rater)
        self.assertEqual(rating.rated_user, self.rated)
        self.assertEqual(rating.score, 8)
        self.assertEqual(rating.category, 'landlord')
    
    def test_rating_score_validation(self):
        """Test rating score validation (1-10)"""
        # Test invalid low score
        with self.assertRaises(ValidationError):
            rating = Rating(
                rater=self.rater,
                rated_user=self.rated,
                score=0,
                comment='Invalid score',
                category='landlord'
            )
            rating.full_clean()
        
        # Test invalid high score
        with self.assertRaises(ValidationError):
            rating = Rating(
                rater=self.rater,
                rated_user=self.rated,
                score=11,
                comment='Invalid score',
                category='landlord'
            )
            rating.full_clean()
        
        # Test valid score
        rating = Rating(
            rater=self.rater,
            rated_user=self.rated,
            score=8,
            comment='Valid score',
            category='landlord'
        )
        rating.full_clean()  # Should not raise
    
    def test_rating_profile_creation(self):
        """Test that rating profiles are created automatically"""
        # Create a rating
        Rating.objects.create(
            rater=self.rater,
            rated_user=self.rated,
            score=8,
            comment='Great experience!',
            category='landlord'
        )
        
        # Check that rating profile exists for rated user
        rating_profile = RatingProfile.objects.get(user=self.rated)
        self.assertEqual(rating_profile.total_ratings, 1)
        self.assertEqual(rating_profile.average_score, 8.0)


class MessageModelTestCase(TestCase):
    """Test cases for Message and Conversation models"""
    
    def setUp(self):
        self.user1 = User.objects.create_user(
            email='user1@verihome.com',
            first_name='User',
            last_name='One',
            password='password123'
        )
        
        self.user2 = User.objects.create_user(
            email='user2@verihome.com',
            first_name='User',
            last_name='Two',
            password='password123'
        )
    
    def test_create_conversation(self):
        """Test creating a conversation"""
        conversation = Conversation.objects.create(
            subject='Property Inquiry',
            created_by=self.user1
        )
        conversation.participants.add(self.user1, self.user2)
        
        self.assertEqual(conversation.subject, 'Property Inquiry')
        self.assertEqual(conversation.created_by, self.user1)
        self.assertEqual(conversation.participants.count(), 2)
    
    def test_create_message(self):
        """Test creating a message"""
        conversation = Conversation.objects.create(
            subject='Property Inquiry',
            created_by=self.user1
        )
        conversation.participants.add(self.user1, self.user2)
        
        message = Message.objects.create(
            conversation=conversation,
            sender=self.user1,
            content='Hello, I am interested in your property.',
            message_type='text'
        )
        
        self.assertEqual(message.conversation, conversation)
        self.assertEqual(message.sender, self.user1)
        self.assertEqual(message.content, 'Hello, I am interested in your property.')
        self.assertFalse(message.is_read)
    
    def test_message_string_representation(self):
        """Test message string representation"""
        conversation = Conversation.objects.create(
            subject='Property Inquiry',
            created_by=self.user1
        )
        
        message = Message.objects.create(
            conversation=conversation,
            sender=self.user1,
            content='Test message content',
            message_type='text'
        )
        
        expected_str = f"Message from {self.user1.email} in {conversation.subject}"
        self.assertEqual(str(message), expected_str)
    
    def test_conversation_last_message(self):
        """Test getting last message from conversation"""
        conversation = Conversation.objects.create(
            subject='Property Inquiry',
            created_by=self.user1
        )
        conversation.participants.add(self.user1, self.user2)
        
        # Create messages
        message1 = Message.objects.create(
            conversation=conversation,
            sender=self.user1,
            content='First message',
            message_type='text'
        )
        
        message2 = Message.objects.create(
            conversation=conversation,
            sender=self.user2,
            content='Second message',
            message_type='text'
        )
        
        self.assertEqual(conversation.get_last_message(), message2)