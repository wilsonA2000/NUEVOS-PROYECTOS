"""
Modelos para la gestión de propiedades en VeriHome.
Incluye propiedades, imágenes, amenidades y características.
"""

from django.db import models, transaction
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from PIL import Image
import uuid

User = get_user_model()


class Property(models.Model):
    """Modelo principal para propiedades inmobiliarias."""
    
    PROPERTY_TYPES = [
        ('apartment', 'Apartamento'),
        ('house', 'Casa'),
        ('studio', 'Estudio'),
        ('penthouse', 'Penthouse'),
        ('townhouse', 'Casa en Condominio'),
        ('commercial', 'Comercial'),
        ('office', 'Oficina'),
        ('warehouse', 'Bodega'),
        ('land', 'Terreno'),
        ('room', 'Habitación'),
    ]
    
    PROPERTY_STATUS = [
        ('available', 'Disponible'),
        ('rented', 'Rentada'),
        ('maintenance', 'En Mantenimiento'),
        ('pending', 'Pendiente'),
        ('inactive', 'Inactiva'),
    ]
    
    LISTING_TYPE = [
        ('rent', 'Renta'),
        ('sale', 'Venta'),
        ('both', 'Ambos'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    landlord = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='properties',
        limit_choices_to={'user_type': 'landlord'}
    )
    
    # Información básica
    title = models.CharField('Título', max_length=200)
    description = models.TextField('Descripción', max_length=2000)
    property_type = models.CharField('Tipo de propiedad', max_length=20, choices=PROPERTY_TYPES)
    listing_type = models.CharField('Tipo de listado', max_length=10, choices=LISTING_TYPE, default='rent')
    status = models.CharField('Estado', max_length=20, choices=PROPERTY_STATUS, default='available')
    
    # Ubicación
    address = models.CharField('Dirección', max_length=255)
    city = models.CharField('Ciudad', max_length=100)
    state = models.CharField('Estado/Provincia', max_length=100)
    country = models.CharField('País', max_length=100, default='México')
    postal_code = models.CharField('Código postal', max_length=10, null=True, blank=True)
    latitude = models.DecimalField('Latitud', max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField('Longitud', max_digits=9, decimal_places=6, null=True, blank=True)
    
    # Características físicas
    bedrooms = models.PositiveIntegerField('Habitaciones', default=0)
    bathrooms = models.DecimalField('Baños', max_digits=3, decimal_places=1, default=0)
    half_bathrooms = models.PositiveIntegerField('Medios baños', default=0)
    total_area = models.DecimalField('Área total (m²)', max_digits=8, decimal_places=2)
    built_area = models.DecimalField('Área construida (m²)', max_digits=8, decimal_places=2, null=True, blank=True)
    lot_area = models.DecimalField('Área del terreno (m²)', max_digits=8, decimal_places=2, null=True, blank=True)
    parking_spaces = models.PositiveIntegerField('Espacios de estacionamiento', default=0)
    floors = models.PositiveIntegerField('Pisos', default=1)
    floor_number = models.PositiveIntegerField('Número de piso', null=True, blank=True)
    year_built = models.PositiveIntegerField('Año de construcción', null=True, blank=True)
    
    # Precios
    rent_price = models.DecimalField('Precio de renta mensual', max_digits=12, decimal_places=2, null=True, blank=True)
    sale_price = models.DecimalField('Precio de venta', max_digits=15, decimal_places=2, null=True, blank=True)
    security_deposit = models.DecimalField('Depósito de garantía', max_digits=12, decimal_places=2, null=True, blank=True)
    maintenance_fee = models.DecimalField('Cuota de mantenimiento', max_digits=8, decimal_places=2, null=True, blank=True)
    
    # Condiciones de renta
    minimum_lease_term = models.PositiveIntegerField('Plazo mínimo de renta (meses)', default=12)
    maximum_lease_term = models.PositiveIntegerField('Plazo máximo de renta (meses)', null=True, blank=True)
    pets_allowed = models.BooleanField('Mascotas permitidas', default=False)
    smoking_allowed = models.BooleanField('Fumar permitido', default=False)
    furnished = models.BooleanField('Amueblada', default=False)
    utilities_included = models.JSONField('Servicios incluidos', default=list)
    
    # Información adicional
    property_features = models.JSONField('Características de la propiedad', default=list)
    nearby_amenities = models.JSONField('Amenidades cercanas', default=list)
    transportation = models.JSONField('Transporte cercano', default=list)
    
    # Disponibilidad
    available_from = models.DateField('Disponible desde', null=True, blank=True)
    last_updated = models.DateTimeField('Última actualización', auto_now=True)
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    
    # Métricas
    views_count = models.PositiveIntegerField('Número de visualizaciones', default=0)
    favorites_count = models.PositiveIntegerField('Número de favoritos', default=0)
    
    # Configuración de visibilidad
    is_featured = models.BooleanField('Propiedad destacada', default=False)
    is_active = models.BooleanField('Activa', default=True)
    
    class Meta:
        verbose_name = 'Propiedad'
        verbose_name_plural = 'Propiedades'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.title} - {self.city}, {self.state}"
    
    def get_main_image(self):
        """FIXED: Get main image URL with atomic operations and error handling."""
        try:
            # Try to get existing main image
            main_image = self.images.filter(is_main=True).first()
            
            # If no main image exists, atomically set the first image as main
            if not main_image:
                with transaction.atomic():
                    # Clear any existing main flags and set first image as main
                    first_image = self.images.first()
                    if first_image:
                        # Use update to avoid race conditions
                        self.images.update(is_main=False)
                        PropertyImage.objects.filter(id=first_image.id).update(is_main=True)
                        # Refresh the object to get updated state
                        first_image.refresh_from_db()
                        main_image = first_image
                        print(f"🔧 AUTO-REPAIR: Set image {first_image.id} as main for property {self.id}")
            
            if main_image and hasattr(main_image, 'image') and main_image.image:
                url = main_image.image.url
                print(f"🖼️ Main image URL resolved: {url} for property {self.id}")
                return url
                
        except Exception as e:
            print(f"❌ ERROR in get_main_image for property {self.id}: {e}")
        
        print(f"⚠️ No main image available for property {self.id}")
        return None
    
    def get_formatted_price(self):
        """Devuelve el precio formateado según el tipo de listado."""
        if self.listing_type == 'rent' and self.rent_price:
            return f"${self.rent_price:,.2f}/mes"
        elif self.listing_type == 'sale' and self.sale_price:
            return f"${self.sale_price:,.2f}"
        elif self.listing_type == 'both':
            prices = []
            if self.rent_price:
                prices.append(f"Renta: ${self.rent_price:,.2f}/mes")
            if self.sale_price:
                prices.append(f"Venta: ${self.sale_price:,.2f}")
            return " | ".join(prices)
        return "Precio no disponible"


class PropertyImage(models.Model):
    """Imágenes de las propiedades."""
    
    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name='images'
    )
    image = models.ImageField('Imagen', upload_to='properties/images/')
    caption = models.CharField('Descripción', max_length=200, blank=True)
    is_main = models.BooleanField('Imagen principal', default=False)
    order = models.PositiveIntegerField('Orden', default=0)
    created_at = models.DateTimeField('Fecha de subida', auto_now_add=True)
    
    class Meta:
        verbose_name = 'Imagen de Propiedad'
        verbose_name_plural = 'Imágenes de Propiedades'
        ordering = ['order', 'created_at']
        
    def __str__(self):
        return f"Imagen de {self.property.title}"
    
    def save(self, *args, **kwargs):
        # Si esta imagen se marca como principal, desmarcar las demás
        if self.is_main:
            PropertyImage.objects.filter(
                property=self.property,
                is_main=True
            ).exclude(pk=self.pk).update(is_main=False)
        
        super().save(*args, **kwargs)
        
        # Redimensionar imagen si es muy grande
        if self.image:
            img = Image.open(self.image.path)
            if img.height > 1080 or img.width > 1920:
                output_size = (1920, 1080)
                img.thumbnail(output_size, Image.Resampling.LANCZOS)
                img.save(self.image.path, optimize=True, quality=85)


class PropertyVideo(models.Model):
    """Videos de las propiedades."""
    
    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name='videos'
    )
    video = models.FileField('Video', upload_to='properties/videos/', null=True, blank=True)
    youtube_url = models.URLField('URL de YouTube', max_length=500, null=True, blank=True)
    title = models.CharField('Título', max_length=200)
    description = models.TextField('Descripción', max_length=500, blank=True)
    duration = models.DurationField('Duración', null=True, blank=True)
    thumbnail = models.ImageField('Miniatura', upload_to='properties/video_thumbnails/', null=True, blank=True)
    order = models.PositiveIntegerField('Orden', default=0)
    created_at = models.DateTimeField('Fecha de subida', auto_now_add=True)
    
    class Meta:
        verbose_name = 'Video de Propiedad'
        verbose_name_plural = 'Videos de Propiedades'
        ordering = ['order', 'created_at']
        
    def __str__(self):
        return f"Video: {self.title} - {self.property.title}"


class PropertyAmenity(models.Model):
    """Amenidades disponibles para las propiedades."""
    
    AMENITY_CATEGORIES = [
        ('interior', 'Interior'),
        ('exterior', 'Exterior'),
        ('security', 'Seguridad'),
        ('recreation', 'Recreación'),
        ('utilities', 'Servicios'),
        ('parking', 'Estacionamiento'),
        ('accessibility', 'Accesibilidad'),
    ]
    
    name = models.CharField('Nombre', max_length=100, unique=True)
    category = models.CharField('Categoría', max_length=20, choices=AMENITY_CATEGORIES)
    icon = models.CharField('Icono', max_length=50, blank=True, help_text='Nombre del icono CSS')
    description = models.TextField('Descripción', max_length=300, blank=True)
    is_active = models.BooleanField('Activa', default=True)
    
    class Meta:
        verbose_name = 'Amenidad'
        verbose_name_plural = 'Amenidades'
        ordering = ['category', 'name']
        
    def __str__(self):
        return self.name


class PropertyAmenityRelation(models.Model):
    """Relación entre propiedades y amenidades."""
    
    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name='amenity_relations'
    )
    amenity = models.ForeignKey(
        PropertyAmenity,
        on_delete=models.CASCADE,
        related_name='property_relations'
    )
    available = models.BooleanField('Disponible', default=True)
    notes = models.CharField('Notas', max_length=200, blank=True)
    
    class Meta:
        verbose_name = 'Amenidad de Propiedad'
        verbose_name_plural = 'Amenidades de Propiedades'
        unique_together = ['property', 'amenity']
        
    def __str__(self):
        return f"{self.property.title} - {self.amenity.name}"


class PropertyFavorite(models.Model):
    """Propiedades favoritas de los usuarios."""
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='favorite_properties'
    )
    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name='favorited_by'
    )
    created_at = models.DateTimeField('Fecha de adición', auto_now_add=True)
    
    class Meta:
        verbose_name = 'Propiedad Favorita'
        verbose_name_plural = 'Propiedades Favoritas'
        unique_together = ['user', 'property']
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.property.title}"


class PropertyView(models.Model):
    """Registro de visualizaciones de propiedades."""
    
    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name='property_views'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='property_views'
    )
    ip_address = models.GenericIPAddressField('Dirección IP', null=True, blank=True)
    user_agent = models.TextField('User Agent', blank=True)
    viewed_at = models.DateTimeField('Fecha de visualización', auto_now_add=True)
    session_key = models.CharField('Clave de sesión', max_length=40, blank=True)
    
    class Meta:
        verbose_name = 'Visualización de Propiedad'
        verbose_name_plural = 'Visualizaciones de Propiedades'
        ordering = ['-viewed_at']
        
    def __str__(self):
        viewer = self.user.get_full_name() if self.user else f"IP: {self.ip_address}"
        return f"{self.property.title} - {viewer}"


class PropertyInquiry(models.Model):
    """Consultas sobre propiedades."""
    
    INQUIRY_STATUS = [
        ('new', 'Nueva'),
        ('contacted', 'Contactado'),
        ('viewing_scheduled', 'Visita Programada'),
        ('closed', 'Cerrada'),
    ]
    
    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name='inquiries'
    )
    inquirer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='property_inquiries'
    )
    
    # Información de la consulta
    subject = models.CharField('Asunto', max_length=200)
    message = models.TextField('Mensaje', max_length=1000)
    preferred_contact_method = models.CharField(
        'Método de contacto preferido',
        max_length=20,
        choices=[
            ('email', 'Correo electrónico'),
            ('phone', 'Teléfono'),
            ('message', 'Mensaje interno'),
        ],
        default='email'
    )
    
    # Información adicional
    move_in_date = models.DateField('Fecha de mudanza', null=True, blank=True)
    lease_duration = models.PositiveIntegerField('Duración de arrendamiento (meses)', null=True, blank=True)
    budget_min = models.DecimalField('Presupuesto mínimo', max_digits=12, decimal_places=2, null=True, blank=True)
    budget_max = models.DecimalField('Presupuesto máximo', max_digits=12, decimal_places=2, null=True, blank=True)
    
    # Estado y seguimiento
    status = models.CharField('Estado', max_length=20, choices=INQUIRY_STATUS, default='new')
    response = models.TextField('Respuesta', max_length=1000, blank=True)
    responded_at = models.DateTimeField('Fecha de respuesta', null=True, blank=True)
    created_at = models.DateTimeField('Fecha de consulta', auto_now_add=True)
    
    class Meta:
        verbose_name = 'Consulta de Propiedad'
        verbose_name_plural = 'Consultas de Propiedades'
        ordering = ['-created_at']
        
    def __str__(self):
        return f"Consulta: {self.property.title} - {self.inquirer.get_full_name()}"
