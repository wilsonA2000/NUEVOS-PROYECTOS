#!/usr/bin/env python
"""
Script para crear datos de prueba en VeriHome.
"""
import os
import sys
import django
from datetime import datetime, timedelta
from decimal import Decimal

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

# Importar modelos
from django.contrib.auth import get_user_model
from properties.models import Property, PropertyImage, PropertyAmenity, PropertyAmenityRelation
from contracts.models import Contract, ContractTemplate
from messaging.models import MessageThread, Message
from payments.models import Transaction, Invoice
from ratings.models import Rating
from django.utils import timezone

User = get_user_model()

def create_users():
    """Crear usuarios de prueba"""
    print("Creando usuarios...")
    
    users = []
    
    # Landlord (Arrendador)
    landlord = User.objects.create_user(
        email='landlord@test.com',
        password='test123',
        first_name='Juan',
        last_name='Pérez',
        user_type='landlord',
        phone_number='+57 300 123 4567',
        is_verified=True
    )
    users.append(landlord)
    print(f"✓ Creado landlord: {landlord.email}")
    
    # Tenant (Arrendatario)
    tenant = User.objects.create_user(
        email='tenant@test.com',
        password='test123',
        first_name='María',
        last_name='García',
        user_type='tenant',
        phone_number='+57 301 234 5678',
        is_verified=True
    )
    users.append(tenant)
    print(f"✓ Creado tenant: {tenant.email}")
    
    # Service Provider
    service_provider = User.objects.create_user(
        email='service@test.com',
        password='test123',
        first_name='Carlos',
        last_name='López',
        user_type='service_provider',
        phone_number='+57 302 345 6789',
        is_verified=True
    )
    users.append(service_provider)
    print(f"✓ Creado service provider: {service_provider.email}")
    
    return users

def create_amenities():
    """Crear amenidades básicas"""
    print("\nCreando amenidades...")
    
    amenities_data = [
        'Parqueadero',
        'Piscina',
        'Gimnasio',
        'Seguridad 24/7',
        'Ascensor',
        'Amoblado',
        'Balcón',
        'Terraza',
        'Jardín',
        'Se permiten mascotas',
        'Lavandería',
        'Bodega',
        'Internet incluido',
        'Calefacción',
        'Aire acondicionado',
    ]
    
    amenities = []
    for name in amenities_data:
        amenity, created = PropertyAmenity.objects.get_or_create(
            name=name,
            defaults={'is_active': True}
        )
        amenities.append(amenity)
        if created:
            print(f"✓ Creada amenidad: {name}")
    
    return amenities

def create_properties(landlord, amenities):
    """Crear propiedades de prueba"""
    print("\nCreando propiedades...")
    
    properties_data = [
        {
            'title': 'Apartamento moderno en El Poblado',
            'description': 'Hermoso apartamento de 3 habitaciones con vista panorámica',
            'property_type': 'apartment',
            'listing_type': 'rent',
            'bedrooms': 3,
            'bathrooms': 2,
            'total_area': 120,
            'rent_price': Decimal('2500000'),
            'address': 'Calle 10 #35-20',
            'city': 'Medellín',
            'state': 'Antioquia',
            'country': 'Colombia',
            'postal_code': '050021',
            'latitude': 6.209778,
            'longitude': -75.573553,
            'amenities': ['Parqueadero', 'Piscina', 'Gimnasio', 'Seguridad 24/7', 'Ascensor'],
        },
        {
            'title': 'Casa campestre en Rionegro',
            'description': 'Espectacular casa campestre con amplio jardín y piscina',
            'property_type': 'house',
            'listing_type': 'rent',
            'bedrooms': 4,
            'bathrooms': 3,
            'total_area': 250,
            'rent_price': Decimal('3500000'),
            'address': 'Vereda Llanogrande',
            'city': 'Rionegro',
            'state': 'Antioquia',
            'country': 'Colombia',
            'postal_code': '054040',
            'latitude': 6.155468,
            'longitude': -75.415794,
            'amenities': ['Parqueadero', 'Piscina', 'Jardín', 'Se permiten mascotas', 'Seguridad 24/7'],
        },
        {
            'title': 'Estudio en Laureles',
            'description': 'Acogedor estudio completamente amoblado',
            'property_type': 'studio',
            'listing_type': 'rent',
            'bedrooms': 1,
            'bathrooms': 1,
            'total_area': 45,
            'rent_price': Decimal('1200000'),
            'address': 'Circular 73 #39B-15',
            'city': 'Medellín',
            'state': 'Antioquia',
            'country': 'Colombia',
            'postal_code': '050031',
            'latitude': 6.245827,
            'longitude': -75.593661,
            'amenities': ['Amoblado', 'Internet incluido', 'Lavandería', 'Seguridad 24/7'],
        },
    ]
    
    properties = []
    for prop_data in properties_data:
        amenity_names = prop_data.pop('amenities')
        
        property_obj = Property.objects.create(
            landlord=landlord,
            **prop_data
        )
        
        # Agregar amenidades
        for name in amenity_names:
            amenity = next((a for a in amenities if a.name == name), None)
            if amenity:
                PropertyAmenityRelation.objects.create(
                    property=property_obj,
                    amenity=amenity
                )
        
        properties.append(property_obj)
        print(f"✓ Creada propiedad: {property_obj.title}")
    
    return properties

def create_contracts(properties, tenant):
    """Crear contratos de prueba"""
    print("\nCreando contratos...")
    
    contracts = []
    
    # Contrato activo
    contract = Contract.objects.create(
        property=properties[0],
        secondary_party=tenant,  # Arrendatario
        primary_party=properties[0].landlord,  # Arrendador
        start_date=timezone.now().date(),
        end_date=timezone.now().date() + timedelta(days=365),
        monthly_rent=properties[0].rent_price,
        security_deposit=properties[0].rent_price * 2,
        status='active',
        title=f'Contrato de arrendamiento - {properties[0].title}',
        contract_type='rental_urban',
        content='Contrato de arrendamiento generado automáticamente para pruebas.'
    )
    contracts.append(contract)
    print(f"✓ Creado contrato activo para: {properties[0].title}")
    
    return contracts

def create_messages(users):
    """Crear mensajes de prueba"""
    print("\nCreando mensajes...")
    
    landlord = users[0]
    tenant = users[1]
    
    # Crear thread
    thread = MessageThread.objects.create(
        subject='Consulta sobre apartamento',
        created_by=tenant
    )
    thread.participants.add(landlord, tenant)
    
    # Crear mensajes
    messages = [
        Message.objects.create(
            thread=thread,
            sender=tenant,
            recipient=landlord,
            content='Hola, me interesa el apartamento en El Poblado. ¿Está disponible?'
        ),
        Message.objects.create(
            thread=thread,
            sender=landlord,
            recipient=tenant,
            content='¡Hola! Sí, el apartamento está disponible. ¿Te gustaría programar una visita?'
        ),
        Message.objects.create(
            thread=thread,
            sender=tenant,
            recipient=landlord,
            content='Sí, me encantaría. ¿Podría ser este fin de semana?'
        ),
    ]
    
    print(f"✓ Creado thread con {len(messages)} mensajes")
    
    return thread, messages

def create_payments(contract, tenant):
    """Crear pagos de prueba"""
    print("\nCreando pagos...")
    
    # Transacción completada
    payment = Transaction.objects.create(
        payer=tenant,
        payee=contract.primary_party,
        amount=contract.monthly_rent,
        transaction_type='rent_payment',
        status='completed',
        description='Pago de renta mensual',
        direction='inbound',
        completed_at=timezone.now()
    )
    
    print(f"✓ Creado pago de renta por: ${payment.amount}")
    
    # Factura
    invoice = Invoice.objects.create(
        issuer=contract.primary_party,
        recipient=tenant,
        contract=contract,
        invoice_type='rent',
        title='Factura de renta mensual',
        subtotal=contract.monthly_rent,
        total_amount=contract.monthly_rent,
        due_date=timezone.now().date() + timedelta(days=5),
        status='paid',
        paid_date=timezone.now().date()
    )
    
    print(f"✓ Creada factura: {invoice.invoice_number}")
    
    return payment, invoice

def create_ratings(users, properties):
    """Crear calificaciones de prueba"""
    print("\nCreando calificaciones...")
    
    tenant = users[1]
    landlord = users[0]
    
    # Rating de tenant a landlord
    rating1 = Rating.objects.create(
        reviewer=tenant,
        reviewee=landlord,
        overall_rating=9,
        property=properties[0],
        rating_type='tenant_to_landlord',
        title='Excelente arrendador',
        review_text='Excelente propiedad, muy bien mantenida y tal como se muestra en las fotos.'
    )
    
    # Rating de landlord a tenant  
    rating2 = Rating.objects.create(
        reviewer=landlord,
        reviewee=tenant,
        overall_rating=10,
        rating_type='landlord_to_tenant',
        title='Inquilino ejemplar',
        review_text='Inquilino responsable y cuidadoso con la propiedad.'
    )
    
    print(f"✓ Creadas {Rating.objects.count()} calificaciones")
    
    return [rating1, rating2]

def main():
    """Función principal"""
    print("\n" + "="*60)
    print("CREACIÓN DE DATOS DE PRUEBA - VERIHOME")
    print("="*60 + "\n")
    
    try:
        # Verificar si ya existen datos
        if User.objects.filter(email__in=['landlord@test.com', 'tenant@test.com']).exists():
            print("⚠️  Los usuarios de prueba ya existen. Limpiando datos anteriores...")
            # Limpiar datos de prueba existentes
            User.objects.filter(email__in=['landlord@test.com', 'tenant@test.com', 'service@test.com']).delete()
            print("✓ Datos anteriores eliminados.")
        
        # Crear datos
        users = create_users()
        amenities = create_amenities()
        properties = create_properties(users[0], amenities)  # landlord
        contracts = create_contracts(properties, users[1])  # tenant
        thread, messages = create_messages(users)
        payment, invoice = create_payments(contracts[0], users[1])
        ratings = create_ratings(users, properties)
        
        # Resumen
        print("\n" + "="*60)
        print("RESUMEN DE DATOS CREADOS")
        print("="*60)
        print(f"✅ Usuarios: {len(users)}")
        print(f"✅ Amenidades: {len(amenities)}")
        print(f"✅ Propiedades: {len(properties)}")
        print(f"✅ Contratos: {len(contracts)}")
        print(f"✅ Mensajes: {len(messages)}")
        print(f"✅ Pagos: 1")
        print(f"✅ Facturas: 1")
        print(f"✅ Calificaciones: {len(ratings)}")
        
        print("\n📝 Credenciales de prueba:")
        print("  - Landlord: landlord@test.com / test123")
        print("  - Tenant: tenant@test.com / test123")
        print("  - Service: service@test.com / test123")
        print("  - Admin: admin@verihome.com / admin123")
        
        print("\n✅ Datos de prueba creados exitosamente!")
        
    except Exception as e:
        print(f"\n❌ Error creando datos: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()