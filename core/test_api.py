"""
Tests for the core app.

Covers models (ContactMessage, FAQ, SupportTicket, TicketResponse),
public API endpoints (contact form, FAQs), and ticket CRUD with permissions.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from .models import ContactMessage, FAQ, SupportTicket, TicketResponse, Notification

User = get_user_model()


# ---------------------------------------------------------------------------
# Helper factories
# ---------------------------------------------------------------------------

def _make_user(email='user@verihome.co', password='SecurePass123!', **kwargs):
    defaults = {
        'first_name': 'Test',
        'last_name': 'User',
        'user_type': 'tenant',
    }
    defaults.update(kwargs)
    return User.objects.create_user(email=email, password=password, **defaults)


def _make_staff_user(email='staff@verihome.co', **kwargs):
    return _make_user(email=email, is_staff=True, user_type='landlord', **kwargs)


def _make_faq(**kwargs):
    defaults = {
        'category': 'general',
        'question': 'Como funciona VeriHome?',
        'answer': 'VeriHome conecta arrendadores con arrendatarios.',
        'is_published': True,
        'order': 0,
    }
    defaults.update(kwargs)
    return FAQ.objects.create(**defaults)


def _make_ticket(user=None, **kwargs):
    defaults = {
        'subject': 'Problema con mi contrato',
        'description': 'No puedo ver el estado de mi contrato.',
        'category': 'contract',
        'department': 'legal',
        'priority': 'normal',
    }
    if user:
        defaults['created_by'] = user
    defaults.update(kwargs)
    return SupportTicket.objects.create(**defaults)


# ===========================================================================
# Model tests
# ===========================================================================


class ContactMessageModelTests(TestCase):
    """Tests for the ContactMessage model."""

    def test_create_contact_message(self):
        msg = ContactMessage.objects.create(
            name='Juan Perez',
            email='juan@example.com',
            subject='Consulta general',
            message='Quiero saber mas sobre VeriHome.',
        )
        self.assertIsNotNone(msg.pk)
        self.assertEqual(msg.status, 'new')

    def test_str_representation(self):
        msg = ContactMessage.objects.create(
            name='Maria',
            email='maria@test.com',
            subject='Info',
            message='Hola',
        )
        self.assertIn('Info', str(msg))
        self.assertIn('Maria', str(msg))

    def test_default_email_notified_false(self):
        msg = ContactMessage.objects.create(
            name='Test',
            email='t@t.com',
            subject='S',
            message='M',
        )
        self.assertFalse(msg.email_notified)

    def test_timestamps_set(self):
        msg = ContactMessage.objects.create(
            name='Test',
            email='t@t.com',
            subject='S',
            message='M',
        )
        self.assertIsNotNone(msg.created_at)


class FAQModelTests(TestCase):
    """Tests for the FAQ model."""

    def test_create_faq(self):
        faq = _make_faq()
        self.assertIsNotNone(faq.pk)
        self.assertEqual(faq.category, 'general')

    def test_str_representation(self):
        faq = _make_faq(question='Cual es el costo?')
        self.assertIn('Cual es el costo?', str(faq))

    def test_default_counters(self):
        faq = _make_faq()
        self.assertEqual(faq.view_count, 0)
        self.assertEqual(faq.helpful_count, 0)

    def test_ordering_by_category_and_order(self):
        faq1 = _make_faq(category='payments', order=2, question='Q2')
        faq2 = _make_faq(category='general', order=1, question='Q1')
        faqs = list(FAQ.objects.all())
        # general comes before payments alphabetically
        self.assertEqual(faqs[0], faq2)


class SupportTicketModelTests(TestCase):
    """Tests for the SupportTicket model."""

    def setUp(self):
        self.user = _make_user()

    def test_create_ticket(self):
        ticket = _make_ticket(user=self.user)
        self.assertIsNotNone(ticket.pk)
        self.assertTrue(ticket.ticket_number.startswith('SPT-'))

    def test_auto_ticket_number(self):
        ticket = _make_ticket(user=self.user)
        self.assertRegex(ticket.ticket_number, r'^SPT-\d{4}-\d{5}$')

    def test_default_status_open(self):
        ticket = _make_ticket(user=self.user)
        self.assertEqual(ticket.status, 'open')

    def test_str_representation(self):
        ticket = _make_ticket(user=self.user, subject='Mi problema')
        self.assertIn('Mi problema', str(ticket))

    def test_ticket_without_user(self):
        """Tickets from contact form have no created_by."""
        ticket = _make_ticket()
        self.assertIsNone(ticket.created_by)


class TicketResponseModelTests(TestCase):
    """Tests for the TicketResponse model."""

    def setUp(self):
        self.user = _make_user()
        self.ticket = _make_ticket(user=self.user)

    def test_create_response(self):
        resp = TicketResponse.objects.create(
            ticket=self.ticket,
            author=self.user,
            message='Gracias por reportar.',
        )
        self.assertIsNotNone(resp.pk)
        self.assertFalse(resp.is_internal)

    def test_str_representation(self):
        resp = TicketResponse.objects.create(
            ticket=self.ticket,
            author=self.user,
            message='Test response',
        )
        self.assertIn(self.ticket.ticket_number, str(resp))


# ===========================================================================
# API / Endpoint tests
# ===========================================================================


class ContactFormAPITests(APITestCase):
    """Tests for the public contact form endpoint."""

    def setUp(self):
        self.client = APIClient()
        self.url = '/api/v1/core/contact/'

    def test_contact_post_success(self):
        data = {
            'name': 'Carlos Garcia',
            'email': 'carlos@example.com',
            'subject': 'Consulta general',
            'message': 'Quiero informacion sobre contratos.',
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('message', response.data)
        # Verify saved in DB
        self.assertEqual(ContactMessage.objects.count(), 1)

    def test_contact_creates_support_ticket(self):
        data = {
            'name': 'Ana',
            'email': 'ana@example.com',
            'subject': 'Problema con pago',
            'message': 'No puedo pagar.',
        }
        self.client.post(self.url, data)
        self.assertEqual(SupportTicket.objects.count(), 1)
        ticket = SupportTicket.objects.first()
        self.assertEqual(ticket.department, 'billing')

    def test_contact_missing_name(self):
        data = {
            'email': 'test@test.com',
            'subject': 'Test',
            'message': 'Test',
        }
        response = self.client.post(self.url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('name', response.data.get('errors', {}))

    def test_contact_missing_all_fields(self):
        response = self.client.post(self.url, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        errors = response.data.get('errors', {})
        self.assertIn('name', errors)
        self.assertIn('email', errors)
        self.assertIn('subject', errors)
        self.assertIn('message', errors)

    def test_contact_get_not_allowed(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class FAQAPITests(APITestCase):
    """Tests for the FAQ list endpoint."""

    def setUp(self):
        self.client = APIClient()
        self.url = '/api/v1/core/faqs/'
        self.faq1 = _make_faq(category='general', question='Q1')
        self.faq2 = _make_faq(category='payments', question='Q2')
        self.faq_unpublished = _make_faq(
            category='general', question='Hidden', is_published=False
        )

    def test_faq_list_public(self):
        """FAQs endpoint does not require auth."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_faq_list_returns_published_only(self):
        response = self.client.get(self.url)
        questions = [f['question'] for f in response.data]
        self.assertIn('Q1', questions)
        self.assertIn('Q2', questions)
        self.assertNotIn('Hidden', questions)

    def test_faq_filter_by_category(self):
        response = self.client.get(self.url, {'category': 'payments'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['question'], 'Q2')

    def test_faq_response_fields(self):
        response = self.client.get(self.url)
        first = response.data[0]
        self.assertIn('question', first)
        self.assertIn('answer', first)
        self.assertIn('category', first)
        self.assertIn('category_display', first)


class SupportTicketAPITests(APITestCase):
    """Tests for SupportTicket CRUD API endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.user = _make_user(email='ticketuser@verihome.co')
        self.staff = _make_staff_user(email='admin@verihome.co')
        self.ticket = _make_ticket(user=self.user)

    def test_tickets_require_auth(self):
        response = self.client.get('/api/v1/core/tickets/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_sees_own_tickets(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/core/tickets/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertGreaterEqual(len(results), 1)

    def test_other_user_no_tickets(self):
        other = _make_user(email='other@verihome.co')
        self.client.force_authenticate(user=other)
        response = self.client.get('/api/v1/core/tickets/')
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 0)

    def test_staff_sees_all_tickets(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.get('/api/v1/core/tickets/')
        results = response.data.get('results', response.data)
        self.assertGreaterEqual(len(results), 1)

    def test_create_ticket(self):
        self.client.force_authenticate(user=self.user)
        data = {
            'subject': 'Nuevo problema',
            'description': 'Descripcion del problema.',
            'category': 'technical',
            'department': 'technical',
            'priority': 'high',
        }
        response = self.client.post('/api/v1/core/tickets/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['subject'], 'Nuevo problema')

    def test_respond_to_ticket(self):
        self.client.force_authenticate(user=self.user)
        url = f'/api/v1/core/tickets/{self.ticket.pk}/respond/'
        data = {'message': 'Adjunto mas informacion.'}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(TicketResponse.objects.count(), 1)

    def test_respond_empty_message_fails(self):
        self.client.force_authenticate(user=self.user)
        url = f'/api/v1/core/tickets/{self.ticket.pk}/respond/'
        response = self.client.post(url, {'message': ''})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_resolve_ticket_staff_only(self):
        self.client.force_authenticate(user=self.user)
        url = f'/api/v1/core/tickets/{self.ticket.pk}/resolve/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_resolve_ticket_as_staff(self):
        self.client.force_authenticate(user=self.staff)
        url = f'/api/v1/core/tickets/{self.ticket.pk}/resolve/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.status, 'resolved')
        self.assertIsNotNone(self.ticket.resolved_at)

    def test_close_ticket(self):
        self.client.force_authenticate(user=self.user)
        url = f'/api/v1/core/tickets/{self.ticket.pk}/close/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.status, 'closed')

    def test_stats_staff_only(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/core/tickets/stats/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_stats_as_staff(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.get('/api/v1/core/tickets/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total', response.data)
        self.assertIn('open', response.data)
        self.assertIn('by_status', response.data)
        self.assertIn('by_department', response.data)

    def test_assign_ticket_staff_only(self):
        self.client.force_authenticate(user=self.user)
        url = f'/api/v1/core/tickets/{self.ticket.pk}/assign/'
        response = self.client.post(url, {'assigned_to': str(self.staff.pk)})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_assign_ticket_as_staff(self):
        self.client.force_authenticate(user=self.staff)
        url = f'/api/v1/core/tickets/{self.ticket.pk}/assign/'
        response = self.client.post(url, {'assigned_to': str(self.staff.pk)})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.ticket.refresh_from_db()
        self.assertEqual(self.ticket.status, 'in_progress')
