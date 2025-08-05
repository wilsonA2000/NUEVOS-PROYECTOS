#!/usr/bin/env python3
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from django.test import Client
import json

User = get_user_model()
user = User.objects.get(email='landlord@test.com')
refresh = RefreshToken.for_user(user)
access_token = str(refresh.access_token)

client = Client()

data = {
    'title': 'Test Final',
    'description': 'Test final property',
    'property_type': 'apartment',
    'listing_type': 'rent',
    'address': 'Test Address',
    'city': 'Medellín',
    'state': 'Antioquia',
    'rent_price': 1500000,
    'bedrooms': 2,
    'bathrooms': 1,
    'total_area': 80
}

response = client.post(
    '/api/v1/properties/properties/', 
    data=json.dumps(data),
    HTTP_AUTHORIZATION=f'Bearer {access_token}',
    content_type='application/json'
)

print(f'Status: {response.status_code}')
if response.status_code == 201:
    print('✅ PROPERTY CREATION WORKING!')
else:
    print('❌ Still having issues')
    print(response.content.decode())