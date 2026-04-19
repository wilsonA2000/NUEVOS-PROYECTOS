"""Signals de messaging.

Fase G1: cuando se crea un `Message`, difundirlo al canal WebSocket
del thread (`thread_<id>`) para que los clientes conectados lo reciban
en tiempo real sin hacer polling.

Antes, `MessageViewSet.create()` creaba la fila en la BD pero no
tocaba el channel layer. El `ThreadConsumer` escuchaba en su grupo
pero nadie le enviaba eventos → los tests E2E (y los usuarios finales)
nunca recibían actualizaciones vía WS.
"""
from __future__ import annotations

import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models.signals import post_save
from django.dispatch import receiver

from messaging.models import Message

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Message)
def broadcast_new_message(sender, instance, created, **kwargs):
    """Emite `new_message` al grupo del thread en cada Message creado."""
    if not created:
        return

    channel_layer = get_channel_layer()
    if channel_layer is None:
        return

    thread_group = f'thread_{instance.thread_id}'
    payload = {
        'type': 'message.new',
        'message': {
            'id': str(instance.id),
            'thread_id': str(instance.thread_id),
            'sender_id': str(instance.sender_id) if instance.sender_id else None,
            'recipient_id': str(instance.recipient_id) if instance.recipient_id else None,
            'content': instance.content,
            'message_type': instance.message_type,
            'sent_at': instance.sent_at.isoformat() if instance.sent_at else None,
        },
    }
    try:
        async_to_sync(channel_layer.group_send)(thread_group, payload)
    except Exception as exc:  # pragma: no cover - la difusión no debe romper el guardado
        logger.warning(
            'No se pudo difundir el mensaje %s al grupo %s: %s',
            instance.id, thread_group, exc,
        )

    # También notificar al recipiente en su grupo personal (inbox).
    if instance.recipient_id:
        user_group = f'user_{instance.recipient_id}'
        notification_payload = {
            'type': 'notification.new',
            'notification': {
                'kind': 'new_message',
                'thread_id': str(instance.thread_id),
                'message_id': str(instance.id),
                'preview': (instance.content or '')[:120],
            },
        }
        try:
            async_to_sync(channel_layer.group_send)(user_group, notification_payload)
        except Exception as exc:  # pragma: no cover
            logger.warning(
                'No se pudo notificar a %s: %s', user_group, exc,
            )
