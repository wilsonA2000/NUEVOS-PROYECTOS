"""
Sistema de permisos personalizado para VeriHome.
Maneja los permisos basados en roles de usuario.
"""

from rest_framework import permissions
from django.contrib.auth import get_user_model

User = get_user_model()


class IsLandlord(permissions.BasePermission):
    """
    Permite acceso solo a usuarios arrendadores.
    """
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            hasattr(request.user, 'user_type') and 
            request.user.user_type == 'landlord'
        )


class IsTenant(permissions.BasePermission):
    """
    Permite acceso solo a usuarios arrendatarios.
    """
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            hasattr(request.user, 'user_type') and 
            request.user.user_type == 'tenant'
        )


class IsServiceProvider(permissions.BasePermission):
    """
    Permite acceso solo a prestadores de servicios.
    """
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            hasattr(request.user, 'user_type') and 
            request.user.user_type == 'service_provider'
        )


class IsLandlordOrReadOnly(permissions.BasePermission):
    """
    Permite acceso completo a arrendadores, solo lectura a otros usuarios.
    """
    
    def has_permission(self, request, view):
        # Permitir acceso de lectura a todos los usuarios autenticados
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        
        # Permitir acceso completo solo a arrendadores
        return (
            request.user.is_authenticated and 
            hasattr(request.user, 'user_type') and 
            request.user.user_type == 'landlord'
        )


class IsPropertyOwner(permissions.BasePermission):
    """
    Permite acceso solo al propietario de la propiedad.
    """
    
    def has_object_permission(self, request, view, obj):
        # Superusuarios pueden acceder a todo
        if request.user.is_superuser:
            return True
        
        # Verificar si el usuario es el propietario de la propiedad
        return obj.landlord == request.user


class IsPropertyOwnerOrReadOnly(permissions.BasePermission):
    """
    Permite acceso completo al propietario de la propiedad, solo lectura a otros usuarios.
    """
    
    def has_object_permission(self, request, view, obj):
        # Permitir acceso de lectura a todos los usuarios autenticados
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        
        # Superusuarios pueden acceder a todo
        if request.user.is_superuser:
            return True
        
        # Permitir acceso completo solo al propietario de la propiedad
        return obj.landlord == request.user


class CanViewProperty(permissions.BasePermission):
    """
    Permite ver propiedades según el rol del usuario.
    """
    
    def has_permission(self, request, view):
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Superusuarios pueden ver todo
        if request.user.is_superuser:
            return True
        
        # Arrendadores pueden ver sus propias propiedades
        if (hasattr(request.user, 'user_type') and 
            request.user.user_type == 'landlord' and 
            obj.landlord == request.user):
            return True
        
        # Arrendatarios y prestadores de servicios pueden ver propiedades activas y disponibles
        if (hasattr(request.user, 'user_type') and 
            request.user.user_type in ['tenant', 'service_provider'] and 
            obj.is_active and 
            obj.status == 'available'):
            return True
        
        return False


class CanCreateProperty(permissions.BasePermission):
    """
    Permite crear propiedades solo a arrendadores.
    """
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            hasattr(request.user, 'user_type') and 
            request.user.user_type == 'landlord'
        )


class CanEditProperty(permissions.BasePermission):
    """
    Permite editar propiedades solo al propietario.
    """
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            hasattr(request.user, 'user_type') and 
            request.user.user_type == 'landlord'
        )
    
    def has_object_permission(self, request, view, obj):
        return obj.landlord == request.user


class CanDeleteProperty(permissions.BasePermission):
    """
    Permite eliminar propiedades solo al propietario.
    """
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            hasattr(request.user, 'user_type') and 
            request.user.user_type == 'landlord'
        )
    
    def has_object_permission(self, request, view, obj):
        return obj.landlord == request.user


class CanContactLandlord(permissions.BasePermission):
    """
    Permite contactar al arrendador solo a arrendatarios y prestadores de servicios.
    """
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            hasattr(request.user, 'user_type') and 
            request.user.user_type in ['tenant', 'service_provider']
        )


class CanViewMessages(permissions.BasePermission):
    """
    Permite ver mensajes solo a usuarios que han tenido interacción aprobada.
    """
    
    def has_permission(self, request, view):
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Verificar si el usuario es parte de la conversación
        return (
            obj.sender == request.user or 
            obj.recipient == request.user or
            request.user.is_superuser
        )


class CanSendMessages(permissions.BasePermission):
    """
    Permite enviar mensajes solo a usuarios que han tenido interacción aprobada.
    """
    
    def has_permission(self, request, view):
        return request.user.is_authenticated


class IsContractParty(permissions.BasePermission):
    """
    Permite acceso solo a las partes del contrato.
    """
    
    def has_object_permission(self, request, view, obj):
        return (
            obj.landlord == request.user or 
            obj.tenant == request.user or
            request.user.is_superuser
        )


class IsPaymentParty(permissions.BasePermission):
    """
    Permite acceso solo a las partes del pago.
    """
    
    def has_object_permission(self, request, view, obj):
        return (
            obj.contract.landlord == request.user or 
            obj.contract.tenant == request.user or
            request.user.is_superuser
        )


class RoleBasedPermissionMixin:
    """
    Mixin para aplicar permisos basados en roles.
    """
    
    def get_permissions(self):
        """
        Retorna los permisos apropiados según la acción.
        """
        if self.action == 'create':
            permission_classes = [CanCreateProperty]
        elif self.action in ['update', 'partial_update']:
            permission_classes = [CanEditProperty]
        elif self.action == 'destroy':
            permission_classes = [CanDeleteProperty]
        elif self.action == 'retrieve':
            permission_classes = [CanViewProperty]
        else:
            permission_classes = [permissions.IsAuthenticated]
        
        return [permission() for permission in permission_classes]


class PropertyAccessMixin:
    """
    Mixin para controlar el acceso a propiedades según el rol.
    """
    
    def get_queryset(self):
        """
        Filtra el queryset según el rol del usuario.
        """
        queryset = super().get_queryset()
        
        # Superusuarios ven todo
        if self.request.user.is_superuser:
            return queryset
        
        # Arrendadores ven solo sus propiedades
        if (hasattr(self.request.user, 'user_type') and 
            self.request.user.user_type == 'landlord'):
            return queryset.filter(landlord=self.request.user)
        
        # Arrendatarios y prestadores de servicios ven solo propiedades activas y disponibles
        if (hasattr(self.request.user, 'user_type') and 
            self.request.user.user_type in ['tenant', 'service_provider']):
            return queryset.filter(is_active=True, status='available')
        
        return queryset.none()


def get_user_role_permissions(user):
    """
    Retorna los permisos específicos del rol del usuario.
    """
    if not user.is_authenticated:
        return []
    
    if not hasattr(user, 'user_type'):
        return []
    
    permissions = []
    
    if user.user_type == 'landlord':
        permissions.extend([
            'can_create_property',
            'can_edit_own_property',
            'can_delete_own_property',
            'can_view_own_properties',
            'can_manage_contracts',
            'can_manage_payments',
            'can_receive_inquiries',
            'can_respond_to_inquiries',
            'can_view_tenant_profiles',
        ])
    elif user.user_type == 'tenant':
        permissions.extend([
            'can_view_available_properties',
            'can_search_properties',
            'can_contact_landlord',
            'can_send_inquiry',
            'can_view_own_contracts',
            'can_view_own_payments',
            'can_rate_property',
            'can_rate_landlord',
        ])
    elif user.user_type == 'service_provider':
        permissions.extend([
            'can_view_available_properties',
            'can_contact_landlord',
            'can_send_inquiry',
            'can_offer_services',
            'can_view_service_requests',
            'can_manage_portfolio',
        ])
    
    return permissions


def has_role_permission(user, permission):
    """
    Verifica si un usuario tiene un permiso específico de su rol.
    """
    user_permissions = get_user_role_permissions(user)
    return permission in user_permissions 