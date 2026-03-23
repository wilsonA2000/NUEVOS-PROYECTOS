from rest_framework import serializers
from .models import VerificationAgent, VerificationVisit, VerificationReport


class VerificationAgentSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    current_week_visits = serializers.IntegerField(read_only=True)
    has_capacity = serializers.BooleanField(read_only=True)

    class Meta:
        model = VerificationAgent
        fields = [
            'id', 'user', 'user_name', 'user_email', 'agent_code',
            'specialization', 'service_areas', 'certifications',
            'max_weekly_visits', 'is_available', 'availability_notes',
            'total_visits_completed', 'average_rating',
            'current_week_visits', 'has_capacity',
            'hired_at', 'created_at',
        ]
        read_only_fields = ['id', 'agent_code', 'total_visits_completed', 'average_rating', 'created_at']


class VerificationVisitSerializer(serializers.ModelSerializer):
    agent_name = serializers.CharField(source='agent.user.get_full_name', read_only=True, default='Sin asignar')
    agent_code = serializers.CharField(source='agent.agent_code', read_only=True, default='')
    target_user_name = serializers.CharField(source='target_user.get_full_name', read_only=True)
    target_user_email = serializers.EmailField(source='target_user.email', read_only=True)
    visit_type_display = serializers.CharField(source='get_visit_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    has_report = serializers.SerializerMethodField()

    class Meta:
        model = VerificationVisit
        fields = [
            'id', 'visit_number', 'visit_type', 'visit_type_display',
            'agent', 'agent_name', 'agent_code',
            'target_user', 'target_user_name', 'target_user_email',
            'property_ref', 'status', 'status_display',
            'scheduled_date', 'scheduled_time', 'visit_address', 'visit_city',
            'started_at', 'completed_at', 'duration_minutes',
            'agent_notes', 'cancellation_reason', 'verification_passed',
            'has_report', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'visit_number', 'duration_minutes', 'created_at', 'updated_at']

    def get_has_report(self, obj):
        return hasattr(obj, 'report') and obj.report is not None


class VerificationReportSerializer(serializers.ModelSerializer):
    visit_number = serializers.CharField(source='visit.visit_number', read_only=True)
    condition_display = serializers.CharField(source='get_overall_condition_display', read_only=True)

    class Meta:
        model = VerificationReport
        fields = [
            'id', 'visit', 'visit_number',
            'overall_condition', 'condition_display', 'initial_rating',
            'identity_verified', 'document_type_verified', 'document_number_verified',
            'property_exists', 'property_matches_description', 'property_condition_notes',
            'person_lives_at_address', 'person_cooperative', 'references_verified',
            'findings', 'recommendations', 'risk_flags', 'photo_evidence',
            'approved_by_admin', 'admin_notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
