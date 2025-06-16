"""
Configuración de URLs para VeriHome - Plataforma Inmobiliaria Revolucionaria.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from users.direct_register import DirectRegisterView
from users.views import ResendVerificationEmailView

# Personalizar la información del admin
admin.site.site_header = "VeriHome Administración"
admin.site.site_title = "VeriHome Admin"
admin.site.index_title = "Panel de Administración"

urlpatterns = [
    # Administración
    path('admin/', admin.site.urls),
    
    # Autenticación (Django Allauth)
    path('accounts/', include('allauth.urls')),
    
    # Aplicaciones principales
    path('', include('core.urls')),
    path('usuarios/', include('users.urls')),
    path('propiedades/', include('properties.urls')),
    path('contratos/', include('contracts.urls')),
    path('mensajes/', include('messaging.urls')),
    path('pagos/', include('payments.urls')),
    path('calificaciones/', include('ratings.urls')),
    
    # Ruta de registro directo para pruebas
    path('registro-directo/', DirectRegisterView.as_view(), name='direct_register'),
    
    # Ruta para reenviar correo de verificación
    path('reenviar-verificacion/', ResendVerificationEmailView.as_view(), name='account_email_verification_resend'),
    
    # API REST
    path('api/v1/', include([
        path('usuarios/', include('users.api_urls')),
        path('propiedades/', include('properties.api_urls')),
        path('contratos/', include('contracts.api_urls')),
        path('mensajes/', include('messaging.api_urls')),
        path('pagos/', include('payments.api_urls')),
        path('calificaciones/', include('ratings.api_urls')),
    ])),
    
    # Páginas especiales
    path('robots.txt', TemplateView.as_view(template_name='robots.txt', content_type='text/plain')),
    path('sitemap.xml', TemplateView.as_view(template_name='sitemap.xml', content_type='application/xml')),
]

# Servir archivos multimedia en desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)