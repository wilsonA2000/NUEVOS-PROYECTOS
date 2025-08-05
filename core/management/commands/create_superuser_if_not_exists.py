"""
Comando de Django para crear un superusuario si no existe.
"""

import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.conf import settings


class Command(BaseCommand):
    help = 'Crea un superusuario si no existe ninguno'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            help='Email del superusuario',
            default=os.getenv('DJANGO_SUPERUSER_EMAIL', 'admin@verihome.com')
        )
        parser.add_argument(
            '--password',
            type=str,
            help='Contraseña del superusuario',
            default=os.getenv('DJANGO_SUPERUSER_PASSWORD', 'admin123')
        )

    def handle(self, *args, **options):
        User = get_user_model()
        
        email = options['email']
        password = options['password']
        
        if User.objects.filter(is_superuser=True).exists():
            self.stdout.write(
                self.style.WARNING('Ya existe al menos un superusuario')
            )
            return
        
        if User.objects.filter(email=email).exists():
            self.stdout.write(
                self.style.WARNING(f'Ya existe un usuario con email {email}')
            )
            return
        
        try:
            user = User.objects.create_superuser(
                email=email,
                password=password
            )
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Superusuario creado exitosamente:\n'
                    f'  Email: {email}\n'
                    f'  Password: {password}\n'
                    f'  ID: {user.id}'
                )
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error al crear superusuario: {str(e)}')
            )