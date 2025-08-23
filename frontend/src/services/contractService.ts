import { api } from './api';
import { Contract, ContractFormData, ContractFilters, ContractTemplate, ContractSignature, ContractDocument, ContractStats, SignatureData, BiometricData } from '../types/contract';

// ===== CONTRACTS CRUD =====

const getContracts = async (filters?: ContractFilters): Promise<Contract[]> => {
  try {
    const response = await api.get('/contracts/contracts/', {
      params: filters,
    });
    // Handle both array and paginated response formats
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && response.data.results) {
      return response.data.results;
    } else {
      return [];
    }
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

// ===== BIOMETRIC AUTHENTICATION FLOW - NEW APIS =====

/**
 * Iniciar proceso de autenticación biométrica
 */
const startBiometricAuthentication = async (contractId: string): Promise<any> => {
  try {
    const response = await api.post(`/contracts/${contractId}/start-authentication/`);
    return response.data;
  } catch (error) {
    console.error('Error starting biometric authentication:', error);
    throw error;
  }
};

/**
 * Procesar captura facial (frontal y lateral)
 */
const processFaceCapture = async (contractId: string, frontImage: string, sideImage: string): Promise<any> => {
  try {
    const response = await api.post(`/contracts/${contractId}/auth/face-capture/`, {
      face_front_image: frontImage,
      face_side_image: sideImage
    });
    return response.data;
  } catch (error) {
    console.error('Error processing face capture:', error);
    throw error;
  }
};

/**
 * Procesar verificación de documento
 */
const processDocumentVerification = async (contractId: string, documentImage: string, documentType: string, documentNumber?: string): Promise<any> => {
  try {
    const response = await api.post(`/contracts/${contractId}/auth/document-capture/`, {
      document_image: documentImage,
      document_type: documentType,
      document_number: documentNumber || ''
    });
    return response.data;
  } catch (error) {
    console.error('Error processing document verification:', error);
    throw error;
  }
};

/**
 * Procesar verificación combinada (documento + rostro)
 */
const processCombinedVerification = async (contractId: string, combinedImage: string): Promise<any> => {
  try {
    const response = await api.post(`/contracts/${contractId}/auth/combined-capture/`, {
      combined_image: combinedImage
    });
    return response.data;
  } catch (error) {
    console.error('Error processing combined verification:', error);
    throw error;
  }
};

/**
 * Procesar verificación de voz
 */
const processVoiceVerification = async (contractId: string, voiceRecording: string, expectedText?: string): Promise<any> => {
  try {
    const response = await api.post(`/contracts/${contractId}/auth/voice-capture/`, {
      voice_recording: voiceRecording,
      expected_text: expectedText
    });
    return response.data;
  } catch (error) {
    console.error('Error processing voice verification:', error);
    throw error;
  }
};

/**
 * Completar autenticación biométrica
 */
const completeAuthentication = async (contractId: string): Promise<any> => {
  try {
    const response = await api.post(`/contracts/${contractId}/complete-auth/`);
    return response.data;
  } catch (error) {
    console.error('Error completing authentication:', error);
    throw error;
  }
};

/**
 * Consultar estado de autenticación biométrica
 */
const getBiometricAuthenticationStatus = async (contractId: string): Promise<any> => {
  try {
    const response = await api.get(`/contracts/${contractId}/auth/status/`);
    return response.data;
  } catch (error) {
    console.error('Error getting biometric authentication status:', error);
    throw error;
  }
};

/**
 * Generar PDF del contrato
 */
const generateContractPDF = async (contractId: string): Promise<any> => {
  try {
    const response = await api.post(`/contracts/${contractId}/generate-pdf/`);
    return response.data;
  } catch (error) {
    console.error('Error generating contract PDF:', error);
    throw error;
  }
};

/**
 * Editar contrato antes de autenticación
 */
const editContractBeforeAuth = async (contractId: string, contractData: any): Promise<any> => {
  try {
    const response = await api.patch(`/contracts/${contractId}/edit-before-auth/`, contractData);
    return response.data;
  } catch (error) {
    console.error('Error editing contract before auth:', error);
    throw error;
  }
};

// ===== LEGACY BIOMETRIC VERIFICATION (DEPRECATED) =====

/**
 * @deprecated Use new biometric authentication flow instead
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
 * @deprecated Use processDocumentVerification instead
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
 * @deprecated Use processFaceCapture instead
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

// ===== COLOMBIAN CONTRACT INTEGRATION =====

const validateMatchForContract = async (matchId: string) => {
  try {
    const response = await api.post(`/matching/requests/${matchId}/validate-contract/`);
    return response.data;
  } catch (error) {
    console.error('Error validating match for contract:', error);
    throw error;
  }
};

const createContractFromMatch = async (matchId: string, contractData: any) => {
  try {
    const response = await api.post(`/matching/requests/${matchId}/create-contract/`, contractData);
    return response.data;
  } catch (error) {
    console.error('Error creating contract from match:', error);
    throw error;
  }
};

const verifyIdentityForContract = async (contractId: string, documents: any) => {
  try {
    const response = await api.post(`/matching/contracts/${contractId}/verify-identity/`, documents);
    return response.data;
  } catch (error) {
    console.error('Error verifying identity for contract:', error);
    throw error;
  }
};

const generateLegalClauses = async (contractId: string) => {
  try {
    const response = await api.post(`/matching/contracts/${contractId}/generate-clauses/`);
    return response.data;
  } catch (error) {
    console.error('Error generating legal clauses:', error);
    throw error;
  }
};

const downloadContractPDF = async (contractId: string) => {
  try {
    const response = await api.get(`/matching/contracts/${contractId}/download-pdf/`, {
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    console.error('Error downloading contract PDF:', error);
    throw error;
  }
};

const getContractMilestones = async (contractId: string) => {
  try {
    const response = await api.get(`/matching/contracts/${contractId}/milestones/`);
    return response.data;
  } catch (error) {
    console.error('Error getting contract milestones:', error);
    throw error;
  }
};

// ===== CONTRACT WORKFLOW ACTIONS =====

/**
 * Enviar contrato para revisión del arrendatario
 */
const sendContractForReview = async (contractId: string): Promise<any> => {
  try {
    const response = await api.patch(`/contracts/contracts/${contractId}/`, {
      status: 'pending_tenant_review'
    });
    return response.data;
  } catch (error) {
    console.error('Error sending contract for review:', error);
    throw error;
  }
};

/**
 * Respuesta del arrendatario a la revisión del contrato
 */
const tenantContractReview = async (contractId: string, action: 'approve' | 'request_changes', comments?: string): Promise<any> => {
  try {
    const response = await api.post('/contracts/tenant-review/', {
      contract_id: contractId,
      action: action,
      comments: comments || ''
    });
    return response.data;
  } catch (error) {
    console.error('Error processing tenant contract review:', error);
    throw error;
  }
};

/**
 * Obtener contratos pendientes de revisión para el arrendatario actual
 */
const getPendingTenantReviewContracts = async (): Promise<Contract[]> => {
  try {
    const response = await api.get('/contracts/contracts/', {
      params: {
        status: 'pending_tenant_review'
      }
    });
    // Handle both array and paginated response formats
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && response.data.results) {
      return response.data.results;
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error fetching pending tenant review contracts:', error);
    throw error;
  }
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
  
  // Biometric Authentication Flow - NEW
  startBiometricAuthentication,
  processFaceCapture,
  processDocumentVerification,
  processCombinedVerification,
  processVoiceVerification,
  completeAuthentication,
  getBiometricAuthenticationStatus,
  generateContractPDF,
  generateContractPdf: generateContractPDF, // Alias for compatibility
  editContractBeforeAuth,
  
  // Biometric (deprecated - legacy)
  processBiometricVerification,
  verifyIdentityDocument,
  verifyFacialRecognition,
  
  // Colombian Contract Integration
  validateMatchForContract,
  createContractFromMatch,
  verifyIdentityForContract,
  generateLegalClauses,
  downloadContractPDF,
  getContractMilestones,
  
  // Contract Workflow Actions
  sendContractForReview,
  tenantContractReview,
  getPendingTenantReviewContracts,
};

export default contractService;
/* FORCE RELOAD 1754456937796 - CONTRACT_SERVICE - Nuclear fix applied */
