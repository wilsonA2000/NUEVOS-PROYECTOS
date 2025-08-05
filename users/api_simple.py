"""
Vista simple para validación de códigos sin CSRF
"""
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from .models import InterviewCode
import logging

logger = logging.getLogger(__name__)

@csrf_exempt
@require_http_methods(["POST"])
def validate_interview_code_simple(request):
    """Vista simple para validar códigos de entrevista sin CSRF."""
    
    try:
        # Parsear JSON del request
        data = json.loads(request.body)
        interview_code = data.get('interview_code', '').strip().upper()
        
        if not interview_code:
            return JsonResponse({
                'is_valid': False,
                'message': 'Código de entrevista requerido'
            }, status=400)
        
        try:
            code_obj = InterviewCode.objects.get(interview_code=interview_code)
            is_valid, message = code_obj.is_valid()
            
            if is_valid:
                return JsonResponse({
                    'is_valid': True,
                    'message': 'Código válido',
                    'code_data': {
                        'interview_code': code_obj.interview_code,
                        'candidate_name': code_obj.candidate_name,
                        'candidate_email': code_obj.candidate_email,
                        'approved_user_type': code_obj.approved_user_type,
                        'interview_rating': code_obj.interview_rating or 0,
                        'status': code_obj.status,
                        'expires_at': code_obj.expires_at.isoformat() if code_obj.expires_at else None,
                        'is_approved': code_obj.is_approved
                    }
                })
            else:
                # Incrementar intentos si el código existe pero no es válido
                code_obj.increment_attempt()
                return JsonResponse({
                    'is_valid': False,
                    'message': message
                }, status=400)
                
        except InterviewCode.DoesNotExist:
            return JsonResponse({
                'is_valid': False,
                'message': 'Código de entrevista no encontrado'
            }, status=404)
            
    except json.JSONDecodeError:
        return JsonResponse({
            'is_valid': False,
            'message': 'Datos JSON inválidos'
        }, status=400)
    except Exception as e:
        logger.error(f"Error validating interview code: {str(e)}")
        return JsonResponse({
            'is_valid': False,
            'message': 'Error interno del servidor'
        }, status=500)