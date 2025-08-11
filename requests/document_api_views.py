"""
API Views para el sistema de documentos de inquilinos.
Maneja la carga, revisión y gestión de documentos para el proceso de arrendamiento.
"""

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count, Case, When, IntegerField
from django.utils import timezone

from .models import TenantDocument, PropertyInterestRequest
from .serializers import (
    TenantDocumentSerializer, 
    TenantDocumentUploadSerializer,
    TenantDocumentReviewSerializer,
    DocumentChecklistSerializer
)


class TenantDocumentUploadAPIView(generics.CreateAPIView):
    """Vista para subir documentos de inquilinos."""
    
    serializer_class = TenantDocumentUploadSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def create(self, request, *args, **kwargs):
        """Subir un documento con validaciones específicas."""
        
        # Solo inquilinos pueden subir documentos
        if request.user.user_type not in ['tenant', 'candidate']:
            return Response(
                {'error': 'Solo los inquilinos pueden subir documentos.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            try:
                document = serializer.save()
                
                # Respuesta con información completa del documento
                response_serializer = TenantDocumentSerializer(document)
                
                return Response({
                    'message': 'Documento subido exitosamente',
                    'document': response_serializer.data
                }, status=status.HTTP_201_CREATED)
                
            except Exception as e:
                return Response(
                    {'error': f'Error al subir el documento: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TenantDocumentListAPIView(generics.ListAPIView):
    """Vista para listar documentos de un proceso específico."""
    
    serializer_class = TenantDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Obtener documentos basados en el proceso y usuario."""
        process_id = self.kwargs.get('process_id')
        
        # Verificar que el proceso existe
        property_request = get_object_or_404(PropertyInterestRequest, id=process_id)
        
        # Solo el inquilino y el landlord pueden ver los documentos
        if self.request.user not in [property_request.requester, property_request.assignee]:
            return TenantDocument.objects.none()
        
        return TenantDocument.objects.filter(
            property_request=property_request
        ).select_related('uploaded_by', 'reviewed_by')


class TenantDocumentReviewAPIView(generics.UpdateAPIView):
    """Vista para que los landlords revisen documentos."""
    
    serializer_class = TenantDocumentReviewSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Solo landlords pueden revisar documentos de sus propiedades."""
        if self.request.user.user_type != 'landlord':
            return TenantDocument.objects.none()
        
        return TenantDocument.objects.filter(
            property_request__assignee=self.request.user
        )
    
    def update(self, request, *args, **kwargs):
        """Actualizar revisión del documento."""
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        
        if serializer.is_valid():
            document = serializer.save()
            
            # Respuesta con información completa
            response_serializer = TenantDocumentSerializer(document)
            
            return Response({
                'message': 'Documento revisado exitosamente',
                'document': response_serializer.data
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DocumentChecklistAPIView(generics.GenericAPIView):
    """Vista para obtener el checklist completo de documentos de un proceso."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, process_id):
        """Obtener checklist de documentos para un proceso específico."""
        
        # Verificar que el proceso existe
        property_request = get_object_or_404(PropertyInterestRequest, id=process_id)
        
        # Solo el inquilino y el landlord pueden ver el checklist
        if request.user not in [property_request.requester, property_request.assignee]:
            return Response(
                {'error': 'No tienes permisos para ver este proceso.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Obtener todos los documentos subidos para este proceso
        uploaded_documents = TenantDocument.objects.filter(
            property_request=property_request
        ).select_related('uploaded_by', 'reviewed_by')
        
        # Crear mapa de documentos por tipo
        documents_map = {doc.document_type: doc for doc in uploaded_documents}
        
        # Definir checklist completo con documentos requeridos
        checklist_data = self._build_checklist(documents_map, property_request)
        
        # Calcular estadísticas
        stats = self._calculate_stats(uploaded_documents, checklist_data)
        
        # Preparar respuesta
        response_data = {
            **checklist_data,
            **stats,
            'property_request_id': str(property_request.id),
            'property_title': property_request.property.title,
            'current_user_role': 'tenant' if request.user == property_request.requester else 'landlord'
        }
        
        serializer = DocumentChecklistSerializer(response_data)
        return Response(serializer.data)
    
    def _build_checklist(self, documents_map, property_request):
        """Construir checklist organizado por categorías."""
        
        # Documentos del TOMADOR
        tomador_types = [
            ('tomador_cedula_frente', 'Cédula de Ciudadanía - Frente', True),
            ('tomador_cedula_atras', 'Cédula de Ciudadanía - Atrás', True),
            ('tomador_pasaporte', 'Pasaporte', False),
            ('tomador_cedula_extranjeria_frente', 'Cédula de Extranjería - Frente', False),
            ('tomador_cedula_extranjeria_atras', 'Cédula de Extranjería - Atrás', False),
            ('tomador_certificado_laboral', 'Certificado Laboral', True),
            ('tomador_carta_recomendacion', 'Carta de Recomendación', True),
        ]
        
        # Documentos del CODEUDOR
        codeudor_types = [
            ('codeudor_cedula_frente', 'Codeudor: Cédula de Ciudadanía - Frente', True),
            ('codeudor_cedula_atras', 'Codeudor: Cédula de Ciudadanía - Atrás', True),
            ('codeudor_pasaporte', 'Codeudor: Pasaporte', False),
            ('codeudor_cedula_extranjeria_frente', 'Codeudor: Cédula de Extranjería - Frente', False),
            ('codeudor_cedula_extranjeria_atras', 'Codeudor: Cédula de Extranjería - Atrás', False),
            ('codeudor_certificado_laboral', 'Codeudor: Certificado Laboral', False),
            ('codeudor_libertad_tradicion', 'Codeudor: Certificado de Libertad y Tradición', False),
        ]
        
        # Otros documentos
        otros_types = [
            ('otros', 'Otros Documentos', False),
        ]
        
        def build_category_documents(types_list, category_name):
            documents = []
            for doc_type, display_name, is_required in types_list:
                doc_info = {
                    'id': str(documents_map[doc_type].id) if doc_type in documents_map else None,
                    'type': doc_type,
                    'display_name': display_name,
                    'required': is_required,
                    'uploaded': doc_type in documents_map,
                    'status': documents_map[doc_type].status if doc_type in documents_map else None,
                    'status_display': documents_map[doc_type].get_status_display() if doc_type in documents_map else 'No subido',
                    'status_color': documents_map[doc_type].get_status_color() if doc_type in documents_map else 'default',
                    'uploaded_at': documents_map[doc_type].uploaded_at.isoformat() if doc_type in documents_map else None,
                    'reviewed_at': documents_map[doc_type].reviewed_at.isoformat() if doc_type in documents_map and documents_map[doc_type].reviewed_at else None,
                    'file_url': documents_map[doc_type].get_file_url() if doc_type in documents_map else None,
                    'review_notes': documents_map[doc_type].review_notes if doc_type in documents_map else None,
                    'other_description': documents_map[doc_type].other_description if doc_type in documents_map else None,
                }
                documents.append(doc_info)
            return documents
        
        return {
            'tomador_documents': build_category_documents(tomador_types, 'TOMADOR'),
            'codeudor_documents': build_category_documents(codeudor_types, 'CODEUDOR'),
            'otros_documents': build_category_documents(otros_types, 'OTROS'),
        }
    
    def _calculate_stats(self, uploaded_documents, checklist_data):
        """Calcular estadísticas del checklist."""
        
        # Contar documentos requeridos
        total_required = 0
        for category in ['tomador_documents', 'codeudor_documents', 'otros_documents']:
            total_required += sum(1 for doc in checklist_data[category] if doc['required'])
        
        # Estadísticas de documentos subidos
        total_uploaded = uploaded_documents.count()
        total_approved = uploaded_documents.filter(status='approved').count()
        total_pending = uploaded_documents.filter(status='pending').count()
        total_rejected = uploaded_documents.filter(status='rejected').count()
        
        # Calcular porcentaje de completación
        completion_percentage = (total_uploaded / total_required * 100) if total_required > 0 else 0
        
        # Verificar si todos los documentos requeridos están subidos
        all_required_uploaded = True
        for category in ['tomador_documents', 'codeudor_documents']:
            for doc in checklist_data[category]:
                if doc['required'] and not doc['uploaded']:
                    all_required_uploaded = False
                    break
        
        # Verificar si todos están aprobados
        all_approved = all_required_uploaded and total_pending == 0 and total_rejected == 0
        
        # Determinar si puede proceder al siguiente paso
        can_proceed = all_approved
        
        return {
            'total_required': total_required,
            'total_uploaded': total_uploaded,
            'total_approved': total_approved,
            'total_pending': total_pending,
            'total_rejected': total_rejected,
            'completion_percentage': round(completion_percentage, 1),
            'all_required_uploaded': all_required_uploaded,
            'all_approved': all_approved,
            'can_proceed': can_proceed,
        }


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def delete_tenant_document(request, document_id):
    """Eliminar un documento subido (solo el inquilino que lo subió)."""
    
    try:
        document = get_object_or_404(TenantDocument, id=document_id)
        
        # Solo el inquilino que subió el documento puede eliminarlo
        if document.uploaded_by != request.user:
            return Response(
                {'error': 'No tienes permisos para eliminar este documento.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Solo permitir eliminar si está pendiente o rechazado
        if document.status not in ['pending', 'rejected']:
            return Response(
                {'error': 'Solo se pueden eliminar documentos pendientes o rechazados.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        document.delete()
        
        return Response({
            'message': 'Documento eliminado exitosamente'
        })
        
    except Exception as e:
        return Response(
            {'error': f'Error al eliminar el documento: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def document_stats_for_landlord(request):
    """Estadísticas de documentos para landlords."""
    
    if request.user.user_type != 'landlord':
        return Response(
            {'error': 'Solo los landlords pueden acceder a estas estadísticas.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Obtener documentos de todas las propiedades del landlord
    documents = TenantDocument.objects.filter(
        property_request__assignee=request.user
    ).select_related('property_request', 'property_request__property')
    
    # Calcular estadísticas
    stats = {
        'total_documents': documents.count(),
        'pending_review': documents.filter(status='pending').count(),
        'approved': documents.filter(status='approved').count(),
        'rejected': documents.filter(status='rejected').count(),
        'requires_correction': documents.filter(status='requires_correction').count(),
        'by_property': {},
        'recent_uploads': []
    }
    
    # Estadísticas por propiedad
    for doc in documents:
        property_title = doc.property_request.property.title
        if property_title not in stats['by_property']:
            stats['by_property'][property_title] = {
                'total': 0,
                'pending': 0,
                'approved': 0,
                'rejected': 0
            }
        
        stats['by_property'][property_title]['total'] += 1
        stats['by_property'][property_title][doc.status] += 1
    
    # Documentos recientes (últimos 10)
    recent_docs = documents.order_by('-uploaded_at')[:10]
    stats['recent_uploads'] = [
        {
            'id': str(doc.id),
            'type': doc.get_document_type_display(),
            'property': doc.property_request.property.title,
            'tenant': doc.uploaded_by.get_full_name(),
            'uploaded_at': doc.uploaded_at.isoformat(),
            'status': doc.status
        }
        for doc in recent_docs
    ]
    
    return Response(stats)