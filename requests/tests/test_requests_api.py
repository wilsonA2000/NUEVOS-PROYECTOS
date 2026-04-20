"""
Tests para la API del sistema de solicitudes de VeriHome.
Cubre: BaseRequest CRUD, acciones, stats, notificaciones,
MaintenanceRequest, ServiceRequest y comentarios.
"""

from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from properties.models import Property
from requests.models import (
    BaseRequest,
    RequestNotification,
    RequestComment,
)

User = get_user_model()


class RequestsAPITestBase(TestCase):
    """Setup compartido para todos los tests de requests."""

    def setUp(self):
        self.client = APIClient()

        self.landlord = User.objects.create_user(
            email="landlord@test.com",
            password="test1234",
            first_name="Land",
            last_name="Lord",
            user_type="landlord",
        )
        self.tenant = User.objects.create_user(
            email="tenant@test.com",
            password="test1234",
            first_name="Ten",
            last_name="Ant",
            user_type="tenant",
        )
        self.other_tenant = User.objects.create_user(
            email="other@test.com",
            password="test1234",
            first_name="Other",
            last_name="Tenant",
            user_type="tenant",
        )

        self.property = Property.objects.create(
            title="Apto Test",
            description="Apartamento de prueba",
            landlord=self.landlord,
            property_type="apartment",
            listing_type="rent",
            rent_price=1500000,
            total_area=60,
            bedrooms=2,
            bathrooms=1,
            city="Bucaramanga",
            state="Santander",
            address="Cra 27 #36-20",
        )


class BaseRequestCRUDTests(RequestsAPITestBase):
    """Tests CRUD para BaseRequest."""

    def test_list_unauthenticated_returns_401(self):
        response = self.client.get("/api/v1/requests/api/base/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_base_request(self):
        self.client.force_authenticate(user=self.tenant)
        data = {
            "request_type": "property_interest",
            "title": "Interesado en apto",
            "description": "Me interesa el apartamento",
            "assignee": str(self.landlord.id),
        }
        response = self.client.post("/api/v1/requests/api/base/", data)
        self.assertIn(
            response.status_code, [status.HTTP_201_CREATED, status.HTTP_200_OK]
        )

    def test_tenant_sees_only_own_requests(self):
        BaseRequest.objects.create(
            request_type="property_interest",
            title="Req del tenant",
            description="desc",
            requester=self.tenant,
            assignee=self.landlord,
        )
        BaseRequest.objects.create(
            request_type="property_interest",
            title="Req de otro",
            description="desc",
            requester=self.other_tenant,
            assignee=self.landlord,
        )
        self.client.force_authenticate(user=self.tenant)
        response = self.client.get("/api/v1/requests/api/base/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data["results"] if "results" in response.data else response.data
        self.assertEqual(len(data), 1)

    def test_landlord_sees_assigned_requests(self):
        BaseRequest.objects.create(
            request_type="property_interest",
            title="Para landlord",
            description="desc",
            requester=self.tenant,
            assignee=self.landlord,
        )
        self.client.force_authenticate(user=self.landlord)
        response = self.client.get("/api/v1/requests/api/base/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data["results"] if "results" in response.data else response.data
        self.assertEqual(len(data), 1)


class BaseRequestActionsTests(RequestsAPITestBase):
    """Tests para acciones en BaseRequest."""

    def setUp(self):
        super().setUp()
        self.req = BaseRequest.objects.create(
            request_type="property_interest",
            title="Solicitud test",
            description="desc",
            requester=self.tenant,
            assignee=self.landlord,
        )

    def test_accept_action_by_assignee(self):
        self.client.force_authenticate(user=self.landlord)
        response = self.client.post(
            f"/api/v1/requests/api/base/{self.req.id}/perform_action/",
            {"action": "accept", "message": "Aceptado"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.req.refresh_from_db()
        self.assertEqual(self.req.status, "in_progress")

    def test_reject_action_by_assignee(self):
        self.client.force_authenticate(user=self.landlord)
        response = self.client.post(
            f"/api/v1/requests/api/base/{self.req.id}/perform_action/",
            {"action": "reject", "message": "No disponible"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.req.refresh_from_db()
        self.assertEqual(self.req.status, "rejected")

    def test_action_by_non_assignee_forbidden(self):
        self.client.force_authenticate(user=self.tenant)
        response = self.client.post(
            f"/api/v1/requests/api/base/{self.req.id}/perform_action/",
            {"action": "accept"},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cancel_action(self):
        self.client.force_authenticate(user=self.tenant)
        response = self.client.post(
            f"/api/v1/requests/api/base/{self.req.id}/perform_action/",
            {"action": "cancel"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.req.refresh_from_db()
        self.assertEqual(self.req.status, "cancelled")

    def test_complete_action(self):
        self.client.force_authenticate(user=self.landlord)
        response = self.client.post(
            f"/api/v1/requests/api/base/{self.req.id}/perform_action/",
            {"action": "complete", "message": "Listo"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.req.refresh_from_db()
        self.assertEqual(self.req.status, "completed")
        self.assertIsNotNone(self.req.completed_at)


class DashboardStatsTests(RequestsAPITestBase):
    """Tests para dashboard_stats y my_sent/received_requests."""

    def test_dashboard_stats(self):
        BaseRequest.objects.create(
            request_type="property_interest",
            title="r1",
            description="d",
            requester=self.tenant,
            assignee=self.landlord,
        )
        self.client.force_authenticate(user=self.tenant)
        response = self.client.get("/api/v1/requests/api/base/dashboard_stats/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("total_requests", response.data)
        self.assertIn("by_type", response.data)

    def test_my_sent_requests(self):
        BaseRequest.objects.create(
            request_type="property_interest",
            title="sent",
            description="d",
            requester=self.tenant,
            assignee=self.landlord,
        )
        self.client.force_authenticate(user=self.tenant)
        response = self.client.get("/api/v1/requests/api/base/my_sent_requests/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_my_received_requests(self):
        BaseRequest.objects.create(
            request_type="property_interest",
            title="recv",
            description="d",
            requester=self.tenant,
            assignee=self.landlord,
        )
        self.client.force_authenticate(user=self.landlord)
        response = self.client.get("/api/v1/requests/api/base/my_received_requests/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class MaintenanceRequestTests(RequestsAPITestBase):
    """Tests para MaintenanceRequest endpoints."""

    def test_create_maintenance_request(self):
        self.client.force_authenticate(user=self.tenant)
        data = {
            "request_type": "maintenance_request",
            "title": "Grifo roto",
            "description": "El grifo de la cocina gotea",
            "assignee": str(self.landlord.id),
            "property": str(self.property.id),
            "maintenance_type": "repair",
            "affected_area": "Cocina",
            "issue_description": "Grifo gotea",
        }
        response = self.client.post("/api/v1/requests/api/maintenance/", data)
        self.assertIn(
            response.status_code, [status.HTTP_201_CREATED, status.HTTP_200_OK]
        )

    def test_list_maintenance_authenticated(self):
        self.client.force_authenticate(user=self.tenant)
        response = self.client.get("/api/v1/requests/api/maintenance/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class ServiceRequestTests(RequestsAPITestBase):
    """Tests para ServiceRequest endpoints."""

    def test_list_service_requests(self):
        self.client.force_authenticate(user=self.tenant)
        response = self.client.get("/api/v1/requests/api/services/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_service_request(self):
        self.client.force_authenticate(user=self.tenant)
        data = {
            "request_type": "service_request",
            "title": "Limpieza profunda",
            "description": "Limpieza del apartamento completo",
            "assignee": str(self.landlord.id),
            "property": str(self.property.id),
            "service_category": "cleaning",
        }
        response = self.client.post("/api/v1/requests/api/services/", data)
        self.assertIn(
            response.status_code, [status.HTTP_201_CREATED, status.HTTP_200_OK]
        )


class NotificationTests(RequestsAPITestBase):
    """Tests para RequestNotification endpoints."""

    def test_list_notifications(self):
        self.client.force_authenticate(user=self.tenant)
        response = self.client.get("/api/v1/requests/api/notifications/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_mark_as_read(self):
        req = BaseRequest.objects.create(
            request_type="property_interest",
            title="t",
            description="d",
            requester=self.tenant,
            assignee=self.landlord,
        )
        notif = RequestNotification.objects.create(
            request=req,
            recipient=self.tenant,
            notification_type="status_change",
            title="Cambio de estado",
            message="Tu solicitud fue aceptada",
        )
        self.client.force_authenticate(user=self.tenant)
        response = self.client.post(
            f"/api/v1/requests/api/notifications/{notif.id}/mark_as_read/",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        notif.refresh_from_db()
        self.assertTrue(notif.is_read)

    def test_mark_all_as_read(self):
        req = BaseRequest.objects.create(
            request_type="property_interest",
            title="t",
            description="d",
            requester=self.tenant,
            assignee=self.landlord,
        )
        for i in range(3):
            RequestNotification.objects.create(
                request=req,
                recipient=self.tenant,
                notification_type="status_change",
                title=f"Notif {i}",
                message=f"msg {i}",
            )
        self.client.force_authenticate(user=self.tenant)
        response = self.client.post(
            "/api/v1/requests/api/notifications/mark_all_as_read/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            RequestNotification.objects.filter(
                recipient=self.tenant, is_read=False
            ).count(),
            0,
        )


class CommentTests(RequestsAPITestBase):
    """Tests para RequestComment endpoints."""

    def setUp(self):
        super().setUp()
        self.req = BaseRequest.objects.create(
            request_type="property_interest",
            title="t",
            description="d",
            requester=self.tenant,
            assignee=self.landlord,
        )

    def test_create_comment(self):
        self.client.force_authenticate(user=self.tenant)
        response = self.client.post(
            f"/api/v1/requests/api/base/{self.req.id}/comments/",
            {"content": "Un comentario de prueba"},
        )
        self.assertIn(
            response.status_code, [status.HTTP_201_CREATED, status.HTTP_200_OK]
        )

    def test_list_comments(self):
        RequestComment.objects.create(
            request=self.req,
            author=self.tenant,
            content="Hola",
        )
        self.client.force_authenticate(user=self.tenant)
        response = self.client.get(
            f"/api/v1/requests/api/base/{self.req.id}/comments/",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class RequestModelTests(TestCase):
    """Tests de modelos básicos."""

    def setUp(self):
        self.user1 = User.objects.create_user(
            email="u1@test.com",
            password="test1234",
            first_name="A",
            last_name="B",
            user_type="tenant",
        )
        self.user2 = User.objects.create_user(
            email="u2@test.com",
            password="test1234",
            first_name="C",
            last_name="D",
            user_type="landlord",
        )

    def test_base_request_str(self):
        req = BaseRequest.objects.create(
            request_type="property_interest",
            title="Mi solicitud",
            description="desc",
            requester=self.user1,
            assignee=self.user2,
        )
        self.assertIn("Mi solicitud", str(req))

    def test_default_status_is_pending(self):
        req = BaseRequest.objects.create(
            request_type="property_interest",
            title="test",
            description="desc",
            requester=self.user1,
            assignee=self.user2,
        )
        self.assertEqual(req.status, "pending")

    def test_default_priority_is_normal(self):
        req = BaseRequest.objects.create(
            request_type="property_interest",
            title="test",
            description="desc",
            requester=self.user1,
            assignee=self.user2,
        )
        self.assertEqual(req.priority, "normal")

    def test_notification_mark_as_read(self):
        req = BaseRequest.objects.create(
            request_type="property_interest",
            title="t",
            description="d",
            requester=self.user1,
            assignee=self.user2,
        )
        notif = RequestNotification.objects.create(
            request=req,
            recipient=self.user1,
            notification_type="new_request",
            title="Nueva",
            message="msg",
        )
        self.assertFalse(notif.is_read)
        notif.mark_as_read()
        self.assertTrue(notif.is_read)
        self.assertIsNotNone(notif.read_at)
