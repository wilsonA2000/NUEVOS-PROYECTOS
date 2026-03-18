/**
 * Wompi Payment Service
 * Service for handling Colombian PSE payments through Wompi gateway
 */

import api from './api';

export interface WompiPaymentRequest {
  amount: number;
  payment_method?: 'PSE' | 'CARD' | 'NEQUI' | 'BANCOLOMBIA_TRANSFER';
  description?: string;
  bank_code: string;
  document_type: string;
  document_number: string;
  phone?: string;
  redirect_url?: string;
}

export interface WompiPaymentResponse {
  success: boolean;
  transaction_id: number;
  reference: string;
  status: string;
  redirect_url: string;
  wompi_transaction_id: string;
  metadata: {
    wompi_transaction_id: string;
    payment_method: string;
    integrity: string;
    created_at: string;
    status_message?: string;
    async_payment_url?: string;
    external_identifier?: string;
  };
  error?: string;
  error_code?: string;
}

export interface PSEBank {
  financial_institution_code: string;
  financial_institution_name: string;
  payment_method_type?: string;
}

export interface TransactionStatus {
  transaction_id: number;
  reference: string;
  status: string;
  amount: string;
  currency: string;
  payment_method: string;
  created_at: string;
  processed_at: string | null;
  metadata: Record<string, any>;
}

class WompiService {
  private baseURL = '/payments';

  /**
   * Initiate PSE payment
   */
  async initiatePayment(paymentData: WompiPaymentRequest): Promise<WompiPaymentResponse> {
    try {
      const response = await api.post<WompiPaymentResponse>(
        `${this.baseURL}/wompi/initiate/`,
        paymentData,
      );
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Get list of available PSE banks
   */
  async getPSEBanks(): Promise<PSEBank[]> {
    try {
      const response = await api.get<{ banks: PSEBank[]; count: number }>(
        `${this.baseURL}/pse/banks/`,
      );
      return response.data.banks;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Check payment status
   */
  async getPaymentStatus(transactionId: number): Promise<TransactionStatus> {
    try {
      const response = await api.get<TransactionStatus>(
        `${this.baseURL}/wompi/status/${transactionId}/`,
      );
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  /**
   * Poll payment status until completed or failed
   * @param transactionId Transaction ID to poll
   * @param maxAttempts Maximum number of polling attempts
   * @param intervalMs Interval between polls in milliseconds
   */
  async pollPaymentStatus(
    transactionId: number,
    maxAttempts: number = 60,
    intervalMs: number = 2000,
  ): Promise<TransactionStatus> {
    let attempts = 0;

    return new Promise((resolve, reject) => {
      const pollInterval = setInterval(async () => {
        attempts++;

        try {
          const status = await this.getPaymentStatus(transactionId);

          // Terminal states
          if (status.status === 'completed' || status.status === 'failed' || status.status === 'voided') {
            clearInterval(pollInterval);
            resolve(status);
            return;
          }

          // Max attempts reached
          if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            reject(new Error('Payment status check timeout'));
          }
        } catch (error) {
          if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            reject(error);
          }
          // Continue polling on errors until max attempts
        }
      }, intervalMs);
    });
  }

  /**
   * Format amount for display
   */
  formatAmount(amount: number, currency: string = 'COP'): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Validate Colombian document number
   */
  validateDocumentNumber(type: string, number: string): { valid: boolean; message?: string } {
    const cleanNumber = number.replace(/\D/g, '');

    switch (type) {
      case 'CC':
        if (cleanNumber.length < 6 || cleanNumber.length > 10) {
          return { valid: false, message: 'Cédula debe tener entre 6 y 10 dígitos' };
        }
        break;
      case 'CE':
        if (cleanNumber.length < 6 || cleanNumber.length > 7) {
          return { valid: false, message: 'Cédula de extranjería debe tener 6-7 dígitos' };
        }
        break;
      case 'NIT':
        if (cleanNumber.length < 9 || cleanNumber.length > 10) {
          return { valid: false, message: 'NIT debe tener 9-10 dígitos' };
        }
        break;
      case 'PP':
        if (number.length < 6 || number.length > 20) {
          return { valid: false, message: 'Pasaporte inválido' };
        }
        break;
      case 'TI':
        if (cleanNumber.length < 8 || cleanNumber.length > 11) {
          return { valid: false, message: 'Tarjeta de identidad debe tener 8-11 dígitos' };
        }
        break;
      default:
        return { valid: false, message: 'Tipo de documento no válido' };
    }

    return { valid: true };
  }

  /**
   * Validate Colombian phone number
   */
  validatePhoneNumber(phone: string): { valid: boolean; message?: string } {
    const cleanPhone = phone.replace(/\D/g, '');

    if (cleanPhone.length !== 10) {
      return { valid: false, message: 'Teléfono debe tener 10 dígitos' };
    }

    if (!cleanPhone.startsWith('3')) {
      return { valid: false, message: 'Teléfono celular debe comenzar con 3' };
    }

    return { valid: true };
  }

  /**
   * Get payment method display name
   */
  getPaymentMethodName(method: string): string {
    const methods: Record<string, string> = {
      PSE: 'PSE - Débito a Cuenta Bancaria',
      CARD: 'Tarjeta de Crédito/Débito',
      NEQUI: 'Nequi',
      BANCOLOMBIA_TRANSFER: 'Transferencia Bancolombia',
    };
    return methods[method] || method;
  }

  /**
   * Get status display information
   */
  getStatusInfo(status: string): { label: string; color: string; icon: string } {
    const statusMap: Record<string, { label: string; color: string; icon: string }> = {
      pending: { label: 'Pendiente', color: 'warning', icon: '⏳' },
      completed: { label: 'Completado', color: 'success', icon: '✅' },
      failed: { label: 'Fallido', color: 'error', icon: '❌' },
      voided: { label: 'Anulado', color: 'default', icon: '🚫' },
      processing: { label: 'Procesando', color: 'info', icon: '🔄' },
    };
    return statusMap[status] || { label: status, color: 'default', icon: '❓' };
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): Error {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.error || error.response.data?.message || 'Error en el servidor';
      return new Error(message);
    } else if (error.request) {
      // Request made but no response
      return new Error('No se pudo conectar con el servidor. Verifica tu conexión a internet.');
    } else {
      // Something else happened
      return new Error(error.message || 'Error desconocido');
    }
  }

  /**
   * Create return URL with transaction reference
   */
  createReturnURL(baseURL: string, reference: string, success: boolean = true): string {
    const params = new URLSearchParams({
      reference,
      status: success ? 'success' : 'failed',
    });
    return `${baseURL}?${params.toString()}`;
  }

  /**
   * Parse return URL parameters
   */
  parseReturnURL(url: string): { reference: string; status: string } | null {
    try {
      const urlObj = new URL(url);
      const reference = urlObj.searchParams.get('reference');
      const status = urlObj.searchParams.get('status');

      if (reference && status) {
        return { reference, status };
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}

// Export singleton instance
const wompiService = new WompiService();
export default wompiService;
