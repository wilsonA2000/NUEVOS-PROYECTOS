"""
Script para resetear datos de usuarios manteniendo las cuentas.
Elimina: matches, contratos, solicitudes, documentos, etc.
Mantiene: usuarios, propiedades
"""

import os
import sys
import django

# Setup Django
sys.path.append('/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from matching.models import MatchRequest
from contracts.models import Contract, LandlordControlledContract, ContractSignature, BiometricAuthentication
from requests.models import (
    PropertyInterestRequest, ServiceRequest, MaintenanceRequest,
    ContractSignatureRequest, BaseRequest
)
from payments.models import Payment, Transaction
from django.contrib.auth import get_user_model

User = get_user_model()

def reset_user_data():
    """
    Elimina todos los datos de workflow manteniendo usuarios y propiedades.
    """
    print("=" * 80)
    print("🔄 RESETEO COMPLETO DE DATOS DE USUARIOS")
    print("=" * 80)

    # Contar antes
    print("\n📊 DATOS ACTUALES:")
    print(f"   • MatchRequest: {MatchRequest.objects.count()}")
    print(f"   • LandlordControlledContract: {LandlordControlledContract.objects.count()}")
    print(f"   • Contract (biométrico): {Contract.objects.count()}")
    print(f"   • BiometricAuthentication: {BiometricAuthentication.objects.count()}")
    print(f"   • PropertyInterestRequest: {PropertyInterestRequest.objects.count()}")
    print(f"   • ServiceRequest: {ServiceRequest.objects.count()}")
    print(f"   • MaintenanceRequest: {MaintenanceRequest.objects.count()}")
    print(f"   • Payment: {Payment.objects.count()}")
    print(f"   • Transaction: {Transaction.objects.count()}")

    # Confirmar
    print("\n⚠️  ADVERTENCIA: Esto eliminará TODOS los datos de workflow.")
    print("   ✅ SE MANTIENEN: Usuarios y Propiedades")
    print("   ❌ SE ELIMINAN: Matches, Contratos, Solicitudes, Pagos, Transacciones")

    confirm = input("\n¿Continuar? (escribe 'SI' en mayúsculas): ")

    if confirm != 'SI':
        print("\n❌ Operación cancelada")
        return

    print("\n🗑️  ELIMINANDO DATOS...")

    # 1. Autenticaciones biométricas
    deleted = BiometricAuthentication.objects.all().delete()
    print(f"   ✅ BiometricAuthentication eliminadas: {deleted[0]}")

    # 2. Firmas de contratos
    deleted = ContractSignature.objects.all().delete()
    print(f"   ✅ ContractSignature eliminadas: {deleted[0]}")

    # 3. Contratos legacy (biométrico)
    deleted = Contract.objects.all().delete()
    print(f"   ✅ Contract (biométrico) eliminados: {deleted[0]}")

    # 4. Contratos landlord-controlled
    deleted = LandlordControlledContract.objects.all().delete()
    print(f"   ✅ LandlordControlledContract eliminados: {deleted[0]}")

    # 5. Match Requests
    deleted = MatchRequest.objects.all().delete()
    print(f"   ✅ MatchRequest eliminados: {deleted[0]}")

    # 6. Solicitudes
    deleted = PropertyInterestRequest.objects.all().delete()
    print(f"   ✅ PropertyInterestRequest eliminadas: {deleted[0]}")

    deleted = ServiceRequest.objects.all().delete()
    print(f"   ✅ ServiceRequest eliminadas: {deleted[0]}")

    deleted = MaintenanceRequest.objects.all().delete()
    print(f"   ✅ MaintenanceRequest eliminadas: {deleted[0]}")

    deleted = ContractSignatureRequest.objects.all().delete()
    print(f"   ✅ ContractSignatureRequest eliminadas: {deleted[0]}")

    # 7. Pagos y transacciones
    deleted = Transaction.objects.all().delete()
    print(f"   ✅ Transaction eliminadas: {deleted[0]}")

    deleted = Payment.objects.all().delete()
    print(f"   ✅ Payment eliminados: {deleted[0]}")

    # Verificar resultado
    print("\n" + "=" * 80)
    print("✅ RESETEO COMPLETADO")
    print("=" * 80)

    print("\n📊 DATOS FINALES:")
    print(f"   • MatchRequest: {MatchRequest.objects.count()}")
    print(f"   • LandlordControlledContract: {LandlordControlledContract.objects.count()}")
    print(f"   • Contract (biométrico): {Contract.objects.count()}")
    print(f"   • BiometricAuthentication: {BiometricAuthentication.objects.count()}")
    print(f"   • Solicitudes: {BaseRequest.objects.count()}")
    print(f"   • Payment: {Payment.objects.count()}")
    print(f"   • Transaction: {Transaction.objects.count()}")

    print("\n👥 USUARIOS DISPONIBLES PARA TESTING:")
    users = User.objects.all()
    for user in users:
        print(f"   • {user.email} ({user.user_type}) - {user.get_full_name()}")

    print("\n🏠 PROPIEDADES DISPONIBLES:")
    from properties.models import Property
    properties = Property.objects.all()
    print(f"   • Total propiedades: {properties.count()}")
    for prop in properties[:5]:
        print(f"     - {prop.title} ({prop.property_type})")

    print("\n" + "=" * 80)
    print("🎉 Sistema listo para testing desde cero!")
    print("=" * 80)
    print("\n💡 PRÓXIMOS PASOS:")
    print("   1. Login como arrendador: admin@verihome.com / admin123")
    print("   2. Login como arrendatario: letefon100@gmail.com / adim123")
    print("   3. Crear nuevos match requests")
    print("   4. Probar flujo completo de contratos")
    print("=" * 80)

if __name__ == '__main__':
    reset_user_data()
