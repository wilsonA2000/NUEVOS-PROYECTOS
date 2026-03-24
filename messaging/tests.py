"""
Tests para el módulo de mensajería de VeriHome.
Cubre modelos, relaciones y endpoints de la API REST.
"""

import uuid
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status

from messaging.models import (
    MessageThread,
    ThreadParticipant,
    Message,
    MessageReaction,
    MessageFolder,
    MessageTemplate,
)

User = get_user_model()


# -- Helpers -----------------------------------------------------------------

def _make_user(email, first_name="Test", last_name="User", **kwargs):
    """Crea un usuario con email-based auth."""
    return User.objects.create_user(
        email=email,
        password="testpass123",
        first_name=first_name,
        last_name=last_name,
        **kwargs,
    )


def _make_thread(user1, user2, subject="Test Thread"):
    """Crea un hilo con dos participantes."""
    thread = MessageThread.objects.create(
        subject=subject,
        thread_type="general",
        status="active",
        created_by=user1,
    )
    ThreadParticipant.objects.create(thread=thread, user=user1)
    ThreadParticipant.objects.create(thread=thread, user=user2)
    return thread


def _make_message(thread, sender, recipient, content="Test message"):
    """Crea un mensaje de texto dentro de un hilo."""
    return Message.objects.create(
        thread=thread,
        sender=sender,
        recipient=recipient,
        content=content,
        message_type="text",
    )


# -- MessageThread Model Tests ----------------------------------------------

class MessageThreadModelTests(TestCase):
    """Tests para el modelo MessageThread."""

    def setUp(self):
        self.user1 = _make_user("user1@test.com", "Alice", "Smith")
        self.user2 = _make_user("user2@test.com", "Bob", "Jones")

    def test_create_thread(self):
        thread = _make_thread(self.user1, self.user2)
        self.assertEqual(thread.subject, "Test Thread")
        self.assertEqual(thread.thread_type, "general")
        self.assertEqual(thread.created_by, self.user1)
        self.assertEqual(thread.participants.count(), 2)

    def test_uuid_primary_key(self):
        thread = _make_thread(self.user1, self.user2)
        self.assertIsInstance(thread.pk, uuid.UUID)

    def test_default_status_active(self):
        thread = MessageThread.objects.create(
            subject="Status test",
            thread_type="general",
            created_by=self.user1,
        )
        self.assertEqual(thread.status, "active")

    def test_str_representation(self):
        thread = _make_thread(self.user1, self.user2, subject="Consulta renta")
        self.assertIn("Consulta renta", str(thread))
        self.assertIn("General", str(thread))

    def test_get_unread_count_zero(self):
        thread = _make_thread(self.user1, self.user2)
        self.assertEqual(thread.get_unread_count(self.user2), 0)

    def test_can_participate_participant(self):
        thread = _make_thread(self.user1, self.user2)
        self.assertTrue(thread.can_participate(self.user1))
        self.assertTrue(thread.can_participate(self.user2))

    def test_can_participate_non_participant(self):
        thread = _make_thread(self.user1, self.user2)
        outsider = _make_user("outsider@test.com")
        self.assertFalse(thread.can_participate(outsider))


# -- ThreadParticipant Model Tests -------------------------------------------

class ThreadParticipantModelTests(TestCase):
    """Tests para el modelo ThreadParticipant."""

    def setUp(self):
        self.user1 = _make_user("p1@test.com", "Carlos", "Diaz")
        self.user2 = _make_user("p2@test.com", "Diana", "Ruiz")

    def test_create_participant(self):
        thread = _make_thread(self.user1, self.user2)
        participant = ThreadParticipant.objects.get(thread=thread, user=self.user1)
        self.assertTrue(participant.is_active)
        self.assertIsNotNone(participant.joined_at)

    def test_unique_together_thread_user(self):
        thread = _make_thread(self.user1, self.user2)
        with self.assertRaises(IntegrityError):
            ThreadParticipant.objects.create(thread=thread, user=self.user1)

    def test_default_values(self):
        thread = _make_thread(self.user1, self.user2)
        participant = ThreadParticipant.objects.get(thread=thread, user=self.user1)
        self.assertTrue(participant.is_active)
        self.assertFalse(participant.is_archived)
        self.assertFalse(participant.is_muted)
        self.assertFalse(participant.is_starred)
        self.assertIsNone(participant.last_read_at)
        self.assertIsNone(participant.archived_at)


# -- Message Model Tests -----------------------------------------------------

class MessageModelTests(TestCase):
    """Tests para el modelo Message."""

    def setUp(self):
        self.user1 = _make_user("msg1@test.com", "Elena", "Lopez")
        self.user2 = _make_user("msg2@test.com", "Felipe", "Garcia")
        self.thread = _make_thread(self.user1, self.user2)

    def test_create_message(self):
        msg = _make_message(self.thread, self.user1, self.user2, "Hola mundo")
        self.assertEqual(msg.content, "Hola mundo")
        self.assertEqual(msg.sender, self.user1)
        self.assertEqual(msg.recipient, self.user2)
        self.assertEqual(msg.thread, self.thread)

    def test_uuid_primary_key(self):
        msg = _make_message(self.thread, self.user1, self.user2)
        self.assertIsInstance(msg.pk, uuid.UUID)

    def test_default_status_sent(self):
        msg = _make_message(self.thread, self.user1, self.user2)
        self.assertEqual(msg.status, "sent")

    def test_default_is_read_false(self):
        msg = _make_message(self.thread, self.user1, self.user2)
        self.assertFalse(msg.is_read)
        self.assertIsNone(msg.read_at)

    def test_mark_as_read(self):
        msg = _make_message(self.thread, self.user1, self.user2)
        msg.mark_as_read()
        msg.refresh_from_db()
        self.assertTrue(msg.is_read)
        self.assertIsNotNone(msg.read_at)
        self.assertEqual(msg.status, "read")

    def test_mark_as_delivered(self):
        msg = _make_message(self.thread, self.user1, self.user2)
        msg.mark_as_delivered()
        msg.refresh_from_db()
        self.assertIsNotNone(msg.delivered_at)
        self.assertEqual(msg.status, "delivered")


# -- MessageReaction Model Tests ---------------------------------------------

class MessageReactionModelTests(TestCase):
    """Tests para el modelo MessageReaction."""

    def setUp(self):
        self.user1 = _make_user("react1@test.com")
        self.user2 = _make_user("react2@test.com")
        self.thread = _make_thread(self.user1, self.user2)
        self.message = _make_message(self.thread, self.user1, self.user2)

    def test_create_reaction(self):
        reaction = MessageReaction.objects.create(
            message=self.message,
            user=self.user2,
            reaction_type="like",
        )
        self.assertEqual(reaction.reaction_type, "like")
        self.assertEqual(reaction.user, self.user2)
        self.assertIsNotNone(reaction.created_at)

    def test_unique_together_message_user(self):
        MessageReaction.objects.create(
            message=self.message,
            user=self.user2,
            reaction_type="like",
        )
        with self.assertRaises(IntegrityError):
            MessageReaction.objects.create(
                message=self.message,
                user=self.user2,
                reaction_type="love",
            )


# -- MessageFolder Model Tests -----------------------------------------------

class MessageFolderModelTests(TestCase):
    """Tests para el modelo MessageFolder."""

    def setUp(self):
        self.user = _make_user("folder@test.com")

    def test_create_folder(self):
        folder = MessageFolder.objects.create(
            user=self.user,
            name="Importante",
            folder_type="custom",
            color="#FF0000",
        )
        self.assertEqual(folder.name, "Importante")
        self.assertEqual(folder.color, "#FF0000")
        self.assertEqual(folder.folder_type, "custom")
        self.assertTrue(folder.is_visible)

    def test_unique_together_user_name(self):
        MessageFolder.objects.create(
            user=self.user,
            name="Carpeta A",
        )
        with self.assertRaises(IntegrityError):
            MessageFolder.objects.create(
                user=self.user,
                name="Carpeta A",
            )


# -- MessageTemplate Model Tests ---------------------------------------------

class MessageTemplateModelTests(TestCase):
    """Tests para el modelo MessageTemplate."""

    def setUp(self):
        self.user = _make_user("template@test.com")

    def test_create_template(self):
        template = MessageTemplate.objects.create(
            user=self.user,
            name="Saludo inicial",
            category="greeting",
            content="Buen dia, gracias por contactarnos.",
        )
        self.assertEqual(template.name, "Saludo inicial")
        self.assertEqual(template.category, "greeting")
        self.assertTrue(template.is_active)

    def test_default_usage_count_zero(self):
        template = MessageTemplate.objects.create(
            user=self.user,
            name="Follow up",
            category="follow_up",
            content="Estamos a la espera de su respuesta.",
        )
        self.assertEqual(template.usage_count, 0)


# -- Messaging API Tests -----------------------------------------------------

class MessagingAPITests(APITestCase):
    """Tests para los endpoints de la API de mensajeria."""

    def setUp(self):
        self.user1 = _make_user("api1@test.com", "Laura", "Martinez")
        self.user2 = _make_user("api2@test.com", "Marco", "Perez")
        self.thread = _make_thread(self.user1, self.user2, "API Thread")

    # -- threads -------

    def test_list_threads_authenticated(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.get("/api/v1/messages/threads/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_threads_unauthenticated_401(self):
        response = self.client.get("/api/v1/messages/threads/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # -- send message --

    def test_send_message(self):
        self.client.force_authenticate(user=self.user1)
        payload = {
            "thread_id": str(self.thread.pk),
            "content": "Hola, estoy interesado en la propiedad.",
        }
        response = self.client.post("/api/v1/messages/send/", payload)
        self.assertIn(response.status_code, [
            status.HTTP_200_OK,
            status.HTTP_201_CREATED,
        ])

    # -- mark read -----

    def test_mark_message_read(self):
        msg = _make_message(self.thread, self.user1, self.user2, "Leer esto")
        self.client.force_authenticate(user=self.user2)
        response = self.client.post(
            f"/api/v1/messages/mark-read/{msg.pk}/",
        )
        self.assertIn(response.status_code, [
            status.HTTP_200_OK,
            status.HTTP_204_NO_CONTENT,
        ])

    # -- stats ---------

    def test_stats_endpoint(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.get("/api/v1/messages/stats/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # -- unread count --

    def test_unread_count_endpoint(self):
        self.client.force_authenticate(user=self.user1)
        response = self.client.get("/api/v1/messages/unread-count/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
