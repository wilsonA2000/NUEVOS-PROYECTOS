"""
Serializadores para la aplicación de propiedades de VeriHome.
"""

from rest_framework import serializers
from .models import (
    Property, PropertyImage, PropertyVideo, PropertyAmenity, 
    PropertyAmenityRelation, PropertyFavorite, PropertyView, PropertyInquiry
)
from users.serializers import UserSerializer


class PropertyAmenitySerializer(serializers.ModelSerializer):
    """Serializador para amenidades de propiedades."""
    
    class Meta:
        model = PropertyAmenity
        fields = [
            'id', 'name', 'category', 'icon', 'description', 'is_active'
        ]


class PropertyImageSerializer(serializers.ModelSerializer):
    """Serializador para imágenes de propiedades."""
    
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = PropertyImage
        fields = [
            'id', 'image', 'image_url', 'caption', 'is_main', 'order', 'created_at'
        ]
    
    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class PropertyVideoSerializer(serializers.ModelSerializer):
    """Serializador para videos de propiedades."""
    
    video_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    
    class Meta:
        model = PropertyVideo
        fields = [
            'id', 'video', 'video_url', 'youtube_url', 'title', 'description', 
            'duration', 'thumbnail', 'thumbnail_url', 'created_at'
        ]
    
    def get_video_url(self, obj):
        if obj.video:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.video.url)
            return obj.video.url
        return None
    
    def get_thumbnail_url(self, obj):
        if obj.thumbnail:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.thumbnail.url)
            return obj.thumbnail.url
        return None


class PropertyAmenityRelationSerializer(serializers.ModelSerializer):
    """Serializador para relaciones entre propiedades y amenidades."""
    
    amenity = PropertyAmenitySerializer(read_only=True)
    amenity_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = PropertyAmenityRelation
        fields = [
            'id', 'amenity', 'amenity_id', 'available', 'notes'
        ]


class PropertyFavoriteSerializer(serializers.ModelSerializer):
    """Serializador para propiedades favoritas."""
    
    user = UserSerializer(read_only=True)
    property_title = serializers.CharField(source='property.title', read_only=True)
    
    class Meta:
        model = PropertyFavorite
        fields = [
            'id', 'user', 'property', 'property_title', 'created_at'
        ]


class PropertyViewSerializer(serializers.ModelSerializer):
    """Serializador para visualizaciones de propiedades."""
    
    class Meta:
        model = PropertyView
        fields = [
            'id', 'property', 'user', 'ip_address', 'user_agent', 
            'viewed_at', 'session_key'
        ]


class PropertyInquirySerializer(serializers.ModelSerializer):
    """Serializador para consultas sobre propiedades."""
    
    inquirer = UserSerializer(read_only=True)
    property_title = serializers.CharField(source='property.title', read_only=True)
    
    class Meta:
        model = PropertyInquiry
        fields = [
            'id', 'property', 'property_title', 'inquirer', 'subject', 'message',
            'preferred_contact_method', 'move_in_date', 'lease_duration',
            'budget_min', 'budget_max', 'status', 'response', 'responded_at',
            'created_at'
        ]


class PropertySerializer(serializers.ModelSerializer):
    """Serializador principal para propiedades."""
    
    landlord = UserSerializer(read_only=True)
    images = PropertyImageSerializer(many=True, read_only=True)
    videos = PropertyVideoSerializer(many=True, read_only=True)
    amenity_relations = PropertyAmenityRelationSerializer(many=True, read_only=True)
    main_image_url = serializers.SerializerMethodField()
    formatted_price = serializers.CharField(read_only=True)
    is_favorited = serializers.SerializerMethodField()
    
    class Meta:
        model = Property
        fields = [
            'id', 'landlord', 'title', 'description', 'property_type', 'listing_type',
            'status', 'address', 'city', 'state', 'country', 'postal_code',
            'latitude', 'longitude', 'bedrooms', 'bathrooms', 'half_bathrooms',
            'total_area', 'built_area', 'lot_area', 'parking_spaces', 'floors',
            'floor_number', 'year_built', 'rent_price', 'sale_price',
            'security_deposit', 'maintenance_fee', 'minimum_lease_term',
            'maximum_lease_term', 'pets_allowed', 'smoking_allowed', 'furnished',
            'utilities_included', 'property_features', 'nearby_amenities',
            'transportation', 'available_from', 'last_updated', 'created_at',
            'views_count', 'favorites_count', 'is_featured', 'is_active',
            'images', 'videos', 'amenity_relations', 'main_image_url',
            'formatted_price', 'is_favorited'
        ]
        read_only_fields = [
            'id', 'landlord', 'last_updated', 'created_at', 'views_count',
            'favorites_count', 'main_image_url', 'formatted_price', 'is_favorited'
        ]
    
    def get_main_image_url(self, obj):
        """Obtiene la URL de la imagen principal."""
        # Intentar obtener imagen principal marcada
        main_image = obj.get_main_image()
        
        # Si no hay imagen principal, usar la primera imagen disponible
        if not main_image:
            first_image = obj.images.first()
            if first_image and first_image.image:
                main_image = first_image.image.url
            else:
                return None
        
        if main_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(main_image)
            return main_image
        return None
    
    def get_is_favorited(self, obj):
        """Verifica si la propiedad está en favoritos del usuario actual."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.favorited_by.filter(user=request.user).exists()
        return False
    
    def to_representation(self, instance):
        """Personaliza la representación de la propiedad."""
        data = super().to_representation(instance)
        data['formatted_price'] = instance.get_formatted_price()
        return data


class CreatePropertySerializer(serializers.ModelSerializer):
    """Serializador para crear propiedades."""
    
    images = serializers.ListField(
        child=serializers.ImageField(),
        required=False,
        write_only=True
    )
    main_image = serializers.ImageField(required=False, write_only=True)
    video_file = serializers.FileField(required=False, write_only=True)
    video_files = serializers.ListField(
        child=serializers.FileField(),
        required=False,
        write_only=True
    )
    youtube_urls = serializers.ListField(
        child=serializers.URLField(),
        required=False,
        write_only=True
    )
    
    class Meta:
        model = Property
        fields = [
            'title', 'description', 'property_type', 'listing_type', 'status',
            'address', 'city', 'state', 'country', 'postal_code', 'latitude',
            'longitude', 'bedrooms', 'bathrooms', 'half_bathrooms', 'total_area',
            'built_area', 'lot_area', 'parking_spaces', 'floors', 'floor_number',
            'year_built', 'rent_price', 'sale_price', 'security_deposit',
            'maintenance_fee', 'minimum_lease_term', 'maximum_lease_term',
            'pets_allowed', 'smoking_allowed', 'furnished', 'utilities_included',
            'property_features', 'nearby_amenities', 'transportation',
            'available_from', 'is_featured', 'is_active', 'images', 'main_image',
            'main_image_id', 'video_file', 'video_files', 'youtube_urls'
        ]
    
    def to_representation(self, instance):
        # Usar PropertySerializer (definido arriba en el mismo archivo)
        return PropertySerializer(instance, context=self.context).data

    def create(self, validated_data):
        """Crea una nueva propiedad asignando el landlord actual."""
        # Extraer archivos
        images = validated_data.pop('images', [])
        main_image = validated_data.pop('main_image', None)
        video_file = validated_data.pop('video_file', None)
        video_files = validated_data.pop('video_files', [])
        youtube_urls = validated_data.pop('youtube_urls', [])
        
        # Convertir campos JSON si vienen como strings
        for field in ['utilities_included', 'property_features', 'nearby_amenities', 'transportation']:
            if field in validated_data and isinstance(validated_data[field], str):
                try:
                    validated_data[field] = eval(validated_data[field]) if validated_data[field] else []
                except:
                    validated_data[field] = []
        
        # Convertir campos booleanos
        for field in ['pets_allowed', 'smoking_allowed', 'furnished', 'is_featured', 'is_active']:
            if field in validated_data and isinstance(validated_data[field], str):
                validated_data[field] = validated_data[field].lower() == 'true'
        
        # Convertir campos numéricos
        numeric_fields = [
            'bedrooms', 'bathrooms', 'half_bathrooms', 'total_area', 'built_area',
            'lot_area', 'parking_spaces', 'floors', 'floor_number', 'year_built',
            'rent_price', 'sale_price', 'security_deposit', 'maintenance_fee',
            'minimum_lease_term', 'maximum_lease_term', 'latitude', 'longitude'
        ]
        
        for field in numeric_fields:
            if field in validated_data and validated_data[field] != '':
                try:
                    validated_data[field] = float(validated_data[field])
                except (ValueError, TypeError):
                    validated_data[field] = None
        
        # Crear la propiedad
        validated_data['landlord'] = self.context['request'].user
        property_instance = super().create(validated_data)
        
        # Crear imágenes
        for i, image in enumerate(images):
            is_main = (main_image and image == main_image) or (i == 0 and not main_image)
            PropertyImage.objects.create(
                property=property_instance,
                image=image,
                is_main=is_main,
                order=i
            )
        
        # Crear video si existe (legacy)
        if video_file:
            PropertyVideo.objects.create(
                property=property_instance,
                video=video_file,
                title=f"Video de {property_instance.title}"
            )
        
        # Procesar múltiples archivos de video
        for i, video in enumerate(video_files):
            # Buscar metadatos del video en la data original
            title_key = f'video_{i}_title'
            description_key = f'video_{i}_description'
            
            request = self.context.get('request')
            title = 'Video'
            description = ''
            
            if request and request.data:
                title = request.data.get(title_key, f'Video {i+1} de {property_instance.title}')
                description = request.data.get(description_key, '')
            
            PropertyVideo.objects.create(
                property=property_instance,
                video=video,
                title=title,
                description=description
            )
        
        # Procesar URLs de YouTube
        for i, youtube_url in enumerate(youtube_urls):
            # Buscar metadatos del video de YouTube en la data original
            title_key = f'youtube_{i}_title'
            description_key = f'youtube_{i}_description'
            
            request = self.context.get('request')
            title = 'Video YouTube'
            description = ''
            
            if request and request.data:
                title = request.data.get(title_key, f'Video YouTube {i+1} de {property_instance.title}')
                description = request.data.get(description_key, '')
            
            PropertyVideo.objects.create(
                property=property_instance,
                youtube_url=youtube_url,
                title=title,
                description=description
            )
        
        return property_instance


class UpdatePropertySerializer(serializers.ModelSerializer):
    """Serializador para actualizar propiedades."""
    
    images = serializers.ListField(
        child=serializers.ImageField(),
        required=False,
        write_only=True
    )
    main_image = serializers.ImageField(required=False, write_only=True)
    main_image_id = serializers.CharField(required=False, write_only=True)
    video_file = serializers.FileField(required=False, write_only=True)
    video_files = serializers.ListField(
        child=serializers.FileField(),
        required=False,
        write_only=True
    )
    youtube_urls = serializers.ListField(
        child=serializers.URLField(),
        required=False,
        write_only=True
    )
    
    class Meta:
        model = Property
        fields = [
            'title', 'description', 'property_type', 'listing_type', 'status',
            'address', 'city', 'state', 'country', 'postal_code', 'latitude',
            'longitude', 'bedrooms', 'bathrooms', 'half_bathrooms', 'total_area',
            'built_area', 'lot_area', 'parking_spaces', 'floors', 'floor_number',
            'year_built', 'rent_price', 'sale_price', 'security_deposit',
            'maintenance_fee', 'minimum_lease_term', 'maximum_lease_term',
            'pets_allowed', 'smoking_allowed', 'furnished', 'utilities_included',
            'property_features', 'nearby_amenities', 'transportation',
            'available_from', 'is_featured', 'is_active', 'images', 'main_image',
            'main_image_id', 'video_file', 'video_files', 'youtube_urls'
        ]
    
    def to_representation(self, instance):
        # Usar PropertySerializer (definido arriba en el mismo archivo)
        return PropertySerializer(instance, context=self.context).data

    def update(self, instance, validated_data):
        """Actualiza una propiedad existente incluyendo nuevas imágenes y videos."""
        # Extraer archivos
        images = validated_data.pop('images', [])
        main_image = validated_data.pop('main_image', None)
        main_image_id = validated_data.pop('main_image_id', None)
        video_file = validated_data.pop('video_file', None)
        video_files = validated_data.pop('video_files', [])
        youtube_urls = validated_data.pop('youtube_urls', [])
        
        # Convertir campos JSON si vienen como strings
        for field in ['utilities_included', 'property_features', 'nearby_amenities', 'transportation']:
            if field in validated_data and isinstance(validated_data[field], str):
                try:
                    import json
                    validated_data[field] = json.loads(validated_data[field]) if validated_data[field] else []
                except:
                    validated_data[field] = []
        
        # Convertir campos booleanos
        for field in ['pets_allowed', 'smoking_allowed', 'furnished', 'is_featured', 'is_active']:
            if field in validated_data and isinstance(validated_data[field], str):
                validated_data[field] = validated_data[field].lower() == 'true'
        
        # Actualizar campos básicos de la propiedad
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Procesar nuevas imágenes (si se envían)
        if images:
            # Agregar nuevas imágenes sin eliminar las existentes
            for i, image in enumerate(images):
                # Determinar si es imagen principal
                is_main = (main_image and image == main_image)
                # Si se marca como principal, desmarcar otras
                if is_main:
                    PropertyImage.objects.filter(property=instance, is_main=True).update(is_main=False)
                
                PropertyImage.objects.create(
                    property=instance,
                    image=image,
                    is_main=is_main if is_main is not None else False,
                    order=instance.images.count() + i
                )
        
        # Manejar designación de imagen principal existente
        if main_image_id:
            try:
                # Desmarcar todas las imágenes como principales
                PropertyImage.objects.filter(property=instance, is_main=True).update(is_main=False)
                # Marcar la imagen especificada como principal
                PropertyImage.objects.filter(property=instance, id=main_image_id).update(is_main=True)
                print(f"✅ Imagen {main_image_id} marcada como principal para propiedad {instance.id}")
            except Exception as e:
                print(f"⚠️ Error marcando imagen principal {main_image_id}: {str(e)}")
        
        # Crear video si existe (legacy)
        if video_file:
            PropertyVideo.objects.create(
                property=instance,
                video=video_file,
                title=f"Video de {instance.title}"
            )
        
        # Procesar múltiples archivos de video
        for i, video in enumerate(video_files):
            # Buscar metadatos del video en la data original
            title_key = f'video_{i}_title'
            description_key = f'video_{i}_description'
            
            # Los metadatos se envían en el FormData, así que los buscamos en el request
            request = self.context.get('request')
            title = 'Video'
            description = ''
            
            if request and request.data:
                title = request.data.get(title_key, f'Video {i+1} de {instance.title}')
                description = request.data.get(description_key, '')
            
            PropertyVideo.objects.create(
                property=instance,
                video=video,
                title=title,
                description=description
            )
        
        # CRITICAL FIX: Replace ALL YouTube videos to prevent exponential duplication
        # 1. Delete ALL existing YouTube videos for this property FIRST
        existing_youtube_videos = instance.videos.filter(youtube_url__isnull=False)
        deleted_count = existing_youtube_videos.count()
        if deleted_count > 0:
            existing_youtube_videos.delete()
            print(f"🔥 CLEANUP: Deleted {deleted_count} existing YouTube videos to prevent duplication")
        
        # 2. Create fresh YouTube videos from the current request data ONLY
        unique_youtube_urls = list(dict.fromkeys([url.strip() for url in youtube_urls if url and url.strip()]))
        print(f"📹 Processing {len(unique_youtube_urls)} unique YouTube URLs: {unique_youtube_urls}")
        
        for i, youtube_url in enumerate(unique_youtube_urls):
            try:
                new_video = PropertyVideo.objects.create(
                    property=instance,
                    youtube_url=youtube_url,
                    title=f'Video YouTube {i+1}',
                    description=f'Video de YouTube para {instance.title}',
                    order=i+1
                )
                print(f"✅ NEW YouTube video created: {youtube_url} (ID: {new_video.id}, Order: {i+1})")
            except Exception as e:
                print(f"❌ ERROR creating YouTube video {youtube_url}: {e}")
        
        return instance


class PropertySearchSerializer(serializers.Serializer):
    """Serializador para parámetros de búsqueda de propiedades."""
    
    # Filtros básicos
    property_type = serializers.CharField(required=False)
    listing_type = serializers.CharField(required=False)
    status = serializers.CharField(required=False)
    city = serializers.CharField(required=False)
    state = serializers.CharField(required=False)
    
    # Filtros de precio
    min_price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    max_price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    
    # Filtros de características
    min_bedrooms = serializers.IntegerField(required=False)
    max_bedrooms = serializers.IntegerField(required=False)
    min_bathrooms = serializers.DecimalField(max_digits=3, decimal_places=1, required=False)
    max_bathrooms = serializers.DecimalField(max_digits=3, decimal_places=1, required=False)
    min_area = serializers.DecimalField(max_digits=8, decimal_places=2, required=False)
    max_area = serializers.DecimalField(max_digits=8, decimal_places=2, required=False)
    
    # Filtros de características
    pets_allowed = serializers.BooleanField(required=False)
    smoking_allowed = serializers.BooleanField(required=False)
    furnished = serializers.BooleanField(required=False)
    
    # Ordenamiento
    ordering = serializers.CharField(required=False)
    
    # Paginación
    page = serializers.IntegerField(required=False, default=1)
    page_size = serializers.IntegerField(required=False, default=20)


class PropertyStatsSerializer(serializers.Serializer):
    """Serializador para estadísticas de propiedades."""
    
    total_properties = serializers.IntegerField()
    available_properties = serializers.IntegerField()
    rented_properties = serializers.IntegerField()
    maintenance_properties = serializers.IntegerField()
    total_views = serializers.IntegerField()
    total_favorites = serializers.IntegerField()
    average_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    occupancy_rate = serializers.DecimalField(max_digits=5, decimal_places=2) 