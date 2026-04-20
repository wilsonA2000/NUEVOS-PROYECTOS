/**
 * Utility functions for handling authenticated contract PDF viewing
 * Solves JWT authentication issues when opening PDFs in new tabs
 */

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const viewContractPDF = async (contractId: string): Promise<void> => {
  try {
    // Obtener el token de localStorage
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error(
        'No hay sesión activa. Por favor inicia sesión nuevamente.',
      );
    }

    // Realizar fetch con headers de autorización
    const response = await fetch(
      `${API_BASE_URL}/contracts/${contractId}/preview-pdf/`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: '*/*',
        },
      },
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
      }
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    // Convertir la respuesta a blob
    const blob = await response.blob();

    // Crear URL del blob y abrirlo en nueva pestaña
    const pdfUrl = URL.createObjectURL(blob);
    const newWindow = window.open(pdfUrl, '_blank');

    // Liberar memoria después de un tiempo
    setTimeout(() => {
      URL.revokeObjectURL(pdfUrl);
    }, 60000);

    if (!newWindow) {
      throw new Error(
        'No se pudo abrir el PDF. Por favor verifica que no esté bloqueado por el navegador.',
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(
      'Error al cargar el contrato profesional. Por favor intenta nuevamente.',
    );
  }
};

export const downloadContractPDF = async (
  contractId: string,
  filename?: string,
): Promise<void> => {
  try {
    // Obtener el token de localStorage
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error(
        'No hay sesión activa. Por favor inicia sesión nuevamente.',
      );
    }

    // Realizar fetch con headers de autorización
    const response = await fetch(
      `${API_BASE_URL}/contracts/${contractId}/preview-pdf/`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: '*/*',
        },
      },
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
      }
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    // Convertir la respuesta a blob
    const blob = await response.blob();

    // Crear enlace de descarga
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || `contrato-${contractId.slice(0, 8)}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Liberar memoria
    URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(
      'Error al descargar el contrato. Por favor intenta nuevamente.',
    );
  }
};
