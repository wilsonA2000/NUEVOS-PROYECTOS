"""
Tests for the Verification module of VeriHome.
Covers models (VerificationAgent, VerificationVisit, VerificationReport)
and API endpoints (agents, visits, reports).
"""

from datetime import date, timedelta
from django.test import TestCase
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from .models import VerificationAgent, VerificationVisit, VerificationReport

User = get_user_model()


class VerificationAgentModelTests(TestCase):
    """Tests for the VerificationAgent model."""

    def setUp(self):
        self.staff_user = User.objects.create_user(
            email='agent@test.com', password='test123',
            first_name='Carlos', last_name='Gomez',
            user_type='landlord', is_staff=True,
        )

    def test_create_agent_auto_generates_code(self):
        agent = VerificationAgent.objects.create(user=self.staff_user)
        self.assertTrue(agent.agent_code.startswith('AGT-'))
        self.assertEqual(agent.agent_code, 'AGT-0001')

    def test_agent_code_increments(self):
        user2 = User.objects.create_user(
            email='agent2@test.com', password='test123',
            first_name='Ana', last_name='Lopez',
            user_type='landlord', is_staff=True,
        )
        VerificationAgent.objects.create(user=self.staff_user)
        agent2 = VerificationAgent.objects.create(user=user2)
        self.assertEqual(agent2.agent_code, 'AGT-0002')

    def test_has_capacity_true_when_available_and_below_limit(self):
        agent = VerificationAgent.objects.create(
            user=self.staff_user, max_weekly_visits=15, is_available=True,
        )
        self.assertTrue(agent.has_capacity)

    def test_has_capacity_false_when_unavailable(self):
        agent = VerificationAgent.objects.create(
            user=self.staff_user, is_available=False,
        )
        self.assertFalse(agent.has_capacity)

    def test_current_week_visits_counts_this_week(self):
        agent = VerificationAgent.objects.create(user=self.staff_user)
        target = User.objects.create_user(
            email='target@test.com', password='test123',
            first_name='Luis', last_name='Perez',
            user_type='tenant',
        )
        VerificationVisit.objects.create(
            visit_type='tenant', agent=agent, target_user=target,
            visit_address='Calle 1', status='scheduled',
            scheduled_date=timezone.now().date(),
        )
        self.assertEqual(agent.current_week_visits, 1)

    def test_str_representation(self):
        agent = VerificationAgent.objects.create(user=self.staff_user)
        self.assertIn('AGT-0001', str(agent))
        self.assertIn('Carlos Gomez', str(agent))

    def test_default_specialization(self):
        agent = VerificationAgent.objects.create(user=self.staff_user)
        self.assertEqual(agent.specialization, 'both')

    def test_default_average_rating(self):
        agent = VerificationAgent.objects.create(user=self.staff_user)
        self.assertEqual(float(agent.average_rating), 5.00)


class VerificationVisitModelTests(TestCase):
    """Tests for the VerificationVisit model."""

    def setUp(self):
        self.target = User.objects.create_user(
            email='tenant@test.com', password='test123',
            first_name='Maria', last_name='Torres',
            user_type='tenant',
        )

    def test_create_visit_auto_generates_visit_number(self):
        visit = VerificationVisit.objects.create(
            visit_type='tenant', target_user=self.target,
            visit_address='Carrera 15 #30-20',
        )
        year = timezone.now().year
        self.assertTrue(visit.visit_number.startswith(f'VIS-{year}-'))

    def test_duration_calculated_on_save(self):
        now = timezone.now()
        visit = VerificationVisit.objects.create(
            visit_type='tenant', target_user=self.target,
            visit_address='Calle 45', status='in_progress',
            started_at=now - timedelta(minutes=45),
            completed_at=now,
        )
        self.assertEqual(visit.duration_minutes, 45)

    def test_duration_none_without_times(self):
        visit = VerificationVisit.objects.create(
            visit_type='tenant', target_user=self.target,
            visit_address='Calle 45',
        )
        self.assertIsNone(visit.duration_minutes)

    def test_default_status_is_pending(self):
        visit = VerificationVisit.objects.create(
            visit_type='property', target_user=self.target,
            visit_address='Calle 10',
        )
        self.assertEqual(visit.status, 'pending')

    def test_str_representation(self):
        visit = VerificationVisit.objects.create(
            visit_type='landlord', target_user=self.target,
            visit_address='Calle 5',
        )
        self.assertIn('VIS-', str(visit))
        self.assertIn('Maria Torres', str(visit))

    def test_visit_type_choices(self):
        for vtype in ('landlord', 'tenant', 'property', 'service_provider'):
            visit = VerificationVisit.objects.create(
                visit_type=vtype, target_user=self.target,
                visit_address='Calle X',
            )
            self.assertEqual(visit.visit_type, vtype)


class VerificationReportModelTests(TestCase):
    """Tests for the VerificationReport model."""

    def setUp(self):
        self.target = User.objects.create_user(
            email='target@test.com', password='test123',
            first_name='Pedro', last_name='Diaz',
            user_type='landlord',
        )
        self.visit = VerificationVisit.objects.create(
            visit_type='landlord', target_user=self.target,
            visit_address='Calle 100', status='completed',
        )

    def test_create_report_linked_to_visit(self):
        report = VerificationReport.objects.create(
            visit=self.visit, overall_condition='good',
            initial_rating=8, findings='Todo en orden',
        )
        self.assertEqual(report.visit, self.visit)
        self.assertEqual(report.initial_rating, 8)

    def test_initial_rating_min_validator(self):
        report = VerificationReport(
            visit=self.visit, overall_condition='good',
            initial_rating=0, findings='Test',
        )
        with self.assertRaises(ValidationError):
            report.full_clean()

    def test_initial_rating_max_validator(self):
        report = VerificationReport(
            visit=self.visit, overall_condition='good',
            initial_rating=11, findings='Test',
        )
        with self.assertRaises(ValidationError):
            report.full_clean()

    def test_initial_rating_valid_boundaries(self):
        """Rating of 1 (minimum) should be valid."""
        report_min = VerificationReport.objects.create(
            visit=self.visit, overall_condition='rejected',
            initial_rating=1, findings='Malo',
        )
        self.assertEqual(report_min.initial_rating, 1)

    def test_default_approved_by_admin_is_false(self):
        report = VerificationReport.objects.create(
            visit=self.visit, overall_condition='acceptable',
            initial_rating=6, findings='Aceptable',
        )
        self.assertFalse(report.approved_by_admin)

    def test_str_representation(self):
        report = VerificationReport.objects.create(
            visit=self.visit, overall_condition='excellent',
            initial_rating=10, findings='Excelente estado',
        )
        self.assertIn('Excelente', str(report))
        self.assertIn('10/10', str(report))


class VerificationAgentAPITests(APITestCase):
    """API tests for VerificationAgent endpoints."""

    def setUp(self):
        self.admin = User.objects.create_user(
            email='admin@test.com', password='test123',
            first_name='Admin', last_name='Test',
            user_type='landlord', is_staff=True,
        )
        self.regular_user = User.objects.create_user(
            email='user@test.com', password='test123',
            first_name='Regular', last_name='User',
            user_type='tenant',
        )
        self.agent = VerificationAgent.objects.create(user=self.admin)

    def test_list_agents_staff_only(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/v1/verification/agents/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_agents_forbidden_for_non_staff(self):
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get('/api/v1/verification/agents/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_agents_unauthenticated(self):
        response = self.client.get('/api/v1/verification/agents/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_stats_endpoint(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/v1/verification/agents/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_agents', response.data)
        self.assertIn('available_agents', response.data)
        self.assertIn('visits_pending_assignment', response.data)

    def test_available_agents_endpoint(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/v1/verification/agents/available/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class VerificationVisitAPITests(APITestCase):
    """API tests for VerificationVisit endpoints."""

    def setUp(self):
        self.admin = User.objects.create_user(
            email='admin@test.com', password='test123',
            first_name='Admin', last_name='Test',
            user_type='landlord', is_staff=True,
        )
        self.regular_user = User.objects.create_user(
            email='user@test.com', password='test123',
            first_name='Regular', last_name='User',
            user_type='tenant',
        )
        self.agent = VerificationAgent.objects.create(user=self.admin)
        self.visit = VerificationVisit.objects.create(
            visit_type='tenant', target_user=self.regular_user,
            visit_address='Calle 50 #10-30', status='pending',
            scheduled_date=timezone.now().date(),
        )

    def test_assign_agent_to_visit(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f'/api/v1/verification/visits/{self.visit.id}/assign_agent/',
            {'agent_id': str(self.agent.id)},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.visit.refresh_from_db()
        self.assertEqual(self.visit.status, 'scheduled')
        self.assertEqual(self.visit.agent, self.agent)

    def test_assign_agent_invalid_status(self):
        self.visit.status = 'completed'
        self.visit.save(update_fields=['status'])
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f'/api/v1/verification/visits/{self.visit.id}/assign_agent/',
            {'agent_id': str(self.agent.id)},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_assign_agent_not_found(self):
        self.client.force_authenticate(user=self.admin)
        import uuid
        response = self.client.post(
            f'/api/v1/verification/visits/{self.visit.id}/assign_agent/',
            {'agent_id': str(uuid.uuid4())},
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_complete_visit(self):
        self.visit.agent = self.agent
        self.visit.status = 'in_progress'
        self.visit.started_at = timezone.now() - timedelta(minutes=30)
        self.visit.save()
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f'/api/v1/verification/visits/{self.visit.id}/complete/',
            {'passed': True, 'notes': 'Todo bien'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.visit.refresh_from_db()
        self.assertEqual(self.visit.status, 'completed')
        self.assertTrue(self.visit.verification_passed)

    def test_complete_visit_wrong_status(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f'/api/v1/verification/visits/{self.visit.id}/complete/',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_start_visit(self):
        self.visit.agent = self.agent
        self.visit.status = 'scheduled'
        self.visit.save()
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f'/api/v1/verification/visits/{self.visit.id}/start/',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.visit.refresh_from_db()
        self.assertEqual(self.visit.status, 'in_progress')

    def test_cancel_visit(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f'/api/v1/verification/visits/{self.visit.id}/cancel/',
            {'reason': 'Cliente no disponible'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.visit.refresh_from_db()
        self.assertEqual(self.visit.status, 'cancelled')

    def test_visits_forbidden_for_non_staff(self):
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get('/api/v1/verification/visits/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class VerificationReportAPITests(APITestCase):
    """API tests for VerificationReport endpoints."""

    def setUp(self):
        self.admin = User.objects.create_user(
            email='admin@test.com', password='test123',
            first_name='Admin', last_name='Test',
            user_type='landlord', is_staff=True,
        )
        self.regular_user = User.objects.create_user(
            email='user@test.com', password='test123',
            first_name='Regular', last_name='User',
            user_type='tenant',
        )
        self.agent = VerificationAgent.objects.create(user=self.admin)
        self.visit = VerificationVisit.objects.create(
            visit_type='tenant', target_user=self.regular_user,
            visit_address='Calle 80', status='completed',
            agent=self.agent,
        )
        self.report = VerificationReport.objects.create(
            visit=self.visit, overall_condition='good',
            initial_rating=8, findings='Verificacion positiva',
        )

    def test_approve_report(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f'/api/v1/verification/reports/{self.report.id}/approve/',
            {'notes': 'Aprobado por revision'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.report.refresh_from_db()
        self.assertTrue(self.report.approved_by_admin)
        self.assertEqual(self.report.admin_notes, 'Aprobado por revision')

    def test_reports_forbidden_for_non_staff(self):
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get('/api/v1/verification/reports/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_reports_as_staff(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/v1/verification/reports/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']) if 'results' in response.data else len(response.data), 1)
