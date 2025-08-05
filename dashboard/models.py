"""
Modelos para el dashboard (si se necesitan en el futuro).
Por ahora el dashboard usa modelos de otras apps.
"""

from django.db import models

# Los modelos del dashboard se basan en los modelos existentes:
# - properties.Property
# - contracts.Contract  
# - payments.Payment
# - ratings.Rating
# - users.User

# Si en el futuro se necesitan modelos específicos para el dashboard
# (como configuraciones de widgets, layouts personalizados, etc.)
# se pueden agregar aquí.