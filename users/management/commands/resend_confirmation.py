from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from allauth.account.models import EmailAddress
from allauth.account.utils import send_email_confirmation
from django.test import RequestFactory
from django.contrib.sites.shortcuts import get_current_site

User = get_user_model()

class Command(BaseCommand):
    help = 'Reenvía el email de confirmación a un usuario'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Email del usuario')

    def handle(self, *args, **options):
        email = options['email']
        
        try:
            user = User.objects.get(email=email)
            self.stdout.write(f'Usuario encontrado: {user.email}')
            
            # Crear o obtener EmailAddress
            email_address, created = EmailAddress.objects.get_or_create(
                user=user,
                email=user.email,
                defaults={'primary': True, 'verified': False}
            )
            
            if email_address.verified:
                self.stdout.write(self.style.WARNING('[ADVERTENCIA] Este email ya está verificado'))
                return
            
            # Crear request falso con toda la configuración necesaria
            from django.contrib.messages.storage.fallback import FallbackStorage
            from django.contrib.sessions.backends.db import SessionStore
            
            factory = RequestFactory()
            request = factory.get('/')
            request.user = user
            request.session = SessionStore()
            setattr(request, '_messages', FallbackStorage(request))
            request.site = get_current_site(request)
            
            # Enviar email de confirmación
            try:
                send_email_confirmation(request, user, signup=True)
                self.stdout.write(self.style.SUCCESS('[OK] Email de confirmación reenviado exitosamente'))
                
                # Mostrar información adicional
                from allauth.account.models import EmailConfirmation
                confirmation = EmailConfirmation.objects.filter(
                    email_address__user=user
                ).order_by('-created').first()
                
                if confirmation:
                    self.stdout.write(f'\nDetalles de confirmación:')
                    self.stdout.write(f'- Key: {confirmation.key}')
                    self.stdout.write(f'- URL: http://localhost:3000/confirm-email/{confirmation.key}')
                else:
                    self.stdout.write(self.style.WARNING('\n[ADVERTENCIA] No se encontró EmailConfirmation después de enviar'))
                    
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'[ERROR] Error enviando email: {str(e)}'))
                import traceback
                self.stdout.write(self.style.ERROR(traceback.format_exc()))
                
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'[ERROR] Usuario no encontrado: {email}'))