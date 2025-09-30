/**
 * Servicio para gestión de imágenes de propiedades
 */

import api from './api';

class PropertyImageService {
  /**
   * Eliminar imagen
   */
  async deleteImage(imageId: number): Promise<void> {
    try {
      await api.delete(`/properties/property-images/${imageId}/`);
      console.log('✅ Imagen eliminada exitosamente');
    } catch (error) {
      console.error('❌ Error eliminando imagen:', error);
      throw error;
    }
  }
}

export const propertyImageService = new PropertyImageService();
export default propertyImageService;