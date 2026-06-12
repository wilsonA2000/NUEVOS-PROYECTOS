"""Tests del management command `create_interview_codes`."""

from __future__ import annotations

from io import StringIO

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase
from django.utils import timezone

from users.models import InterviewCode


class CreateInterviewCodesTests(TestCase):
    def test_default_creates_ten_codes_split_by_type(self):
        out = StringIO()
        call_command("create_interview_codes", stdout=out)
        self.assertEqual(InterviewCode.objects.count(), 10)
        self.assertEqual(InterviewCode.objects.filter(user_type="landlord").count(), 5)
        self.assertEqual(InterviewCode.objects.filter(user_type="tenant").count(), 5)
        self.assertIn("10 códigos creados", out.getvalue())

    def test_explicit_type_and_count(self):
        call_command(
            "create_interview_codes", "--count=3", "--user-type=tenant", stdout=StringIO()
        )
        self.assertEqual(InterviewCode.objects.filter(user_type="tenant").count(), 3)

    def test_codes_are_valid_and_unique(self):
        call_command("create_interview_codes", "--count=5", "--days=7", stdout=StringIO())
        codes = list(InterviewCode.objects.all())
        self.assertEqual(len({c.code for c in codes}), 5)
        for code in codes:
            self.assertTrue(code.is_valid())
            self.assertLessEqual(
                code.valid_until, timezone.now() + timezone.timedelta(days=7)
            )

    def test_invalid_count_raises(self):
        with self.assertRaises(CommandError):
            call_command("create_interview_codes", "--count=0", stdout=StringIO())
