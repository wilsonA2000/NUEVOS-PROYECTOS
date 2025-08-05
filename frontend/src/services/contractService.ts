import { api } from './api';
import { Contract, ContractFormData, ContractFilters, ContractTemplate, ContractSignature, ContractDocument, ContractStats, SignatureData, BiometricData } from '../types/contract';

// ===== CONTRACTS CRUD =====

const getContracts = async (filters?: ContractFilters): Promise<Contract[]> => {
  try {
    const response = await api.get('/contracts/contracts/', {
      params: filters,
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching contracts:', error);
    throw error;
  }
};

const getContract = async (id: string): Promise<Contract> => {
  try {
    const response = await api.get(`/contracts/contracts/${id}/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching contract:', error);
    throw error;
  }
};

const createContract = async (contractData: ContractFormData): Promise<Contract> => {
  try {
    const response = await api.post('/contracts/contracts/', contractData);
    return response.data;
  } catch (error) {
    console.error('Error creating contract:', error);
    throw error;
  }
};

const updateContract = async (id: string, contractData: Partial<ContractFormData>): Promise<Contract> => {
  try {
    const response = await api.patch(`/contracts/contracts/${id}/`, contractData);
    return response.data;
  } catch (error) {
    console.error('Error updating contract:', error);
    throw error;
  }
};

const deleteContract = async (id: string): Promise<void> => {
  try {
    await api.delete(`/contracts/contracts/${id}/`);
  } catch (error) {
    console.error('Error deleting contract:', error);
    throw error;
  }
};

// ===== CONTRACT TEMPLATES =====

const getTemplates = async (): Promise<ContractTemplate[]> => {
  try {
    const response = await api.get('/contracts/templates/');
    return response.data;
  } catch (error) {
    console.error('Error fetching contract templates:', error);
    throw error;
  }
};

const getTemplate = async (id: string): Promise<ContractTemplate> => {
  try {
    const response = await api.get(`/contracts/templates/${id}/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching contract template:', error);
    throw error;
  }
};

const createTemplate = async (templateData: any): Promise<ContractTemplate> => {
  try {
    const response = await api.post('/contracts/templates/', templateData);
    return response.data;
  } catch (error) {
    console.error('Error creating contract template:', error);
    throw error;
  }
};

const updateTemplate = async (id: string, templateData: any): Promise<ContractTemplate> => {
  try {
    const response = await api.patch(`/contracts/templates/${id}/`, templateData);
    return response.data;
  } catch (error) {
    console.error('Error updating template:', error);
    throw error;
  }
};

const deleteTemplate = async (id: string): Promise<void> => {
  try {
    await api.delete(`/contracts/templates/${id}/`);
  } catch (error) {
    console.error('Error deleting template:', error);
    throw error;
  }
};

// ===== DIGITAL SIGNATURES =====

const getSignatures = async (contractId?: string): Promise<ContractSignature[]> => {
  try {
    const url = contractId ? `/contracts/signatures/?contract=${contractId}` : '/contracts/signatures/';
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching signatures:', error);
    throw error;
  }
};

const createSignature = async (signatureData: any): Promise<ContractSignature> => {
  try {
    const response = await api.post('/contracts/signatures/', signatureData);
    return response.data;
  } catch (error) {
    console.error('Error creating signature:', error);
    throw error;
  }
};

/**
 * Firma digital avanzada con verificación biométrica
 */
const signContract = async (
  contractId: string, 
  signatureData: SignatureData, 
  biometricData?: BiometricData,
  verificationLevel: 'basic' | 'enhanced' | 'maximum' = 'basic'
): Promise<ContractSignature> => {
  try {
    const payload = {
      signature_data: {
        signature: signatureData.signature,
        timestamp: signatureData.timestamp,
        signerInfo: signatureData.signerInfo,
        verification: signatureData.verification
      },
      biometric_data: biometricData || {},
      verification_level: verificationLevel,
      device_info: {
        userAgent: navigator.userAgent,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        platform: navigator.platform
      }
    };

    const response = await api.post(`/contracts/contracts/${contractId}/sign/`, payload);
    return response.data;
  } catch (error) {
    console.error('Error signing contract:', error);
    throw error;
  }
};

/**
 * Verificar la autenticidad de una firma
 */
const verifySignature = async (contractId: string, verificationData: any): Promise<any> => {
  try {
    const response = await api.post(`/contracts/contracts/${contractId}/verify-signature/`, verificationData);
    return response.data;
  } catch (error) {
    console.error('Error verifying signature:', error);
    throw error;
  }
};

// ===== CONTRACT STATES =====

/**
 * Activar un contrato completamente firmado
 */
const activateContract = async (contractId: string): Promise<Contract> => {
  try {
    const response = await api.post(`/contracts/contracts/${contractId}/activate/`);
    return response.data;
  } catch (error) {
    console.error('Error activating contract:', error);
    throw error;
  }
};

/**
 * Suspender un contrato activo
 */
const suspendContract = async (contractId: string, reason?: string): Promise<Contract> => {
  try {
    const response = await api.post(`/contracts/contracts/${contractId}/suspend/`, { reason });
    return response.data;
  } catch (error) {
    console.error('Error suspending contract:', error);
    throw error;
  }
};

// ===== AMENDMENTS =====

const getAmendments = async (contractId?: string): Promise<any[]> => {
  try {
    const url = contractId ? `/contracts/amendments/?contract=${contractId}` : '/contracts/amendments/';
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching contract amendments:', error);
    throw error;
  }
};

const createAmendment = async (amendmentData: any): Promise<any> => {
  try {
    const response = await api.post('/contracts/amendments/', amendmentData);
    return response.data;
  } catch (error) {
    console.error('Error creating contract amendment:', error);
    throw error;
  }
};

// ===== RENEWALS =====

const getRenewals = async (contractId?: string): Promise<any[]> => {
  try {
    const url = contractId ? `/contracts/renewals/?contract=${contractId}` : '/contracts/renewals/';
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching renewals:', error);
    throw error;
  }
};

const createRenewal = async (renewalData: any): Promise<any> => {
  try {
    const response = await api.post('/contracts/renewals/', renewalData);
    return response.data;
  } catch (error) {
    console.error('Error creating renewal:', error);
    throw error;
  }
};

// ===== TERMINATIONS =====

const getTerminations = async (contractId?: string): Promise<any[]> => {
  try {
    const url = contractId ? `/contracts/terminations/?contract=${contractId}` : '/contracts/terminations/';
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching terminations:', error);
    throw error;
  }
};

const createTermination = async (terminationData: any): Promise<any> => {
  try {
    const response = await api.post('/contracts/terminations/', terminationData);
    return response.data;
  } catch (error) {
    console.error('Error creating termination:', error);
    throw error;
  }
};

// ===== DOCUMENT MANAGEMENT =====

const getDocuments = async (contractId?: string): Promise<ContractDocument[]> => {
  try {
    const url = contractId ? `/contracts/documents/?contract=${contractId}` : '/contracts/documents/';
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching contract documents:', error);
    throw error;
  }
};

const uploadDocument = async (contractId: string, documentData: FormData): Promise<ContractDocument> => {
  try {
    const response = await api.post(`/contracts/contracts/${contractId}/documents/upload/`, documentData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
};

const deleteDocument = async (documentId: string): Promise<void> => {
  try {
    await api.delete(`/contracts/documents/${documentId}/`);
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

// ===== REPORTS AND ANALYTICS =====

const getExpiringContracts = async (): Promise<Contract[]> => {
  try {
    const response = await api.get('/contracts/reports/expiring/');
    return response.data;
  } catch (error) {
    console.error('Error fetching expiring contracts:', error);
    throw error;
  }
};

const getPendingSignatures = async (): Promise<Contract[]> => {
  try {
    const response = await api.get('/contracts/reports/pending-signatures/');
    return response.data;
  } catch (error) {
    console.error('Error fetching pending signatures:', error);
    throw error;
  }
};

const getContractStats = async (): Promise<ContractStats> => {
  try {
    const response = await api.get('/contracts/stats/');
    return response.data;
  } catch (error) {
    console.error('Error fetching contract stats:', error);
    throw error;
  }
};

// ===== BIOMETRIC VERIFICATION (MOCK - TO BE REPLACED) =====

/**
 * Procesar verificación biométrica (simulado - conectar con API real)
 */
const processBiometricVerification = async (biometricData: BiometricData): Promise<any> => {
  // Esta función debe conectarse con APIs reales de verificación biométrica
  // Por ahora retorna datos simulados
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        confidence: 0.95,
        verificationId: 'bio_' + Date.now(),
        facialRecognition: biometricData.facialRecognition,
        documentVerification: biometricData.documentVerification,
        fingerprint: biometricData.fingerprint
      });
    }, 2000);
  });
};

/**
 * Verificar documento de identidad (simulado - conectar con API real)
 */
const verifyIdentityDocument = async (documentImage: string): Promise<any> => {
  // Conectar con API real de OCR y verificación de documentos
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        confidence: 0.92,
        extractedData: {
          documentType: 'Cédula de Ciudadanía',
          documentNumber: '1234567890',
          fullName: 'Juan Pérez García',
          dateOfBirth: '1990-05-15',
          expirationDate: '2030-05-15',
          issuingAuthority: 'Registraduría Nacional'
        }
      });
    }, 3000);
  });
};

/**
 * Verificar reconocimiento facial (simulado - conectar con API real)
 */
const verifyFacialRecognition = async (faceImage: string): Promise<any> => {
  // Conectar con API real de reconocimiento facial
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        confidence: 0.95,
        landmarks: {
          leftEye: { x: 150, y: 120 },
          rightEye: { x: 200, y: 120 },
          nose: { x: 175, y: 150 },
          mouth: { x: 175, y: 180 }
        }
      });
    }, 2000);
  });
};

// ===== CONTRACT SERVICE EXPORT =====

export const contractService = {
  // Basic CRUD
  getContracts,
  getContract,
  createContract,
  updateContract,
  deleteContract,
  
  // Templates
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  
  // Signatures
  getSignatures,
  createSignature,
  signContract,
  verifySignature,
  
  // Contract states
  activateContract,
  suspendContract,
  
  // Amendments
  getAmendments,
  createAmendment,
  
  // Renewals
  getRenewals,
  createRenewal,
  
  // Terminations
  getTerminations,
  createTermination,
  
  // Documents
  getDocuments,
  uploadDocument,
  deleteDocument,
  
  // Reports
  getExpiringContracts,
  getPendingSignatures,
  getContractStats,
  
  // Biometric (mock)
  processBiometricVerification,
  verifyIdentityDocument,
  verifyFacialRecognition,
};

export default contractService;