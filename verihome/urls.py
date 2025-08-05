"""
Configuración de URLs para VeriHome - Plataforma Inmobiliaria Revolucionaria.
"""

from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from users.direct_register import DirectRegisterView
from users.views import ResendVerificationEmailView
from rest_framework_simplejwt.views import TokenRefreshView
from core.views import index, ReactAppView

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
    path('matching/', include('matching.urls')),
    
    # Ruta de registro directo para pruebas
    path('registro-directo/', DirectRegisterView.as_view(), name='direct_register'),
    
    # Ruta para reenviar correo de verificación
    path('reenviar-verificacion/', ResendVerificationEmailView.as_view(), name='account_email_verification_resend'),
    
    # API REST
    path('api/v1/', include([
        path('users/', include('users.api_urls')),
        path('properties/', include('properties.api_urls')),
        path('contracts/', include('contracts.api_urls')),
        path('messages/', include('messaging.api_urls')),
        path('payments/', include('payments.api_urls')),
        path('ratings/', include('ratings.api_urls')),
        path('matching/', include('matching.urls', namespace='api-matching')),
        path('core/', include('core.api_urls')),
        path('dashboard/', include('dashboard.urls')),
    ])),
    
    # Páginas especiales
    path('robots.txt', TemplateView.as_view(template_name='robots.txt', content_type='text/plain')),
    path('sitemap.xml', TemplateView.as_view(template_name='sitemap.xml', content_type='application/xml')),
]

# Rutas del frontend React (catch-all para SPA)
# Estas rutas deben ir al final para no interferir con las rutas de la API
# Ahora funciona tanto en desarrollo como en producción
urlpatterns += [
    re_path(r'^(?!api/|admin/|accounts/|usuarios/|propiedades/|contratos/|mensajes/|pagos/|calificaciones/|registro-directo/|reenviar-verificacion/|robots\.txt|sitemap\.xml|static/|media/|dashboard/|notificaciones/|soporte/|acerca-de/|contacto/|preguntas-frecuentes/|terminos-y-condiciones/|politica-de-privacidad/|buscar/|analytics/|estado/).*$', 
            ReactAppView.as_view(), name='react_app'),
]

# Servir archivos multimedia en desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)