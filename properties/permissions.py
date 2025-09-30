"""
Sistema de permisos profesional para el módulo de propiedades.
Incluye permisos basados en roles para arrendadores, inquilinos y proveedores de servicios.
"""

from rest_framework import permissions
from django.core.exceptions import PermissionDenied


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Permite escritura solo al propietario del objeto.
    Todos pueden leer, solo el propietario puede escribir.
    """
    def has_object_permission(self, request, view, obj):
        # Permisos de lectura para cualquier usuario autenticado
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Permisos de escritura solo para el propietario
        return obj.landlord == request.user


class IsLandlordOrReadOnly(permissions.BasePermission):
    """
    Permite que solo los arrendadores puedan crear/editar propiedades.
    Todos los usuarios autenticados pueden leer.
    """
    def has_permission(self, request, view):
        # Requiere autenticación
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Permisos de lectura para cualquier usuario autenticado
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Solo arrendadores pueden crear/modificar propiedades
        return request.user.user_type == 'landlord'
    
    def has_object_permission(self, request, view, obj):
        # Permisos de lectura para cualquier usuario autenticado
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Solo el arrendador propietario puede modificar su propiedad
        return (
            request.user.user_type == 'landlord' and 
            obj.landlord == request.user
        )


class PropertyImagePermission(permissions.BasePermission):
    """
    Permisos para imágenes de propiedades.
    Solo el arrendador propietario puede gestionar las imágenes.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Lectura permitida para usuarios autenticados
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Solo arrendadores pueden subir imágenes
        return request.user.user_type == 'landlord'
    
    def has_object_permission(self, request, view, obj):
        # Lectura permitida para usuarios autenticados
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Solo el propietario de la propiedad puede gestionar las imágenes
        return obj.property.landlord == request.user


class PropertyVideoPermission(permissions.BasePermission):
    """
    Permisos para videos de propiedades.
    Solo el arrendador propietario puede gestionar los videos.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Lectura permitida para usuarios autenticados
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Solo arrendadores pueden subir videos
        return request.user.user_type == 'landlord'
    
    def has_object_permission(self, request, view, obj):
        # Lectura permitida para usuarios autenticados
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Solo el propietario de la propiedad puede gestionar los videos
        return obj.property.landlord == request.user


class PropertyInquiryPermission(permissions.BasePermission):
    """
    Permisos para consultas de propiedades.
    - Los inquilinos pueden crear consultas
    - Los arrendadores pueden ver consultas de sus propiedades
    - Solo el arrendador y el consultante pueden ver la consulta específica
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Todos los usuarios autenticados pueden crear consultas
        if request.method == 'POST':
            return True
        
        # Para listar, depende del tipo de usuario
        if request.method == 'GET':
            return True
        
        return False
    
    def has_object_permission(self, request, view, obj):
        # El consultante puede ver su propia consulta
        if obj.inquirer == request.user:
            return True
        
        # El arrendador puede ver consultas de sus propiedades
        if (request.user.user_type == 'landlord' and 
            obj.property.landlord == request.user):
            return True
        
        return False


class PropertyFavoritePermission(permissions.BasePermission):
    """
    Permisos para favoritos de propiedades.
    Solo el usuario puede gestionar sus propios favoritos.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Solo el usuario puede gestionar sus favoritos
        return obj.user == request.user


class IsLandlordOwnerOrAdmin(permissions.BasePermission):
    """
    Permite acceso solo al arrendador propietario o administradores.
    Usado para operaciones sensibles como eliminar propiedades.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        return (
            request.user.user_type == 'landlord' or 
            request.user.is_staff or 
            request.user.is_superuser
        )
    
    def has_object_permission(self, request, view, obj):
        # Administradores tienen acceso completo
        if request.user.is_staff or request.user.is_superuser:
            return True
        
        # Solo el arrendador propietario
        return (
            request.user.user_type == 'landlord' and 
            obj.landlord == request.user
        )


class CanViewPropertyDetails(permissions.BasePermission):
    """
    Controla quién puede ver detalles completos de propiedades.
    - Propiedades públicas: todos los usuarios autenticados
    - Propiedades privadas: solo el propietario y usuarios con permisos especiales
    """
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # El propietario siempre puede ver su propiedad
        if obj.landlord == request.user:
            return True
        
        # Propiedades activas pueden ser vistas por usuarios autenticados
        if obj.is_active and obj.status == 'available':
            return True
        
        # Administradores pueden ver todo
        if request.user.is_staff or request.user.is_superuser:
            return True
        
        return False


class TenantCanInquire(permissions.BasePermission):
    """
    Los inquilinos pueden hacer consultas sobre propiedades.
    Los arrendadores no pueden consultar sus propias propiedades.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Solo inquilinos y proveedores pueden hacer consultas
        return request.user.user_type in ['tenant', 'service_provider']


class ServiceProviderPropertyPermission(permissions.BasePermission):
    """
    Permisos especiales para proveedores de servicios.
    Pueden ver propiedades pero con limitaciones específicas.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Solo lectura para proveedores de servicios
        if request.user.user_type == 'service_provider':
            return request.method in permissions.SAFE_METHODS
        
        return True
    
    def has_object_permission(self, request, view, obj):
        # Proveedores de servicios solo pueden leer
        if request.user.user_type == 'service_provider':
            return request.method in permissions.SAFE_METHODS
        
        return True


def check_property_ownership(user, property_obj):
    """
    Función auxiliar para verificar propiedad.
    """
    if not user or not user.is_authenticated:
        raise PermissionDenied("Usuario no autenticado")
    
    if user.user_type != 'landlord':
        raise PermissionDenied("Solo arrendadores pueden poseer propiedades")
    
    if property_obj.landlord != user:
        raise PermissionDenied("No eres el propietario de esta propiedad")
    
    return True


def check_can_modify_property(user, property_obj):
    """
    Función auxiliar para verificar permisos de modificación.
    """
    # Verificar propiedad básica
    check_property_ownership(user, property_obj)
    
    # Verificaciones adicionales de estado
    if property_obj.status == 'rented':
        raise PermissionDenied("No se puede modificar una propiedad rentada")
    
    return True


class PropertyAccessMixin:
    """
    Mixin para vistas que necesitan control de acceso a propiedades.
    """
    def check_property_permissions(self, request, property_obj, action='view'):
        """
        Verifica permisos para una acción específica en una propiedad.
        """
        user = request.user
        
        if not user.is_authenticated:
            raise PermissionDenied("Usuario no autenticado")
        
        # Acciones por tipo de usuario
        if action == 'view':
            # Todos los usuarios autenticados pueden ver propiedades activas
            if property_obj.is_active and property_obj.status == 'available':
                return True
            # El propietario puede ver todas sus propiedades
            if user.user_type == 'landlord' and property_obj.landlord == user:
                return True
            # Administradores pueden ver todo
            if user.is_staff or user.is_superuser:
                return True
            
            raise PermissionDenied("No tienes permisos para ver esta propiedad")
        
        elif action in ['edit', 'delete']:
            # Solo el propietario puede modificar/eliminar
            if user.user_type == 'landlord' and property_obj.landlord == user:
                return True
            # Administradores pueden hacer todo
            if user.is_staff or user.is_superuser:
                return True
            
            raise PermissionDenied("No tienes permisos para modificar esta propiedad")
        
        elif action == 'inquire':
            # Solo inquilinos y proveedores pueden consultar
            if user.user_type in ['tenant', 'service_provider']:
                # No pueden consultar sus propias propiedades (arrendadores)
                if user != property_obj.landlord:
                    return True
            
            raise PermissionDenied("No tienes permisos para consultar esta propiedad")
        
        return False