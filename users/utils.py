"""
Utilidades para la aplicación de usuarios de VeriHome.
"""

import random
import string
import uuid
from datetime import datetime, timedelta
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
from django.db import models
from .models import InterviewCode, User


def generate_interview_code():
    """
    Genera un código único de entrevista de 8 caracteres.
    Formato: 2 letras + 4 números + 2 letras (ej: AB1234CD)
    """
    letters = string.ascii_uppercase
    numbers = string.digits
    
    # Generar código único
    while True:
        code = (
            ''.join(random.choices(letters, k=2)) +
            ''.join(random.choices(numbers, k=4)) +
            ''.join(random.choices(letters, k=2))
        )
        
        # Verificar que no exista
        if not InterviewCode.objects.filter(interview_code=code).exists():
            return code


def create_interview_code(email, initial_rating=0, notes='', expires_in_days=30, candidate_name='Unknown', created_by=None):
    """
    Crea un código de entrevista para un email específico.
    
    Args:
        email (str): Email del candidato
        initial_rating (int): Calificación inicial (0-10)
        notes (str): Notas de la entrevista
        expires_in_days (int): Días hasta que expire el código
    
    Returns:
        InterviewCode: El código de entrevista creado
    """
    code = generate_interview_code()
    expires_at = timezone.now() + timedelta(days=expires_in_days)
    
    # Get a default created_by user (first superuser) if none provided
    if created_by is None:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        created_by = User.objects.filter(is_superuser=True).first()
        if created_by is None:
            raise ValueError("No superuser found to assign as created_by. Please provide a created_by user.")
    
    interview_code = InterviewCode.objects.create(
        interview_code=code,
        candidate_email=email,
        candidate_name=candidate_name,
        interview_rating=initial_rating,
        interview_notes=notes,
        expires_at=expires_at,
        created_by=created_by
    )
    
    return interview_code


def send_interview_code_email(interview_code, admin_name='Administrador'):
    """
    Envía el código de entrevista por email al candidato.
    
    Args:
        interview_code (InterviewCode): El código de entrevista
        admin_name (str): Nombre del administrador que asignó el código
    """
    context = {
        'interview_code': interview_code,
        'admin_name': admin_name,
        'site_name': 'VeriHome',
        'registration_url': f"{settings.SITE_URL}/register" if hasattr(settings, 'SITE_URL') else '/register'
    }
    
    # Renderizar templates
    html_message = render_to_string(
        'users/email/interview_code.html', 
        context
    )
    plain_message = render_to_string(
        'users/email/interview_code.txt', 
        context
    )
    
    # Enviar email
    send_mail(
        subject=f'[VeriHome] Tu código de entrevista: {interview_code.code}',
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[interview_code.email],
        html_message=html_message
    )


def send_interview_notification_to_admin(candidate_email, candidate_name, admin_email):
    """
    Envía notificación al administrador sobre un nuevo candidato.
    
    Args:
        candidate_email (str): Email del candidato
        candidate_name (str): Nombre del candidato
        admin_email (str): Email del administrador
    """
    context = {
        'candidate_email': candidate_email,
        'candidate_name': candidate_name,
        'site_name': 'VeriHome',
        'admin_panel_url': f"{settings.SITE_URL}/admin" if hasattr(settings, 'SITE_URL') else '/admin'
    }
    
    html_message = render_to_string(
        'users/email/interview_notification_admin.html', 
        context
    )
    plain_message = render_to_string(
        'users/email/interview_notification_admin.txt', 
        context
    )
    
    send_mail(
        subject=f'[VeriHome] Nuevo candidato: {candidate_name}',
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[admin_email],
        html_message=html_message
    )


def validate_interview_code(code, email):
    """
    Valida un código de entrevista.
    
    Args:
        code (str): Código a validar
        email (str): Email asociado al código
    
    Returns:
        tuple: (is_valid, message, interview_code)
    """
    try:
        interview_code = InterviewCode.objects.get(
            interview_code=code,
            candidate_email=email,
            status='active'
        )
        
        # Verificar si ha expirado
        if interview_code.expires_at and interview_code.expires_at < timezone.now():
            return False, "El código de entrevista ha expirado.", None
        
        return True, "Código válido.", interview_code
        
    except InterviewCode.DoesNotExist:
        return False, "Código de entrevista inválido o ya utilizado.", None


def get_interview_statistics():
    """
    Obtiene estadísticas de entrevistas.
    
    Returns:
        dict: Estadísticas de entrevistas
    """
    total_codes = InterviewCode.objects.count()
    used_codes = InterviewCode.objects.filter(status='used').count()
    pending_codes = InterviewCode.objects.filter(status='active').count()
    expired_codes = InterviewCode.objects.filter(
        expires_at__lt=timezone.now(),
        status='active'
    ).count()
    
    # Calificaciones promedio
    avg_rating = InterviewCode.objects.filter(
        status='used',
        initial_rating__gt=0
    ).aggregate(avg_rating=models.Avg('initial_rating'))['avg_rating'] or 0
    
    return {
        'total_codes': total_codes,
        'used_codes': used_codes,
        'pending_codes': pending_codes,
        'expired_codes': expired_codes,
        'average_rating': round(avg_rating, 1),
        'usage_rate': round((used_codes / total_codes * 100) if total_codes > 0 else 0, 1)
    }


def cleanup_expired_codes():
    """
    Limpia códigos de entrevista expirados.
    
    Returns:
        int: Número de códigos eliminados
    """
    expired_codes = InterviewCode.objects.filter(
        expires_at__lt=timezone.now(),
        status='active'
    )
    count = expired_codes.count()
    expired_codes.delete()
    return count


def get_user_verification_status(user):
    """
    Obtiene el estado completo de verificación de un usuario.
    
    Args:
        user (User): Usuario a verificar
    
    Returns:
        dict: Estado de verificación
    """
    status = {
        'email_verified': user.is_verified,
        'has_interview': user.interview_code is not None,
        'interview_rating': user.interview_code.initial_rating if user.interview_code else 0,
        'profile_complete': False,
        'documents_uploaded': False,
        'verification_score': 0
    }
    
    # Verificar perfil específico
    profile = user.get_profile()
    if profile:
        status['profile_complete'] = bool(profile.bio and profile.address)
    
    # Verificar documentos
    if hasattr(user, 'resume'):
        resume = user.resume
        status['documents_uploaded'] = any([
            resume.id_document,
            resume.proof_of_income,
            resume.bank_statement,
            resume.employment_letter
        ])
        status['verification_score'] = resume.verification_score
    
    return status


def calculate_verification_score(user):
    """
    Calcula el puntaje de verificación de un usuario.
    
    Args:
        user (User): Usuario a evaluar
    
    Returns:
        int: Puntaje de verificación (0-100)
    """
    score = 0
    
    # Email verificado (20 puntos)
    if user.is_verified:
        score += 20
    
    # Entrevista realizada (30 puntos)
    if user.interview_code and user.interview_code.status == 'used':
        score += 30
    
    # Calificación de entrevista (20 puntos)
    if user.interview_code and user.interview_code.initial_rating:
        score += min(user.interview_code.initial_rating * 2, 20)
    
    # Perfil completo (15 puntos)
    profile = user.get_profile()
    if profile and profile.bio and profile.address:
        score += 15
    
    # Documentos subidos (15 puntos)
    if hasattr(user, 'resume'):
        resume = user.resume
        documents = [
            resume.id_document,
            resume.proof_of_income,
            resume.bank_statement,
            resume.employment_letter
        ]
        uploaded_docs = sum(1 for doc in documents if doc)
        score += min(uploaded_docs * 3.75, 15)
    
    return min(score, 100) 