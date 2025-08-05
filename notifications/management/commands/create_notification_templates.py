"""
Comando para crear plantillas de notificación por defecto del sistema.
Crea todas las plantillas necesarias para VeriHome.
"""

from django.core.management.base import BaseCommand
from notifications.models import NotificationTemplate, NotificationChannel
import json


class Command(BaseCommand):
    help = 'Crea plantillas de notificación por defecto del sistema'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Sobrescribir plantillas existentes'
        )
        parser.add_argument(
            '--template-type',
            type=str,
            help='Crear solo plantillas de un tipo específico'
        )
    
    def handle(self, *args, **options):
        force = options.get('force', False)
        template_type_filter = options.get('template_type')
        
        self.stdout.write('Creando plantillas de notificación por defecto...')
        
        # Obtener canales disponibles
        email_channel = NotificationChannel.objects.filter(channel_type='email').first()
        in_app_channel = NotificationChannel.objects.filter(channel_type='in_app').first()
        sms_channel = NotificationChannel.objects.filter(channel_type='sms').first()
        push_channel = NotificationChannel.objects.filter(channel_type='push').first()
        
        templates_data = self._get_templates_data()
        created_count = 0
        updated_count = 0
        skipped_count = 0
        
        for template_data in templates_data:
            # Filtrar por tipo si se especifica
            if template_type_filter and template_data['template_type'] != template_type_filter:
                continue
            
            try:
                template, created = NotificationTemplate.objects.get_or_create(
                    name=template_data['name'],
                    defaults=template_data
                )
                
                if created:
                    created_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f'✓ Creada: {template.name}')
                    )
                elif force:
                    # Actualizar plantilla existente
                    for key, value in template_data.items():
                        if key != 'name':  # No cambiar el nombre
                            setattr(template, key, value)
                    template.save()
                    updated_count += 1
                    self.stdout.write(
                        self.style.WARNING(f'↻ Actualizada: {template.name}')
                    )
                else:
                    skipped_count += 1
                    self.stdout.write(
                        self.style.HTTP_INFO(f'- Omitida (ya existe): {template.name}')
                    )
                    continue
                
                # Asignar canales
                channels_to_add = []
                channel_types = template_data.get('channel_types', ['in_app', 'email'])
                
                for channel_type in channel_types:
                    if channel_type == 'email' and email_channel:
                        channels_to_add.append(email_channel)
                    elif channel_type == 'in_app' and in_app_channel:
                        channels_to_add.append(in_app_channel)
                    elif channel_type == 'sms' and sms_channel:
                        channels_to_add.append(sms_channel)
                    elif channel_type == 'push' and push_channel:
                        channels_to_add.append(push_channel)
                
                if channels_to_add:
                    template.channels.set(channels_to_add)
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'✗ Error creando {template_data["name"]}: {str(e)}')
                )
        
        # Mostrar resumen
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.SUCCESS('RESUMEN DE CREACIÓN DE PLANTILLAS'))
        self.stdout.write('='*50)
        self.stdout.write(f'Plantillas creadas: {created_count}')
        self.stdout.write(f'Plantillas actualizadas: {updated_count}')
        self.stdout.write(f'Plantillas omitidas: {skipped_count}')
        self.stdout.write(f'Total procesadas: {created_count + updated_count + skipped_count}')
        
        if created_count > 0 or updated_count > 0:
            self.stdout.write(
                self.style.SUCCESS(f'\n✓ Proceso completado exitosamente')
            )
    
    def _get_templates_data(self):
        """Devuelve los datos de todas las plantillas por defecto."""
        return [
            # Plantilla de bienvenida
            {
                'name': 'welcome',
                'template_type': 'welcome',
                'title': '¡Bienvenido a {{ platform_name }}!',
                'subject': 'Bienvenido a VeriHome - Tu plataforma inmobiliaria',
                'content_text': '''¡Hola {{ user_name }}!

Bienvenido a {{ platform_name }}, la plataforma inmobiliaria más completa de Colombia.

Tu cuenta ha sido creada exitosamente y ya puedes acceder a todas nuestras funcionalidades:

• Publicar y buscar propiedades
• Gestionar contratos digitales
• Procesar pagos seguros
• Sistema de calificaciones
• Comunicación directa entre usuarios

Para comenzar, te recomendamos completar tu perfil y explorar las propiedades disponibles.

¡Esperamos que tengas una excelente experiencia con nosotros!

Equipo de {{ platform_name }}''',
                'content_html': '''
<h2>¡Bienvenido a {{ platform_name }}!</h2>
<p>Hola {{ user_name }},</p>
<p>Tu cuenta ha sido creada exitosamente. Ya puedes acceder a todas nuestras funcionalidades.</p>
<ul>
<li>Publicar y buscar propiedades</li>
<li>Gestionar contratos digitales</li>
<li>Procesar pagos seguros</li>
<li>Sistema de calificaciones</li>
<li>Comunicación directa</li>
</ul>
<p><a href="{{ action_url }}" style="background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Comenzar ahora</a></p>
''',
                'priority': 'normal',
                'variables': ['user_name', 'platform_name', 'action_url'],
                'max_frequency_per_user_per_day': 1,
                'is_active': True,
                'is_system_template': True,
                'channel_types': ['in_app', 'email']
            },
            
            # Verificación de email
            {
                'name': 'email_verification',
                'template_type': 'verification',
                'title': 'Verifica tu correo electrónico',
                'subject': 'Verificación de correo - VeriHome',
                'content_text': '''Hola {{ user_name }},

Para completar tu registro en {{ platform_name }}, necesitas verificar tu correo electrónico.

Haz clic en el siguiente enlace para verificar tu cuenta:
{{ verification_url }}

Si no creaste esta cuenta, puedes ignorar este mensaje.

El enlace expira en 24 horas.

Equipo de {{ platform_name }}''',
                'content_html': '''
<h2>Verifica tu correo electrónico</h2>
<p>Hola {{ user_name }},</p>
<p>Para completar tu registro, necesitas verificar tu correo electrónico.</p>
<p><a href="{{ verification_url }}" style="background: #4CAF50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px;">Verificar Email</a></p>
<p><small>Si no creaste esta cuenta, puedes ignorar este mensaje.</small></p>
''',
                'priority': 'high',
                'variables': ['user_name', 'platform_name', 'verification_url'],
                'max_frequency_per_user_per_day': 3,
                'is_active': True,
                'is_system_template': True,
                'channel_types': ['email']
            },
            
            # Nueva propiedad publicada
            {
                'name': 'property_published',
                'template_type': 'property_inquiry',
                'title': 'Propiedad publicada exitosamente',
                'subject': 'Tu propiedad ya está en línea - VeriHome',
                'content_text': '''¡Excelente noticia, {{ landlord_name }}!

Tu propiedad "{{ property_title }}" ha sido publicada exitosamente en {{ platform_name }}.

Detalles de la publicación:
• Tipo: {{ property_type }}
• Estado: Activa y visible para inquilinos
• URL: {{ property_url }}

Tu propiedad ya está recibiendo visitas. Te notificaremos cuando recibas consultas de potenciales inquilinos.

¡Esperamos que encuentres el inquilino perfecto pronto!

Equipo de {{ platform_name }}''',
                'content_html': '''
<h2>¡Propiedad publicada exitosamente!</h2>
<p>Hola {{ landlord_name }},</p>
<p>Tu propiedad <strong>"{{ property_title }}"</strong> ya está en línea.</p>
<div style="background: #f0f8ff; padding: 15px; border-radius: 5px; margin: 15px 0;">
<h3>Detalles de la publicación:</h3>
<p>• Tipo: {{ property_type }}</p>
<p>• Estado: Activa y visible</p>
</div>
<p><a href="{{ property_url }}" style="background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ver propiedad</a></p>
''',
                'priority': 'normal',
                'variables': ['landlord_name', 'property_title', 'property_type', 'property_url', 'platform_name'],
                'max_frequency_per_user_per_day': 10,
                'is_active': True,
                'is_system_template': True,
                'channel_types': ['in_app', 'email']
            },
            
            # Nuevo contrato
            {
                'name': 'contract_created',
                'template_type': 'contract_created',
                'title': 'Nuevo contrato creado',
                'subject': 'Nuevo contrato para revisión - VeriHome',
                'content_text': '''Hola {{ recipient_name }},

Se ha creado un nuevo contrato que requiere tu atención.

Detalles del contrato:
• ID: {{ contract_id }}
• Tipo: {{ contract_type }}
• Otra parte: {{ other_party }}

Por favor, revisa los términos del contrato y procede con la firma digital cuando estés listo.

Es importante que leas cuidadosamente todos los términos antes de firmar.

Ver contrato: {{ contract_url }}

Equipo de {{ platform_name }}''',
                'content_html': '''
<h2>Nuevo contrato para revisión</h2>
<p>Hola {{ recipient_name }},</p>
<p>Se ha creado un nuevo contrato que requiere tu atención.</p>
<div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0;">
<h3>Detalles del contrato:</h3>
<p>• ID: {{ contract_id }}</p>
<p>• Tipo: {{ contract_type }}</p>
<p>• Otra parte: {{ other_party }}</p>
</div>
<p><a href="{{ contract_url }}" style="background: #dc3545; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px;">Revisar y Firmar</a></p>
<p><small>Lee cuidadosamente todos los términos antes de firmar.</small></p>
''',
                'priority': 'high',
                'variables': ['recipient_name', 'contract_id', 'contract_type', 'other_party', 'contract_url', 'platform_name'],
                'max_frequency_per_user_per_day': 5,
                'is_active': True,
                'is_system_template': True,
                'channel_types': ['in_app', 'email', 'sms']
            },
            
            # Pago recibido
            {
                'name': 'payment_received',
                'template_type': 'payment_received',
                'title': 'Pago procesado exitosamente',
                'subject': 'Confirmación de pago - VeriHome',
                'content_text': '''Hola {{ user_name }},

Tu pago ha sido procesado exitosamente.

Detalles del pago:
• Monto: ${{ amount }}
• ID de transacción: {{ transaction_id }}
• Método de pago: {{ payment_method }}
• Fecha: {{ payment_date }}

El recibo ha sido enviado a tu correo electrónico.

Si tienes alguna pregunta sobre este pago, no dudes en contactarnos.

Gracias por usar {{ platform_name }}!''',
                'content_html': '''
<h2>✅ Pago procesado exitosamente</h2>
<p>Hola {{ user_name }},</p>
<p>Tu pago ha sido procesado correctamente.</p>
<div style="background: #d4edda; padding: 15px; border-radius: 5px; margin: 15px 0;">
<h3>Detalles del pago:</h3>
<p>• Monto: <strong>${{ amount }}</strong></p>
<p>• ID: {{ transaction_id }}</p>
<p>• Método: {{ payment_method }}</p>
</div>
<p>El recibo ha sido enviado a tu correo electrónico.</p>
''',
                'priority': 'normal',
                'variables': ['user_name', 'amount', 'transaction_id', 'payment_method', 'payment_date', 'platform_name'],
                'max_frequency_per_user_per_day': 20,
                'is_active': True,
                'is_system_template': True,
                'channel_types': ['in_app', 'email']
            },
            
            # Nueva calificación
            {
                'name': 'rating_received',
                'template_type': 'rating_received',
                'title': 'Nueva calificación recibida',
                'subject': 'Has recibido una nueva calificación - VeriHome',
                'content_text': '''Hola {{ rated_user }},

Has recibido una nueva calificación de {{ rating_user }}.

Detalles de la calificación:
• Puntuación: {{ rating_score }}/5 ⭐
• Comentario: "{{ rating_comment }}"

Tu puntuación promedio se ha actualizado. Las buenas calificaciones te ayudan a generar más confianza en la plataforma.

¡Sigue brindando un excelente servicio!

Equipo de {{ platform_name }}''',
                'content_html': '''
<h2>⭐ Nueva calificación recibida</h2>
<p>Hola {{ rated_user }},</p>
<p>Has recibido una nueva calificación de <strong>{{ rating_user }}</strong>.</p>
<div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0;">
<h3>Detalles:</h3>
<p>• Puntuación: <strong>{{ rating_score }}/5 ⭐</strong></p>
<p>• Comentario: "{{ rating_comment }}"</p>
</div>
<p>¡Sigue brindando un excelente servicio!</p>
''',
                'priority': 'normal',
                'variables': ['rated_user', 'rating_user', 'rating_score', 'rating_comment', 'platform_name'],
                'max_frequency_per_user_per_day': 10,
                'is_active': True,
                'is_system_template': True,
                'channel_types': ['in_app', 'email']
            },
            
            # Nuevo mensaje
            {
                'name': 'message_received',
                'template_type': 'message_received',
                'title': 'Nuevo mensaje de {{ sender_name }}',
                'subject': 'Nuevo mensaje en VeriHome',
                'content_text': '''Hola {{ recipient_name }},

Has recibido un nuevo mensaje de {{ sender_name }}.

Asunto: {{ thread_subject }}

Mensaje:
"{{ message_content }}"

Responde directamente desde la plataforma para mantener un historial organizado.

Ver mensaje: {{ message_url }}

Equipo de {{ platform_name }}''',
                'content_html': '''
<h2>💬 Nuevo mensaje</h2>
<p>Hola {{ recipient_name }},</p>
<p>Has recibido un nuevo mensaje de <strong>{{ sender_name }}</strong>.</p>
<div style="background: #f8f9fa; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0;">
<p><strong>{{ thread_subject }}</strong></p>
<p>"{{ message_content }}"</p>
</div>
<p><a href="{{ message_url }}" style="background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Responder mensaje</a></p>
''',
                'priority': 'normal',
                'variables': ['recipient_name', 'sender_name', 'thread_subject', 'message_content', 'message_url', 'platform_name'],
                'max_frequency_per_user_per_day': 50,
                'is_active': True,
                'is_system_template': True,
                'channel_types': ['in_app', 'email']
            },
            
            # Alerta del sistema
            {
                'name': 'system_alert',
                'template_type': 'system_alert',
                'title': 'Alerta del Sistema: {{ alert_title }}',
                'subject': 'Alerta importante - VeriHome',
                'content_text': '''ALERTA DEL SISTEMA

{{ alert_message }}

Esta es una notificación automática del sistema {{ platform_name }}.

Si tienes preguntas, contacta al soporte técnico.

Fecha: {{ alert_date }}
Tipo: {{ alert_type }}''',
                'content_html': '''
<div style="background: #f8d7da; padding: 20px; border-radius: 5px; border-left: 4px solid #dc3545;">
<h2>🚨 Alerta del Sistema</h2>
<p><strong>{{ alert_message }}</strong></p>
<p><small>Fecha: {{ alert_date }} | Tipo: {{ alert_type }}</small></p>
</div>
''',
                'priority': 'urgent',
                'variables': ['alert_title', 'alert_message', 'alert_date', 'alert_type', 'platform_name'],
                'max_frequency_per_user_per_day': 10,
                'is_active': True,
                'is_system_template': True,
                'channel_types': ['in_app', 'email', 'sms']
            }
        ]