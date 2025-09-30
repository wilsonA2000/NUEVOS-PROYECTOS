"""
Parche para el serializador de propiedades para manejar videos sin duplicación.
Este archivo contiene las funciones auxiliares para manejar videos.
"""

from properties.models import PropertyVideo
import hashlib

def handle_youtube_videos(property_instance, youtube_videos, delete_missing=False):
    """
    Maneja la creación o actualización de videos de YouTube para una propiedad.
    Evita duplicación usando lógica update-or-create.
    
    Args:
        property_instance: La instancia de Property
        youtube_videos: Lista de diccionarios con info de videos YouTube
        delete_missing: Si True, elimina videos que no están en la lista
    
    Returns:
        Tuple (created_count, updated_count, deleted_count)
    """
    created_count = 0
    updated_count = 0
    deleted_count = 0
    
    if youtube_videos is None:
        youtube_videos = []
    
    print(f"🔄 Procesando {len(youtube_videos)} videos YouTube para propiedad {property_instance.id}...")
    
    # Obtener videos existentes
    existing_videos = PropertyVideo.objects.filter(property=property_instance)
    existing_youtube_urls = {}
    for video in existing_videos:
        if video.youtube_url:
            existing_youtube_urls[video.youtube_url] = video
    
    print(f"📊 Videos YouTube existentes: {len(existing_youtube_urls)}")
    
    # Procesar cada video de YouTube
    processed_urls = set()
    for youtube_video in youtube_videos:
        url = youtube_video['url']
        processed_urls.add(url)
        
        if url in existing_youtube_urls:
            # Actualizar video existente
            try:
                existing_video = existing_youtube_urls[url]
                existing_video.title = youtube_video['title']
                existing_video.description = youtube_video.get('description', '')
                existing_video.save()
                updated_count += 1
                print(f"🔄 Video YouTube actualizado: {url} - {youtube_video['title']}")
            except Exception as e:
                print(f"❌ Error actualizando video YouTube existente {url}: {str(e)}")
        else:
            # Crear nuevo video
            try:
                PropertyVideo.objects.create(
                    property=property_instance,
                    youtube_url=url,
                    title=youtube_video['title'],
                    description=youtube_video.get('description', '')
                )
                created_count += 1
                print(f"🎥 Nuevo video YouTube creado: {url} - {youtube_video['title']}")
            except Exception as e:
                print(f"❌ Error creando nuevo video YouTube {url}: {str(e)}")
    
    # Eliminar videos que ya no están en la lista (si se especifica)
    if delete_missing:
        for url, video in existing_youtube_urls.items():
            if url not in processed_urls:
                print(f"🗑️ Eliminando video YouTube que ya no está en la lista: {url}")
                video.delete()
                deleted_count += 1
    
    print(f"✅ Procesamiento completado: {created_count} creados, {updated_count} actualizados, {deleted_count} eliminados")
    return created_count, updated_count, deleted_count


def handle_video_files(property_instance, video_files, video_metadata, delete_missing=False):
    """
    Maneja la creación o actualización de videos de archivo para una propiedad.
    
    Args:
        property_instance: La instancia de Property
        video_files: Lista de archivos de video
        video_metadata: Diccionario con metadatos de videos (títulos, descripciones, etc.)
        delete_missing: Si True, elimina videos de archivo que no están en la lista
    
    Returns:
        Tuple (created_count, updated_count, deleted_count)
    """
    created_count = 0
    updated_count = 0
    deleted_count = 0
    
    if not video_files:
        # Si no hay archivos nuevos pero delete_missing es True, eliminar todos los videos de archivo
        if delete_missing:
            existing_file_videos = PropertyVideo.objects.filter(
                property=property_instance,
                video__isnull=False
            )
            deleted_count = existing_file_videos.count()
            if deleted_count > 0:
                print(f"🗑️ Eliminando {deleted_count} videos de archivo que ya no están en la lista")
                existing_file_videos.delete()
        return created_count, updated_count, deleted_count
    
    print(f"🎬 Procesando {len(video_files)} archivos de video para propiedad {property_instance.id}...")
    
    # Para archivos de video, usaremos un hash del nombre y tamaño como identificador único
    processed_hashes = set()
    
    for i, video_file in enumerate(video_files):
        # Generar hash único para el archivo
        file_hash = hashlib.md5(f"{video_file.name}_{video_file.size}".encode()).hexdigest()[:12]
        processed_hashes.add(file_hash)
        
        # Obtener metadatos del video
        title = video_metadata.get(f'video_{i}_title', video_file.name)
        description = video_metadata.get(f'video_{i}_description', '')
        order = int(video_metadata.get(f'video_{i}_order', i))
        
        # Como los archivos de video no tienen una URL única para comparar,
        # siempre creamos nuevos cuando se suben archivos
        # (No podemos actualizar archivos existentes sin un identificador único confiable)
        try:
            PropertyVideo.objects.create(
                property=property_instance,
                video=video_file,
                title=title,
                description=description
            )
            created_count += 1
            print(f"🎬 Nuevo video de archivo creado: {video_file.name} - {title}")
        except Exception as e:
            print(f"❌ Error creando video de archivo {video_file.name}: {str(e)}")
    
    print(f"✅ Procesamiento de archivos completado: {created_count} creados")
    return created_count, updated_count, deleted_count


def sync_property_videos(property_instance, request_data):
    """
    Sincroniza todos los videos de una propiedad basándose en los datos del request.
    Maneja tanto videos YouTube como archivos de video.
    
    Args:
        property_instance: La instancia de Property
        request_data: Los datos del request que contienen información de videos
    
    Returns:
        Diccionario con estadísticas del procesamiento
    """
    stats = {
        'youtube': {'created': 0, 'updated': 0, 'deleted': 0},
        'files': {'created': 0, 'updated': 0, 'deleted': 0},
        'total_videos': 0
    }
    
    # Procesar videos de YouTube
    youtube_videos = []
    video_files = []
    video_metadata = {}
    
    # Buscar todos los campos de video en request_data
    for key, value in request_data.items():
        # Videos YouTube
        if key.startswith('youtube_') and key.endswith('_url') and value:
            try:
                index = int(key.split('_')[1])
                youtube_videos.append({
                    'url': value,
                    'title': request_data.get(f'youtube_{index}_title', f'Video {index}'),
                    'description': request_data.get(f'youtube_{index}_description', ''),
                    'order': int(request_data.get(f'youtube_{index}_order', index))
                })
            except (ValueError, IndexError):
                pass
        
        # Metadatos de archivos de video
        elif key.startswith('video_') and ('_title' in key or '_description' in key or '_order' in key):
            video_metadata[key] = value
    
    # Obtener archivos de video si existen
    if hasattr(request_data, 'getlist'):
        video_files = request_data.getlist('video_files', [])
    
    # Procesar videos YouTube
    if youtube_videos or request_data.get('sync_youtube', False):
        created, updated, deleted = handle_youtube_videos(
            property_instance, 
            youtube_videos, 
            delete_missing=True
        )
        stats['youtube'] = {'created': created, 'updated': updated, 'deleted': deleted}
    
    # Procesar archivos de video
    if video_files:
        created, updated, deleted = handle_video_files(
            property_instance,
            video_files,
            video_metadata,
            delete_missing=False  # No eliminar archivos existentes automáticamente
        )
        stats['files'] = {'created': created, 'updated': updated, 'deleted': deleted}
    
    # Contar total de videos
    stats['total_videos'] = PropertyVideo.objects.filter(property=property_instance).count()
    
    return stats