"""
Comando para procesar notificaciones automáticas de contratos.
Envía alertas por vencimientos, firmas pendientes y otros eventos importantes.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Q
from datetime import timedelta, datetime
import logging

from contracts.models import Contract, ContractSignature, ContractRenewal
from notifications.notification_service import notification_service

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Procesa notificaciones automáticas de contratos'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--notification-type',
            type=str,
            choices=['expiring', 'pending_signatures', 'renewals', 'all'],
            default='all',
            help='Tipo de notificaciones a procesar'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Ejecutar en modo de prueba sin enviar notificaciones'
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Mostrar información detallada'
        )
    
    def handle(self, *args, **options):
        start_time = timezone.now()
        notification_type = options['notification_type']
        dry_run = options['dry_run']
        verbose = options['verbose']
        
        if verbose:
            self.stdout.write(
                self.style.SUCCESS(f'Iniciando procesamiento de notificaciones de contratos: {start_time}')
            )
        
        stats = {
            'expiring_contracts': 0,
            'pending_signatures': 0,
            'renewal_reminders': 0,
            'total_notifications': 0
        }
        
        try:
            # Procesar contratos próximos a expirar
            if notification_type in ['expiring', 'all']:
                expiring_stats = self._process_expiring_contracts(dry_run, verbose)
                stats['expiring_contracts'] = expiring_stats
            
            # Procesar firmas pendientes
            if notification_type in ['pending_signatures', 'all']:
                pending_stats = self._process_pending_signatures(dry_run, verbose)
                stats['pending_signatures'] = pending_stats
            
            # Procesar recordatorios de renovación
            if notification_type in ['renewals', 'all']:
                renewal_stats = self._process_renewal_reminders(dry_run, verbose)
                stats['renewal_reminders'] = renewal_stats
            
            stats['total_notifications'] = sum(stats.values())
            
            # Mostrar resumen
            end_time = timezone.now()
            duration = (end_time - start_time).total_seconds()
            
            self.stdout.write('\\n' + '='*50)
            self.stdout.write(self.style.SUCCESS('RESUMEN DE NOTIFICACIONES'))
            self.stdout.write('='*50)
            self.stdout.write(f'Contratos próximos a expirar: {stats["expiring_contracts"]}')
            self.stdout.write(f'Firmas pendientes: {stats["pending_signatures"]}')
            self.stdout.write(f'Recordatorios de renovación: {stats["renewal_reminders"]}')
            self.stdout.write(f'Total de notificaciones: {stats["total_notifications"]}')
            self.stdout.write(f'Tiempo de procesamiento: {duration:.2f}s')
            
            if dry_run:
                self.stdout.write(self.style.WARNING('MODO DE PRUEBA: No se enviaron notificaciones reales'))
            
            if stats['total_notifications'] > 0:
                self.stdout.write(
                    self.style.SUCCESS(f'\\n[OK] Proceso completado exitosamente')
                )
            else:
                self.stdout.write(
                    self.style.HTTP_INFO('No se encontraron notificaciones para enviar')
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error durante el procesamiento: {str(e)}')
            )
            logger.error(f'Error in process_contract_notifications command: {str(e)}')
            raise
    
    def _process_expiring_contracts(self, dry_run=False, verbose=False):
        """Procesa contratos próximos a expirar."""
        notification_count = 0
        
        # Contratos que expiran en 30, 15, 7 y 1 día
        warning_days = [30, 15, 7, 1]
        
        for days in warning_days:
            target_date = timezone.now().date() + timedelta(days=days)
            
            contracts = Contract.objects.filter(
                end_date=target_date,
                status='active'
            ).select_related('primary_party', 'secondary_party', 'property')
            
            for contract in contracts:
                if verbose:
                    self.stdout.write(
                        f'Procesando contrato {contract.contract_number} - expira en {days} días'
                    )
                
                if not dry_run:
                    # Notificar al arrendador
                    notification_service.send_notification(
                        user=contract.primary_party,
                        template_name='contract_expiring_landlord',
                        context={
                            'contract': contract,
                            'days_until_expiry': days,
                            'landlord_name': contract.primary_party.get_full_name(),
                            'tenant_name': contract.secondary_party.get_full_name(),
                            'property_address': contract.property.address if contract.property else 'N/A',
                            'contract_url': f'/contracts/{contract.id}/'
                        },
                        priority='high' if days <= 7 else 'normal'
                    )
                    
                    # Notificar al arrendatario
                    notification_service.send_notification(
                        user=contract.secondary_party,
                        template_name='contract_expiring_tenant',
                        context={
                            'contract': contract,
                            'days_until_expiry': days,
                            'tenant_name': contract.secondary_party.get_full_name(),
                            'landlord_name': contract.primary_party.get_full_name(),
                            'property_address': contract.property.address if contract.property else 'N/A',
                            'contract_url': f'/contracts/{contract.id}/'
                        },
                        priority='high' if days <= 7 else 'normal'
                    )
                    
                    notification_count += 2  # Una para cada parte
                else:
                    notification_count += 2
        
        return notification_count
    
    def _process_pending_signatures(self, dry_run=False, verbose=False):
        """Procesa contratos con firmas pendientes."""
        notification_count = 0
        
        # Contratos pendientes de firma por más de 24 horas
        cutoff_time = timezone.now() - timedelta(hours=24)
        
        contracts = Contract.objects.filter(
            status__in=['pending_signature', 'partially_signed'],
            created_at__lt=cutoff_time
        ).select_related('primary_party', 'secondary_party')
        
        for contract in contracts:
            # Verificar quién falta por firmar
            signed_users = ContractSignature.objects.filter(
                contract=contract,
                is_valid=True
            ).values_list('signer_id', flat=True)
            
            signatories = [contract.primary_party, contract.secondary_party]
            pending_signers = [user for user in signatories if user.id not in signed_users]
            
            for pending_signer in pending_signers:
                if verbose:
                    self.stdout.write(
                        f'Recordatorio de firma pendiente para {pending_signer.email} - '
                        f'contrato {contract.contract_number}'
                    )
                
                if not dry_run:
                    # Calcular días pendientes
                    days_pending = (timezone.now() - contract.created_at).days
                    
                    notification_service.send_notification(
                        user=pending_signer,
                        template_name='contract_signature_reminder',
                        context={
                            'contract': contract,
                            'pending_signer_name': pending_signer.get_full_name(),
                            'other_party_name': (
                                contract.secondary_party.get_full_name() 
                                if pending_signer == contract.primary_party 
                                else contract.primary_party.get_full_name()
                            ),
                            'days_pending': days_pending,
                            'contract_url': f'/contracts/{contract.id}/sign/',
                            'urgency_level': 'high' if days_pending > 3 else 'normal'
                        },
                        priority='high' if days_pending > 3 else 'normal'
                    )
                    
                notification_count += 1
        
        return notification_count
    
    def _process_renewal_reminders(self, dry_run=False, verbose=False):
        """Procesa recordatorios de renovación."""
        notification_count = 0
        
        # Contratos que pueden renovarse y están próximos a expirar
        renewal_notice_date = timezone.now().date() + timedelta(days=60)
        
        contracts = Contract.objects.filter(
            is_renewable=True,
            status='active',
            end_date__lte=renewal_notice_date
        ).select_related('primary_party', 'secondary_party', 'property')
        
        # Excluir contratos que ya tienen solicitudes de renovación pendientes
        contracts_with_renewals = ContractRenewal.objects.filter(
            status__in=['pending', 'approved']
        ).values_list('original_contract_id', flat=True)
        
        contracts = contracts.exclude(id__in=contracts_with_renewals)
        
        for contract in contracts:
            days_until_expiry = (contract.end_date - timezone.now().date()).days
            
            if verbose:
                self.stdout.write(
                    f'Recordatorio de renovación para contrato {contract.contract_number} - '
                    f'expira en {days_until_expiry} días'
                )
            
            if not dry_run:
                # Notificar al arrendador
                notification_service.send_notification(
                    user=contract.primary_party,
                    template_name='contract_renewal_reminder',
                    context={
                        'contract': contract,
                        'landlord_name': contract.primary_party.get_full_name(),
                        'tenant_name': contract.secondary_party.get_full_name(),
                        'property_address': contract.property.address if contract.property else 'N/A',
                        'days_until_expiry': days_until_expiry,
                        'renewal_url': f'/contracts/{contract.id}/renew/',
                        'current_rent': contract.monthly_rent
                    },
                    priority='normal'
                )
                
                # Notificar al arrendatario
                notification_service.send_notification(
                    user=contract.secondary_party,
                    template_name='contract_renewal_notice_tenant',
                    context={
                        'contract': contract,
                        'tenant_name': contract.secondary_party.get_full_name(),
                        'landlord_name': contract.primary_party.get_full_name(),
                        'property_address': contract.property.address if contract.property else 'N/A',
                        'days_until_expiry': days_until_expiry,
                        'contract_url': f'/contracts/{contract.id}/',
                        'current_rent': contract.monthly_rent
                    },
                    priority='normal'
                )
                
                notification_count += 2
            else:
                notification_count += 2
        
        return notification_count