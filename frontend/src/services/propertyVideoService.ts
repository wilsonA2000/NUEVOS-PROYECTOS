import { api } from './api';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v1`;

export interface PropertyVideo {
  id: number;
  video?: string;
  video_url?: string;
  youtube_url?: string;
  title: string;
  description: string;
  duration?: string;
  thumbnail?: string;
  thumbnail_url?: string;
  created_at: string;
  order?: number;
}

export interface CreateVideoDto {
  title: string;
  description: string;
  youtube_url?: string;
  video?: File;
}

export interface UpdateVideoDto {
  title?: string;
  description?: string;
  youtube_url?: string;
  video?: File;
  order?: number;
}

export interface VideoUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

class PropertyVideoService {
  // No necesitamos getAuthHeaders porque api.ts maneja automáticamente la autenticación

  /**
   * Obtener videos de una propiedad
   */
  async getPropertyVideos(propertyId: string): Promise<PropertyVideo[]> {
    try {
      // Get property details which includes videos
      const response = await api.get(`/properties/${propertyId}/`);
      
      // Extract videos from property response
      const videos = response.data.videos || [];
      
      console.log('🔍 API Response videos:', videos);
      console.log('🔍 Total videos count:', videos.length);
      
      videos.forEach((video, index) => {
        console.log(`🔍 Video ${index + 1}:`, {
          id: video.id,
          title: video.title,
          youtube_url: video.youtube_url,
          video_url: video.video_url,
          video: video.video,
          created_at: video.created_at,
          allFields: Object.keys(video)
        });
      });
      return videos;
    } catch (error) {
      console.error('❌ Error obteniendo videos:', error);
      throw error;
    }
  }

  /**
   * Agregar video a propiedad (dual: URL o archivo)
   */
  async addVideoToProperty(
    propertyId: string,
    videoData: CreateVideoDto,
    onProgress?: (progress: VideoUploadProgress) => void
  ): Promise<{
    message: string;
    video: PropertyVideo;
    video_type: 'url' | 'file';
  }> {
    try {
      const formData = new FormData();
      
      // Campos básicos
      formData.append('title', videoData.title);
      formData.append('description', videoData.description);
      formData.append('property', propertyId);
      
      // Determinar tipo de video
      if (videoData.youtube_url) {
        formData.append('youtube_url', videoData.youtube_url);
        console.log('🎬 Enviando video URL:', videoData.youtube_url);
      } else if (videoData.video) {
        formData.append('video', videoData.video);
        console.log('🎬 Enviando video archivo:', videoData.video.name);
      } else {
        throw new Error('Debe proporcionar youtube_url o archivo de video');
      }

      const response = await api.post(
        `/properties/${propertyId}/videos/upload/`,
        formData,
        {
          // Don't set Content-Type manually - let axios set the boundary for multipart/form-data
          onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const progress: VideoUploadProgress = {
                loaded: progressEvent.loaded,
                total: progressEvent.total,
                percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total)
              };
              onProgress(progress);
            }
          }
        }
      );

      console.log('✅ Video agregado exitosamente:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error agregando video:', error);
      throw error;
    }
  }

  /**
   * Cambiar fuente de video existente (URL ↔ archivo) 
   * TODO: Implementar endpoint en backend
   */
  async updateVideoSource(
    propertyId: string,
    videoId: number,
    updateData: UpdateVideoDto,
    onProgress?: (progress: VideoUploadProgress) => void
  ): Promise<{
    message: string;
    video: PropertyVideo;
    video_type: 'url' | 'file';
  }> {
    // NOTA: Este endpoint no está implementado en el backend aún
    throw new Error('Funcionalidad de actualización de video no implementada aún');
  }

  /**
   * Reordenar video en la galería
   * TODO: Implementar endpoint en backend
   */
  async reorderVideo(
    propertyId: string,
    videoId: number,
    newOrder: number
  ): Promise<{
    message: string;
    video: PropertyVideo;
  }> {
    // NOTA: Este endpoint no está implementado en el backend aún
    throw new Error('Funcionalidad de reordenar videos no implementada aún');
  }

  /**
   * Eliminar video
   */
  async deleteVideo(propertyId: string, videoId: number): Promise<void> {
    try {
      await api.delete(
        `/properties/property-videos/${videoId}/`
      );
      console.log('✅ Video eliminado exitosamente');
    } catch (error) {
      console.error('❌ Error eliminando video:', error);
      throw error;
    }
  }

  /**
   * Obtener información de video de YouTube
   */
  async getYouTubeVideoInfo(url: string): Promise<{
    title: string;
    description: string;
    thumbnail: string;
    duration: string;
    isValid: boolean;
  }> {
    try {
      // Extraer video ID de la URL
      const videoId = this.extractYouTubeVideoId(url);
      if (!videoId) {
        return {
          title: '',
          description: '',
          thumbnail: '',
          duration: '',
          isValid: false
        };
      }

      // En un entorno real, usarías la YouTube API
      // Por ahora, retornamos datos simulados
      return {
        title: `Video de YouTube ${videoId}`,
        description: 'Descripción extraída de YouTube',
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        duration: '5:30',
        isValid: true
      };
    } catch (error) {
      console.error('❌ Error obteniendo info de YouTube:', error);
      return {
        title: '',
        description: '',
        thumbnail: '',
        duration: '',
        isValid: false
      };
    }
  }

  /**
   * Extraer ID de video de YouTube de una URL
   */
  private extractYouTubeVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Validar archivo de video
   */
  validateVideoFile(file: File): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    // Validar tipo de archivo
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/avi'];
    if (!allowedTypes.includes(file.type)) {
      errors.push(`Tipo de archivo no permitido. Tipos permitidos: ${allowedTypes.join(', ')}`);
    }
    
    // Validar tamaño (50MB máximo)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      errors.push(`Archivo muy grande. Tamaño máximo: ${maxSize / (1024 * 1024)}MB`);
    }
    
    // Validar duración mínima del nombre
    if (file.name.length < 3) {
      errors.push('Nombre de archivo muy corto');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validar URL de YouTube
   */
  validateYouTubeUrl(url: string): {
    valid: boolean;
    errors: string[];
    videoId?: string;
  } {
    const errors: string[] = [];
    
    if (!url) {
      errors.push('URL es requerida');
      return { valid: false, errors };
    }
    
    const videoId = this.extractYouTubeVideoId(url);
    if (!videoId) {
      errors.push('URL de YouTube inválida');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      videoId: videoId || undefined
    };
  }

  /**
   * Generar thumbnail para archivo de video
   */
  async generateThumbnailFromFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        reject(new Error('No se puede crear contexto de canvas'));
        return;
      }
      
      video.onloadedmetadata = () => {
        // Ir al segundo 1 del video
        video.currentTime = 1;
      };
      
      video.onseeked = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        // Convertir a base64
        const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
        resolve(thumbnail);
      };
      
      video.onerror = () => {
        reject(new Error('Error cargando video para generar thumbnail'));
      };
      
      // Crear URL del archivo
      video.src = URL.createObjectURL(file);
    });
  }
}

export const propertyVideoService = new PropertyVideoService();