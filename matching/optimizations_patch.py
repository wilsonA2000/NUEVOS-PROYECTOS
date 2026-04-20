"""
Performance optimizations patch for matching/api_views.py
Adds select_related and prefetch_related to eliminate N+1 queries

INSTRUCCIONES DE APLICACIÓN:
1. Reemplazar los métodos get_queryset() en MatchRequestViewSet con estas versiones optimizadas
2. Aplicar los cambios marcados con # OPTIMIZACIÓN
"""

# ==========================================
# OPTIMIZACIÓN 1: MatchRequestViewSet.get_queryset()
# ==========================================
# ANTES (N+1 queries):
"""
def get_queryset(self):
    user = self.request.user

    if user.user_type == 'tenant':
        return MatchRequest.objects.filter(tenant=user)
    elif user.user_type == 'landlord':
        return MatchRequest.objects.filter(landlord=user)
    else:
        return MatchRequest.objects.none()
"""

# DESPUÉS (optimizado - ~3 queries en lugar de ~50):
"""
def get_queryset(self):
    user = self.request.user

    # OPTIMIZACIÓN: select_related para relaciones ForeignKey
    # prefetch_related para relaciones ManyToMany si existen
    base_queryset = MatchRequest.objects.select_related(
        'tenant',           # Usuario arrendatario
        'property',         # Propiedad relacionada
        'landlord',         # Usuario arrendador
        'property__landlord'  # Arrendador de la propiedad (evita query adicional)
    )

    if user.user_type == 'tenant':
        # Arrendatarios ven sus solicitudes enviadas
        return base_queryset.filter(tenant=user)
    elif user.user_type == 'landlord':
        # Arrendadores ven solicitudes recibidas
        return base_queryset.filter(landlord=user)
    else:
        return MatchRequest.objects.none()
"""

# ==========================================
# OPTIMIZACIÓN 2: MatchCriteriaViewSet.get_queryset()
# ==========================================
# ANTES:
"""
def get_queryset(self):
    return MatchCriteria.objects.filter(tenant=self.request.user)
"""

# DESPUÉS (optimizado):
"""
def get_queryset(self):
    # OPTIMIZACIÓN: select_related para tenant
    return MatchCriteria.objects.select_related('tenant').filter(
        tenant=self.request.user
    )
"""

# ==========================================
# OPTIMIZACIÓN 3: MatchNotificationViewSet.get_queryset()
# ==========================================
# ANTES:
"""
def get_queryset(self):
    return MatchNotification.objects.filter(user=self.request.user)
"""

# DESPUÉS (optimizado):
"""
def get_queryset(self):
    # OPTIMIZACIÓN: select_related para user y match_request con sus relaciones
    return MatchNotification.objects.select_related(
        'user',
        'match_request',
        'match_request__tenant',
        'match_request__property',
        'match_request__landlord'
    ).filter(user=self.request.user)
"""

# ==========================================
# MÉTRICAS ESPERADAS
# ==========================================
"""
ANTES de la optimización:
- MatchRequest list (20 items): ~50 queries
  * 1 query inicial
  * 20 queries para tenant
  * 20 queries para property
  * 20 queries para landlord
  * Queries adicionales para property details

DESPUÉS de la optimización:
- MatchRequest list (20 items): ~3 queries
  * 1 query inicial con JOINs
  * 1-2 queries adicionales de paginación/conteo

MEJORA: ~94% reducción de queries (50 → 3)
IMPACTO: Response time ~500ms → ~50ms (~90% más rápido)
"""

print("✅ Optimizaciones de matching preparadas")
print("📊 Impacto esperado: 94% menos queries, 90% más rápido")
print("📝 Aplicar cambios manualmente en matching/api_views.py")
