import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
import uuid

User = get_user_model()

# Crear superusuario
if not User.objects.filter(email='wilsonderecho10@gmail.com').exists():
    user = User(
        id=uuid.uuid4(),
        email='wilsonderecho10@gmail.com',
        first_name='admin123',
        last_name='arguello',
        user_type='landlord',
        is_verified=True,
        is_staff=True,
        is_superuser=True,
        is_active=True
    )
    user.set_password('admin123')  # Cambia esta contraseña por una más segura
    user.verification_date = timezone.now()
    user.save()
    print("Superusuario creado exitosamente")
else:
    print("El usuario ya existe")