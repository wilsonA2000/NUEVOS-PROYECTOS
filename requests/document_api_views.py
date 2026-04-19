"""
API Views para el sistema de documentos de inquilinos.
Maneja la carga, revisión y gestión de documentos para el proceso de arrendamiento.
"""

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.http import FileResponse

from .models import TenantDocument, PropertyInterestRequest, DocumentAccessLog
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

        # CONSOLIDACIÓN: Manejar tanto MatchRequest IDs como PropertyInterestRequest IDs
        process_id = request.data.get('property_request')

        if not process_id:
            return Response(
                {'error': 'property_request es requerido.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Buscar/crear el PropertyInterestRequest asociado
        try:
            property_request = self._get_or_create_property_request(process_id, request.user)
            if not property_request:
                return Response(
                    {'error': 'No se pudo encontrar o crear el proceso de documentos.'},
                    status=status.HTTP_404_NOT_FOUND
                )
        except Exception as e:
            return Response(
                {'error': f'Error al procesar la solicitud: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Crear una copia mutable de los datos
        mutable_data = request.data.copy()
        mutable_data['property_request'] = str(property_request.id)

        serializer = self.get_serializer(data=mutable_data, context={'request': request})
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
    
    def _get_or_create_property_request(self, process_id, user):
        """Obtener o crear PropertyInterestRequest desde MatchRequest ID."""
        
        # 1. Intentar MatchRequest primero (consolidación)
        try:
            from matching.models import MatchRequest
            match_request = MatchRequest.objects.get(id=process_id)
            
            # Verificar permisos: solo el tenant puede subir documentos
            if user != match_request.tenant:
                print(f"❌ CONSOLIDACIÓN: Usuario {user.id} no es el tenant {match_request.tenant.id}")
                return None
            
            # Buscar PropertyInterestRequest existente
            existing_property_request = PropertyInterestRequest.objects.filter(
                requester=match_request.tenant,
                property=match_request.property
            ).first()
            
            if existing_property_request:
                print(f"✅ CONSOLIDACIÓN: Using existing PropertyInterestRequest {existing_property_request.id}")
                return existing_property_request
            
            # Crear nuevo PropertyInterestRequest basado en MatchRequest
            new_property_request = PropertyInterestRequest.objects.create(
                requester=match_request.tenant,
                assignee=match_request.landlord,
                property=match_request.property,
                request_type='property_interest',
                title=f"Documentos para {match_request.property.title}",
                description="Proceso de documentos generado automáticamente para la solicitud de match.",
                status='in_progress',
                priority='high',
                # Copiar información relevante del MatchRequest
                monthly_income=getattr(match_request, 'monthly_income', None),
                employment_type=getattr(match_request, 'employment_type', 'employed'),
                preferred_move_in_date=getattr(match_request, 'preferred_move_in_date', None),
                lease_duration_months=getattr(match_request, 'lease_duration_months', 12),
                number_of_occupants=getattr(match_request, 'number_of_occupants', 1),
                has_pets=getattr(match_request, 'has_pets', False),
                pet_details=getattr(match_request, 'pet_details', ''),
            )
            
            print(f"🆕 CONSOLIDACIÓN: Created new PropertyInterestRequest {new_property_request.id} from MatchRequest {process_id}")
            return new_property_request
            
        except Exception as e:
            print(f"⚠️ CONSOLIDACIÓN: MatchRequest {process_id} not found, trying PropertyInterestRequest: {e}")
            pass
        
        # 2. Fallback: intentar PropertyInterestRequest directo
        try:
            property_request = get_object_or_404(PropertyInterestRequest, id=process_id)
            
            # Verificar permisos
            if user != property_request.requester:
                print(f"❌ FALLBACK: Usuario {user.id} no es el requester {property_request.requester.id}")
                return None
                
            print(f"✅ FALLBACK: Using direct PropertyInterestRequest {property_request.id}")
            return property_request
            
        except Exception as e:
            print(f"❌ ERROR: Process {process_id} not found in either MatchRequest or PropertyInterestRequest: {e}")
            return None


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

            # Verificar si todos los documentos están aprobados
            if document.match_request:
                match_request = document.match_request

                # Contar documentos
                all_docs = TenantDocument.objects.filter(match_request=match_request)
                pending = all_docs.filter(status='pending').count()
                rejected = all_docs.filter(status='rejected').count()

                # Si todos están aprobados, actualizar workflow_data
                if pending == 0 and rejected == 0 and all_docs.exists():
                    match_request.workflow_data['all_documents_approved'] = True
                    match_request.save()
                    print(f"✅ Todos los documentos aprobados para match {match_request.match_code}")
                else:
                    match_request.workflow_data['all_documents_approved'] = False
                    match_request.save()

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
        
        # CONSOLIDACIÓN: Intentar encontrar el proceso en MatchRequest primero, luego PropertyInterestRequest
        property_request = None
        
        # 1. Intentar MatchRequest primero (fuente de verdad actual)
        try:
            from matching.models import MatchRequest
            match_request = MatchRequest.objects.get(id=process_id)
            
            # Crear un objeto compatible para mantener compatibilidad con el código existente
            class MatchRequestWrapper:
                def __init__(self, match_request):
                    self.id = match_request.id
                    self.requester = match_request.tenant  # tenant en MatchRequest = requester en PropertyInterestRequest
                    self.assignee = match_request.landlord  # landlord en MatchRequest = assignee en PropertyInterestRequest
                    self.property = match_request.property
                    self._match_request = match_request
                    
            property_request = MatchRequestWrapper(match_request)
            print(f"🔄 CONSOLIDACIÓN: Using MatchRequest {process_id} for documents")
            
        except Exception:
            # 2. Fallback a PropertyInterestRequest si MatchRequest no existe
            try:
                property_request = get_object_or_404(PropertyInterestRequest, id=process_id)
                print(f"🔄 FALLBACK: Using PropertyInterestRequest {process_id} for documents")
            except Exception:
                return Response(
                    {'error': 'Proceso no encontrado.'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Debug logging para permisos
        print("🔍 CHECKLIST DEBUG:")
        print(f"  - Process ID: {process_id}")
        print(f"  - Request User: {request.user.email} (ID: {request.user.id})")
        print(f"  - Requester: {property_request.requester.email if property_request.requester else 'None'} (ID: {property_request.requester.id if property_request.requester else 'None'})")
        print(f"  - Assignee: {property_request.assignee.email if property_request.assignee else 'None'} (ID: {property_request.assignee.id if property_request.assignee else 'None'})")
        
        # Verificar permisos con mensajes específicos
        allowed_users = [property_request.requester, property_request.assignee]
        user_is_requester = request.user == property_request.requester
        user_is_assignee = request.user == property_request.assignee
        
        print(f"  - User is requester (tenant): {user_is_requester}")
        print(f"  - User is assignee (landlord): {user_is_assignee}")
        
        if request.user not in allowed_users:
            print(f"❌ CHECKLIST: Permission denied - User {request.user.email} not in allowed list")
            error_details = {
                'error': 'No tienes permisos para ver este proceso.',
                'debug_info': {
                    'authenticated_user': request.user.email,
                    'process_id': str(process_id),
                    'requester_email': property_request.requester.email if property_request.requester else None,
                    'assignee_email': property_request.assignee.email if property_request.assignee else None,
                }
            }
            return Response(error_details, status=status.HTTP_403_FORBIDDEN)
            
        print(f"✅ CHECKLIST: Permission granted for user {request.user.email}")
        
        # Obtener todos los documentos subidos para este proceso
        # CONSOLIDACIÓN: Buscar documentos según el tipo de request
        if hasattr(property_request, '_match_request'):
            # Si es MatchRequest, buscar PropertyInterestRequest asociado para documentos
            try:
                related_property_request = PropertyInterestRequest.objects.filter(
                    requester=property_request.requester,
                    property=property_request.property
                ).first()
                
                if related_property_request:
                    uploaded_documents = TenantDocument.objects.filter(
                        property_request=related_property_request
                    ).select_related('uploaded_by', 'reviewed_by')
                    print(f"🔄 CONSOLIDACIÓN: Found {uploaded_documents.count()} documents via PropertyInterestRequest")
                else:
                    uploaded_documents = TenantDocument.objects.none()
                    print(f"🔄 CONSOLIDACIÓN: No PropertyInterestRequest found for MatchRequest {process_id}")
            except Exception as e:
                uploaded_documents = TenantDocument.objects.none()
                print(f"❌ Error finding documents: {e}")
        else:
            # Si es PropertyInterestRequest directo
            uploaded_documents = TenantDocument.objects.filter(
                property_request=property_request
            ).select_related('uploaded_by', 'reviewed_by')
        
        # Crear mapa de documentos por tipo
        # ✅ FIX: Para documentos "otros_*", mantener lista en lugar de sobreescribir
        documents_map = {}
        otros_documents_list = []

        for doc in uploaded_documents:
            if doc.document_type.startswith('otros'):
                # Documentos personalizables van en una lista separada
                otros_documents_list.append(doc)
            else:
                # Otros documentos siguen usando el mapa normal
                documents_map[doc.document_type] = doc

        # Definir checklist completo con documentos requeridos
        checklist_data = self._build_checklist(documents_map, property_request, otros_documents_list)
        
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
    
    def _build_checklist(self, documents_map, property_request, otros_documents_list=None):
        """Construir checklist organizado por categorías."""

        if otros_documents_list is None:
            otros_documents_list = []

        # Documentos del TOMADOR
        tomador_types = [
            ('tomador_cedula_ciudadania', 'Cédula de Ciudadanía', True),
            ('tomador_pasaporte', 'Pasaporte', False),
            ('tomador_cedula_extranjeria', 'Cédula de Extranjería', False),
            ('tomador_certificado_laboral', 'Certificado Laboral', True),
            ('tomador_carta_recomendacion', 'Carta de Recomendación', True),
        ]

        # Documentos del CODEUDOR
        codeudor_types = [
            ('codeudor_cedula_ciudadania', 'Codeudor: Cédula de Ciudadanía', True),
            ('codeudor_pasaporte', 'Codeudor: Pasaporte', False),
            ('codeudor_cedula_extranjeria', 'Codeudor: Cédula de Extranjería', False),
            ('codeudor_certificado_laboral', 'Codeudor: Certificado Laboral', False),
            ('codeudor_libertad_tradicion', 'Codeudor: Certificado de Libertad y Tradición', False),
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

        # ✅ FIX: Construir lista dinámica de documentos "otros_*"
        def build_otros_documents(otros_docs):
            """Construir lista de documentos personalizables desde la lista de documentos."""
            documents = []
            for doc in otros_docs:
                # Extraer nombre del documento de other_description
                display_name = 'Otros Documentos (Personalizable)'
                if doc.other_description:
                    # Si hay descripción, usarla como display_name
                    parts = doc.other_description.split(':', 1)
                    if len(parts) >= 1:
                        display_name = parts[0].strip()

                doc_info = {
                    'id': str(doc.id),
                    'type': doc.document_type,
                    'display_name': display_name,
                    'required': False,  # Documentos personalizables siempre son opcionales
                    'uploaded': True,  # Si está en la lista, está subido
                    'status': doc.status,
                    'status_display': doc.get_status_display(),
                    'status_color': doc.get_status_color(),
                    'uploaded_at': doc.uploaded_at.isoformat(),
                    'reviewed_at': doc.reviewed_at.isoformat() if doc.reviewed_at else None,
                    'file_url': doc.get_file_url(),
                    'review_notes': doc.review_notes,
                    'other_description': doc.other_description,
                    'file_size': doc.document_file.size if doc.document_file else None,
                    'original_filename': doc.document_file.name.split('/')[-1] if doc.document_file else None,
                    'category': 'OTROS',
                }
                documents.append(doc_info)

            print(f"✅ Built {len(documents)} 'otros' documents dynamically")
            return documents

        return {
            'tomador_documents': build_category_documents(tomador_types, 'TOMADOR'),
            'codeudor_documents': build_category_documents(codeudor_types, 'CODEUDOR'),
            'otros_documents': build_otros_documents(otros_documents_list),  # ✅ Lista dinámica
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


class SecureDocumentDownloadView(APIView):
    """
    🔒 DESCARGA SEGURA DE DOCUMENTOS (Plan Maestro V2.0)

    Endpoint para descarga segura de documentos con:
    - Verificación de permisos (arrendatario propietario, arrendador de la propiedad, o admin)
    - Registro de acceso en auditoría
    - Servicio seguro de archivos

    GET /api/v1/documents/{id}/secure-download/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, document_id):
        """Descarga segura de documento con auditoría."""
        try:
            document = get_object_or_404(TenantDocument, id=document_id)
        except Exception:
            return Response(
                {'error': 'Documento no encontrado.', 'code': 'DOCUMENT_NOT_FOUND'},
                status=status.HTTP_404_NOT_FOUND
            )

        # 🔒 Verificar permisos
        if not self._can_access(request.user, document):
            # Log intento de acceso no autorizado
            print(f"⚠️ SECURE_DOWNLOAD: Acceso denegado - Usuario {request.user.email} intentó acceder a documento {document_id}")
            return Response(
                {
                    'error': 'No tienes permisos para acceder a este documento.',
                    'code': 'ACCESS_DENIED'
                },
                status=status.HTTP_403_FORBIDDEN
            )

        # 📋 Registrar acceso en auditoría
        try:
            DocumentAccessLog.log_access(
                document=document,
                user=request.user,
                action='download',
                request=request
            )
            print(f"📋 SECURE_DOWNLOAD: Acceso registrado - {request.user.email} descargó {document.document_type}")
        except Exception as log_error:
            # No fallar la descarga si hay error en el log
            print(f"⚠️ SECURE_DOWNLOAD: Error al registrar acceso: {log_error}")

        # 📂 Verificar que el archivo existe
        if not document.document_file:
            return Response(
                {'error': 'El archivo del documento no existe.', 'code': 'FILE_NOT_FOUND'},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            # Abrir el archivo
            file_handle = document.document_file.open('rb')

            # Determinar el nombre del archivo para descarga
            filename = document.original_filename or f"{document.document_type}_{document.id}.pdf"

            # Crear respuesta con FileResponse
            response = FileResponse(
                file_handle,
                as_attachment=True,
                filename=filename
            )

            # Headers adicionales de seguridad
            response['Content-Type'] = 'application/pdf'
            response['X-Content-Type-Options'] = 'nosniff'
            response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response['Pragma'] = 'no-cache'
            response['Expires'] = '0'

            # Header personalizado para auditoría
            response['X-VeriHome-Access-Logged'] = 'true'
            response['X-VeriHome-Document-Locked'] = str(document.is_locked).lower()

            return response

        except FileNotFoundError:
            return Response(
                {'error': 'El archivo no se encuentra en el servidor.', 'code': 'FILE_NOT_FOUND'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            print(f"❌ SECURE_DOWNLOAD: Error al servir archivo: {e}")
            return Response(
                {'error': f'Error al descargar el archivo: {str(e)}', 'code': 'DOWNLOAD_ERROR'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _can_access(self, user, document):
        """
        Verifica si el usuario puede acceder al documento.

        Permisos:
        1. El arrendatario que subió el documento
        2. El arrendador de la propiedad relacionada
        3. Administradores (is_staff o is_superuser)
        """
        # 1. Admin/Staff siempre puede acceder
        if user.is_staff or user.is_superuser:
            return True

        # 2. El arrendatario que subió el documento
        if document.uploaded_by == user:
            return True

        # 3. El arrendador de la propiedad relacionada
        if document.match_request:
            # Verificar a través del match_request
            match_request = document.match_request
            if match_request.landlord == user:
                return True
            if match_request.property and match_request.property.landlord == user:
                return True

        # 4. Legacy: Verificar a través de property_request
        if document.property_request:
            if document.property_request.assignee == user:
                return True

        return False


class SecureDocumentPreviewView(APIView):
    """
    👁️ VISTA PREVIA SEGURA DE DOCUMENTOS (Plan Maestro V2.0)

    Similar a SecureDocumentDownloadView pero para vista previa en navegador.
    No fuerza descarga, muestra inline.

    GET /api/v1/documents/{id}/secure-preview/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, document_id):
        """Vista previa segura de documento con auditoría."""
        try:
            document = get_object_or_404(TenantDocument, id=document_id)
        except Exception:
            return Response(
                {'error': 'Documento no encontrado.', 'code': 'DOCUMENT_NOT_FOUND'},
                status=status.HTTP_404_NOT_FOUND
            )

        # 🔒 Verificar permisos (misma lógica que download)
        if not self._can_access(request.user, document):
            return Response(
                {'error': 'No tienes permisos para ver este documento.', 'code': 'ACCESS_DENIED'},
                status=status.HTTP_403_FORBIDDEN
            )

        # 📋 Registrar acceso en auditoría
        try:
            DocumentAccessLog.log_access(
                document=document,
                user=request.user,
                action='preview',
                request=request
            )
        except Exception as log_error:
            print(f"⚠️ SECURE_PREVIEW: Error al registrar acceso: {log_error}")

        # 📂 Verificar que el archivo existe
        if not document.document_file:
            return Response(
                {'error': 'El archivo del documento no existe.', 'code': 'FILE_NOT_FOUND'},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            file_handle = document.document_file.open('rb')

            # Vista previa inline (no descarga)
            response = FileResponse(
                file_handle,
                as_attachment=False,  # Mostrar inline
                filename=document.original_filename or f"{document.document_type}.pdf"
            )

            response['Content-Type'] = 'application/pdf'
            response['Content-Disposition'] = f'inline; filename="{document.original_filename or "documento.pdf"}"'
            response['X-Content-Type-Options'] = 'nosniff'
            response['X-VeriHome-Access-Logged'] = 'true'

            return response

        except FileNotFoundError:
            return Response(
                {'error': 'El archivo no se encuentra en el servidor.', 'code': 'FILE_NOT_FOUND'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Error al mostrar el archivo: {str(e)}', 'code': 'PREVIEW_ERROR'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _can_access(self, user, document):
        """Misma lógica que SecureDocumentDownloadView."""
        if user.is_staff or user.is_superuser:
            return True
        if document.uploaded_by == user:
            return True
        if document.match_request:
            match_request = document.match_request
            if match_request.landlord == user:
                return True
            if match_request.property and match_request.property.landlord == user:
                return True
        if document.property_request:
            if document.property_request.assignee == user:
                return True
        return False


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def document_access_history(request, document_id):
    """
    📜 HISTORIAL DE ACCESOS A UN DOCUMENTO (Plan Maestro V2.0)

    Solo visible para admin/staff y el arrendador de la propiedad.
    Muestra quién, cuándo y cómo accedió al documento.

    GET /api/v1/documents/{id}/access-history/
    """
    try:
        document = get_object_or_404(TenantDocument, id=document_id)
    except Exception:
        return Response(
            {'error': 'Documento no encontrado.'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Solo admin o arrendador pueden ver el historial
    can_view_history = (
        request.user.is_staff or
        request.user.is_superuser or
        (document.match_request and document.match_request.landlord == request.user) or
        (document.property_request and document.property_request.assignee == request.user)
    )

    if not can_view_history:
        return Response(
            {'error': 'No tienes permisos para ver el historial de accesos.'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Obtener historial de accesos
    access_logs = DocumentAccessLog.objects.filter(
        document=document
    ).select_related('user').order_by('-timestamp')[:100]  # Últimos 100 accesos

    history = [
        {
            'id': str(log.id),
            'user_email': log.user.email,
            'user_name': log.user.get_full_name(),
            'action': log.action,
            'action_display': log.get_action_display(),
            'ip_address': log.ip_address,
            'timestamp': log.timestamp.isoformat(),
            'user_agent_short': (log.user_agent[:100] + '...') if len(log.user_agent) > 100 else log.user_agent,
        }
        for log in access_logs
    ]

    return Response({
        'document_id': str(document.id),
        'document_type': document.document_type,
        'is_locked': document.is_locked,
        'total_accesses': access_logs.count(),
        'access_history': history
    })