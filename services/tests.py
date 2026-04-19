"""
Tests for the services app.

Covers models (ServiceCategory, Service, ServiceRequest, ServiceImage),
slug auto-generation, string representations, pricing display, status
transitions, and API endpoints.
"""

import uuid
from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from django.contrib.auth import get_user_model

from .models import (
    ServiceCategory, Service, ServiceRequest, ServiceImage,
    SubscriptionPlan, ServiceSubscription,
    ServiceOrder, ServicePayment, ServiceOrderHistory,
)

User = get_user_model()


# ---------------------------------------------------------------------------
# Helper factory
# ---------------------------------------------------------------------------

def _make_category(**kwargs):
    """Create and return a ServiceCategory with sensible defaults."""
    defaults = {
        "name": "Mantenimiento",
        "description": "Servicios de mantenimiento general",
        "icon_name": "Build",
        "color": "#FF5722",
        "order": 0,
        "is_active": True,
        "is_featured": False,
    }
    defaults.update(kwargs)
    return ServiceCategory.objects.create(**defaults)


def _make_service(category=None, **kwargs):
    """Create and return a Service with sensible defaults."""
    if category is None:
        category = _make_category()
    defaults = {
        "category": category,
        "name": "Plomeria General",
        "short_description": "Servicio de plomeria",
        "full_description": "Servicio completo de plomeria residencial",
        "pricing_type": "fixed",
        "base_price": Decimal("150000.00"),
        "difficulty": "medium",
        "estimated_duration": "2-4 horas",
        "is_active": True,
    }
    defaults.update(kwargs)
    return Service.objects.create(**defaults)


def _make_service_request(service=None, **kwargs):
    """Create and return a ServiceRequest with sensible defaults."""
    if service is None:
        service = _make_service()
    defaults = {
        "service": service,
        "requester_name": "Juan Perez",
        "requester_email": "juan@example.com",
        "requester_phone": "3001234567",
        "message": "Necesito reparar la tuberia del bano",
        "status": "pending",
    }
    defaults.update(kwargs)
    return ServiceRequest.objects.create(**defaults)


def _tiny_gif():
    """Return a minimal valid GIF for ImageField tests."""
    return SimpleUploadedFile(
        name="test.gif",
        content=(
            b"\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00"
            b"\x00\xff\xff\xff\x00\x00\x00\x21\xf9\x04\x00\x00"
            b"\x00\x00\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00"
            b"\x00\x02\x02\x44\x01\x00\x3b"
        ),
        content_type="image/gif",
    )


# ===========================================================================
# Model tests
# ===========================================================================


class ServiceCategoryModelTests(TestCase):
    """Tests for the ServiceCategory model."""

    def setUp(self):
        self.category = _make_category(name="Electricidad", order=1)

    # -- CRUD ---------------------------------------------------------------

    def test_create_category(self):
        self.assertIsNotNone(self.category.pk)
        self.assertIsInstance(self.category.id, uuid.UUID)
        self.assertEqual(self.category.name, "Electricidad")

    def test_read_category(self):
        fetched = ServiceCategory.objects.get(pk=self.category.pk)
        self.assertEqual(fetched.name, "Electricidad")
        self.assertEqual(fetched.color, "#FF5722")

    def test_update_category(self):
        self.category.name = "Electricidad Industrial"
        self.category.save()
        self.category.refresh_from_db()
        self.assertEqual(self.category.name, "Electricidad Industrial")

    def test_delete_category(self):
        pk = self.category.pk
        self.category.delete()
        self.assertFalse(ServiceCategory.objects.filter(pk=pk).exists())

    # -- Slug auto-generation -----------------------------------------------

    def test_slug_auto_generated_on_create(self):
        self.assertEqual(self.category.slug, "electricidad")

    def test_slug_not_overwritten_on_update(self):
        """Once set, the slug should not be regenerated."""
        original_slug = self.category.slug
        self.category.name = "Electricidad Residencial"
        self.category.save()
        self.category.refresh_from_db()
        self.assertEqual(self.category.slug, original_slug)

    def test_slug_unique_constraint(self):
        """Two categories with the same slug should raise IntegrityError."""
        _make_category(name="Electricidad 2", slug="electricidad-2")
        with self.assertRaises(IntegrityError):
            _make_category(name="Duplicado", slug="electricidad-2")

    def test_custom_slug_respected(self):
        cat = _make_category(name="Seguridad", slug="custom-slug")
        self.assertEqual(cat.slug, "custom-slug")

    # -- String representation ----------------------------------------------

    def test_str(self):
        self.assertEqual(str(self.category), "Electricidad")

    # -- Defaults -----------------------------------------------------------

    def test_default_icon_name(self):
        cat = _make_category(name="Defaults Test")
        self.assertEqual(cat.icon_name, "Build")

    def test_default_color(self):
        cat = _make_category(name="Color Test", color="#2196F3")
        self.assertEqual(cat.color, "#2196F3")

    def test_default_is_active(self):
        self.assertTrue(self.category.is_active)

    def test_default_is_featured(self):
        self.assertFalse(self.category.is_featured)

    # -- Ordering -----------------------------------------------------------

    def test_meta_ordering(self):
        cat_a = _make_category(name="Alpha", order=2)
        cat_b = _make_category(name="Beta", order=0)
        qs = ServiceCategory.objects.filter(pk__in=[cat_a.pk, cat_b.pk])
        self.assertEqual(list(qs), [cat_b, cat_a])

    # -- Timestamps ---------------------------------------------------------

    def test_timestamps_set(self):
        self.assertIsNotNone(self.category.created_at)
        self.assertIsNotNone(self.category.updated_at)


class ServiceModelTests(TestCase):
    """Tests for the Service model."""

    def setUp(self):
        self.category = _make_category(name="Limpieza")
        self.service = _make_service(
            category=self.category,
            name="Limpieza Profunda",
            pricing_type="fixed",
            base_price=Decimal("200000.00"),
        )

    # -- CRUD ---------------------------------------------------------------

    def test_create_service(self):
        self.assertIsNotNone(self.service.pk)
        self.assertIsInstance(self.service.id, uuid.UUID)

    def test_read_service(self):
        fetched = Service.objects.get(pk=self.service.pk)
        self.assertEqual(fetched.name, "Limpieza Profunda")
        self.assertEqual(fetched.category, self.category)

    def test_update_service(self):
        self.service.base_price = Decimal("250000.00")
        self.service.save()
        self.service.refresh_from_db()
        self.assertEqual(self.service.base_price, Decimal("250000.00"))

    def test_delete_service(self):
        pk = self.service.pk
        self.service.delete()
        self.assertFalse(Service.objects.filter(pk=pk).exists())

    # -- Slug auto-generation -----------------------------------------------

    def test_slug_includes_category_and_name(self):
        self.assertEqual(self.service.slug, "limpieza-limpieza-profunda")

    def test_slug_not_overwritten_on_update(self):
        original = self.service.slug
        self.service.name = "Limpieza Express"
        self.service.save()
        self.service.refresh_from_db()
        self.assertEqual(self.service.slug, original)

    def test_custom_slug_respected(self):
        svc = _make_service(
            category=self.category,
            name="Custom",
            slug="my-custom-slug",
        )
        self.assertEqual(svc.slug, "my-custom-slug")

    # -- String representation ----------------------------------------------

    def test_str(self):
        self.assertEqual(str(self.service), "Limpieza - Limpieza Profunda")

    # -- Pricing types and display ------------------------------------------

    def test_pricing_type_fixed(self):
        self.service.pricing_type = "fixed"
        self.service.base_price = Decimal("150000")
        self.service.save()
        display = self.service.get_price_display()
        self.assertIn("150,000", display)
        self.assertIn("COP", display)

    def test_pricing_type_hourly(self):
        self.service.pricing_type = "hourly"
        self.service.base_price = Decimal("50000")
        self.service.save()
        display = self.service.get_price_display()
        self.assertIn("COP/hora", display)

    def test_pricing_type_range(self):
        self.service.pricing_type = "quote"
        self.service.base_price = None
        self.service.price_range_min = Decimal("100000")
        self.service.price_range_max = Decimal("500000")
        self.service.save()
        display = self.service.get_price_display()
        self.assertIn("100,000", display)
        self.assertIn("500,000", display)

    def test_pricing_type_consultation(self):
        self.service.pricing_type = "consultation"
        self.service.base_price = None
        self.service.price_range_min = None
        self.service.price_range_max = None
        self.service.save()
        self.assertEqual(self.service.get_price_display(), "Consulta disponible")

    def test_pricing_type_quote_no_ranges(self):
        self.service.pricing_type = "quote"
        self.service.base_price = None
        self.service.price_range_min = None
        self.service.price_range_max = None
        self.service.save()
        self.assertEqual(
            self.service.get_price_display(), "Precio bajo cotización"
        )

    # -- Pricing type choices validation ------------------------------------

    def test_valid_pricing_types(self):
        valid = {"fixed", "hourly", "consultation", "quote"}
        choices = {c[0] for c in Service.PRICING_TYPE_CHOICES}
        self.assertEqual(choices, valid)

    # -- Difficulty choices -------------------------------------------------

    def test_valid_difficulty_choices(self):
        valid = {"easy", "medium", "hard", "expert"}
        choices = {c[0] for c in Service.DIFFICULTY_CHOICES}
        self.assertEqual(choices, valid)

    # -- Counter helpers ----------------------------------------------------

    def test_increment_views(self):
        initial = self.service.views_count
        self.service.increment_views()
        self.service.refresh_from_db()
        self.assertEqual(self.service.views_count, initial + 1)

    def test_increment_requests(self):
        initial = self.service.requests_count
        self.service.increment_requests()
        self.service.refresh_from_db()
        self.assertEqual(self.service.requests_count, initial + 1)

    # -- Cascade delete -----------------------------------------------------

    def test_cascade_delete_with_category(self):
        svc_pk = self.service.pk
        self.category.delete()
        self.assertFalse(Service.objects.filter(pk=svc_pk).exists())

    # -- Related name -------------------------------------------------------

    def test_category_services_related_name(self):
        self.assertIn(self.service, self.category.services.all())

    # -- Defaults -----------------------------------------------------------

    def test_default_views_and_requests_counts(self):
        svc = _make_service(category=self.category, name="Fresh")
        self.assertEqual(svc.views_count, 0)
        self.assertEqual(svc.requests_count, 0)

    def test_default_popularity_score(self):
        svc = _make_service(category=self.category, name="Pop Test")
        self.assertEqual(svc.popularity_score, 0)

    def test_default_boolean_flags(self):
        svc = _make_service(category=self.category, name="Flags Test")
        self.assertTrue(svc.is_active)
        self.assertFalse(svc.is_featured)
        self.assertFalse(svc.is_most_requested)

    # -- Ordering -----------------------------------------------------------

    def test_meta_ordering_popularity_first(self):
        svc_low = _make_service(
            category=self.category, name="Low Pop", popularity_score=0, slug="low"
        )
        svc_high = _make_service(
            category=self.category, name="High Pop", popularity_score=100, slug="high"
        )
        qs = Service.objects.filter(pk__in=[svc_low.pk, svc_high.pk])
        self.assertEqual(qs.first(), svc_high)


class ServiceRequestModelTests(TestCase):
    """Tests for the ServiceRequest model."""

    def setUp(self):
        self.category = _make_category(name="Mudanzas")
        self.service = _make_service(category=self.category, name="Mudanza Local")
        self.request_obj = _make_service_request(
            service=self.service,
            requester_name="Maria Lopez",
            requester_email="maria@example.com",
        )

    # -- CRUD ---------------------------------------------------------------

    def test_create_request(self):
        self.assertIsNotNone(self.request_obj.pk)
        self.assertIsInstance(self.request_obj.id, uuid.UUID)

    def test_read_request(self):
        fetched = ServiceRequest.objects.get(pk=self.request_obj.pk)
        self.assertEqual(fetched.requester_name, "Maria Lopez")

    def test_update_request(self):
        self.request_obj.admin_notes = "Prioridad alta"
        self.request_obj.save()
        self.request_obj.refresh_from_db()
        self.assertEqual(self.request_obj.admin_notes, "Prioridad alta")

    def test_delete_request(self):
        pk = self.request_obj.pk
        self.request_obj.delete()
        self.assertFalse(ServiceRequest.objects.filter(pk=pk).exists())

    # -- String representation ----------------------------------------------

    def test_str(self):
        expected = "Solicitud: Mudanza Local - Maria Lopez"
        self.assertEqual(str(self.request_obj), expected)

    # -- Status choices validation ------------------------------------------

    def test_valid_status_choices(self):
        valid = {"pending", "contacted", "in_progress", "completed", "cancelled"}
        choices = {c[0] for c in ServiceRequest.STATUS_CHOICES}
        self.assertEqual(choices, valid)

    def test_default_status_is_pending(self):
        req = _make_service_request(service=self.service, requester_name="Test")
        self.assertEqual(req.status, "pending")

    # -- Status transitions -------------------------------------------------

    def test_transition_pending_to_contacted(self):
        self.request_obj.status = "contacted"
        self.request_obj.save()
        self.request_obj.refresh_from_db()
        self.assertEqual(self.request_obj.status, "contacted")

    def test_transition_contacted_to_in_progress(self):
        self.request_obj.status = "in_progress"
        self.request_obj.save()
        self.request_obj.refresh_from_db()
        self.assertEqual(self.request_obj.status, "in_progress")

    def test_transition_in_progress_to_completed(self):
        self.request_obj.status = "completed"
        self.request_obj.save()
        self.request_obj.refresh_from_db()
        self.assertEqual(self.request_obj.status, "completed")

    def test_transition_pending_to_cancelled(self):
        self.request_obj.status = "cancelled"
        self.request_obj.save()
        self.request_obj.refresh_from_db()
        self.assertEqual(self.request_obj.status, "cancelled")

    # -- Optional fields ----------------------------------------------------

    def test_preferred_date_optional(self):
        req = _make_service_request(
            service=self.service,
            preferred_date=date(2026, 4, 15),
        )
        self.assertEqual(req.preferred_date, date(2026, 4, 15))

    def test_budget_range_optional(self):
        req = _make_service_request(
            service=self.service,
            budget_range="200000-400000 COP",
        )
        self.assertEqual(req.budget_range, "200000-400000 COP")

    # -- Cascade delete -----------------------------------------------------

    def test_cascade_delete_with_service(self):
        req_pk = self.request_obj.pk
        self.service.delete()
        self.assertFalse(ServiceRequest.objects.filter(pk=req_pk).exists())

    # -- Related name -------------------------------------------------------

    def test_service_requests_related_name(self):
        self.assertIn(self.request_obj, self.service.service_requests.all())

    # -- Ordering -----------------------------------------------------------

    def test_ordering_most_recent_first(self):
        req2 = _make_service_request(service=self.service, requester_name="Segundo")
        qs = ServiceRequest.objects.filter(
            pk__in=[self.request_obj.pk, req2.pk]
        )
        self.assertEqual(qs.first(), req2)

    # -- Timestamps ---------------------------------------------------------

    def test_timestamps_set(self):
        self.assertIsNotNone(self.request_obj.created_at)
        self.assertIsNotNone(self.request_obj.updated_at)


@override_settings(MEDIA_ROOT="/tmp/verihome_test_media/")
class ServiceImageModelTests(TestCase):
    """Tests for the ServiceImage model."""

    def setUp(self):
        self.category = _make_category(name="Pintura")
        self.service = _make_service(category=self.category, name="Pintura Interior")
        self.image = ServiceImage.objects.create(
            service=self.service,
            image=_tiny_gif(),
            alt_text="Foto de pintura interior",
            is_main=True,
            order=0,
        )

    # -- CRUD ---------------------------------------------------------------

    def test_create_image(self):
        self.assertIsNotNone(self.image.pk)

    def test_read_image(self):
        fetched = ServiceImage.objects.get(pk=self.image.pk)
        self.assertEqual(fetched.alt_text, "Foto de pintura interior")

    def test_update_image(self):
        self.image.alt_text = "Actualizada"
        self.image.save()
        self.image.refresh_from_db()
        self.assertEqual(self.image.alt_text, "Actualizada")

    def test_delete_image(self):
        pk = self.image.pk
        self.image.delete()
        self.assertFalse(ServiceImage.objects.filter(pk=pk).exists())

    # -- String representation ----------------------------------------------

    def test_str(self):
        self.assertEqual(str(self.image), "Imagen de Pintura Interior")

    # -- Flags and ordering -------------------------------------------------

    def test_is_main_flag(self):
        self.assertTrue(self.image.is_main)

    def test_ordering_main_first(self):
        ServiceImage.objects.create(
            service=self.service,
            image=_tiny_gif(),
            is_main=False,
            order=0,
        )
        qs = ServiceImage.objects.filter(service=self.service)
        self.assertEqual(qs.first(), self.image)

    # -- Cascade delete -----------------------------------------------------

    def test_cascade_delete_with_service(self):
        img_pk = self.image.pk
        self.service.delete()
        self.assertFalse(ServiceImage.objects.filter(pk=img_pk).exists())

    # -- Related name -------------------------------------------------------

    def test_images_related_name(self):
        self.assertIn(self.image, self.service.images.all())


# ===========================================================================
# API / Endpoint tests
# ===========================================================================


class ServiceCategoryAPITests(APITestCase):
    """Tests for the ServiceCategory ViewSet endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.cat1 = _make_category(name="Cerrajeria", is_featured=True, order=0)
        self.cat2 = _make_category(
            name="Jardineria", is_featured=False, order=1, slug="jardineria"
        )

    def test_list_categories(self):
        response = self.client.get("/api/v1/services/categories/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [c["name"] for c in response.data["results"]]
        self.assertIn("Cerrajeria", names)
        self.assertIn("Jardineria", names)

    def test_retrieve_category(self):
        response = self.client.get(f"/api/v1/services/categories/{self.cat1.pk}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Cerrajeria")

    def test_featured_categories(self):
        response = self.client.get("/api/v1/services/categories/featured/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = [c["name"] for c in response.data]
        self.assertIn("Cerrajeria", names)
        self.assertNotIn("Jardineria", names)

    def test_read_only_no_post(self):
        response = self.client.post(
            "/api/v1/services/categories/", {"name": "Hacking"}
        )
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class ServiceAPITests(APITestCase):
    """Tests for the Service ViewSet endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.category = _make_category(name="Tecnologia")
        self.service = _make_service(
            category=self.category,
            name="Instalacion WiFi",
            is_featured=True,
            is_most_requested=True,
            popularity_score=50,
        )

    def test_list_services(self):
        response = self.client.get("/api/v1/services/services/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_retrieve_service_increments_views(self):
        initial_views = self.service.views_count
        response = self.client.get(
            f"/api/v1/services/services/{self.service.pk}/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.service.refresh_from_db()
        self.assertEqual(self.service.views_count, initial_views + 1)

    def test_featured_services(self):
        response = self.client.get("/api/v1/services/services/featured/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_most_requested_services(self):
        response = self.client.get("/api/v1/services/services/most_requested/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_popular_services(self):
        response = self.client.get("/api/v1/services/services/popular/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_by_category(self):
        response = self.client.get(
            "/api/v1/services/services/by_category/",
            {"category": self.category.slug},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_stats(self):
        response = self.client.get("/api/v1/services/services/stats/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("total_services", response.data)
        self.assertIn("total_categories", response.data)

    def test_search_filter(self):
        response = self.client.get(
            "/api/v1/services/services/", {"search": "WiFi"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_anonymous_cannot_post(self):
        """SVC-02: POST sin auth → 403 (antes era 405 con ReadOnlyModelViewSet)."""
        response = self.client.post("/api/v1/services/services/", {"name": "X"})
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_subscriber_can_post(self):
        """SVC-02: prestador con suscripción activa puede crear servicios."""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        sp = User.objects.create_user(
            email='provider@test.com', password='Test1234!',
            first_name='Proveedor', last_name='Test', user_type='service_provider',
        )
        plan = SubscriptionPlan.objects.first()
        if not plan:
            plan = SubscriptionPlan.objects.create(
                name='Test', slug='test', price=50000, description='Plan test',
                max_active_services=10,
            )
        ServiceSubscription.objects.create(
            service_provider=sp, plan=plan, status='active',
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timedelta(days=30)).date(),
        )
        self.client.force_authenticate(user=sp)
        response = self.client.post("/api/v1/services/services/", {
            "name": "Limpieza Express",
            "short_description": "Limpieza profesional",
            "full_description": "Limpieza profesional de interiores.",
            "category": str(self.category.id),
            "pricing_type": "fixed",
            "base_price": "80000",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['provider_name'], 'Proveedor Test')

    def test_subscriber_respects_max_active_services(self):
        """SVC-001: al alcanzar el tope del plan, la creación debe rechazarse."""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        sp = User.objects.create_user(
            email='provider_cap@test.com', password='Test1234!',
            first_name='Cap', last_name='Provider', user_type='service_provider',
        )
        plan = SubscriptionPlan.objects.create(
            name='Mini', slug='mini', price=10000,
            description='Plan con 1 slot', max_active_services=1,
        )
        ServiceSubscription.objects.create(
            service_provider=sp, plan=plan, status='active',
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timedelta(days=30)).date(),
            services_published=1,  # cupo ya consumido
        )
        self.client.force_authenticate(user=sp)
        response = self.client.post("/api/v1/services/services/", {
            "name": "Servicio Extra",
            "short_description": "No debería crearse",
            "full_description": "Debería rechazarse por cupo.",
            "category": str(self.category.id),
            "pricing_type": "fixed",
            "base_price": "50000",
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('máximo', str(response.data).lower())


class ServiceRequestAPITests(APITestCase):
    """Tests for the ServiceRequest ViewSet endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.category = _make_category(name="Asesoria")
        self.service = _make_service(
            category=self.category, name="Asesoria Legal"
        )

    def test_create_request(self):
        data = {
            "service": str(self.service.pk),
            "requester_name": "Carlos Garcia",
            "requester_email": "carlos@example.com",
            "requester_phone": "3109876543",
            "message": "Necesito asesoria para contrato de arrendamiento",
        }
        response = self.client.post("/api/v1/services/requests/", data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["requester_name"], "Carlos Garcia")
        self.assertEqual(response.data["status"], "pending")

    def test_create_request_increments_service_counter(self):
        initial = self.service.requests_count
        data = {
            "service": str(self.service.pk),
            "requester_name": "Test User",
            "requester_email": "test@example.com",
            "requester_phone": "3000000000",
            "message": "Test message",
        }
        self.client.post("/api/v1/services/requests/", data)
        self.service.refresh_from_db()
        self.assertEqual(self.service.requests_count, initial + 1)

    def test_create_request_missing_required_fields(self):
        response = self.client.post("/api/v1/services/requests/", {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_requests(self):
        _make_service_request(service=self.service)
        response = self.client.get("/api/v1/services/requests/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_retrieve_request(self):
        req = _make_service_request(service=self.service)
        response = self.client.get(f"/api/v1/services/requests/{req.pk}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["requester_name"], "Juan Perez")

    # 1.9.3: FKs User/Property/Contract ---------------------------------

    def test_create_request_anonymous_keeps_requester_null(self):
        """Solicitud anónima no debe asignar FK requester pero sí datos string."""
        data = {
            "service": str(self.service.pk),
            "requester_name": "Anonimo",
            "requester_email": "anon@example.com",
            "requester_phone": "3000000000",
            "message": "Consulta rapida",
        }
        response = self.client.post("/api/v1/services/requests/", data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = ServiceRequest.objects.get(pk=response.data["id"])
        self.assertIsNone(created.requester)
        self.assertIsNone(created.property)
        self.assertIsNone(created.contract)
        self.assertEqual(created.requester_name, "Anonimo")

    def test_create_request_authenticated_autoassigns_requester(self):
        """Usuario autenticado → requester se completa automáticamente."""
        user = User.objects.create_user(
            email="client@example.com", password="pass12345", user_type="tenant"
        )
        self.client.force_authenticate(user=user)
        data = {
            "service": str(self.service.pk),
            "requester_name": "Client Test",
            "requester_email": "client@example.com",
            "requester_phone": "3001112222",
            "message": "Necesito el servicio",
        }
        response = self.client.post("/api/v1/services/requests/", data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = ServiceRequest.objects.get(pk=response.data["id"])
        self.assertEqual(created.requester_id, user.id)
        # Los strings siguen preservándose para visibilidad histórica.
        self.assertEqual(created.requester_name, "Client Test")


class AdditionalListViewAPITests(APITestCase):
    """Tests for the standalone list view endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.category = _make_category(name="Construccion")
        self.service = _make_service(
            category=self.category,
            name="Albanileria",
            is_featured=True,
            is_most_requested=True,
            popularity_score=80,
        )

    def test_popular_list_view(self):
        response = self.client.get("/api/v1/services/popular/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_featured_list_view(self):
        response = self.client.get("/api/v1/services/featured/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_most_requested_list_view(self):
        response = self.client.get("/api/v1/services/most-requested/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_by_category_list_view(self):
        response = self.client.get(
            f"/api/v1/services/category/{self.category.slug}/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_search_view(self):
        response = self.client.get(
            "/api/v1/services/search/", {"search": "Albanileria"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# T2.1 · ServiceOrder + ServicePayment models
# ---------------------------------------------------------------------------

class ServiceOrderModelTests(TestCase):
    """Tests del modelo ServiceOrder."""

    def setUp(self):
        self.provider = User.objects.create_user(
            email='prov@test.com', password='test1234',
            first_name='Pro', last_name='V',
            user_type='service_provider',
        )
        self.client_user = User.objects.create_user(
            email='client@test.com', password='test1234',
            first_name='Cli', last_name='Ent',
            user_type='tenant',
        )

    def test_create_service_order_default_status_draft(self):
        order = ServiceOrder.objects.create(
            provider=self.provider,
            client=self.client_user,
            title='Limpieza profunda',
            description='Limpieza del apto completo',
            amount=Decimal('250000'),
        )
        self.assertEqual(order.status, 'draft')
        self.assertIsNone(order.payment_order)

    def test_str_representation(self):
        order = ServiceOrder.objects.create(
            provider=self.provider, client=self.client_user,
            title='Pintura', amount=Decimal('500000'),
        )
        s = str(order)
        self.assertIn('Pintura', s)
        self.assertIn('500000', s)

    def test_uuid_primary_key(self):
        order = ServiceOrder.objects.create(
            provider=self.provider, client=self.client_user,
            title='Test', amount=Decimal('100000'),
        )
        self.assertIsInstance(order.id, uuid.UUID)

    # --- 1.9.5: ServiceOrderHistory signal --------------------------------

    def test_signal_records_creation_entry(self):
        """Al crear una orden, signal registra una fila CREATE."""
        order = ServiceOrder.objects.create(
            provider=self.provider, client=self.client_user,
            title='Signal create', amount=Decimal('100000'),
        )
        entries = ServiceOrderHistory.objects.filter(order=order)
        self.assertEqual(entries.count(), 1)
        self.assertEqual(entries.first().action_type, 'CREATE')
        self.assertEqual(entries.first().new_status, 'draft')

    def test_signal_records_status_transitions(self):
        """Cada cambio de status añade una fila al historial."""
        order = ServiceOrder.objects.create(
            provider=self.provider, client=self.client_user,
            title='Signal transition', amount=Decimal('200000'),
        )
        order.status = 'sent'
        order.save()
        order.status = 'accepted'
        order.save()

        entries = ServiceOrderHistory.objects.filter(order=order).order_by('timestamp')
        self.assertEqual(entries.count(), 3)  # CREATE + SEND + ACCEPT
        self.assertEqual([e.action_type for e in entries],
                         ['CREATE', 'SEND', 'ACCEPT'])
        self.assertEqual(entries[2].old_status, 'sent')
        self.assertEqual(entries[2].new_status, 'accepted')

    def test_signal_noop_when_status_unchanged(self):
        """Guardar sin cambiar status no duplica filas."""
        order = ServiceOrder.objects.create(
            provider=self.provider, client=self.client_user,
            title='Signal noop', amount=Decimal('300000'),
        )
        order.notes = 'sólo metadatos'
        order.save()
        entries = ServiceOrderHistory.objects.filter(order=order)
        self.assertEqual(entries.count(), 1)  # sólo CREATE


class ServicePaymentModelTests(TestCase):
    """Tests del modelo ServicePayment."""

    def setUp(self):
        provider = User.objects.create_user(
            email='prov2@test.com', password='test1234',
            first_name='X', last_name='Y',
            user_type='service_provider',
        )
        client_user = User.objects.create_user(
            email='client2@test.com', password='test1234',
            first_name='X', last_name='Y',
            user_type='tenant',
        )
        self.order = ServiceOrder.objects.create(
            provider=provider, client=client_user,
            title='Test', amount=Decimal('300000'),
        )

    def test_create_payment(self):
        payment = ServicePayment.objects.create(
            order=self.order,
            amount_paid=Decimal('300000'),
            gateway='stripe',
        )
        self.assertEqual(payment.amount_paid, Decimal('300000'))
        self.assertEqual(payment.gateway, 'stripe')

    def test_payment_order_relation(self):
        ServicePayment.objects.create(
            order=self.order, amount_paid=Decimal('100000'), gateway='manual',
        )
        ServicePayment.objects.create(
            order=self.order, amount_paid=Decimal('200000'), gateway='wompi',
        )
        # Una orden puede tener múltiples pagos
        self.assertEqual(self.order.payments.count(), 2)


# ---------------------------------------------------------------------------
# T2.2 · ServiceOrderViewSet API
# ---------------------------------------------------------------------------

class ServiceOrderAPITests(APITestCase):
    """Endpoints CRUD + workflow de ServiceOrder."""

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email='admin@svc.com', password='test1234',
            first_name='A', last_name='X',
            user_type='landlord', is_staff=True,
        )
        self.provider = User.objects.create_user(
            email='prov@svc.com', password='test1234',
            first_name='Prov', last_name='X',
            user_type='service_provider',
        )
        self.tenant = User.objects.create_user(
            email='tt@svc.com', password='test1234',
            first_name='Ten', last_name='X',
            user_type='tenant',
        )
        # Crear suscripción activa para el provider
        plan = SubscriptionPlan.objects.create(
            name='Plan Test', slug='plan-test', description='x',
            price=Decimal('50000'),
        )
        ServiceSubscription.objects.create(
            service_provider=self.provider, plan=plan, status='active',
            start_date=timezone.now(),
            end_date=timezone.now() + timedelta(days=30),
        )

    def test_unauthenticated_returns_401(self):
        response = self.client.get('/api/v1/services/orders/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_provider_can_create_order(self):
        self.client.force_authenticate(user=self.provider)
        response = self.client.post('/api/v1/services/orders/', {
            'client': str(self.tenant.id),
            'title': 'Limpieza profunda',
            'description': 'Apto completo',
            'amount': '250000',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'draft')

    def test_tenant_cannot_create_order(self):
        self.client.force_authenticate(user=self.tenant)
        response = self.client.post('/api/v1/services/orders/', {
            'client': str(self.tenant.id),
            'title': 'X', 'amount': '100000',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_provider_without_subscription_blocked(self):
        prov2 = User.objects.create_user(
            email='nosub@svc.com', password='x',
            first_name='X', last_name='Y',
            user_type='service_provider',
        )
        self.client.force_authenticate(user=prov2)
        response = self.client.post('/api/v1/services/orders/', {
            'client': str(self.tenant.id),
            'title': 'X', 'amount': '100000',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_send_action(self):
        order = ServiceOrder.objects.create(
            provider=self.provider, client=self.tenant,
            title='X', amount=Decimal('100000'),
        )
        self.client.force_authenticate(user=self.provider)
        response = self.client.post(f'/api/v1/services/orders/{order.id}/send/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, 'sent')
        self.assertIsNotNone(order.sent_at)

    def test_accept_creates_payment_order(self):
        order = ServiceOrder.objects.create(
            provider=self.provider, client=self.tenant,
            title='Servicio X', amount=Decimal('300000'),
            status='sent',
        )
        self.client.force_authenticate(user=self.tenant)
        response = self.client.post(f'/api/v1/services/orders/{order.id}/accept/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, 'accepted')
        self.assertIsNotNone(order.payment_order)
        self.assertEqual(order.payment_order.amount, Decimal('300000'))
        self.assertEqual(order.payment_order.order_type, 'service')
        self.assertTrue(order.payment_order.order_number.startswith('PO-'))

    def test_reject_action(self):
        order = ServiceOrder.objects.create(
            provider=self.provider, client=self.tenant,
            title='X', amount=Decimal('100000'), status='sent',
        )
        self.client.force_authenticate(user=self.tenant)
        response = self.client.post(f'/api/v1/services/orders/{order.id}/reject/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, 'rejected')

    def test_cancel_by_provider(self):
        order = ServiceOrder.objects.create(
            provider=self.provider, client=self.tenant,
            title='X', amount=Decimal('100000'), status='draft',
        )
        self.client.force_authenticate(user=self.provider)
        response = self.client.post(f'/api/v1/services/orders/{order.id}/cancel/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, 'cancelled')

    def test_provider_sees_only_own_orders(self):
        ServiceOrder.objects.create(
            provider=self.provider, client=self.tenant,
            title='X', amount=Decimal('100000'),
        )
        # Otra orden de otro provider con suscripción
        other_prov = User.objects.create_user(
            email='other@svc.com', password='x',
            first_name='X', last_name='Y',
            user_type='service_provider',
        )
        ServiceOrder.objects.create(
            provider=other_prov, client=self.tenant,
            title='Y', amount=Decimal('200000'),
        )
        self.client.force_authenticate(user=self.provider)
        response = self.client.get('/api/v1/services/orders/')
        data = response.data['results'] if 'results' in response.data else response.data
        self.assertEqual(len(data), 1)
