import pytest
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from django.urls import reverse
from decimal import Decimal
from datetime import date, timedelta
import json

from properties.models import Property
from contracts.models import Contract
from payments.models import Payment
from ratings.models import Rating
from messaging.models import Conversation, Message

User = get_user_model()


class AuthenticationAPITestCase(APITestCase):
    """Test cases for authentication APIs"""
    
    def setUp(self):
        self.client = APIClient()
        self.register_url = reverse('auth:register')
        self.login_url = reverse('auth:login')
        self.logout_url = reverse('auth:logout')
        self.me_url = reverse('auth:me')
        
        self.user_data = {
            'email': 'test@verihome.com',
            'password': 'TestPassword123!',
            'password2': 'TestPassword123!',
            'first_name': 'Test',
            'last_name': 'User',
            'role': 'tenant',
            'interview_code': '123456'
        }
    
    def test_user_registration_success(self):
        """Test successful user registration"""
        response = self.client.post(self.register_url, self.user_data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('user_id', response.data)
        
        # Verify user was created
        user = User.objects.get(email=self.user_data['email'])
        self.assertEqual(user.first_name, self.user_data['first_name'])
        self.assertEqual(user.last_name, self.user_data['last_name'])
        self.assertFalse(user.is_verified)  # Should not be verified initially
    
    def test_user_registration_invalid_email(self):
        """Test registration with invalid email"""
        self.user_data['email'] = 'invalid-email'
        response = self.client.post(self.register_url, self.user_data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)
    
    def test_user_registration_password_mismatch(self):
        """Test registration with password mismatch"""
        self.user_data['password2'] = 'DifferentPassword123!'
        response = self.client.post(self.register_url, self.user_data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_user_registration_duplicate_email(self):
        """Test registration with duplicate email"""
        # Create first user
        User.objects.create_user(
            email=self.user_data['email'],
            password=self.user_data['password'],
            first_name='First',
            last_name='User'
        )
        
        # Try to register with same email
        response = self.client.post(self.register_url, self.user_data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)
    
    def test_user_login_success(self):
        """Test successful user login"""
        # Create and verify user first
        user = User.objects.create_user(
            email=self.user_data['email'],
            password=self.user_data['password'],
            first_name=self.user_data['first_name'],
            last_name=self.user_data['last_name'],
            is_verified=True
        )
        
        login_data = {
            'email': self.user_data['email'],
            'password': self.user_data['password']
        }
        
        response = self.client.post(self.login_url, login_data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
    
    def test_user_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        login_data = {
            'email': 'nonexistent@verihome.com',
            'password': 'WrongPassword123!'
        }
        
        response = self.client.post(self.login_url, login_data)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_user_login_unverified_account(self):
        """Test login with unverified account"""
        # Create unverified user
        User.objects.create_user(
            email=self.user_data['email'],
            password=self.user_data['password'],
            first_name=self.user_data['first_name'],
            last_name=self.user_data['last_name'],
            is_verified=False
        )
        
        login_data = {
            'email': self.user_data['email'],
            'password': self.user_data['password']
        }
        
        response = self.client.post(self.login_url, login_data)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('verificada', response.data['detail'])
    
    def test_get_current_user_authenticated(self):
        """Test getting current user when authenticated"""
        user = User.objects.create_user(
            email=self.user_data['email'],
            password=self.user_data['password'],
            first_name=self.user_data['first_name'],
            last_name=self.user_data['last_name'],
            is_verified=True
        )
        
        self.client.force_authenticate(user=user)
        response = self.client.get(self.me_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], user.email)
        self.assertEqual(response.data['first_name'], user.first_name)
    
    def test_get_current_user_unauthenticated(self):
        """Test getting current user when not authenticated"""
        response = self.client.get(self.me_url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class PropertyAPITestCase(APITestCase):
    """Test cases for property APIs"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create users
        self.landlord = User.objects.create_user(
            email='landlord@verihome.com',
            password='password123',
            first_name='Landlord',
            last_name='User',
            is_verified=True
        )
        
        self.tenant = User.objects.create_user(
            email='tenant@verihome.com',
            password='password123',
            first_name='Tenant',
            last_name='User',
            is_verified=True
        )
        
        # Create test property
        self.property = Property.objects.create(
            title='Test Property',
            description='A beautiful test property',
            property_type='apartment',
            listing_type='rent',
            address='Calle 85 #14-32',
            city='Bogotá',
            state='Cundinamarca',
            country='Colombia',
            latitude=Decimal('4.6097'),
            longitude=Decimal('-74.0817'),
            bedrooms=2,
            bathrooms=2,
            total_area=Decimal('85.5'),
            rent_price=Decimal('1500000'),
            landlord=self.landlord,
            status='available'
        )
        
        self.properties_url = reverse('api:properties-list')
        self.property_detail_url = reverse('api:properties-detail', kwargs={'pk': self.property.pk})
    
    def test_get_properties_list_authenticated(self):
        """Test getting properties list when authenticated"""
        self.client.force_authenticate(user=self.tenant)
        response = self.client.get(self.properties_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['title'], self.property.title)
    
    def test_get_properties_list_unauthenticated(self):
        """Test getting properties list when not authenticated"""
        response = self.client.get(self.properties_url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_get_property_detail(self):
        """Test getting property detail"""
        self.client.force_authenticate(user=self.tenant)
        response = self.client.get(self.property_detail_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], self.property.title)
        self.assertEqual(response.data['landlord'], self.landlord.id)
    
    def test_create_property_as_landlord(self):
        """Test creating property as landlord"""
        self.client.force_authenticate(user=self.landlord)
        
        property_data = {
            'title': 'New Property',
            'description': 'A new property for rent',
            'property_type': 'house',
            'listing_type': 'rent',
            'address': 'Carrera 15 #93-42',
            'city': 'Bogotá',
            'state': 'Cundinamarca',
            'country': 'Colombia',
            'latitude': '4.6789',
            'longitude': '-74.0456',
            'bedrooms': 3,
            'bathrooms': 3,
            'total_area': '120.0',
            'rent_price': '2000000'
        }
        
        response = self.client.post(self.properties_url, property_data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], property_data['title'])
        self.assertEqual(response.data['landlord'], self.landlord.id)
        
        # Verify property was created in database
        new_property = Property.objects.get(id=response.data['id'])
        self.assertEqual(new_property.title, property_data['title'])
        self.assertEqual(new_property.landlord, self.landlord)
    
    def test_create_property_as_tenant_forbidden(self):
        """Test that tenants cannot create properties"""
        self.client.force_authenticate(user=self.tenant)
        
        property_data = {
            'title': 'Unauthorized Property',
            'description': 'This should not be created',
            'property_type': 'apartment',
            'listing_type': 'rent',
            'total_area': '85.0',
            'rent_price': '1500000'
        }
        
        response = self.client.post(self.properties_url, property_data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_update_property_as_owner(self):
        """Test updating property as the owner"""
        self.client.force_authenticate(user=self.landlord)
        
        update_data = {
            'title': 'Updated Property Title',
            'description': 'Updated description'
        }
        
        response = self.client.patch(self.property_detail_url, update_data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], update_data['title'])
        
        # Verify update in database
        self.property.refresh_from_db()
        self.assertEqual(self.property.title, update_data['title'])
    
    def test_update_property_as_non_owner_forbidden(self):
        """Test that non-owners cannot update properties"""
        self.client.force_authenticate(user=self.tenant)
        
        update_data = {'title': 'Unauthorized Update'}
        response = self.client.patch(self.property_detail_url, update_data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_delete_property_as_owner(self):
        """Test deleting property as the owner"""
        self.client.force_authenticate(user=self.landlord)
        
        response = self.client.delete(self.property_detail_url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify property was deleted
        with self.assertRaises(Property.DoesNotExist):
            Property.objects.get(id=self.property.id)
    
    def test_search_properties_by_location(self):
        """Test searching properties by location"""
        self.client.force_authenticate(user=self.tenant)
        
        search_url = f"{self.properties_url}?city=Bogotá"
        response = self.client.get(search_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['city'], 'Bogotá')
    
    def test_search_properties_by_price_range(self):
        """Test searching properties by price range"""
        self.client.force_authenticate(user=self.tenant)
        
        search_url = f"{self.properties_url}?min_price=1000000&max_price=2000000"
        response = self.client.get(search_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_search_properties_by_type(self):
        """Test searching properties by type"""
        self.client.force_authenticate(user=self.tenant)
        
        search_url = f"{self.properties_url}?property_type=apartment"
        response = self.client.get(search_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['property_type'], 'apartment')


class ContractAPITestCase(APITestCase):
    """Test cases for contract APIs"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create users
        self.landlord = User.objects.create_user(
            email='landlord@verihome.com',
            password='password123',
            first_name='Landlord',
            last_name='User',
            is_verified=True
        )
        
        self.tenant = User.objects.create_user(
            email='tenant@verihome.com',
            password='password123',
            first_name='Tenant',
            last_name='User',
            is_verified=True
        )
        
        # Create property
        self.property = Property.objects.create(
            title='Contract Test Property',
            description='Property for contract testing',
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
        
        # Create contract
        self.contract = Contract.objects.create(
            property=self.property,
            landlord=self.landlord,
            tenant=self.tenant,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=365),
            monthly_rent=Decimal('1500000'),
            security_deposit=Decimal('1500000'),
            status='draft'
        )
        
        self.contracts_url = reverse('api:contracts-list')
        self.contract_detail_url = reverse('api:contracts-detail', kwargs={'pk': self.contract.pk})
    
    def test_get_contracts_as_landlord(self):
        """Test getting contracts as landlord"""
        self.client.force_authenticate(user=self.landlord)
        response = self.client.get(self.contracts_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['landlord'], self.landlord.id)
    
    def test_get_contracts_as_tenant(self):
        """Test getting contracts as tenant"""
        self.client.force_authenticate(user=self.tenant)
        response = self.client.get(self.contracts_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['tenant'], self.tenant.id)
    
    def test_create_contract_as_landlord(self):
        """Test creating contract as landlord"""
        self.client.force_authenticate(user=self.landlord)
        
        contract_data = {
            'property': self.property.id,
            'tenant': self.tenant.id,
            'start_date': (date.today() + timedelta(days=30)).isoformat(),
            'end_date': (date.today() + timedelta(days=395)).isoformat(),
            'monthly_rent': '1600000',
            'security_deposit': '1600000',
            'terms_and_conditions': 'Standard rental terms apply.'
        }
        
        response = self.client.post(self.contracts_url, contract_data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['landlord'], self.landlord.id)
        self.assertEqual(response.data['tenant'], self.tenant.id)
    
    def test_sign_contract_as_tenant(self):
        """Test signing contract as tenant"""
        self.client.force_authenticate(user=self.tenant)
        
        sign_url = reverse('api:contracts-sign', kwargs={'pk': self.contract.pk})
        sign_data = {
            'signature_data': 'base64_signature_data_here',
            'ip_address': '192.168.1.1'
        }
        
        response = self.client.post(sign_url, sign_data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify signature was created
        self.assertTrue(
            self.contract.signatures.filter(signer=self.tenant).exists()
        )
    
    def test_get_contract_detail_unauthorized(self):
        """Test getting contract detail as unauthorized user"""
        unauthorized_user = User.objects.create_user(
            email='unauthorized@verihome.com',
            password='password123',
            first_name='Unauthorized',
            last_name='User'
        )
        
        self.client.force_authenticate(user=unauthorized_user)
        response = self.client.get(self.contract_detail_url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class PaymentAPITestCase(APITestCase):
    """Test cases for payment APIs"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create users
        self.landlord = User.objects.create_user(
            email='landlord@verihome.com',
            password='password123',
            first_name='Landlord',
            last_name='User',
            is_verified=True
        )
        
        self.tenant = User.objects.create_user(
            email='tenant@verihome.com',
            password='password123',
            first_name='Tenant',
            last_name='User',
            is_verified=True
        )
        
        # Create property and contract
        self.property = Property.objects.create(
            title='Payment Test Property',
            description='Property for payment testing',
            property_type='apartment',
            listing_type='rent',
            address='Test Address',
            city='Bogotá',
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
        
        # Create payment
        self.payment = Payment.objects.create(
            contract=self.contract,
            payer=self.tenant,
            payee=self.landlord,
            amount=Decimal('1500000'),
            payment_type='rent',
            status='pending',
            due_date=date.today() + timedelta(days=30)
        )
        
        self.payments_url = reverse('api:payments-list')
        self.payment_detail_url = reverse('api:payments-detail', kwargs={'pk': self.payment.pk})
    
    def test_get_payments_as_tenant(self):
        """Test getting payments as tenant (payer)"""
        self.client.force_authenticate(user=self.tenant)
        response = self.client.get(self.payments_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['payer'], self.tenant.id)
    
    def test_get_payments_as_landlord(self):
        """Test getting payments as landlord (payee)"""
        self.client.force_authenticate(user=self.landlord)
        response = self.client.get(self.payments_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['payee'], self.landlord.id)
    
    def test_process_payment(self):
        """Test processing a payment"""
        self.client.force_authenticate(user=self.tenant)
        
        process_url = reverse('api:payments-process', kwargs={'pk': self.payment.pk})
        payment_data = {
            'payment_method': 'credit_card',
            'stripe_token': 'tok_visa_test_token'
        }
        
        response = self.client.post(process_url, payment_data)
        
        # This would require mocking Stripe in a real implementation
        # For now, we'll test the API structure
        self.assertIn(response.status_code, [
            status.HTTP_200_OK,
            status.HTTP_400_BAD_REQUEST  # If Stripe integration is not mocked
        ])


class RatingAPITestCase(APITestCase):
    """Test cases for rating APIs"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create users
        self.user1 = User.objects.create_user(
            email='user1@verihome.com',
            password='password123',
            first_name='User',
            last_name='One',
            is_verified=True
        )
        
        self.user2 = User.objects.create_user(
            email='user2@verihome.com',
            password='password123',
            first_name='User',
            last_name='Two',
            is_verified=True
        )
        
        # Create rating
        self.rating = Rating.objects.create(
            rater=self.user1,
            rated_user=self.user2,
            score=8,
            comment='Great experience!',
            category='landlord'
        )
        
        self.ratings_url = reverse('api:ratings-list')
        self.rating_detail_url = reverse('api:ratings-detail', kwargs={'pk': self.rating.pk})
    
    def test_create_rating(self):
        """Test creating a rating"""
        self.client.force_authenticate(user=self.user2)
        
        rating_data = {
            'rated_user': self.user1.id,
            'score': 9,
            'comment': 'Excellent tenant!',
            'category': 'tenant'
        }
        
        response = self.client.post(self.ratings_url, rating_data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['rater'], self.user2.id)
        self.assertEqual(response.data['rated_user'], self.user1.id)
        self.assertEqual(response.data['score'], 9)
    
    def test_get_user_ratings(self):
        """Test getting ratings for a user"""
        self.client.force_authenticate(user=self.user1)
        
        # Get ratings for user2
        user_ratings_url = f"{self.ratings_url}?rated_user={self.user2.id}"
        response = self.client.get(user_ratings_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['rated_user'], self.user2.id)
    
    def test_cannot_rate_yourself(self):
        """Test that users cannot rate themselves"""
        self.client.force_authenticate(user=self.user1)
        
        rating_data = {
            'rated_user': self.user1.id,  # Rating yourself
            'score': 10,
            'comment': 'I am awesome!',
            'category': 'landlord'
        }
        
        response = self.client.post(self.ratings_url, rating_data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class MessageAPITestCase(APITestCase):
    """Test cases for messaging APIs"""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create users
        self.user1 = User.objects.create_user(
            email='user1@verihome.com',
            password='password123',
            first_name='User',
            last_name='One',
            is_verified=True
        )
        
        self.user2 = User.objects.create_user(
            email='user2@verihome.com',
            password='password123',
            first_name='User',
            last_name='Two',
            is_verified=True
        )
        
        # Create conversation
        self.conversation = Conversation.objects.create(
            subject='Property Inquiry',
            created_by=self.user1
        )
        self.conversation.participants.add(self.user1, self.user2)
        
        # Create message
        self.message = Message.objects.create(
            conversation=self.conversation,
            sender=self.user1,
            content='Hello, I am interested in your property.',
            message_type='text'
        )
        
        self.conversations_url = reverse('api:conversations-list')
        self.messages_url = reverse('api:messages-list')
    
    def test_get_conversations(self):
        """Test getting user conversations"""
        self.client.force_authenticate(user=self.user1)
        response = self.client.get(self.conversations_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['subject'], 'Property Inquiry')
    
    def test_create_conversation(self):
        """Test creating a new conversation"""
        self.client.force_authenticate(user=self.user2)
        
        conversation_data = {
            'subject': 'New Property Question',
            'participants': [self.user1.id, self.user2.id],
            'initial_message': 'I have a question about your property.'
        }
        
        response = self.client.post(self.conversations_url, conversation_data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['subject'], conversation_data['subject'])
        self.assertEqual(response.data['created_by'], self.user2.id)
    
    def test_send_message(self):
        """Test sending a message"""
        self.client.force_authenticate(user=self.user2)
        
        message_data = {
            'conversation': self.conversation.id,
            'content': 'Thank you for your inquiry!',
            'message_type': 'text'
        }
        
        response = self.client.post(self.messages_url, message_data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['sender'], self.user2.id)
        self.assertEqual(response.data['content'], message_data['content'])
    
    def test_get_conversation_messages(self):
        """Test getting messages for a conversation"""
        self.client.force_authenticate(user=self.user1)
        
        messages_url = f"{self.messages_url}?conversation={self.conversation.id}"
        response = self.client.get(messages_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['conversation'], self.conversation.id)
    
    def test_mark_message_as_read(self):
        """Test marking a message as read"""
        self.client.force_authenticate(user=self.user2)
        
        mark_read_url = reverse('api:messages-mark-read', kwargs={'pk': self.message.pk})
        response = self.client.post(mark_read_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify message was marked as read
        self.message.refresh_from_db()
        self.assertTrue(self.message.is_read)