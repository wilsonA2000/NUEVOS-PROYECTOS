/**
 * Contract Modification Service
 *
 * Servicio para gestionar solicitudes de modificación de contratos.
 * Implementa el flujo completo de solicitudes, aprobaciones y rechazos.
 */

import api from './api';
import {
  ContractModificationRequest,
  CreateModificationRequestPayload,
  RespondModificationRequestPayload,
} from '../types/landlordContract';

const BASE_URL = '/contracts/landlord/modification-requests';

/**
 * Servicio de Modificación de Contratos
 */
const ContractModificationService = {
  /**
   * Crea una nueva solicitud de modificación.
   *
   * @param payload - Datos de la solicitud de modificación
   * @returns Promesa con la solicitud creada
   */
  async createModificationRequest(
    payload: CreateModificationRequestPayload,
  ): Promise<ContractModificationRequest> {
    const response = await api.post<ContractModificationRequest>(`${BASE_URL  }/`, payload);
    return response.data;
  },

  /**
   * Lista todas las solicitudes de modificación del usuario.
   *
   * @param filters - Filtros opcionales (contract_id, status)
   * @returns Promesa con array de solicitudes
   */
  async listModificationRequests(filters?: {
    contract_id?: string;
    status?: string;
  }): Promise<ContractModificationRequest[]> {
    const params = new URLSearchParams();

    if (filters?.contract_id) {
      params.append('contract_id', filters.contract_id);
    }

    if (filters?.status) {
      params.append('status', filters.status);
    }

    const response = await api.get<ContractModificationRequest[]>(
      `${BASE_URL}/?${params.toString()}`,
    );
    return response.data;
  },

  /**
   * Obtiene los detalles de una solicitud de modificación específica.
   *
   * @param modificationId - ID de la solicitud
   * @returns Promesa con los detalles de la solicitud
   */
  async getModificationRequest(
    modificationId: string,
  ): Promise<ContractModificationRequest> {
    const response = await api.get<ContractModificationRequest>(
      `${BASE_URL}/${modificationId}/`,
    );
    return response.data;
  },

  /**
   * Responde a una solicitud de modificación (solo arrendador).
   *
   * @param modificationId - ID de la solicitud
   * @param payload - Acción (approve/reject) y comentarios
   * @returns Promesa con la solicitud actualizada
   */
  async respondToModificationRequest(
    modificationId: string,
    payload: RespondModificationRequestPayload,
  ): Promise<ContractModificationRequest> {
    const response = await api.post<ContractModificationRequest>(
      `${BASE_URL}/${modificationId}/respond/`,
      payload,
    );
    return response.data;
  },

  /**
   * Marca una modificación como implementada (solo arrendador).
   *
   * Esto se usa cuando el arrendador termina de editar el contrato
   * con los cambios solicitados.
   *
   * @param modificationId - ID de la solicitud
   * @returns Promesa con la solicitud actualizada
   */
  async markAsImplemented(
    modificationId: string,
  ): Promise<ContractModificationRequest> {
    const response = await api.post<ContractModificationRequest>(
      `${BASE_URL}/${modificationId}/mark-implemented/`,
    );
    return response.data;
  },

  /**
   * Obtiene las solicitudes de modificación de un contrato específico.
   *
   * @param contractId - ID del contrato
   * @returns Promesa con array de solicitudes del contrato
   */
  async getContractModificationRequests(
    contractId: string,
  ): Promise<ContractModificationRequest[]> {
    return this.listModificationRequests({ contract_id: contractId });
  },

  /**
   * Obtiene las solicitudes pendientes del usuario actual.
   *
   * @returns Promesa con array de solicitudes pendientes
   */
  async getPendingModificationRequests(): Promise<ContractModificationRequest[]> {
    return this.listModificationRequests({ status: 'PENDING' });
  },

  /**
   * Verifica si un contrato puede recibir más solicitudes de modificación.
   *
   * @param contractId - ID del contrato
   * @returns Promesa con booleano indicando si puede solicitar más modificaciones
   */
  async canRequestMoreModifications(contractId: string): Promise<boolean> {
    try {
      const requests = await this.getContractModificationRequests(contractId);

      // Máximo 2 ciclos de revisión
      const maxRevisions = 2;
      const currentRevisions = requests.length;

      return currentRevisions < maxRevisions;
    } catch (error) {
      return false;
    }
  },

  /**
   * Aprueba una solicitud de modificación.
   *
   * @param modificationId - ID de la solicitud
   * @param landlordResponse - Comentarios del arrendador (opcional)
   * @returns Promesa con la solicitud actualizada
   */
  async approveModificationRequest(
    modificationId: string,
    landlordResponse?: string,
  ): Promise<ContractModificationRequest> {
    return this.respondToModificationRequest(modificationId, {
      action: 'approve',
      landlord_response: landlordResponse,
    });
  },

  /**
   * Rechaza una solicitud de modificación.
   *
   * @param modificationId - ID de la solicitud
   * @param landlordResponse - Razón del rechazo (requerido)
   * @returns Promesa con la solicitud actualizada
   */
  async rejectModificationRequest(
    modificationId: string,
    landlordResponse: string,
  ): Promise<ContractModificationRequest> {
    return this.respondToModificationRequest(modificationId, {
      action: 'reject',
      landlord_response: landlordResponse,
    });
  },
};

export default ContractModificationService;
