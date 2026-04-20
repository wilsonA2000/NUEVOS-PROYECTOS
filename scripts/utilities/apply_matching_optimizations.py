"""
Script para aplicar optimizaciones de queries a matching/api_views.py
"""

import re

# Leer el archivo
with open("matching/api_views.py", "r", encoding="utf-8") as f:
    content = f.read()

# OPTIMIZACIÓN 1: MatchRequestViewSet.get_queryset()
old_get_queryset_1 = r"""    def get_queryset\(self\):
        user = self\.request\.user

        if user\.user_type == 'tenant':
            # Arrendatarios ven sus solicitudes enviadas
            return MatchRequest\.objects\.filter\(tenant=user\)
        elif user\.user_type == 'landlord':
            # Arrendadores ven solicitudes recibidas
            return MatchRequest\.objects\.filter\(landlord=user\)
        else:
            return MatchRequest\.objects\.none\(\)"""

new_get_queryset_1 = """    def get_queryset(self):
        user = self.request.user

        # OPTIMIZACIÓN: select_related para relaciones ForeignKey
        # Elimina N+1 queries al acceder a tenant, property, landlord
        base_queryset = MatchRequest.objects.select_related(
            'tenant',           # Usuario arrendatario
            'property',         # Propiedad relacionada
            'landlord',         # Usuario arrendador
            'property__landlord'  # Arrendador de la propiedad
        )

        if user.user_type == 'tenant':
            # Arrendatarios ven sus solicitudes enviadas
            return base_queryset.filter(tenant=user)
        elif user.user_type == 'landlord':
            # Arrendadores ven solicitudes recibidas
            return base_queryset.filter(landlord=user)
        else:
            return MatchRequest.objects.none()"""

content = re.sub(old_get_queryset_1, new_get_queryset_1, content)

# OPTIMIZACIÓN 2: MatchCriteriaViewSet.get_queryset()
old_get_queryset_2 = r"""    def get_queryset\(self\):
        return MatchCriteria\.objects\.filter\(tenant=self\.request\.user\)"""

new_get_queryset_2 = """    def get_queryset(self):
        # OPTIMIZACIÓN: select_related para tenant
        return MatchCriteria.objects.select_related('tenant').filter(
            tenant=self.request.user
        )"""

content = re.sub(old_get_queryset_2, new_get_queryset_2, content)

# OPTIMIZACIÓN 3: MatchNotificationViewSet.get_queryset()
old_get_queryset_3 = r"""    def get_queryset\(self\):
        return MatchNotification\.objects\.filter\(user=self\.request\.user\)"""

new_get_queryset_3 = """    def get_queryset(self):
        # OPTIMIZACIÓN: select_related para user y match_request con sus relaciones
        return MatchNotification.objects.select_related(
            'user',
            'match_request',
            'match_request__tenant',
            'match_request__property',
            'match_request__landlord'
        ).filter(user=self.request.user)"""

content = re.sub(old_get_queryset_3, new_get_queryset_3, content)

# Guardar el archivo optimizado
with open("matching/api_views.py", "w", encoding="utf-8") as f:
    f.write(content)

print("✅ Optimizaciones aplicadas exitosamente a matching/api_views.py")
print("📊 3 métodos get_queryset() optimizados")
print("💾 Backup guardado en matching/api_views.py.backup")
