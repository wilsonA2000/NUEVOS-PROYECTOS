from django.core.management.base import BaseCommand
from django.contrib.sites.models import Site

class Command(BaseCommand):
    help = 'Actualiza la configuración del sitio para los emails de confirmación'

    def handle(self, *args, **options):
        try:
            site = Site.objects.get(pk=1)
            self.stdout.write(f'Configuración actual: Domain={site.domain}, Name={site.name}')
            
            # Actualizar con el dominio correcto
            site.domain = 'localhost:3000'  # Frontend React
            site.name = 'VeriHome'
            site.save()
            
            self.stdout.write(self.style.SUCCESS(f'✅ Sitio actualizado: Domain={site.domain}, Name={site.name}'))
        except Site.DoesNotExist:
            Site.objects.create(
                pk=1,
                domain='localhost:3000',
                name='VeriHome'
            )
            self.stdout.write(self.style.SUCCESS('✅ Sitio creado con dominio localhost:3000'))