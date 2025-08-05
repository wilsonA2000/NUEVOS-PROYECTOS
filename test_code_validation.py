#!/usr/bin/env python
"""
Script para probar la validación de códigos de entrevista
"""
import os
import sys
import django

# Configurar Django
sys.path.append('/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from users.models import InterviewCode
from users.api_interview import ValidateInterviewCodeView
from django.test import RequestFactory
from django.http import JsonResponse
import json

def test_codes():
    print("=== CÓDIGOS EN LA BASE DE DATOS ===")
    codes = InterviewCode.objects.all()
    
    for code in codes:
        print(f"Código: {code.interview_code}")
        print(f"Estado: {code.status}")
        print(f"Aprobado: {code.is_approved}")
        print(f"Expira: {code.expires_at}")
        print(f"Usado: {getattr(code, 'used', 'N/A')}")
        
        # Probar validación
        is_valid, message = code.is_valid()
        print(f"¿Es válido?: {is_valid}")
        print(f"Mensaje: {message}")
        print("---")
        
        # Probar con la API
        factory = RequestFactory()
        view = ValidateInterviewCodeView()
        
        # Probar el código limpio (sin guiones)
        clean_code = code.interview_code.replace('-', '')
        request = factory.post('/api/v1/auth/validate-interview-code/', 
                             data=json.dumps({'interview_code': clean_code}),
                             content_type='application/json')
        response = view.post(request)
        
        print(f"API Response para '{clean_code}': {response.status_code}")
        if hasattr(response, 'data'):
            print(f"API Data: {response.data}")
        print("=" * 50)

if __name__ == "__main__":
    test_codes()