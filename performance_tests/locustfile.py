from locust import HttpUser, task, between
import json
import random
from datetime import date, timedelta
import base64


class VeriHomeUser(HttpUser):
    """
    Simulates a typical VeriHome user performing various actions
    """
    wait_time = between(1, 3)  # Wait 1-3 seconds between requests
    host = "http://localhost:8000"  # Django backend URL
    
    def on_start(self):
        """Called when a user starts. Performs login."""
        self.login()
    
    def login(self):
        """Login with test credentials"""
        login_data = {
            "email": "tenant.test@verihome.com",
            "password": "TenantPass123!"
        }
        
        response = self.client.post("/api/v1/auth/login/", json=login_data)
        
        if response.status_code == 200:
            token_data = response.json()
            self.client.headers.update({
                "Authorization": f"Bearer {token_data['access']}"
            })
        else:
            # Create a test user if login fails
            self.register_test_user()
    
    def register_test_user(self):
        """Register a new test user"""
        user_id = random.randint(1000, 9999)
        register_data = {
            "email": f"loadtest{user_id}@verihome.com",
            "password": "LoadTest123!",
            "password2": "LoadTest123!",
            "first_name": "Load",
            "last_name": f"Test{user_id}",
            "role": random.choice(["tenant", "landlord"]),
            "interview_code": "123456"
        }
        
        response = self.client.post("/api/v1/auth/register/", json=register_data)
        
        if response.status_code == 201:
            # Try to login with the new user
            login_data = {
                "email": register_data["email"],
                "password": register_data["password"]
            }
            
            # In a real scenario, we'd need to verify the email first
            # For load testing, we'll assume the user is auto-verified
            login_response = self.client.post("/api/v1/auth/login/", json=login_data)
            
            if login_response.status_code == 200:
                token_data = login_response.json()
                self.client.headers.update({
                    "Authorization": f"Bearer {token_data['access']}"
                })
    
    @task(30)
    def browse_properties(self):
        """Most common task: Browse available properties"""
        params = {}
        
        # Randomly add search filters
        if random.random() < 0.3:  # 30% chance to filter by city
            params["city"] = random.choice(["Bogotá", "Medellín", "Cali"])
        
        if random.random() < 0.2:  # 20% chance to filter by price
            params["max_price"] = random.choice([1000000, 2000000, 3000000])
        
        if random.random() < 0.2:  # 20% chance to filter by property type
            params["property_type"] = random.choice(["apartment", "house", "studio"])
        
        if random.random() < 0.1:  # 10% chance to filter by bedrooms
            params["bedrooms"] = random.choice([1, 2, 3])
        
        response = self.client.get("/api/v1/properties/", params=params)
        
        if response.status_code == 200:
            properties = response.json().get("results", [])
            
            # 50% chance to view a property detail
            if properties and random.random() < 0.5:
                property_id = random.choice(properties)["id"]
                self.client.get(f"/api/v1/properties/{property_id}/")
    
    @task(10)
    def search_properties(self):
        """Search properties with text query"""
        search_terms = [
            "apartment", "house", "luxury", "furnished", 
            "parking", "gym", "pool", "balcony", "pets"
        ]
        
        search_term = random.choice(search_terms)
        params = {"search": search_term}
        
        self.client.get("/api/v1/properties/", params=params)
    
    @task(8)
    def view_property_detail(self):
        """View detailed property information"""
        # First get a list of properties
        response = self.client.get("/api/v1/properties/")
        
        if response.status_code == 200:
            properties = response.json().get("results", [])
            if properties:
                property_id = random.choice(properties)["id"]
                
                # View property detail
                detail_response = self.client.get(f"/api/v1/properties/{property_id}/")
                
                if detail_response.status_code == 200:
                    # 20% chance to favorite the property
                    if random.random() < 0.2:
                        self.client.post(f"/api/v1/properties/{property_id}/toggle-favorite/")
    
    @task(5)
    def check_messages(self):
        """Check conversations and messages"""
        # Get conversations
        conversations_response = self.client.get("/api/v1/conversations/")
        
        if conversations_response.status_code == 200:
            conversations = conversations_response.json().get("results", [])
            
            if conversations:
                # Read messages from a random conversation
                conversation_id = random.choice(conversations)["id"]
                self.client.get(f"/api/v1/messages/?conversation={conversation_id}")
    
    @task(3)
    def view_profile(self):
        """View user profile information"""
        self.client.get("/api/v1/auth/me/")
    
    @task(2)
    def check_payments(self):
        """Check payment history (for tenants) or incoming payments (for landlords)"""
        self.client.get("/api/v1/payments/")
    
    @task(2)
    def check_contracts(self):
        """View user contracts"""
        self.client.get("/api/v1/contracts/")
    
    @task(1)
    def check_ratings(self):
        """View user ratings"""
        self.client.get("/api/v1/ratings/")


class LandlordUser(HttpUser):
    """
    Simulates a landlord user with property management tasks
    """
    wait_time = between(2, 5)
    host = "http://localhost:8000"
    
    def on_start(self):
        """Login as landlord"""
        login_data = {
            "email": "landlord.test@verihome.com",
            "password": "LandlordPass123!"
        }
        
        response = self.client.post("/api/v1/auth/login/", json=login_data)
        
        if response.status_code == 200:
            token_data = response.json()
            self.client.headers.update({
                "Authorization": f"Bearer {token_data['access']}"
            })
    
    @task(20)
    def manage_properties(self):
        """View and manage properties"""
        # Get my properties
        response = self.client.get("/api/v1/properties/my-properties/")
        
        if response.status_code == 200:
            properties = response.json().get("results", [])
            
            if properties:
                # Update a random property
                property_id = random.choice(properties)["id"]
                
                # 30% chance to update property details
                if random.random() < 0.3:
                    update_data = {
                        "description": f"Updated property description {random.randint(1, 1000)}"
                    }
                    self.client.patch(f"/api/v1/properties/{property_id}/", json=update_data)
    
    @task(10)
    def create_property(self):
        """Create a new property (simulation)"""
        property_data = {
            "title": f"Test Property {random.randint(1, 1000)}",
            "description": "Load test property description",
            "property_type": random.choice(["apartment", "house", "studio"]),
            "listing_type": "rent",
            "address": f"Test Address {random.randint(1, 100)}",
            "city": random.choice(["Bogotá", "Medellín", "Cali"]),
            "state": "Test State",
            "country": "Colombia",
            "latitude": str(random.uniform(4.0, 5.0)),
            "longitude": str(random.uniform(-75.0, -74.0)),
            "bedrooms": random.randint(1, 4),
            "bathrooms": random.randint(1, 3),
            "total_area": str(random.randint(50, 200)),
            "rent_price": str(random.randint(800000, 5000000))
        }
        
        self.client.post("/api/v1/properties/", json=property_data)
    
    @task(8)
    def check_contracts(self):
        """Check contracts for properties"""
        self.client.get("/api/v1/contracts/")
    
    @task(5)
    def check_payments(self):
        """Check incoming payments"""
        self.client.get("/api/v1/payments/")
    
    @task(3)
    def respond_to_messages(self):
        """Check and respond to tenant messages"""
        conversations_response = self.client.get("/api/v1/conversations/")
        
        if conversations_response.status_code == 200:
            conversations = conversations_response.json().get("results", [])
            
            if conversations:
                conversation_id = random.choice(conversations)["id"]
                
                # Check messages
                self.client.get(f"/api/v1/messages/?conversation={conversation_id}")
                
                # 20% chance to send a response
                if random.random() < 0.2:
                    message_data = {
                        "conversation": conversation_id,
                        "content": f"Load test response {random.randint(1, 1000)}",
                        "message_type": "text"
                    }
                    self.client.post("/api/v1/messages/", json=message_data)


class TenantUser(HttpUser):
    """
    Simulates a tenant user looking for properties
    """
    wait_time = between(1, 4)
    host = "http://localhost:8000"
    
    def on_start(self):
        """Login as tenant"""
        login_data = {
            "email": "tenant.test@verihome.com",
            "password": "TenantPass123!"
        }
        
        response = self.client.post("/api/v1/auth/login/", json=login_data)
        
        if response.status_code == 200:
            token_data = response.json()
            self.client.headers.update({
                "Authorization": f"Bearer {token_data['access']}"
            })
    
    @task(40)
    def search_properties(self):
        """Primary task: Search for rental properties"""
        search_params = {}
        
        # Common search patterns
        if random.random() < 0.4:  # Location-based search
            search_params["city"] = random.choice(["Bogotá", "Medellín"])
        
        if random.random() < 0.3:  # Budget-based search
            search_params["max_price"] = random.choice([1500000, 2000000, 2500000])
        
        if random.random() < 0.3:  # Size-based search
            search_params["min_bedrooms"] = random.choice([1, 2])
        
        if random.random() < 0.2:  # Amenity-based search
            search_params["furnished"] = "true"
        
        if random.random() < 0.1:  # Pet-friendly search
            search_params["pets_allowed"] = "true"
        
        response = self.client.get("/api/v1/properties/", params=search_params)
        
        if response.status_code == 200:
            properties = response.json().get("results", [])
            
            # View property details for interesting properties
            if properties and random.random() < 0.6:
                property_id = random.choice(properties)["id"]
                detail_response = self.client.get(f"/api/v1/properties/{property_id}/")
                
                if detail_response.status_code == 200 and random.random() < 0.3:
                    # Favorite the property
                    self.client.post(f"/api/v1/properties/{property_id}/toggle-favorite/")
    
    @task(10)
    def check_favorites(self):
        """Check saved/favorite properties"""
        self.client.get("/api/v1/properties/favorites/")
    
    @task(8)
    def contact_landlord(self):
        """Initiate contact with property owner"""
        # Get available properties first
        response = self.client.get("/api/v1/properties/")
        
        if response.status_code == 200:
            properties = response.json().get("results", [])
            
            if properties and random.random() < 0.1:  # 10% chance to contact
                property_data = random.choice(properties)
                
                conversation_data = {
                    "subject": f"Interest in {property_data['title']}",
                    "participants": [property_data["landlord"]],
                    "initial_message": "Hi! I'm interested in viewing this property. When would be a good time?"
                }
                
                self.client.post("/api/v1/conversations/", json=conversation_data)
    
    @task(5)
    def check_applications(self):
        """Check rental applications/contracts"""
        self.client.get("/api/v1/contracts/")
    
    @task(3)
    def check_payments(self):
        """Check payment obligations"""
        self.client.get("/api/v1/payments/")


class StressTestUser(HttpUser):
    """
    High-intensity user for stress testing
    """
    wait_time = between(0.1, 0.5)  # Very short wait times
    host = "http://localhost:8000"
    
    def on_start(self):
        """Quick login"""
        login_data = {
            "email": "stress.test@verihome.com",
            "password": "StressTest123!"
        }
        
        response = self.client.post("/api/v1/auth/login/", json=login_data)
        
        if response.status_code == 200:
            token_data = response.json()
            self.client.headers.update({
                "Authorization": f"Bearer {token_data['access']}"
            })
    
    @task(50)
    def rapid_property_browsing(self):
        """Rapid property browsing to test caching and performance"""
        params = {
            "page": random.randint(1, 5),
            "page_size": random.choice([10, 20, 50])
        }
        
        if random.random() < 0.5:
            params["city"] = random.choice(["Bogotá", "Medellín", "Cali"])
        
        self.client.get("/api/v1/properties/", params=params)
    
    @task(20)
    def rapid_search(self):
        """Rapid search requests"""
        search_terms = ["apartment", "house", "luxury", "cheap", "furnished"]
        params = {"search": random.choice(search_terms)}
        
        self.client.get("/api/v1/properties/", params=params)
    
    @task(10)
    def quick_detail_views(self):
        """Quick property detail views"""
        # Use a predictable property ID for stress testing
        property_id = random.randint(1, 100)
        self.client.get(f"/api/v1/properties/{property_id}/")


# Test scenarios for different user types
class MixedUserBehavior(HttpUser):
    """
    Simulates mixed user behavior patterns
    """
    wait_time = between(1, 3)
    host = "http://localhost:8000"
    
    tasks = {
        VeriHomeUser: 70,      # 70% general users
        LandlordUser: 20,      # 20% landlords
        TenantUser: 10         # 10% focused tenants
    }


# Performance benchmarking user
class PerformanceTestUser(HttpUser):
    """
    Focused on measuring specific endpoint performance
    """
    wait_time = between(0.5, 1.5)
    host = "http://localhost:8000"
    
    def on_start(self):
        """Setup for performance testing"""
        # Login as a test user
        login_data = {
            "email": "perf.test@verihome.com",
            "password": "PerfTest123!"
        }
        
        response = self.client.post("/api/v1/auth/login/", json=login_data)
        
        if response.status_code == 200:
            token_data = response.json()
            self.client.headers.update({
                "Authorization": f"Bearer {token_data['access']}"
            })
    
    @task(30)
    def test_property_list_performance(self):
        """Test property list endpoint performance"""
        with self.client.get("/api/v1/properties/", catch_response=True) as response:
            if response.elapsed.total_seconds() > 2.0:
                response.failure(f"Request took {response.elapsed.total_seconds()} seconds")
    
    @task(20)
    def test_property_search_performance(self):
        """Test search performance"""
        params = {"search": "apartment", "city": "Bogotá"}
        
        with self.client.get("/api/v1/properties/", params=params, catch_response=True) as response:
            if response.elapsed.total_seconds() > 3.0:
                response.failure(f"Search took {response.elapsed.total_seconds()} seconds")
    
    @task(20)
    def test_property_detail_performance(self):
        """Test property detail performance"""
        property_id = random.randint(1, 50)
        
        with self.client.get(f"/api/v1/properties/{property_id}/", catch_response=True) as response:
            if response.elapsed.total_seconds() > 1.5:
                response.failure(f"Property detail took {response.elapsed.total_seconds()} seconds")
    
    @task(10)
    def test_auth_performance(self):
        """Test authentication endpoint performance"""
        with self.client.get("/api/v1/auth/me/", catch_response=True) as response:
            if response.elapsed.total_seconds() > 1.0:
                response.failure(f"Auth check took {response.elapsed.total_seconds()} seconds")
    
    @task(10)
    def test_complex_filter_performance(self):
        """Test complex filtering performance"""
        params = {
            "city": "Bogotá",
            "min_price": "1000000",
            "max_price": "3000000",
            "min_bedrooms": "2",
            "property_type": "apartment",
            "furnished": "true"
        }
        
        with self.client.get("/api/v1/properties/", params=params, catch_response=True) as response:
            if response.elapsed.total_seconds() > 4.0:
                response.failure(f"Complex filter took {response.elapsed.total_seconds()} seconds")


if __name__ == "__main__":
    # This allows running the locust file directly for testing
    print("VeriHome Load Testing Configuration")
    print("Available user types:")
    print("- VeriHomeUser: General platform users")
    print("- LandlordUser: Property owners and managers")
    print("- TenantUser: Property seekers")
    print("- StressTestUser: High-intensity testing")
    print("- MixedUserBehavior: Mixed user simulation")
    print("- PerformanceTestUser: Performance benchmarking")
    print("\nTo run load tests:")
    print("locust -f locustfile.py --host=http://localhost:8000")
    print("locust -f locustfile.py --host=http://localhost:8000 -u 100 -r 10 -t 5m")