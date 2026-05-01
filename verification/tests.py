"""
Tests for the Verification module of VeriHome.
Covers models (VerificationAgent, VerificationVisit, VerificationReport)
and API endpoints (agents, visits, reports).
"""

from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from .models import (
    FieldVisitRequest,
    VerificationAgent,
    VerificationReport,
    VerificationVisit,
)

User = get_user_model()


class VerificationAgentModelTests(TestCase):
    """Tests for the VerificationAgent model."""

    def setUp(self):
        self.staff_user = User.objects.create_user(
            email="agent@test.com",
            password="test123",
            first_name="Carlos",
            last_name="Gomez",
            user_type="landlord",
            is_staff=True,
        )

    def test_create_agent_auto_generates_code(self):
        agent = VerificationAgent.objects.create(user=self.staff_user)
        self.assertTrue(agent.agent_code.startswith("AGT-"))
        self.assertEqual(agent.agent_code, "AGT-0001")

    def test_agent_code_increments(self):
        user2 = User.objects.create_user(
            email="agent2@test.com",
            password="test123",
            first_name="Ana",
            last_name="Lopez",
            user_type="landlord",
            is_staff=True,
        )
        VerificationAgent.objects.create(user=self.staff_user)
        agent2 = VerificationAgent.objects.create(user=user2)
        self.assertEqual(agent2.agent_code, "AGT-0002")

    def test_has_capacity_true_when_available_and_below_limit(self):
        agent = VerificationAgent.objects.create(
            user=self.staff_user,
            max_weekly_visits=15,
            is_available=True,
        )
        self.assertTrue(agent.has_capacity)

    def test_has_capacity_false_when_unavailable(self):
        agent = VerificationAgent.objects.create(
            user=self.staff_user,
            is_available=False,
        )
        self.assertFalse(agent.has_capacity)

    def test_current_week_visits_counts_this_week(self):
        agent = VerificationAgent.objects.create(user=self.staff_user)
        target = User.objects.create_user(
            email="target@test.com",
            password="test123",
            first_name="Luis",
            last_name="Perez",
            user_type="tenant",
        )
        VerificationVisit.objects.create(
            visit_type="tenant",
            agent=agent,
            target_user=target,
            visit_address="Calle 1",
            status="scheduled",
            scheduled_date=timezone.now().date(),
        )
        self.assertEqual(agent.current_week_visits, 1)

    def test_str_representation(self):
        agent = VerificationAgent.objects.create(user=self.staff_user)
        self.assertIn("AGT-0001", str(agent))
        self.assertIn("Carlos Gomez", str(agent))

    def test_default_specialization(self):
        agent = VerificationAgent.objects.create(user=self.staff_user)
        self.assertEqual(agent.specialization, "both")

    def test_default_average_rating(self):
        agent = VerificationAgent.objects.create(user=self.staff_user)
        self.assertEqual(float(agent.average_rating), 5.00)


class VerificationVisitModelTests(TestCase):
    """Tests for the VerificationVisit model."""

    def setUp(self):
        self.target = User.objects.create_user(
            email="tenant@test.com",
            password="test123",
            first_name="Maria",
            last_name="Torres",
            user_type="tenant",
        )

    def test_create_visit_auto_generates_visit_number(self):
        visit = VerificationVisit.objects.create(
            visit_type="tenant",
            target_user=self.target,
            visit_address="Carrera 15 #30-20",
        )
        year = timezone.now().year
        self.assertTrue(visit.visit_number.startswith(f"VIS-{year}-"))

    def test_duration_calculated_on_save(self):
        now = timezone.now()
        visit = VerificationVisit.objects.create(
            visit_type="tenant",
            target_user=self.target,
            visit_address="Calle 45",
            status="in_progress",
            started_at=now - timedelta(minutes=45),
            completed_at=now,
        )
        self.assertEqual(visit.duration_minutes, 45)

    def test_duration_none_without_times(self):
        visit = VerificationVisit.objects.create(
            visit_type="tenant",
            target_user=self.target,
            visit_address="Calle 45",
        )
        self.assertIsNone(visit.duration_minutes)

    def test_default_status_is_pending(self):
        visit = VerificationVisit.objects.create(
            visit_type="property",
            target_user=self.target,
            visit_address="Calle 10",
        )
        self.assertEqual(visit.status, "pending")

    def test_str_representation(self):
        visit = VerificationVisit.objects.create(
            visit_type="landlord",
            target_user=self.target,
            visit_address="Calle 5",
        )
        self.assertIn("VIS-", str(visit))
        self.assertIn("Maria Torres", str(visit))

    def test_visit_type_choices(self):
        for vtype in ("landlord", "tenant", "property", "service_provider"):
            visit = VerificationVisit.objects.create(
                visit_type=vtype,
                target_user=self.target,
                visit_address="Calle X",
            )
            self.assertEqual(visit.visit_type, vtype)


class VerificationReportModelTests(TestCase):
    """Tests for the VerificationReport model."""

    def setUp(self):
        self.target = User.objects.create_user(
            email="target@test.com",
            password="test123",
            first_name="Pedro",
            last_name="Diaz",
            user_type="landlord",
        )
        self.visit = VerificationVisit.objects.create(
            visit_type="landlord",
            target_user=self.target,
            visit_address="Calle 100",
            status="completed",
        )

    def test_create_report_linked_to_visit(self):
        report = VerificationReport.objects.create(
            visit=self.visit,
            overall_condition="good",
            initial_rating=8,
            findings="Todo en orden",
        )
        self.assertEqual(report.visit, self.visit)
        self.assertEqual(report.initial_rating, 8)

    def test_initial_rating_min_validator(self):
        report = VerificationReport(
            visit=self.visit,
            overall_condition="good",
            initial_rating=0,
            findings="Test",
        )
        with self.assertRaises(ValidationError):
            report.full_clean()

    def test_initial_rating_max_validator(self):
        report = VerificationReport(
            visit=self.visit,
            overall_condition="good",
            initial_rating=11,
            findings="Test",
        )
        with self.assertRaises(ValidationError):
            report.full_clean()

    def test_initial_rating_valid_boundaries(self):
        """Rating of 1 (minimum) should be valid."""
        report_min = VerificationReport.objects.create(
            visit=self.visit,
            overall_condition="rejected",
            initial_rating=1,
            findings="Malo",
        )
        self.assertEqual(report_min.initial_rating, 1)

    def test_default_approved_by_admin_is_false(self):
        report = VerificationReport.objects.create(
            visit=self.visit,
            overall_condition="acceptable",
            initial_rating=6,
            findings="Aceptable",
        )
        self.assertFalse(report.approved_by_admin)

    def test_str_representation(self):
        report = VerificationReport.objects.create(
            visit=self.visit,
            overall_condition="excellent",
            initial_rating=10,
            findings="Excelente estado",
        )
        self.assertIn("Excelente", str(report))
        self.assertIn("10/10", str(report))


class VerificationAgentAPITests(APITestCase):
    """API tests for VerificationAgent endpoints."""

    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin@test.com",
            password="test123",
            first_name="Admin",
            last_name="Test",
            user_type="landlord",
            is_staff=True,
        )
        self.regular_user = User.objects.create_user(
            email="user@test.com",
            password="test123",
            first_name="Regular",
            last_name="User",
            user_type="tenant",
        )
        self.agent = VerificationAgent.objects.create(user=self.admin)

    def test_list_agents_staff_only(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/v1/verification/agents/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_agents_forbidden_for_non_staff(self):
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get("/api/v1/verification/agents/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_agents_unauthenticated(self):
        response = self.client.get("/api/v1/verification/agents/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_stats_endpoint(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/v1/verification/agents/stats/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("total_agents", response.data)
        self.assertIn("available_agents", response.data)
        self.assertIn("visits_pending_assignment", response.data)

    def test_available_agents_endpoint(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/v1/verification/agents/available/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class VerificationVisitAPITests(APITestCase):
    """API tests for VerificationVisit endpoints."""

    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin@test.com",
            password="test123",
            first_name="Admin",
            last_name="Test",
            user_type="landlord",
            is_staff=True,
        )
        self.regular_user = User.objects.create_user(
            email="user@test.com",
            password="test123",
            first_name="Regular",
            last_name="User",
            user_type="tenant",
        )
        self.agent = VerificationAgent.objects.create(user=self.admin)
        self.visit = VerificationVisit.objects.create(
            visit_type="tenant",
            target_user=self.regular_user,
            visit_address="Calle 50 #10-30",
            status="pending",
            scheduled_date=timezone.now().date(),
        )

    def test_assign_agent_to_visit(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f"/api/v1/verification/visits/{self.visit.id}/assign_agent/",
            {"agent_id": str(self.agent.id)},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.visit.refresh_from_db()
        self.assertEqual(self.visit.status, "scheduled")
        self.assertEqual(self.visit.agent, self.agent)

    def test_assign_agent_invalid_status(self):
        self.visit.status = "completed"
        self.visit.save(update_fields=["status"])
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f"/api/v1/verification/visits/{self.visit.id}/assign_agent/",
            {"agent_id": str(self.agent.id)},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_assign_agent_not_found(self):
        self.client.force_authenticate(user=self.admin)
        import uuid

        response = self.client.post(
            f"/api/v1/verification/visits/{self.visit.id}/assign_agent/",
            {"agent_id": str(uuid.uuid4())},
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_complete_visit(self):
        self.visit.agent = self.agent
        self.visit.status = "in_progress"
        self.visit.started_at = timezone.now() - timedelta(minutes=30)
        self.visit.save()
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f"/api/v1/verification/visits/{self.visit.id}/complete/",
            {"passed": True, "notes": "Todo bien"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.visit.refresh_from_db()
        self.assertEqual(self.visit.status, "completed")
        self.assertTrue(self.visit.verification_passed)

    def test_complete_visit_wrong_status(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f"/api/v1/verification/visits/{self.visit.id}/complete/",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_start_visit(self):
        self.visit.agent = self.agent
        self.visit.status = "scheduled"
        self.visit.save()
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f"/api/v1/verification/visits/{self.visit.id}/start/",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.visit.refresh_from_db()
        self.assertEqual(self.visit.status, "in_progress")

    def test_cancel_visit(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f"/api/v1/verification/visits/{self.visit.id}/cancel/",
            {"reason": "Cliente no disponible"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.visit.refresh_from_db()
        self.assertEqual(self.visit.status, "cancelled")

    def test_visits_forbidden_for_non_staff(self):
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get("/api/v1/verification/visits/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class VerificationReportAPITests(APITestCase):
    """API tests for VerificationReport endpoints."""

    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin@test.com",
            password="test123",
            first_name="Admin",
            last_name="Test",
            user_type="landlord",
            is_staff=True,
        )
        self.regular_user = User.objects.create_user(
            email="user@test.com",
            password="test123",
            first_name="Regular",
            last_name="User",
            user_type="tenant",
        )
        self.agent = VerificationAgent.objects.create(user=self.admin)
        self.visit = VerificationVisit.objects.create(
            visit_type="tenant",
            target_user=self.regular_user,
            visit_address="Calle 80",
            status="completed",
            agent=self.agent,
        )
        self.report = VerificationReport.objects.create(
            visit=self.visit,
            overall_condition="good",
            initial_rating=8,
            findings="Verificacion positiva",
        )

    def test_approve_report(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f"/api/v1/verification/reports/{self.report.id}/approve/",
            {"notes": "Aprobado por revision"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.report.refresh_from_db()
        self.assertTrue(self.report.approved_by_admin)
        self.assertEqual(self.report.admin_notes, "Aprobado por revision")

    def test_reports_forbidden_for_non_staff(self):
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get("/api/v1/verification/reports/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_reports_as_staff(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get("/api/v1/verification/reports/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            len(response.data["results"])
            if "results" in response.data
            else len(response.data),
            1,
        )


# 1x1 transparent PNG en base64; suficiente para que ImageField acepte el blob.
_DUMMY_PNG = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII="
)


def _onboarding_payload(score_total="0.45"):
    return {
        "document_type_declared": "cedula_ciudadania",
        "document_number_declared": "1234567890",
        "full_name_declared": "Juan Perez",
        "cedula_anverso": _DUMMY_PNG,
        "cedula_reverso": _DUMMY_PNG,
        "selfie": _DUMMY_PNG,
        "ocr_data": {"document_number": "1234567890"},
        "liveness_data": {"completed_steps": 5},
        "face_match_data": {"similarity": 0.78, "passed": True},
        "digital_score": {"observaciones": [], "total": float(score_total)},
        "digital_score_total": score_total,
    }


class FieldVisitRequestAPITests(APITestCase):
    """API tests for VeriHome ID onboarding endpoint."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="onboarding@test.com",
            password="test123",
            first_name="Wilson",
            last_name="A",
            user_type="tenant",
        )
        self.staff = User.objects.create_user(
            email="staff@test.com",
            password="test123",
            first_name="Staff",
            last_name="User",
            user_type="landlord",
            is_staff=True,
        )

    def test_onboarding_requires_authentication(self):
        response = self.client.post(
            "/api/v1/verification/onboarding/", _onboarding_payload(), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_onboarding_creates_record_with_aprobado_verdict(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            "/api/v1/verification/onboarding/",
            _onboarding_payload("0.45"),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["digital_verdict"], "aprobado")
        self.assertEqual(response.data["status"], "digital_completed")

        instance = FieldVisitRequest.objects.get(id=response.data["id"])
        self.assertEqual(instance.user, self.user)
        self.assertTrue(instance.cedula_anverso.name)
        self.assertTrue(instance.cedula_reverso.name)
        self.assertTrue(instance.selfie_liveness.name)

    def test_onboarding_rechazado_persists_with_status_rejected(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            "/api/v1/verification/onboarding/",
            _onboarding_payload("0.10"),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["digital_verdict"], "rechazado")
        self.assertEqual(response.data["status"], "rejected")

    def test_onboarding_observado_verdict_at_threshold(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            "/api/v1/verification/onboarding/",
            _onboarding_payload("0.30"),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["digital_verdict"], "observado")

    def test_me_returns_latest_onboarding(self):
        self.client.force_authenticate(user=self.user)
        self.client.post(
            "/api/v1/verification/onboarding/",
            _onboarding_payload("0.30"),
            format="json",
        )
        latest = self.client.post(
            "/api/v1/verification/onboarding/",
            _onboarding_payload("0.45"),
            format="json",
        )
        response = self.client.get("/api/v1/verification/onboarding/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], latest.data["id"])

    def test_me_returns_404_when_no_onboarding(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/v1/verification/onboarding/me/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_list_forbidden_for_non_staff(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/v1/verification/onboarding/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_works_for_staff(self):
        self.client.force_authenticate(user=self.user)
        self.client.post(
            "/api/v1/verification/onboarding/",
            _onboarding_payload("0.45"),
            format="json",
        )
        self.client.force_authenticate(user=self.staff)
        response = self.client.get("/api/v1/verification/onboarding/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_score_total_out_of_range_rejected(self):
        self.client.force_authenticate(user=self.user)
        payload = _onboarding_payload("0.45")
        payload["digital_score_total"] = "0.99"
        response = self.client.post(
            "/api/v1/verification/onboarding/", payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# =============================================================================
# C11 — FieldVisitAct + hash chain
# =============================================================================


def _build_sealed_act(
    user,
    agent,
    lawyer,
    *,
    payload=None,
    pdf_sha256="a" * 64,
    score_total="0.45",
):
    """Helper: crea FieldVisitRequest + Visit + Act y la sella en cadena."""
    from decimal import Decimal
    from verification.models import FieldVisitAct
    from verification.services.hash_chain import seal_act

    field_request = FieldVisitRequest.objects.create(
        user=user,
        document_type_declared="cedula_ciudadania",
        document_number_declared="1234567890",
        full_name_declared=user.get_full_name() or user.email,
        digital_score={"total": float(score_total)},
        digital_score_total=Decimal(score_total),
        digital_verdict="aprobado",
    )
    visit = VerificationVisit.objects.create(
        visit_type="tenant",
        agent=agent,
        target_user=user,
        visit_address="Calle 1 #2-3",
        scheduled_date=timezone.now().date(),
    )
    act = FieldVisitAct(
        field_request=field_request,
        visit=visit,
        payload=payload or {"section_i": {"name": user.get_full_name()}},
        pdf_sha256=pdf_sha256,
        verified_signature={"data": "sig"},
        verified_signed_at=timezone.now(),
        agent_signature={"data": "sig"},
        agent_signed_at=timezone.now(),
        lawyer_user=lawyer,
        lawyer_signed_at=timezone.now(),
        lawyer_tp_number="12345",
        lawyer_full_name="Wilson A",
        lawyer_cc="1098765432",
        status="signed_by_lawyer",
    )
    act.save()
    seal_act(act, lawyer_signed_at=act.lawyer_signed_at)
    act.save()
    return act


class HashChainTests(TestCase):
    """Verifica integridad del hash chain de FieldVisitAct."""

    def setUp(self):
        self.user1 = User.objects.create_user(
            email="u1@t.com", password="x", first_name="U", last_name="1",
            user_type="tenant",
        )
        self.user2 = User.objects.create_user(
            email="u2@t.com", password="x", first_name="U", last_name="2",
            user_type="tenant",
        )
        self.user3 = User.objects.create_user(
            email="u3@t.com", password="x", first_name="U", last_name="3",
            user_type="tenant",
        )
        self.lawyer = User.objects.create_user(
            email="lawyer@t.com", password="x", first_name="W", last_name="A",
            user_type="landlord", is_staff=True,
        )
        agent_user = User.objects.create_user(
            email="agent_chain@t.com", password="x",
            first_name="Ag", last_name="Ent",
            user_type="landlord", is_staff=True,
        )
        self.agent = VerificationAgent.objects.create(user=agent_user)

    def test_first_act_uses_genesis_prev_hash(self):
        from verification.services.hash_chain import GENESIS_PREV_HASH

        act = _build_sealed_act(self.user1, self.agent, self.lawyer)
        self.assertEqual(act.prev_hash, GENESIS_PREV_HASH)
        self.assertEqual(act.block_number, 1)
        self.assertIsNone(act.prev_act)
        self.assertEqual(len(act.final_hash), 64)

    def test_chain_links_prev_hash_correctly(self):
        a1 = _build_sealed_act(self.user1, self.agent, self.lawyer)
        a2 = _build_sealed_act(self.user2, self.agent, self.lawyer)
        self.assertEqual(a2.prev_hash, a1.final_hash)
        self.assertEqual(a2.prev_act_id, a1.id)
        self.assertEqual(a2.block_number, 2)

    def test_payload_hash_changes_when_payload_mutates(self):
        from verification.services.hash_chain import compute_payload_hash

        act = _build_sealed_act(self.user1, self.agent, self.lawyer)
        original = act.payload_hash
        mutated = compute_payload_hash(
            {**act.payload, "extra": "tampered"}, act.pdf_sha256
        )
        self.assertNotEqual(original, mutated)

    def test_verify_chain_passes_for_clean_chain(self):
        from verification.services.hash_chain import verify_chain

        _build_sealed_act(self.user1, self.agent, self.lawyer)
        _build_sealed_act(self.user2, self.agent, self.lawyer)
        _build_sealed_act(self.user3, self.agent, self.lawyer)
        result = verify_chain()
        self.assertTrue(result["ok"])
        self.assertEqual(result["total"], 3)
        self.assertEqual(result["errors"], [])

    def test_verify_chain_detects_payload_tampering(self):
        from verification.services.hash_chain import verify_chain

        a1 = _build_sealed_act(self.user1, self.agent, self.lawyer)
        _build_sealed_act(self.user2, self.agent, self.lawyer)
        # Mutar payload sin recomputar hash
        a1.payload = {**a1.payload, "tampered": True}
        a1.save(update_fields=["payload"])
        result = verify_chain()
        self.assertFalse(result["ok"])
        codes = {e["code"] for e in result["errors"]}
        self.assertIn("payload_tampered", codes)

    def test_verify_chain_detects_prev_hash_break(self):
        from verification.services.hash_chain import verify_chain

        _build_sealed_act(self.user1, self.agent, self.lawyer)
        a2 = _build_sealed_act(self.user2, self.agent, self.lawyer)
        a2.prev_hash = "0" * 64
        a2.save(update_fields=["prev_hash"])
        result = verify_chain()
        self.assertFalse(result["ok"])
        codes = {e["code"] for e in result["errors"]}
        self.assertIn("prev_hash_mismatch", codes)

    def test_act_number_autogenerated(self):
        act = _build_sealed_act(self.user1, self.agent, self.lawyer)
        year = timezone.now().year
        self.assertTrue(act.act_number.startswith(f"ACT-{year}-"))


class FieldVisitActAPITests(APITestCase):
    """Endpoints C11: draft, parties-sign, lawyer-sign, verify-chain."""

    def setUp(self):
        from decimal import Decimal

        self.lawyer_email = "lawyer-api@test.com"
        # Activa IsLawyer para este test forzando settings.
        from django.test import override_settings  # noqa: F401

        self.lawyer = User.objects.create_user(
            email=self.lawyer_email, password="x",
            first_name="Wilson", last_name="A",
            user_type="landlord", is_staff=True,
        )
        self.staff = User.objects.create_user(
            email="staff-api@test.com", password="x",
            first_name="Staff", last_name="X",
            user_type="landlord", is_staff=True,
        )
        agent_user = User.objects.create_user(
            email="agent-api@test.com", password="x",
            first_name="Ag", last_name="Ent",
            user_type="landlord", is_staff=True,
        )
        self.agent = VerificationAgent.objects.create(user=agent_user)
        self.target = User.objects.create_user(
            email="target-api@test.com", password="x",
            first_name="Tar", last_name="Get",
            user_type="tenant",
        )
        self.field_request = FieldVisitRequest.objects.create(
            user=self.target,
            document_type_declared="cedula_ciudadania",
            document_number_declared="9999",
            full_name_declared="Tar Get",
            digital_score={"total": 0.45},
            digital_score_total=Decimal("0.45"),
            digital_verdict="aprobado",
        )
        self.visit = VerificationVisit.objects.create(
            visit_type="tenant",
            agent=self.agent,
            target_user=self.target,
            visit_address="Cr 1 #1-1",
            scheduled_date=timezone.now().date(),
            status="scheduled",
        )

    def _create_draft_act(self):
        from verification.models import FieldVisitAct

        return FieldVisitAct.objects.create(
            field_request=self.field_request,
            visit=self.visit,
            payload={"section_i": {"name": "Tar Get"}},
        )

    def test_create_draft_requires_auth(self):
        response = self.client.post(
            "/api/v1/verification/acts/",
            {
                "field_request": str(self.field_request.id),
                "visit": str(self.visit.id),
                "payload": {"section_i": {}},
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_staff_creates_draft(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.post(
            "/api/v1/verification/acts/",
            {
                "field_request": str(self.field_request.id),
                "visit": str(self.visit.id),
                "payload": {"section_i": {"name": "Tar Get"}},
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertEqual(response.data["status"], "draft")
        self.assertTrue(response.data["act_number"].startswith("ACT-"))

    def test_parties_sign_transitions_state(self):
        act = self._create_draft_act()
        self.client.force_authenticate(user=self.staff)
        response = self.client.post(
            f"/api/v1/verification/acts/{act.id}/parties-sign/",
            {
                "verified_signature": {"data": "v"},
                "agent_signature": {"data": "a"},
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["status"], "signed_by_parties")

    def test_lawyer_sign_requires_lawyer_role(self):
        from django.test import override_settings

        act = self._create_draft_act()
        act.verified_signature = {"data": "v"}
        act.agent_signature = {"data": "a"}
        act.verified_signed_at = timezone.now()
        act.agent_signed_at = timezone.now()
        act.pdf_sha256 = "b" * 64
        act.status = "signed_by_parties"
        act.save()

        self.client.force_authenticate(user=self.staff)
        with override_settings(LAWYER_EMAIL=self.lawyer_email):
            response = self.client.post(
                f"/api/v1/verification/acts/{act.id}/lawyer-sign/", {}, format="json"
            )
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_lawyer_sign_seals_chain(self):
        from django.test import override_settings

        act = self._create_draft_act()
        act.verified_signature = {"data": "v"}
        act.agent_signature = {"data": "a"}
        act.verified_signed_at = timezone.now()
        act.agent_signed_at = timezone.now()
        act.pdf_sha256 = "c" * 64
        act.status = "signed_by_parties"
        act.save()

        self.client.force_authenticate(user=self.lawyer)
        with override_settings(
            LAWYER_EMAIL=self.lawyer_email,
            LAWYER_TP_NUMBER="98765",
            LAWYER_FULL_NAME="Wilson A",
            LAWYER_CC="1098765432",
        ):
            response = self.client.post(
                f"/api/v1/verification/acts/{act.id}/lawyer-sign/", {}, format="json"
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
            self.assertEqual(response.data["status"], "sealed")
            self.assertEqual(response.data["block_number"], 1)
            self.assertEqual(len(response.data["final_hash"]), 64)

    def test_lawyer_sign_blocked_without_pdf(self):
        from django.test import override_settings

        act = self._create_draft_act()
        act.verified_signature = {"data": "v"}
        act.agent_signature = {"data": "a"}
        act.verified_signed_at = timezone.now()
        act.agent_signed_at = timezone.now()
        act.status = "signed_by_parties"
        act.save()

        self.client.force_authenticate(user=self.lawyer)
        with override_settings(LAWYER_EMAIL=self.lawyer_email):
            response = self.client.post(
                f"/api/v1/verification/acts/{act.id}/lawyer-sign/", {}, format="json"
            )
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_verify_chain_endpoint_requires_staff(self):
        self.client.force_authenticate(user=self.target)
        response = self.client.get("/api/v1/verification/acts/verify-chain/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.staff)
        response = self.client.get("/api/v1/verification/acts/verify-chain/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("ok", response.data)
        self.assertIn("errors", response.data)

    def test_generate_pdf_endpoint(self):
        act = self._create_draft_act()
        act.verified_signature = {"data": "v"}
        act.agent_signature = {"data": "a"}
        act.verified_signed_at = timezone.now()
        act.agent_signed_at = timezone.now()
        act.status = "signed_by_parties"
        act.save()

        self.client.force_authenticate(user=self.staff)
        response = self.client.post(
            f"/api/v1/verification/acts/{act.id}/generate-pdf/", {}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertIsNotNone(response.data["pdf_url"])
        self.assertEqual(len(response.data["pdf_sha256"]), 64)
        act.refresh_from_db()
        self.assertTrue(act.pdf_file)

    def test_seal_marks_user_verified_via_signal(self):
        from django.test import override_settings

        act = self._create_draft_act()
        act.verified_signature = {"data": "v"}
        act.agent_signature = {"data": "a"}
        act.verified_signed_at = timezone.now()
        act.agent_signed_at = timezone.now()
        act.pdf_sha256 = "d" * 64
        act.status = "signed_by_parties"
        act.save()

        self.client.force_authenticate(user=self.lawyer)
        with override_settings(
            LAWYER_EMAIL=self.lawyer_email,
            LAWYER_TP_NUMBER="1",
            LAWYER_FULL_NAME="W",
            LAWYER_CC="2",
        ):
            response = self.client.post(
                f"/api/v1/verification/acts/{act.id}/lawyer-sign/", {}, format="json"
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.target.refresh_from_db()
        self.assertTrue(self.target.is_verified)
        self.field_request.refresh_from_db()
        self.assertEqual(self.field_request.status, "visit_completed")


class VerihomeIDStatusEndpointTests(APITestCase):
    """`/api/v1/verification/onboarding/status/` consolida estado del onboarding."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="status@test.com", password="x",
            first_name="St", last_name="At",
            user_type="tenant",
        )
        self.url = "/api/v1/verification/onboarding/status/"

    def test_status_without_onboarding(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_verified"])
        self.assertFalse(response.data["has_onboarding"])
        self.assertEqual(response.data["next_step"], "start_onboarding")
        self.assertIn("create_property", response.data["blocking_actions"])

    def test_status_with_pending_visit(self):
        from decimal import Decimal

        FieldVisitRequest.objects.create(
            user=self.user,
            document_type_declared="cedula_ciudadania",
            document_number_declared="1",
            full_name_declared="X",
            digital_score={"total": 0.45},
            digital_score_total=Decimal("0.45"),
            digital_verdict="aprobado",
            status="digital_completed",
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.data["next_step"], "wait_visit")
        self.assertTrue(response.data["has_onboarding"])
        self.assertEqual(response.data["onboarding_status"], "digital_completed")

    def test_status_when_verified(self):
        self.user.is_verified = True
        self.user.save(update_fields=["is_verified"])
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.url)
        self.assertTrue(response.data["is_verified"])
        self.assertEqual(response.data["blocking_actions"], [])


from django.test import override_settings as _override_settings


@_override_settings(VERIHOME_ID_ENFORCEMENT=True)
class VerihomeIDEnforcementTests(APITestCase):
    """`VerihomeIDRequired` bloquea acciones críticas hasta verificación."""

    def setUp(self):
        self.unverified = User.objects.create_user(
            email="unverif@test.com", password="x",
            first_name="Un", last_name="V",
            user_type="tenant",
        )
        self.verified = User.objects.create_user(
            email="verif@test.com", password="x",
            first_name="Ve", last_name="R",
            user_type="tenant",
        )
        self.verified.is_verified = True
        self.verified.save(update_fields=["is_verified"])

    def test_match_create_blocked_for_unverified(self):
        from properties.models import Property

        landlord = User.objects.create_user(
            email="ll@test.com", password="x",
            first_name="L", last_name="L",
            user_type="landlord",
            is_verified=True,
        )
        property_obj = Property.objects.create(
            landlord=landlord,
            title="Apartamento",
            description="Test",
            property_type="apartment",
            listing_type="rent",
            rent_price=1000000,
            address="Cr 1",
            city="Bogotá",
            state="Cundinamarca",
            country="Colombia",
            bedrooms=2,
            bathrooms=1,
            total_area=80,
        )
        self.client.force_authenticate(user=self.unverified)
        response = self.client.post(
            "/api/v1/matching/requests/",
            {
                "property": str(property_obj.id),
                "tenant_message": "Me interesa",
                "monthly_income": 3000000,
                "employment_type": "employee",
                "preferred_move_in_date": "2026-06-01",
                "lease_duration_months": 12,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        body = response.data
        # PermissionDenied(detail=dict) se serializa plano: {detail, code, next_step}
        code = body.get("code") if isinstance(body, dict) else None
        if code is None:
            nested = body.get("detail") if isinstance(body, dict) else None
            code = nested.get("code") if isinstance(nested, dict) else None
        self.assertEqual(str(code), "verihome_id_required")


# =============================================================================
# C12 — Score compuesto + endpoint scoring
# =============================================================================


class CompositeScoreTests(TestCase):
    """`FieldVisitAct.recompute_score` deriva total_score + final_verdict."""

    def setUp(self):
        from decimal import Decimal

        self.user = User.objects.create_user(
            email="score@t.com", password="x", first_name="S", last_name="C",
            user_type="tenant",
        )
        agent_user = User.objects.create_user(
            email="agscore@t.com", password="x",
            first_name="A", last_name="G",
            user_type="landlord", is_staff=True,
        )
        self.agent = VerificationAgent.objects.create(user=agent_user)
        self.field_request = FieldVisitRequest.objects.create(
            user=self.user,
            document_type_declared="cedula_ciudadania",
            document_number_declared="1",
            full_name_declared="X",
            digital_score={"total": 0.45},
            digital_score_total=Decimal("0.45"),
            digital_verdict="aprobado",
        )
        self.visit = VerificationVisit.objects.create(
            visit_type="tenant",
            agent=self.agent,
            target_user=self.user,
            visit_address="Cr 1",
            scheduled_date=timezone.now().date(),
        )

    def _build_act(self, visit_score):
        from decimal import Decimal
        from verification.models import FieldVisitAct

        return FieldVisitAct.objects.create(
            field_request=self.field_request,
            visit=self.visit,
            visit_score_total=Decimal(str(visit_score)),
        )

    def test_total_score_equals_digital_plus_visit(self):
        from decimal import Decimal

        act = self._build_act("0.40")
        self.assertEqual(act.total_score, Decimal("0.850"))

    def test_verdict_aprobado_when_total_above_080(self):
        act = self._build_act("0.40")  # 0.45 + 0.40 = 0.85
        self.assertEqual(act.final_verdict, "aprobado")

    def test_verdict_observado_between_055_and_080(self):
        act = self._build_act("0.20")  # 0.45 + 0.20 = 0.65
        self.assertEqual(act.final_verdict, "observado")

    def test_verdict_rechazado_below_055(self):
        act = self._build_act("0.05")  # 0.45 + 0.05 = 0.50
        self.assertEqual(act.final_verdict, "rechazado")


class ScoringEndpointTests(APITestCase):
    """`/api/v1/verification/acts/scoring/` rankea candidatos."""

    def setUp(self):
        from decimal import Decimal
        from verification.models import FieldVisitAct

        self.staff = User.objects.create_user(
            email="staffscore@t.com", password="x",
            first_name="St", last_name="ff",
            user_type="landlord", is_staff=True,
        )
        agent_user = User.objects.create_user(
            email="agscoreapi@t.com", password="x",
            first_name="A", last_name="G",
            user_type="landlord", is_staff=True,
        )
        agent = VerificationAgent.objects.create(user=agent_user)
        self.acts = []
        for idx, (digital, visit) in enumerate(
            [
                ("0.45", "0.40"),  # 0.85 aprobado
                ("0.30", "0.30"),  # 0.60 observado
                ("0.10", "0.10"),  # 0.20 rechazado
            ]
        ):
            user = User.objects.create_user(
                email=f"u{idx}@t.com", password="x",
                first_name=f"U{idx}", last_name="X",
                user_type="tenant",
            )
            fr = FieldVisitRequest.objects.create(
                user=user,
                document_type_declared="cedula_ciudadania",
                document_number_declared=str(idx),
                full_name_declared=f"U{idx}",
                digital_score={"total": float(digital)},
                digital_score_total=Decimal(digital),
                digital_verdict="aprobado",
            )
            visit_obj = VerificationVisit.objects.create(
                visit_type="tenant",
                agent=agent,
                target_user=user,
                visit_address="Cr 1",
                scheduled_date=timezone.now().date(),
            )
            self.acts.append(
                FieldVisitAct.objects.create(
                    field_request=fr,
                    visit=visit_obj,
                    visit_score_total=Decimal(visit),
                )
            )

    def test_scoring_requires_staff(self):
        response = self.client.get("/api/v1/verification/acts/scoring/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_scoring_lists_ranked_results(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.get("/api/v1/verification/acts/scoring/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.data
        self.assertEqual(body["summary"]["total"], 3)
        self.assertEqual(body["summary"]["aprobados"], 1)
        self.assertEqual(body["summary"]["observados"], 1)
        self.assertEqual(body["summary"]["rechazados"], 1)
        # Orden DESC por total_score
        scores = [r["total_score"] for r in body["results"]]
        self.assertEqual(scores, sorted(scores, reverse=True))

    def test_scoring_filter_verdict(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.get(
            "/api/v1/verification/acts/scoring/?verdict=aprobado"
        )
        self.assertEqual(response.data["summary"]["total"], 1)
        self.assertEqual(
            response.data["results"][0]["final_verdict"], "aprobado"
        )

    def test_scoring_filter_min_score(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.get(
            "/api/v1/verification/acts/scoring/?min_score=0.55"
        )
        self.assertEqual(response.data["summary"]["total"], 2)
