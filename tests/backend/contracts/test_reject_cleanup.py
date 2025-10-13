#!/usr/bin/env python3
"""
Script de prueba para verificar que el rechazo de matches limpia correctamente
todos los datos asociados.
"""

import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from matching.models import MatchRequest
from contracts.models import Contract
from requests.models import PropertyInterestRequest, TenantDocument
from messaging.models import Message, Thread
from django.contrib.auth import get_user_model

User = get_user_model()

def test_reject_cleanup():
    """Prueba el sistema de limpieza al rechazar un match."""
    
    print("🧪 INICIANDO PRUEBA DE LIMPIEZA AL RECHAZAR MATCH")
    print("="*60)
    
    # Buscar un match para probar (o crear uno de prueba)
    matches = MatchRequest.objects.filter(status__in=['pending', 'accepted', 'contract_ready'])
    
    if not matches.exists():
        print("❌ No hay matches disponibles para probar")
        print("💡 Crea un match primero desde la interfaz web")
        return
    
    # Tomar el primer match disponible
    test_match = matches.first()
    
    print(f"🎯 MATCH SELECCIONADO PARA PRUEBA:")
    print(f"   Match Code: {test_match.match_code}")
    print(f"   Status: {test_match.status}")
    print(f"   Arrendador: {test_match.landlord.get_full_name()}")
    print(f"   Inquilino: {test_match.tenant.get_full_name()}")
    print(f"   Propiedad: {test_match.property.title}")
    print()
    
    # CONTAR DATOS ANTES DEL RECHAZO
    print("📊 DATOS ANTES DEL RECHAZO:")
    
    # Contratos asociados
    contracts_before = Contract.objects.filter(
        variables_data__workflow_match_id=str(test_match.id)
    ).count()
    
    # PropertyInterestRequest asociados
    prop_requests_before = PropertyInterestRequest.objects.filter(
        requester=test_match.tenant,
        property=test_match.property
    ).count()
    
    # Documentos del inquilino
    docs_before = 0
    for prop_req in PropertyInterestRequest.objects.filter(
        requester=test_match.tenant,
        property=test_match.property
    ):
        docs_before += TenantDocument.objects.filter(property_request=prop_req).count()
    
    # Mensajes
    messages_before = 0
    try:
        thread = Thread.objects.filter(
            participants__in=[test_match.landlord, test_match.tenant]
        ).distinct().first()
        if thread:
            messages_before = Message.objects.filter(thread=thread).count()
    except:
        pass
    
    print(f"   📄 Contratos: {contracts_before}")
    print(f"   📋 Solicitudes de propiedad: {prop_requests_before}")
    print(f"   📎 Documentos de inquilino: {docs_before}")
    print(f"   💬 Mensajes: {messages_before}")
    print()
    
    # EJECUTAR RECHAZO
    print("🚫 EJECUTANDO RECHAZO CON LIMPIEZA...")
    print("-"*40)
    
    try:
        test_match.reject_match("Prueba de limpieza automática del sistema")
        print("✅ Rechazo ejecutado correctamente")
    except Exception as e:
        print(f"❌ Error durante el rechazo: {e}")
        return
    
    print()
    print("📊 VERIFICANDO LIMPIEZA...")
    
    # CONTAR DATOS DESPUÉS DEL RECHAZO
    contracts_after = Contract.objects.filter(
        variables_data__workflow_match_id=str(test_match.id)
    ).count()
    
    prop_requests_after = PropertyInterestRequest.objects.filter(
        requester=test_match.tenant,
        property=test_match.property
    ).count()
    
    docs_after = 0
    for prop_req in PropertyInterestRequest.objects.filter(
        requester=test_match.tenant,
        property=test_match.property
    ):
        docs_after += TenantDocument.objects.filter(property_request=prop_req).count()
    
    messages_after = 0
    try:
        thread = Thread.objects.filter(
            participants__in=[test_match.landlord, test_match.tenant]
        ).distinct().first()
        if thread:
            messages_after = Message.objects.filter(thread=thread).count()
    except:
        pass
    
    print(f"📊 DATOS DESPUÉS DEL RECHAZO:")
    print(f"   📄 Contratos: {contracts_after} (antes: {contracts_before})")
    print(f"   📋 Solicitudes de propiedad: {prop_requests_after} (antes: {prop_requests_before})")
    print(f"   📎 Documentos de inquilino: {docs_after} (antes: {docs_before})")
    print(f"   💬 Mensajes: {messages_after} (antes: {messages_before})")
    print()
    
    # VERIFICAR STATUS DEL MATCH
    test_match.refresh_from_db()
    print(f"📋 ESTADO DEL MATCH:")
    print(f"   Status: {test_match.status}")
    print(f"   Workflow Data: {test_match.workflow_data}")
    print(f"   Current Stage: {test_match.current_stage}")
    print()
    
    # EVALUACIÓN FINAL
    cleanup_successful = (
        contracts_after == 0 and
        prop_requests_after == 0 and
        docs_after == 0 and
        test_match.status == 'rejected'
    )
    
    if cleanup_successful:
        print("🎉 ¡PRUEBA EXITOSA!")
        print("✅ Todos los datos asociados fueron limpiados correctamente")
        print("✅ El inquilino puede solicitar nuevamente sin conflictos")
        print("✅ La propiedad está liberada para nuevas solicitudes")
    else:
        print("⚠️  PRUEBA PARCIALMENTE EXITOSA")
        print("❓ Algunos datos pueden no haberse limpiado completamente")
        print("💡 Revisar logs para más detalles")
    
    print()
    print("="*60)
    print("🧪 PRUEBA COMPLETADA")

if __name__ == "__main__":
    test_reject_cleanup()