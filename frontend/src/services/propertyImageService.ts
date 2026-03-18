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
    } catch (error) {
      throw error;
    }
  }
}

export const propertyImageService = new PropertyImageService();
export default propertyImageService;