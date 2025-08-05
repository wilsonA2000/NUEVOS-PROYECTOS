from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from allauth.account.models import EmailAddress, EmailConfirmation
from django.utils import timezone

User = get_user_model()

class Command(BaseCommand):
    help = 'Verifica el estado de un usuario y sus emails de confirmación'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Email del usuario a verificar')

    def handle(self, *args, **options):
        email = options['email']
        
        self.stdout.write(f'\n=== Verificando usuario: {email} ===\n')
        
        # 1. Verificar si existe el usuario
        try:
            user = User.objects.get(email=email)
            self.stdout.write(self.style.SUCCESS(f'✅ Usuario encontrado:'))
            self.stdout.write(f'   - ID: {user.id}')
            self.stdout.write(f'   - Email: {user.email}')
            self.stdout.write(f'   - Tipo: {user.user_type}')
            self.stdout.write(f'   - Activo: {user.is_active}')
            self.stdout.write(f'   - Verificado: {user.is_verified}')
            self.stdout.write(f'   - Fecha registro: {user.date_joined}')
            
            # 2. Verificar EmailAddress
            try:
                email_address = EmailAddress.objects.get(user=user)
                self.stdout.write(self.style.SUCCESS(f'\n✅ EmailAddress encontrado:'))
                self.stdout.write(f'   - Email: {email_address.email}')
                self.stdout.write(f'   - Primario: {email_address.primary}')
                self.stdout.write(f'   - Verificado: {email_address.verified}')
            except EmailAddress.DoesNotExist:
                self.stdout.write(self.style.ERROR('\n❌ No se encontró EmailAddress'))
                
            # 3. Verificar EmailConfirmation
            confirmations = EmailConfirmation.objects.filter(
                email_address__user=user
            ).order_by('-created')
            
            if confirmations.exists():
                self.stdout.write(self.style.SUCCESS(f'\n✅ EmailConfirmations encontrados: {confirmations.count()}'))
                for i, conf in enumerate(confirmations[:3]):  # Mostrar últimos 3
                    self.stdout.write(f'\n   Confirmación {i+1}:')
                    self.stdout.write(f'   - Key: {conf.key}')
                    self.stdout.write(f'   - Creado: {conf.created}')
                    self.stdout.write(f'   - Enviado: {conf.sent or "No registrado"}')
                    self.stdout.write(f'   - Expirado: {"Sí" if conf.key_expired() else "No"}')
            else:
                self.stdout.write(self.style.ERROR('\n❌ No se encontraron EmailConfirmations'))
                
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'❌ No se encontró usuario con email: {email}'))
            
        # 4. Probar envío de email de prueba
        self.stdout.write(self.style.WARNING('\n\n=== Probando envío de email ==='))
        try:
            from django.core.mail import send_mail
            from django.conf import settings
            
            send_mail(
                'Prueba VeriHome - Verificación de Email',
                f'Este es un email de prueba para verificar que el sistema puede enviar correos a {email}',
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
            )
            self.stdout.write(self.style.SUCCESS('✅ Email de prueba enviado exitosamente'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error enviando email: {str(e)}'))