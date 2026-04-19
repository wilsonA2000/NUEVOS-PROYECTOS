"""
Tests for the properties app.

Covers Property model creation and validation, CRUD API endpoints,
search/filter functionality, image upload, permission checks,
and public vs authenticated property listing.
"""

import uuid
from decimal import Decimal

from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase, APIClient

# Cache override that includes all backends the project needs (default + sessions)
_TEST_CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "test-default",
    },
    "sessions": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "test-sessions",
    },
    "query_cache": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "test-query",
    },
    "local_fallback": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "test-fallback",
    },
}

from .models import (
    Property, PropertyAmenity,
    PropertyFavorite,
)

from django.contrib.auth import get_user_model

User = get_user_model()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _tiny_gif():
    """Return a minimal valid GIF suitable for ImageField tests."""
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


def _create_landlord(email="landlord@test.com", **kwargs):
    """Create a landlord user."""
    defaults = {
        "email": email,
        "password": "TestPass123!",
        "first_name": "Land",
        "last_name": "Lord",
        "user_type": "landlord",
    }
    defaults.update(kwargs)
    pwd = defaults.pop("password")
    user = User.objects.create_user(password=pwd, **defaults)
    return user


def _create_tenant(email="tenant@test.com", **kwargs):
    """Create a tenant user."""
    defaults = {
        "email": email,
        "password": "TestPass123!",
        "first_name": "Ten",
        "last_name": "Ant",
        "user_type": "tenant",
    }
    defaults.update(kwargs)
    pwd = defaults.pop("password")
    user = User.objects.create_user(password=pwd, **defaults)
    return user


def _create_property(landlord, **kwargs):
    """Create a Property with sensible defaults."""
    defaults = {
        "landlord": landlord,
        "title": "Apartamento Centro",
        "description": "Hermoso apartamento en el centro de la ciudad.",
        "property_type": "apartment",
        "listing_type": "rent",
        "status": "available",
        "address": "Calle 50 #10-30",
        "city": "Bucaramanga",
        "state": "Santander",
        "country": "Colombia",
        "bedrooms": 3,
        "bathrooms": Decimal("2.0"),
        "total_area": Decimal("85.00"),
        "rent_price": Decimal("1500000.00"),
        "is_active": True,
    }
    defaults.update(kwargs)
    return Property.objects.create(**defaults)


PROPERTY_CREATE_DATA = {
    "title": "Casa Nueva",
    "description": "Una casa nueva con jardin y piscina.",
    "property_type": "house",
    "listing_type": "rent",
    "address": "Carrera 20 #45-10",
    "city": "Bogota",
    "state": "Cundinamarca",
    "country": "Colombia",
    "bedrooms": 4,
    "bathrooms": "3.0",
    "total_area": "150.00",
    "rent_price": "2500000.00",
}


# ===========================================================================
# Model Tests
# ===========================================================================


class PropertyModelTests(TestCase):
    """Tests for the Property model."""

    def setUp(self):
        self.landlord = _create_landlord()
        self.prop = _create_property(self.landlord)

    def test_create_property(self):
        """A property is created with correct field values."""
        self.assertEqual(self.prop.title, "Apartamento Centro")
        self.assertEqual(self.prop.landlord, self.landlord)
        self.assertEqual(self.prop.property_type, "apartment")
        self.assertEqual(self.prop.status, "available")
        self.assertTrue(self.prop.is_active)

    def test_str_representation(self):
        """__str__ includes title and city."""
        s = str(self.prop)
        self.assertIn("Apartamento Centro", s)
        self.assertIn("Bucaramanga", s)

    def test_uuid_primary_key(self):
        """Property id is a UUID."""
        self.assertIsInstance(self.prop.id, uuid.UUID)

    def test_formatted_price_rent(self):
        """get_formatted_price returns a rent-formatted string."""
        result = self.prop.get_formatted_price()
        self.assertIn("/mes", result)

    def test_formatted_price_sale(self):
        """get_formatted_price for sale listing."""
        prop = _create_property(
            self.landlord,
            title="Terreno",
            listing_type="sale",
            sale_price=Decimal("500000000.00"),
            rent_price=None,
        )
        result = prop.get_formatted_price()
        self.assertNotIn("/mes", result)
        self.assertIn("$", result)

    def test_default_values(self):
        """Default values are set correctly."""
        self.assertEqual(self.prop.parking_spaces, 0)
        self.assertEqual(self.prop.floors, 1)
        self.assertFalse(self.prop.pets_allowed)
        self.assertFalse(self.prop.furnished)
        self.assertEqual(self.prop.views_count, 0)
        self.assertEqual(self.prop.favorites_count, 0)
        self.assertEqual(self.prop.minimum_lease_term, 12)

    def test_property_ordering(self):
        """Properties are ordered by -created_at by default."""
        _create_property(self.landlord, title="Segundo")
        qs = Property.objects.all()
        self.assertEqual(qs.first().title, "Segundo")


class PropertyFavoriteModelTests(TestCase):
    """Tests for the PropertyFavorite model."""

    def setUp(self):
        self.landlord = _create_landlord()
        self.tenant = _create_tenant()
        self.prop = _create_property(self.landlord)

    def test_create_favorite(self):
        fav = PropertyFavorite.objects.create(user=self.tenant, property=self.prop)
        self.assertEqual(fav.user, self.tenant)
        self.assertEqual(fav.property, self.prop)

    def test_unique_together(self):
        """Cannot favorite the same property twice."""
        PropertyFavorite.objects.create(user=self.tenant, property=self.prop)
        with self.assertRaises(Exception):
            PropertyFavorite.objects.create(user=self.tenant, property=self.prop)


class PropertyAmenityModelTests(TestCase):
    """Tests for the PropertyAmenity model."""

    def test_create_amenity(self):
        amenity = PropertyAmenity.objects.create(
            name="Piscina",
            category="recreation",
            description="Piscina comunitaria",
        )
        self.assertEqual(str(amenity), "Piscina")
        self.assertTrue(amenity.is_active)


# ===========================================================================
# API Tests
# ===========================================================================


@override_settings(CACHES=_TEST_CACHES)
class PropertyListAPITests(APITestCase):
    """Tests for the property list endpoint (GET /api/v1/properties/)."""

    def setUp(self):
        self.landlord = _create_landlord()
        self.tenant = _create_tenant()
        self.prop = _create_property(self.landlord)
        self.client = APIClient()

    def test_unauthenticated_list_returns_401_or_403(self):
        """Unauthenticated users cannot list properties."""
        resp = self.client.get("/api/v1/properties/")
        self.assertIn(resp.status_code, [401, 403])

    def test_landlord_list_own_properties(self):
        """Landlord sees own properties."""
        self.client.force_authenticate(user=self.landlord)
        resp = self.client.get("/api/v1/properties/")
        self.assertEqual(resp.status_code, 200)
        # Response may be paginated
        data = resp.data.get("results", resp.data)
        self.assertGreaterEqual(len(data), 1)

    def test_tenant_list_available_properties(self):
        """Tenant sees available/active properties."""
        self.client.force_authenticate(user=self.tenant)
        resp = self.client.get("/api/v1/properties/")
        self.assertEqual(resp.status_code, 200)
        data = resp.data.get("results", resp.data)
        self.assertGreaterEqual(len(data), 1)

    def test_tenant_does_not_see_inactive_property(self):
        """Tenant cannot see inactive properties."""
        self.prop.is_active = False
        self.prop.save()
        self.client.force_authenticate(user=self.tenant)
        resp = self.client.get("/api/v1/properties/")
        self.assertEqual(resp.status_code, 200)
        data = resp.data.get("results", resp.data)
        titles = [p.get("title") for p in data]
        self.assertNotIn("Apartamento Centro", titles)


@override_settings(CACHES=_TEST_CACHES)
class PropertyCreateAPITests(APITestCase):
    """Tests for creating properties (POST /api/v1/properties/)."""

    def setUp(self):
        self.landlord = _create_landlord()
        self.tenant = _create_tenant()
        self.client = APIClient()

    def test_landlord_can_create_property(self):
        """A landlord can create a property."""
        self.client.force_authenticate(user=self.landlord)
        resp = self.client.post("/api/v1/properties/", PROPERTY_CREATE_DATA, format="json")
        self.assertIn(resp.status_code, [200, 201])
        self.assertEqual(Property.objects.count(), 1)

    def test_tenant_cannot_create_property(self):
        """A tenant is forbidden from creating a property."""
        self.client.force_authenticate(user=self.tenant)
        resp = self.client.post("/api/v1/properties/", PROPERTY_CREATE_DATA, format="json")
        self.assertEqual(resp.status_code, 403)

    def test_unauthenticated_cannot_create(self):
        """Unauthenticated user cannot create."""
        resp = self.client.post("/api/v1/properties/", PROPERTY_CREATE_DATA, format="json")
        self.assertIn(resp.status_code, [401, 403])

    def test_create_missing_required_fields(self):
        """Creating without required fields returns 400."""
        self.client.force_authenticate(user=self.landlord)
        resp = self.client.post("/api/v1/properties/", {"title": "Solo titulo"}, format="json")
        self.assertEqual(resp.status_code, 400)


@override_settings(CACHES=_TEST_CACHES)
class PropertyRetrieveAPITests(APITestCase):
    """Tests for retrieving a single property (GET /api/v1/properties/{id}/)."""

    def setUp(self):
        self.landlord = _create_landlord()
        self.tenant = _create_tenant()
        self.prop = _create_property(self.landlord)
        self.client = APIClient()

    def test_landlord_retrieve_own_property(self):
        """Landlord can retrieve own property."""
        self.client.force_authenticate(user=self.landlord)
        resp = self.client.get(f"/api/v1/properties/{self.prop.id}/")
        self.assertEqual(resp.status_code, 200)

    def test_tenant_retrieve_available_property(self):
        """Tenant can retrieve an available property."""
        self.client.force_authenticate(user=self.tenant)
        resp = self.client.get(f"/api/v1/properties/{self.prop.id}/")
        self.assertEqual(resp.status_code, 200)

    def test_retrieve_nonexistent_returns_404(self):
        """Retrieving a nonexistent property returns 404."""
        self.client.force_authenticate(user=self.landlord)
        fake_id = uuid.uuid4()
        resp = self.client.get(f"/api/v1/properties/{fake_id}/")
        self.assertEqual(resp.status_code, 404)


@override_settings(CACHES=_TEST_CACHES)
class PropertyUpdateAPITests(APITestCase):
    """Tests for updating properties (PUT/PATCH /api/v1/properties/{id}/)."""

    def setUp(self):
        self.landlord = _create_landlord()
        self.other_landlord = _create_landlord(email="other@test.com")
        self.tenant = _create_tenant()
        self.prop = _create_property(self.landlord)
        self.client = APIClient()

    def test_owner_can_partial_update(self):
        """Owner can PATCH their property."""
        self.client.force_authenticate(user=self.landlord)
        resp = self.client.patch(
            f"/api/v1/properties/{self.prop.id}/",
            {"title": "Titulo Actualizado"},
            format="json",
        )
        self.assertIn(resp.status_code, [200, 201])
        self.prop.refresh_from_db()
        self.assertEqual(self.prop.title, "Titulo Actualizado")

    def test_tenant_cannot_update(self):
        """Tenant cannot update a property."""
        self.client.force_authenticate(user=self.tenant)
        resp = self.client.patch(
            f"/api/v1/properties/{self.prop.id}/",
            {"title": "Hacked"},
            format="json",
        )
        self.assertEqual(resp.status_code, 403)

    def test_other_landlord_cannot_update(self):
        """A different landlord cannot update someone else's property."""
        self.client.force_authenticate(user=self.other_landlord)
        resp = self.client.patch(
            f"/api/v1/properties/{self.prop.id}/",
            {"title": "Stolen"},
            format="json",
        )
        # Should be 403 or 404 (object-level permission or filtered queryset)
        self.assertIn(resp.status_code, [403, 404])


@override_settings(CACHES=_TEST_CACHES)
class PropertyDeleteAPITests(APITestCase):
    """Tests for deleting properties (DELETE /api/v1/properties/{id}/)."""

    def setUp(self):
        self.landlord = _create_landlord()
        self.other_landlord = _create_landlord(email="other@test.com")
        self.tenant = _create_tenant()
        self.prop = _create_property(self.landlord)
        self.client = APIClient()

    def test_owner_can_delete(self):
        """Owner can delete their property."""
        self.client.force_authenticate(user=self.landlord)
        resp = self.client.delete(f"/api/v1/properties/{self.prop.id}/")
        self.assertIn(resp.status_code, [200, 204])
        self.assertFalse(Property.objects.filter(id=self.prop.id, is_active=True).exists())

    def test_tenant_cannot_delete(self):
        """Tenant cannot delete a property."""
        self.client.force_authenticate(user=self.tenant)
        resp = self.client.delete(f"/api/v1/properties/{self.prop.id}/")
        self.assertEqual(resp.status_code, 403)

    def test_other_landlord_cannot_delete(self):
        """Another landlord cannot delete someone else's property."""
        self.client.force_authenticate(user=self.other_landlord)
        resp = self.client.delete(f"/api/v1/properties/{self.prop.id}/")
        self.assertIn(resp.status_code, [403, 404])


@override_settings(CACHES=_TEST_CACHES)
class PropertySearchFilterAPITests(APITestCase):
    """Tests for search and filter on properties."""

    def setUp(self):
        self.landlord = _create_landlord()
        self.tenant = _create_tenant()
        self.client = APIClient()

        # Create several properties for filtering
        _create_property(self.landlord, title="Apto Bogota", city="Bogota", property_type="apartment", rent_price=Decimal("1200000"))
        _create_property(self.landlord, title="Casa Medellin", city="Medellin", property_type="house", rent_price=Decimal("3000000"), bedrooms=5)
        _create_property(self.landlord, title="Estudio Cali", city="Cali", property_type="studio", rent_price=Decimal("800000"), bedrooms=1)

    def test_filter_by_property_type(self):
        """Filter by property_type returns matching results."""
        self.client.force_authenticate(user=self.tenant)
        resp = self.client.get("/api/v1/properties/", {"property_type": "house"})
        self.assertEqual(resp.status_code, 200)
        data = resp.data.get("results", resp.data)
        for p in data:
            self.assertEqual(p["property_type"], "house")

    def test_filter_by_city(self):
        """Filter by city returns matching results."""
        self.client.force_authenticate(user=self.tenant)
        resp = self.client.get("/api/v1/properties/", {"city": "Bogota"})
        self.assertEqual(resp.status_code, 200)
        data = resp.data.get("results", resp.data)
        for p in data:
            self.assertEqual(p["city"], "Bogota")

    def test_search_by_title(self):
        """Search query matches title."""
        self.client.force_authenticate(user=self.tenant)
        resp = self.client.get("/api/v1/properties/", {"search": "Estudio"})
        self.assertEqual(resp.status_code, 200)
        data = resp.data.get("results", resp.data)
        titles = [p["title"] for p in data]
        self.assertIn("Estudio Cali", titles)

    def test_ordering_by_rent_price(self):
        """Ordering by rent_price works."""
        self.client.force_authenticate(user=self.tenant)
        resp = self.client.get("/api/v1/properties/", {"ordering": "rent_price"})
        self.assertEqual(resp.status_code, 200)
        data = resp.data.get("results", resp.data)
        if len(data) >= 2:
            prices = [Decimal(str(p["rent_price"])) for p in data if p.get("rent_price")]
            self.assertEqual(prices, sorted(prices))


@override_settings(CACHES=_TEST_CACHES)
class ToggleFavoriteAPITests(APITestCase):
    """Tests for the toggle-favorite endpoint."""

    def setUp(self):
        self.landlord = _create_landlord()
        self.tenant = _create_tenant()
        self.prop = _create_property(self.landlord)
        self.client = APIClient()

    def test_add_favorite(self):
        """POST adds property to favorites."""
        self.client.force_authenticate(user=self.tenant)
        resp = self.client.post(f"/api/v1/properties/{self.prop.id}/toggle-favorite/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["action"], "added")
        self.assertTrue(PropertyFavorite.objects.filter(user=self.tenant, property=self.prop).exists())

    def test_remove_favorite(self):
        """POST again removes property from favorites."""
        PropertyFavorite.objects.create(user=self.tenant, property=self.prop)
        self.client.force_authenticate(user=self.tenant)
        resp = self.client.post(f"/api/v1/properties/{self.prop.id}/toggle-favorite/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["action"], "removed")
        self.assertFalse(PropertyFavorite.objects.filter(user=self.tenant, property=self.prop).exists())

    def test_toggle_nonexistent_property(self):
        """Toggle favorite on nonexistent property returns 404."""
        self.client.force_authenticate(user=self.tenant)
        fake_id = uuid.uuid4()
        resp = self.client.post(f"/api/v1/properties/{fake_id}/toggle-favorite/")
        self.assertEqual(resp.status_code, 404)


@override_settings(CACHES=_TEST_CACHES)
class PropertyStatsAndFiltersURLTests(APITestCase):
    """
    Tests that /stats/ and /filters/ endpoints are accessible.
    URL ordering was fixed so explicit paths match before the router.
    """

    def setUp(self):
        self.landlord = _create_landlord()
        self.client = APIClient()
        _create_property(self.landlord)

    def test_stats_url_accessible(self):
        """stats/ endpoint is reachable (not captured by router)."""
        self.client.force_authenticate(user=self.landlord)
        resp = self.client.get("/api/v1/properties/stats/")
        self.assertIn(resp.status_code, [200, 403])

    def test_filters_url_accessible(self):
        """filters/ endpoint is reachable (not captured by router)."""
        self.client.force_authenticate(user=self.landlord)
        resp = self.client.get("/api/v1/properties/filters/")
        self.assertIn(resp.status_code, [200, 403])


@override_settings(CACHES=_TEST_CACHES)
class PropertyPaginationAPITests(APITestCase):
    """Tests for property list pagination."""

    def setUp(self):
        self.landlord = _create_landlord()
        self.tenant = _create_tenant()
        self.client = APIClient()
        # Create enough properties to trigger pagination
        for i in range(25):
            _create_property(self.landlord, title=f"Prop {i}")

    def test_default_page_size(self):
        """Default page size is 20."""
        self.client.force_authenticate(user=self.tenant)
        resp = self.client.get("/api/v1/properties/")
        self.assertEqual(resp.status_code, 200)
        data = resp.data.get("results", resp.data)
        self.assertEqual(len(data), 20)

    def test_custom_page_size(self):
        """page_size parameter limits results."""
        self.client.force_authenticate(user=self.tenant)
        resp = self.client.get("/api/v1/properties/", {"page_size": 5})
        self.assertEqual(resp.status_code, 200)
        data = resp.data.get("results", resp.data)
        self.assertEqual(len(data), 5)

    def test_page_two(self):
        """Page 2 returns remaining results."""
        self.client.force_authenticate(user=self.tenant)
        resp = self.client.get("/api/v1/properties/", {"page": 2})
        self.assertEqual(resp.status_code, 200)
        data = resp.data.get("results", resp.data)
        self.assertEqual(len(data), 5)  # 25 total, page_size=20, page 2 has 5
