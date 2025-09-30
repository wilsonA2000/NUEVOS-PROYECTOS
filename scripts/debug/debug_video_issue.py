#!/usr/bin/env python3
"""
Diagnóstico del problema de videos de YouTube en VeriHome
"""
import os
import sys
import django
import json

# Configurar Django
sys.path.append('/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from properties.models import Property, PropertyVideo
from django.contrib.auth import get_user_model

User = get_user_model()

def debug_video_issue():
    """Diagnosticar el problema del video de YouTube"""
    
    print("=" * 70)
    print("🎥 DIAGNÓSTICO DE VIDEOS DE YOUTUBE - VERIHOME")
    print("=" * 70)
    
    # 1. Verificar propiedades existentes
    properties = Property.objects.all()
    print(f"\n📊 PROPIEDADES EN LA BASE DE DATOS: {properties.count()}")
    
    if not properties.exists():
        print("❌ No hay propiedades para diagnosticar")
        return
    
    # 2. Revisar cada propiedad y sus videos
    for i, property in enumerate(properties, 1):
        print(f"\n🏠 PROPIEDAD {i}: {property.title}")
        print(f"   ID: {property.id}")
        print(f"   Propietario: {property.landlord.email}")
        
        # Contar videos
        videos_count = property.videos.count()
        print(f"   Videos totales: {videos_count}")
        
        if videos_count == 0:
            print("   ℹ️ No tiene videos")
            continue
        
        # Revisar cada video
        print(f"\n📹 DETALLES DE VIDEOS:")
        for j, video in enumerate(property.videos.all(), 1):
            print(f"     Video {j}:")
            print(f"       ID: {video.id}")
            print(f"       Título: '{video.title}'")
            print(f"       Descripción: '{video.description}'")
            print(f"       Video archivo: {video.video}")
            print(f"       YouTube URL: {video.youtube_url}")
            
            # Diagnosticar el problema específico
            if video.youtube_url:
                print(f"       🔍 ANÁLISIS DE URL DE YOUTUBE:")
                print(f"         URL original: {video.youtube_url}")
                
                # Extraer video ID usando la misma lógica del frontend
                url = video.youtube_url
                video_id = None
                
                if 'v=' in url:
                    video_id = url.split('v=')[1].split('&')[0]
                elif 'youtu.be/' in url:
                    video_id = url.split('youtu.be/')[1].split('?')[0]
                else:
                    video_id = url.split('/').pop() if '/' in url else url
                
                print(f"         Video ID extraído: {video_id}")
                embed_url = f"https://www.youtube.com/embed/{video_id}?rel=0&modestbranding=1"
                print(f"         URL embed generada: {embed_url}")
                
                # Validar formato de video ID
                if len(video_id) == 11 and video_id.isalnum():
                    print("         ✅ Video ID parece válido")
                else:
                    print(f"         ❌ Video ID inválido (longitud: {len(video_id)})")
                    print(f"         ❌ Contiene caracteres especiales: {not video_id.isalnum()}")
            else:
                print(f"       ⚠️ No tiene YouTube URL")
            print()
    
    # 3. Verificar estructura de datos que llega al frontend
    print(f"\n🔍 ESTRUCTURA DE DATOS PARA EL FRONTEND:")
    latest_property = properties.first()
    
    if latest_property and latest_property.videos.exists():
        print(f"   Usando propiedad: {latest_property.title}")
        
        # Simular serialización como en el API
        property_data = {
            'id': str(latest_property.id),
            'title': latest_property.title,
            'videos': []
        }
        
        for video in latest_property.videos.all():
            video_data = {
                'id': str(video.id),
                'title': video.title,
                'description': video.description,
                'video': str(video.video) if video.video else None,
                'youtube_url': video.youtube_url,
                'video_url': video.video.url if video.video else None,
            }
            property_data['videos'].append(video_data)
        
        print(f"   Datos JSON que llegan al frontend:")
        print(json.dumps(property_data, indent=2, default=str))
    
    # 4. Sugerencias de solución
    print(f"\n💡 DIAGNÓSTICO Y SOLUCIONES:")
    
    youtube_videos = PropertyVideo.objects.filter(youtube_url__isnull=False).exclude(youtube_url='')
    
    if youtube_videos.exists():
        print(f"   ✅ {youtube_videos.count()} videos de YouTube encontrados")
        
        for video in youtube_videos:
            url = video.youtube_url
            print(f"\n   🔧 Verificando: {url}")
            
            # Validar URL
            if not url.startswith(('http://', 'https://')):
                print(f"     ❌ URL no tiene protocolo válido")
            elif 'youtube.com' not in url and 'youtu.be' not in url:
                print(f"     ❌ URL no es de YouTube")
            else:
                print(f"     ✅ URL parece válida")
                
                # Sugerir URL de prueba corregida si es necesario
                if 'watch?v=' in url:
                    video_id = url.split('v=')[1].split('&')[0]
                    embed_url = f"https://www.youtube.com/embed/{video_id}"
                    print(f"     🎯 URL de embed correcta: {embed_url}")
    else:
        print(f"   ❌ No se encontraron videos de YouTube")
    
    print(f"\n📋 ACCIONES RECOMENDADAS:")
    print(f"   1. Verificar que la URL de YouTube es válida")
    print(f"   2. Comprobar que el frontend está recibiendo youtube_url correctamente")
    print(f"   3. Validar la función getYouTubeEmbedUrl en PropertyDetail.tsx")
    print(f"   4. Verificar configuraciones de CORS para embeds de YouTube")
    
    print(f"\n✨ DIAGNÓSTICO COMPLETADO")
    print("=" * 70)

if __name__ == "__main__":
    debug_video_issue()