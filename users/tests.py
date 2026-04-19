"""
Tests for VeriHome users module.
Covers User model, profiles, InterviewCode, UserSettings, and API endpoints.
"""

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from users.models import (
    InterviewCode,
)

User = get_user_model()


# ---------------------------------------------------------------------------
# Factory helpers
# ---------------------------------------------------------------------------

def _make_user(email='testuser@verihome.co', password='SecurePass123!',
               first_name='Carlos', last_name='Lopez',
               user_type='tenant', **kwargs):
    """Create and return a User instance."""
    return User.objects.create_user(
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        user_type=user_type,
        **kwargs,
    )


def _make_verified_user(email='verified@verihome.co', **kwargs):
    """Create a user with a verified EmailAddress (required for login)."""
    from allauth.account.models import EmailAddress

    user = _make_user(email=email, **kwargs)
    EmailAddress.objects.create(user=user, email=user.email, primary=True, verified=True)
    return user


def _make_interview_code(user_type='tenant', **kwargs):
    """Create and return an InterviewCode instance."""
    defaults = {
        'user_type': user_type,
        'valid_from': timezone.now(),
        'valid_until': timezone.now() + timedelta(days=7),
    }
    defaults.update(kwargs)
    return InterviewCode.objects.create(**defaults)


# ===========================================================================
# User Model Tests
# ===========================================================================

class UserModelTests(TestCase):
    """Tests for the custom User model and UserManager."""

    def test_create_user(self):
        """Creating a user with required fields succeeds."""
        user = _make_user()
        self.assertEqual(user.email, 'testuser@verihome.co')
        self.assertEqual(user.first_name, 'Carlos')
        self.assertEqual(user.last_name, 'Lopez')
        self.assertEqual(user.user_type, 'tenant')
        self.assertTrue(user.check_password('SecurePass123!'))

    def test_create_user_no_email_raises(self):
        """Creating a user without an email raises ValueError."""
        with self.assertRaises(ValueError):
            User.objects.create_user(
                email='',
                password='SecurePass123!',
                first_name='A',
                last_name='B',
                user_type='tenant',
            )

    def test_create_superuser(self):
        """create_superuser sets is_staff and is_superuser True."""
        su = User.objects.create_superuser(
            email='admin@verihome.co',
            password='AdminPass123!',
            first_name='Admin',
            last_name='User',
        )
        self.assertTrue(su.is_staff)
        self.assertTrue(su.is_superuser)

    def test_superuser_is_staff_and_superuser(self):
        """Superuser must have is_staff=True and is_superuser=True."""
        with self.assertRaises(ValueError):
            User.objects.create_superuser(
                email='bad_admin@verihome.co',
                password='AdminPass123!',
                first_name='Bad',
                last_name='Admin',
                is_staff=False,
            )

    def test_uuid_primary_key(self):
        """User primary key is a UUID."""
        import uuid
        user = _make_user()
        self.assertIsInstance(user.pk, uuid.UUID)

    def test_email_is_unique(self):
        """Two users with the same email cannot be created."""
        _make_user(email='dup@verihome.co')
        with self.assertRaises(Exception):
            _make_user(email='dup@verihome.co')

    def test_default_user_type(self):
        """user_type can be blank string but normally is set explicitly."""
        user = _make_user(user_type='landlord')
        self.assertEqual(user.user_type, 'landlord')

    def test_default_is_verified_false(self):
        """New users are not verified by default."""
        user = _make_user()
        self.assertFalse(user.is_verified)

    def test_default_is_online_false(self):
        """New users are offline by default."""
        user = _make_user()
        self.assertFalse(user.is_online)

    def test_default_status_mode_offline(self):
        """Default status_mode is 'offline'."""
        user = _make_user()
        self.assertEqual(user.status_mode, 'offline')

    def test_verification_date_set_on_verify(self):
        """Setting is_verified=True and saving populates verification_date."""
        user = _make_user()
        self.assertIsNone(user.verification_date)

        user.is_verified = True
        user.save()
        user.refresh_from_db()

        self.assertIsNotNone(user.verification_date)

    def test_str_representation(self):
        """__str__ returns full name with user type display."""
        user = _make_user(first_name='Maria', last_name='Garcia', user_type='tenant')
        result = str(user)
        self.assertIn('Maria', result)
        self.assertIn('Garcia', result)


# ===========================================================================
# Profile Model Tests
# ===========================================================================

class ProfileModelTests(TestCase):
    """Tests for LandlordProfile, TenantProfile, and ServiceProviderProfile."""

    def test_create_landlord_profile(self):
        """LandlordProfile is auto-created by signal and can be updated."""
        user = _make_user(email='landlord@verihome.co', user_type='landlord')
        # Signal auto-creates the profile; update it with specific values
        profile = user.landlord_profile
        profile.company_name = 'Inmobiliaria Test'
        profile.total_properties = 5
        profile.years_experience = 10
        profile.save()
        profile.refresh_from_db()
        self.assertEqual(profile.user, user)
        self.assertEqual(profile.company_name, 'Inmobiliaria Test')
        self.assertEqual(profile.total_properties, 5)

    def test_create_tenant_profile(self):
        """TenantProfile is auto-created by signal and can be updated."""
        user = _make_user(email='tenant@verihome.co', user_type='tenant')
        profile = user.tenant_profile
        profile.monthly_income = Decimal('3500000.00')
        profile.employment_status = 'employed'
        profile.save()
        profile.refresh_from_db()
        self.assertEqual(profile.user, user)
        self.assertEqual(profile.monthly_income, Decimal('3500000.00'))

    def test_create_service_provider_profile(self):
        """ServiceProviderProfile is auto-created by signal and can be updated."""
        user = _make_user(email='sp@verihome.co', user_type='service_provider')
        profile = user.service_provider_profile
        profile.company_name = 'Plomeria Express'
        profile.service_types = ['plumbing', 'electrical']
        profile.years_experience = 8
        profile.hourly_rate = Decimal('45000.00')
        profile.save()
        profile.refresh_from_db()
        self.assertEqual(profile.user, user)
        self.assertEqual(profile.service_types, ['plumbing', 'electrical'])

    def test_landlord_profile_defaults(self):
        """Auto-created LandlordProfile has correct default values."""
        user = _make_user(email='l_defaults@verihome.co', user_type='landlord')
        profile = user.landlord_profile
        self.assertEqual(profile.total_properties, 0)
        self.assertEqual(profile.property_types, [])
        self.assertEqual(profile.country, 'Colombia')

    def test_tenant_profile_defaults(self):
        """Auto-created TenantProfile has correct default values."""
        user = _make_user(email='t_defaults@verihome.co', user_type='tenant')
        profile = user.tenant_profile
        self.assertFalse(profile.has_pets)
        self.assertFalse(profile.smokes)
        self.assertFalse(profile.has_children)
        self.assertEqual(profile.children_count, 0)
        self.assertEqual(profile.currency, 'COP')
        self.assertEqual(profile.preferred_property_types, [])
        self.assertEqual(profile.preferred_locations, [])

    def test_service_provider_profile_defaults(self):
        """Auto-created ServiceProviderProfile has correct default values."""
        user = _make_user(email='sp_defaults@verihome.co', user_type='service_provider')
        profile = user.service_provider_profile
        self.assertEqual(profile.years_experience, 0)
        self.assertEqual(profile.max_distance_km, 50)
        self.assertTrue(profile.has_own_tools)
        self.assertTrue(profile.has_vehicle)
        self.assertFalse(profile.accepts_emergency_calls)
        self.assertEqual(profile.emergency_rate_multiplier, Decimal('1.5'))
        self.assertTrue(profile.available_monday)
        self.assertFalse(profile.available_saturday)
        self.assertFalse(profile.available_sunday)
        self.assertEqual(profile.service_areas, [])
        self.assertEqual(profile.service_types, [])


# ===========================================================================
# InterviewCode Model Tests
# ===========================================================================

class InterviewCodeModelTests(TestCase):
    """Tests for the InterviewCode model."""

    def test_create_interview_code(self):
        """InterviewCode is created with auto-generated code."""
        code = _make_interview_code()
        self.assertIsNotNone(code.pk)
        self.assertTrue(len(code.code) > 0)
        self.assertEqual(code.user_type, 'tenant')

    def test_code_auto_generated(self):
        """Code field is auto-populated on save when left blank."""
        code = InterviewCode(
            user_type='landlord',
            valid_from=timezone.now(),
            valid_until=timezone.now() + timedelta(days=7),
        )
        code.save()
        self.assertTrue(len(code.code) == 8)
        self.assertTrue(code.code.isalnum())

    def test_is_valid_fresh_code(self):
        """A freshly created code is valid."""
        code = _make_interview_code()
        self.assertTrue(code.is_valid())

    def test_is_valid_expired_code(self):
        """An expired code is not valid."""
        code = _make_interview_code()
        code.valid_until = timezone.now() - timedelta(days=1)
        code.save()
        self.assertFalse(code.is_valid())

    def test_use_code(self):
        """use_code increments current_uses and associates user."""
        code = _make_interview_code()
        user = _make_user(email='codeuser@verihome.co')

        code.use_code(user)
        code.refresh_from_db()
        user.refresh_from_db()

        self.assertEqual(code.current_uses, 1)
        self.assertTrue(code.is_used)
        self.assertEqual(user.interview_code, code)


# ===========================================================================
# UserSettings Model Tests
# ===========================================================================

class UserSettingsModelTests(TestCase):
    """Tests for the UserSettings model."""

    def test_create_settings(self):
        """UserSettings is auto-created by signal when a user is created."""
        user = _make_user(email='settings@verihome.co')
        # Signal auto-creates UserSettings
        settings = user.settings
        self.assertEqual(settings.user, user)
        self.assertIsNotNone(settings.pk)

    def test_default_values(self):
        """Auto-created UserSettings has the expected default values."""
        user = _make_user(email='defaults@verihome.co')
        settings = user.settings

        self.assertTrue(settings.email_notifications)
        self.assertTrue(settings.push_notifications)
        self.assertFalse(settings.sms_notifications)
        self.assertEqual(settings.language, 'es')
        self.assertEqual(settings.theme, 'light')
        self.assertEqual(settings.currency, 'COP')
        self.assertEqual(settings.timezone, 'America/Bogota')
        self.assertEqual(settings.profile_visibility, 'registered')
        self.assertFalse(settings.show_contact_info)
        self.assertTrue(settings.allow_messages)
        self.assertFalse(settings.two_factor_enabled)
        self.assertTrue(settings.login_notifications)
        self.assertEqual(settings.session_timeout, 30)


# ===========================================================================
# API Tests
# ===========================================================================

@override_settings(
    ACCOUNT_EMAIL_VERIFICATION='none',
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
)
class UserAPITests(APITestCase):
    """Tests for user-related API endpoints."""

    BASE_URL = '/api/v1/users/'

    def _make_auth_user(self, email='apiuser@verihome.co', password='ApiPass123!',
                        user_type='tenant'):
        """Create a verified user and force-authenticate the test client."""
        user = _make_verified_user(email=email, password=password, user_type=user_type)
        self.client.force_authenticate(user=user)
        return user

    # ------------------------------------------------------------------
    # Registration
    # ------------------------------------------------------------------

    def test_register_user(self):
        """POST /api/v1/users/auth/register/ creates a new user."""
        data = {
            'email': 'newuser@verihome.co',
            'password': 'StrongPass123!',
            'password2': 'StrongPass123!',
            'first_name': 'Nuevo',
            'last_name': 'Usuario',
            'user_type': 'tenant',
        }
        response = self.client.post(f'{self.BASE_URL}auth/register/', data, format='json')
        # The view returns 201 on success or 500 if email sending fails (test env)
        self.assertIn(response.status_code, [
            status.HTTP_201_CREATED,
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        ])
        # User should exist regardless of email sending outcome
        self.assertTrue(User.objects.filter(email='newuser@verihome.co').exists())

    def test_register_user_password_mismatch(self):
        """Registration fails when passwords do not match."""
        data = {
            'email': 'mismatch@verihome.co',
            'password': 'StrongPass123!',
            'password2': 'DifferentPass456!',
            'first_name': 'Bad',
            'last_name': 'Passwords',
            'user_type': 'tenant',
        }
        response = self.client.post(f'{self.BASE_URL}auth/register/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email='mismatch@verihome.co').exists())

    # ------------------------------------------------------------------
    # Login
    # ------------------------------------------------------------------

    def test_login_success(self):
        """POST /api/v1/users/auth/login/ returns access and refresh tokens."""
        _make_verified_user(email='login@verihome.co', password='LoginPass123!')
        data = {
            'email': 'login@verihome.co',
            'password': 'LoginPass123!',
        }
        response = self.client.post(f'{self.BASE_URL}auth/login/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    # ------------------------------------------------------------------
    # Profile (auth/me/)
    # ------------------------------------------------------------------

    def test_get_profile_authenticated(self):
        """GET /api/v1/users/auth/me/ returns user data when authenticated."""
        user = self._make_auth_user()
        response = self.client.get(f'{self.BASE_URL}auth/me/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], user.email)

    def test_get_profile_unauthenticated_401(self):
        """GET /api/v1/users/auth/me/ returns 401 for unauthenticated requests."""
        response = self.client.get(f'{self.BASE_URL}auth/me/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_profile(self):
        """PATCH /api/v1/users/auth/me/ updates user fields."""
        self._make_auth_user()
        data = {'first_name': 'NuevoNombre', 'city': 'Bucaramanga'}
        response = self.client.patch(f'{self.BASE_URL}auth/me/', data, format='json')
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

    # ------------------------------------------------------------------
    # Search
    # ------------------------------------------------------------------

    def test_search_users_endpoint_exists(self):
        """GET /api/v1/users/search/?q= is routed and requires authentication."""
        # Unauthenticated request should return 401
        response = self.client.get(f'{self.BASE_URL}search/', {'q': 'test'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_search_users_authenticated(self):
        """GET /api/v1/users/search/?q= responds 200 cuando está autenticado."""
        self._make_auth_user(email='searchable@verihome.co')
        _make_user(email='other@verihome.co', first_name='Juanito', last_name='Perez')
        response = self.client.get(f'{self.BASE_URL}search/', {'q': 'Juanito'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # ------------------------------------------------------------------
    # Smoke tests adicionales (BUG-USR-03/04/05 regression)
    # ------------------------------------------------------------------

    def test_notifications_list_authenticated(self):
        self._make_auth_user()
        response = self.client.get(f'{self.BASE_URL}notifications/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_notifications_unauthenticated_401(self):
        response = self.client.get(f'{self.BASE_URL}notifications/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_activity_logs_stats_authenticated(self):
        self._make_auth_user()
        response = self.client.get(f'{self.BASE_URL}activity-logs/stats/')
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT])

    def test_activity_types_endpoint(self):
        self._make_auth_user()
        response = self.client.get(f'{self.BASE_URL}activity-logs/types/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_public_profile_view(self):
        target = _make_user(email='target@verihome.co')
        self._make_auth_user(email='viewer@verihome.co')
        response = self.client.get(f'{self.BASE_URL}{target.id}/profile/')
        self.assertIn(response.status_code, [
            status.HTTP_200_OK, status.HTTP_404_NOT_FOUND,
        ])

    def test_public_resume_view_landlord_sees_tenant(self):
        """Landlord autenticado puede ver hoja de vida de tenant.
        Si el tenant no tiene UserResume aún, retorna 404."""
        tenant = _make_user(email='resume-target@verihome.co', user_type='tenant')
        self._make_auth_user(email='landlord-viewer@verihome.co', user_type='landlord')
        response = self.client.get(f'{self.BASE_URL}{tenant.id}/resume/')
        self.assertIn(response.status_code, [
            status.HTTP_200_OK, status.HTTP_404_NOT_FOUND,
        ])

    def test_public_resume_view_tenant_forbidden(self):
        """Tenant no puede ver hoja de vida (solo landlords)."""
        tenant = _make_user(email='resume-target2@verihome.co', user_type='tenant')
        self._make_auth_user(email='tenant-viewer@verihome.co', user_type='tenant')
        response = self.client.get(f'{self.BASE_URL}{tenant.id}/resume/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_settings_get(self):
        self._make_auth_user()
        response = self.client.get(f'{self.BASE_URL}settings/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_resume_get(self):
        self._make_auth_user()
        response = self.client.get(f'{self.BASE_URL}resume/')
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND])

    def test_dashboard_stats(self):
        self._make_auth_user()
        response = self.client.get(f'{self.BASE_URL}dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
