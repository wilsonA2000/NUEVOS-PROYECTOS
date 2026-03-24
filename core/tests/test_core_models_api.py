"""
Tests for the Core module of VeriHome.
Covers models (ContactMessage, SupportTicket, FAQ)
and API endpoints (contact form, FAQs, tickets).
"""

from django.test import TestCase, TransactionTestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from core.models import ContactMessage, SupportTicket, TicketResponse, FAQ

User = get_user_model()


class ContactMessageModelTests(TestCase):
    """Tests for the ContactMessage model."""

    def test_create_contact_message(self):
        msg = ContactMessage.objects.create(
            name='Juan Perez', email='juan@example.com',
            subject='Consulta general', message='Quiero informacion sobre VeriHome',
        )
        self.assertIsNotNone(msg.id)
        self.assertEqual(msg.name, 'Juan Perez')

    def test_default_status_is_new(self):
        msg = ContactMessage.objects.create(
            name='Ana', email='ana@test.com',
            subject='Test', message='Hola',
        )
        self.assertEqual(msg.status, 'new')

    def test_status_choices(self):
        msg = ContactMessage.objects.create(
            name='Test', email='t@t.com',
            subject='S', message='M',
        )
        for choice_value in ('new', 'read', 'replied', 'archived'):
            msg.status = choice_value
            msg.full_clean()  # Should not raise

    def test_str_representation(self):
        msg = ContactMessage.objects.create(
            name='Pedro', email='pedro@test.com',
            subject='Arriendo', message='Busco apartamento',
        )
        self.assertIn('Arriendo', str(msg))
        self.assertIn('Pedro', str(msg))

    def test_ip_address_stored(self):
        msg = ContactMessage.objects.create(
            name='Test', email='t@t.com',
            subject='S', message='M',
            ip_address='192.168.1.1',
        )
        self.assertEqual(msg.ip_address, '192.168.1.1')


class SupportTicketModelTests(TestCase):
    """Tests for the SupportTicket model."""

    def setUp(self):
        self.user = User.objects.create_user(
            email='user@test.com', password='test123',
            first_name='Test', last_name='User',
            user_type='tenant',
        )

    def test_auto_generated_ticket_number(self):
        ticket = SupportTicket.objects.create(
            created_by=self.user, subject='Problema con contrato',
            description='No puedo firmar', category='contract',
        )
        year = timezone.now().year
        self.assertTrue(ticket.ticket_number.startswith(f'SPT-{year}-'))

    def test_ticket_number_increments(self):
        t1 = SupportTicket.objects.create(
            created_by=self.user, subject='Ticket 1',
            description='Desc 1', category='technical',
        )
        t2 = SupportTicket.objects.create(
            created_by=self.user, subject='Ticket 2',
            description='Desc 2', category='billing',
        )
        # Second ticket should have a higher number
        num1 = int(t1.ticket_number.split('-')[-1])
        num2 = int(t2.ticket_number.split('-')[-1])
        self.assertGreater(num2, num1)

    def test_default_department(self):
        ticket = SupportTicket.objects.create(
            created_by=self.user, subject='Test',
            description='Desc', category='other',
        )
        self.assertEqual(ticket.department, 'general')

    def test_department_assignment(self):
        ticket = SupportTicket.objects.create(
            created_by=self.user, subject='Legal issue',
            description='Necesito asesoria legal',
            category='legal', department='legal',
        )
        self.assertEqual(ticket.department, 'legal')

    def test_default_status_is_open(self):
        ticket = SupportTicket.objects.create(
            created_by=self.user, subject='Test',
            description='Desc', category='technical',
        )
        self.assertEqual(ticket.status, 'open')

    def test_status_transitions(self):
        ticket = SupportTicket.objects.create(
            created_by=self.user, subject='Test',
            description='Desc', category='technical',
        )
        for next_status in ('in_progress', 'waiting_customer', 'resolved', 'closed'):
            ticket.status = next_status
            ticket.full_clean()  # Should not raise

    def test_str_representation(self):
        ticket = SupportTicket.objects.create(
            created_by=self.user, subject='Mi problema',
            description='Desc', category='account',
        )
        self.assertIn('Mi problema', str(ticket))
        self.assertIn('SPT-', str(ticket))


class FAQModelTests(TestCase):
    """Tests for the FAQ model."""

    def test_create_faq(self):
        faq = FAQ.objects.create(
            category='general',
            question='Como me registro?',
            answer='Ve a la pagina de registro y completa el formulario.',
        )
        self.assertTrue(faq.is_published)
        self.assertEqual(faq.view_count, 0)

    def test_str_representation(self):
        faq = FAQ.objects.create(
            category='payments',
            question='Como pago?',
            answer='Aceptamos PSE, Nequi y tarjetas.',
        )
        self.assertIn('Como pago?', str(faq))


class ContactAPITests(APITestCase):
    """API tests for the public contact endpoint.

    Note: The contact endpoint auto-creates a SupportTicket which requires
    created_by (a known limitation). We use TransactionTestCase behavior
    by checking only the response, not DB state after successful posts.
    """

    def test_post_contact_form_validation_errors(self):
        response = self.client.post('/api/v1/core/contact/', {
            'name': '', 'email': '', 'subject': '', 'message': '',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('errors', response.data)

    def test_post_contact_form_missing_fields(self):
        response = self.client.post('/api/v1/core/contact/', {
            'name': 'Juan',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ContactAPISuccessTests(TransactionTestCase):
    """Tests for successful contact form submissions.

    Uses TransactionTestCase because the endpoint's auto-ticket creation
    may fail with IntegrityError, which poisons the atomic transaction.
    """

    def test_post_contact_form_success(self):
        response = self.client.post('/api/v1/core/contact/', {
            'name': 'Juan Perez',
            'email': 'juan@example.com',
            'subject': 'Consulta de arriendo',
            'message': 'Me interesa su plataforma.',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ContactMessage.objects.count(), 1)

    def test_contact_no_auth_required(self):
        """Contact endpoint is public, no authentication needed."""
        response = self.client.post('/api/v1/core/contact/', {
            'name': 'Anon', 'email': 'anon@test.com',
            'subject': 'Question', 'message': 'Hello',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class FAQAPITests(APITestCase):
    """API tests for the public FAQ endpoint."""

    def setUp(self):
        FAQ.objects.create(
            category='general', question='Que es VeriHome?',
            answer='Una plataforma inmobiliaria.', is_published=True,
        )
        FAQ.objects.create(
            category='payments', question='Metodos de pago?',
            answer='PSE, Nequi, tarjetas.', is_published=True,
        )
        FAQ.objects.create(
            category='general', question='Draft FAQ',
            answer='Not visible.', is_published=False,
        )

    def test_get_faqs_public(self):
        response = self.client.get('/api/v1/core/faqs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)  # Excludes unpublished

    def test_filter_faqs_by_category(self):
        response = self.client.get('/api/v1/core/faqs/', {'category': 'payments'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['question'], 'Metodos de pago?')

    def test_faqs_no_auth_required(self):
        response = self.client.get('/api/v1/core/faqs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class SupportTicketAPITests(APITestCase):
    """API tests for SupportTicket endpoints."""

    def setUp(self):
        self.admin = User.objects.create_user(
            email='admin@test.com', password='test123',
            first_name='Admin', last_name='Test',
            user_type='landlord', is_staff=True,
        )
        self.user = User.objects.create_user(
            email='user@test.com', password='test123',
            first_name='Regular', last_name='User',
            user_type='tenant',
        )
        self.user_ticket = SupportTicket.objects.create(
            created_by=self.user, subject='Mi ticket',
            description='Tengo un problema', category='technical',
        )
        self.admin_ticket = SupportTicket.objects.create(
            created_by=self.admin, subject='Admin ticket',
            description='Admin issue', category='account',
        )

    def test_staff_sees_all_tickets(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/v1/core/tickets/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        count = len(response.data['results']) if 'results' in response.data else len(response.data)
        self.assertEqual(count, 2)

    def test_user_sees_only_own_tickets(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/core/tickets/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        count = len(response.data['results']) if 'results' in response.data else len(response.data)
        self.assertEqual(count, 1)

    def test_unauthenticated_gets_401(self):
        response = self.client.get('/api/v1/core/tickets/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_respond_to_ticket(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f'/api/v1/core/tickets/{self.user_ticket.id}/respond/',
            {'message': 'Estamos revisando tu caso.'},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(TicketResponse.objects.count(), 1)

    def test_respond_empty_message_rejected(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f'/api/v1/core/tickets/{self.user_ticket.id}/respond/',
            {'message': ''},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_resolve_ticket_staff_only(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f'/api/v1/core/tickets/{self.user_ticket.id}/resolve/',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user_ticket.refresh_from_db()
        self.assertEqual(self.user_ticket.status, 'resolved')
        self.assertIsNotNone(self.user_ticket.resolved_at)

    def test_resolve_ticket_forbidden_for_regular_user(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            f'/api/v1/core/tickets/{self.user_ticket.id}/resolve/',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_close_ticket(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f'/api/v1/core/tickets/{self.user_ticket.id}/close/',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user_ticket.refresh_from_db()
        self.assertEqual(self.user_ticket.status, 'closed')

    def test_staff_respond_updates_status_to_in_progress(self):
        self.client.force_authenticate(user=self.admin)
        self.client.post(
            f'/api/v1/core/tickets/{self.user_ticket.id}/respond/',
            {'message': 'Revisando...'},
        )
        self.user_ticket.refresh_from_db()
        self.assertEqual(self.user_ticket.status, 'in_progress')

    def test_ticket_stats_staff_only(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/v1/core/tickets/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total', response.data)
        self.assertIn('by_status', response.data)

    def test_ticket_stats_forbidden_for_regular_user(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/core/tickets/stats/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
