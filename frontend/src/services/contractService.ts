import { api } from './api';
import {
  Contract,
  ContractFormData,
  ContractFilters,
  ContractTemplate,
  ContractSignature,
  ContractDocument,
  ContractStats,
  SignatureData,
  BiometricData,
} from '../types/contract';

// ===== CONTRACTS CRUD =====

const getContracts = async (filters?: ContractFilters): Promise<Contract[]> => {
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
};

const getContract = async (id: string): Promise<Contract> => {
  const response = await api.get(`/contracts/contracts/${id}/`);
  return response.data;
};

const createContract = async (
  contractData: ContractFormData,
): Promise<Contract> => {
  const response = await api.post('/contracts/contracts/', contractData);
  return response.data;
};

const updateContract = async (
  id: string,
  contractData: Partial<ContractFormData>,
): Promise<Contract> => {
  const response = await api.patch(`/contracts/contracts/${id}/`, contractData);
  return response.data;
};

const deleteContract = async (id: string): Promise<void> => {
  await api.delete(`/contracts/contracts/${id}/`);
};

// ===== CONTRACT TEMPLATES =====

const getTemplates = async (): Promise<ContractTemplate[]> => {
  const response = await api.get('/contracts/templates/');
  return response.data;
};

const getTemplate = async (id: string): Promise<ContractTemplate> => {
  const response = await api.get(`/contracts/templates/${id}/`);
  return response.data;
};

const createTemplate = async (templateData: any): Promise<ContractTemplate> => {
  const response = await api.post('/contracts/templates/', templateData);
  return response.data;
};

const updateTemplate = async (
  id: string,
  templateData: any,
): Promise<ContractTemplate> => {
  const response = await api.patch(`/contracts/templates/${id}/`, templateData);
  return response.data;
};

const deleteTemplate = async (id: string): Promise<void> => {
  await api.delete(`/contracts/templates/${id}/`);
};

// ===== DIGITAL SIGNATURES =====

const getSignatures = async (
  contractId?: string,
): Promise<ContractSignature[]> => {
  const url = contractId
    ? `/contracts/signatures/?contract=${contractId}`
    : '/contracts/signatures/';
  const response = await api.get(url);
  return response.data;
};

const createSignature = async (
  signatureData: any,
): Promise<ContractSignature> => {
  const response = await api.post('/contracts/signatures/', signatureData);
  return response.data;
};

/**
 * Firma digital avanzada con verificación biométrica
 */
const signContract = async (
  contractId: string,
  signatureData: SignatureData,
  biometricData?: BiometricData,
  verificationLevel: 'basic' | 'enhanced' | 'maximum' = 'basic',
): Promise<ContractSignature> => {
  const payload = {
    signature_data: {
      signature: signatureData.signature,
      timestamp: signatureData.timestamp,
      signerInfo: signatureData.signerInfo,
      verification: signatureData.verification,
    },
    biometric_data: biometricData || {},
    verification_level: verificationLevel,
    device_info: {
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
    },
  };

  const response = await api.post(
    `/contracts/contracts/${contractId}/sign/`,
    payload,
  );
  return response.data;
};

/**
 * Verificar la autenticidad de una firma
 */
const verifySignature = async (
  contractId: string,
  verificationData: any,
): Promise<any> => {
  const response = await api.post(
    `/contracts/contracts/${contractId}/verify-signature/`,
    verificationData,
  );
  return response.data;
};

// ===== CONTRACT STATES =====

/**
 * Activar un contrato completamente firmado
 */
const activateContract = async (contractId: string): Promise<Contract> => {
  const response = await api.post(
    `/contracts/contracts/${contractId}/activate/`,
  );
  return response.data;
};

/**
 * Suspender un contrato activo
 */
const suspendContract = async (
  contractId: string,
  reason?: string,
): Promise<Contract> => {
  const response = await api.post(
    `/contracts/contracts/${contractId}/suspend/`,
    { reason },
  );
  return response.data;
};

// ===== AMENDMENTS =====

const getAmendments = async (contractId?: string): Promise<any[]> => {
  const url = contractId
    ? `/contracts/amendments/?contract=${contractId}`
    : '/contracts/amendments/';
  const response = await api.get(url);
  return response.data;
};

const createAmendment = async (amendmentData: any): Promise<any> => {
  const response = await api.post('/contracts/amendments/', amendmentData);
  return response.data;
};

// ===== RENEWALS =====

const getRenewals = async (contractId?: string): Promise<any[]> => {
  const url = contractId
    ? `/contracts/renewals/?contract=${contractId}`
    : '/contracts/renewals/';
  const response = await api.get(url);
  return response.data;
};

const createRenewal = async (renewalData: any): Promise<any> => {
  const response = await api.post('/contracts/renewals/', renewalData);
  return response.data;
};

// ===== TERMINATIONS =====

const getTerminations = async (contractId?: string): Promise<any[]> => {
  const url = contractId
    ? `/contracts/terminations/?contract=${contractId}`
    : '/contracts/terminations/';
  const response = await api.get(url);
  return response.data;
};

const createTermination = async (terminationData: any): Promise<any> => {
  const response = await api.post('/contracts/terminations/', terminationData);
  return response.data;
};

// ===== DOCUMENT MANAGEMENT =====

const getDocuments = async (
  contractId?: string,
): Promise<ContractDocument[]> => {
  const url = contractId
    ? `/contracts/documents/?contract=${contractId}`
    : '/contracts/documents/';
  const response = await api.get(url);
  return response.data;
};

const uploadDocument = async (
  contractId: string,
  documentData: FormData,
): Promise<ContractDocument> => {
  const response = await api.post(
    `/contracts/contracts/${contractId}/documents/upload/`,
    documentData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );
  return response.data;
};

const deleteDocument = async (documentId: string): Promise<void> => {
  await api.delete(`/contracts/documents/${documentId}/`);
};

// ===== REPORTS AND ANALYTICS =====

const getExpiringContracts = async (): Promise<Contract[]> => {
  const response = await api.get('/contracts/reports/expiring/');
  return response.data;
};

const getPendingSignatures = async (): Promise<Contract[]> => {
  const response = await api.get('/contracts/reports/pending-signatures/');
  return response.data;
};

const getContractStats = async (): Promise<ContractStats> => {
  const response = await api.get('/contracts/stats/');
  return response.data;
};

// ===== BIOMETRIC AUTHENTICATION FLOW - NEW APIS =====

/**
 * Iniciar proceso de autenticación biométrica
 */
const startBiometricAuthentication = async (
  contractId: string,
): Promise<any> => {
  const response = await api.post(
    `/contracts/${contractId}/start-authentication/`,
  );
  return response.data;
};

/**
 * Procesar captura facial (frontal y lateral)
 */
const processFaceCapture = async (
  contractId: string,
  frontImage: string,
  sideImage: string,
): Promise<any> => {
  const response = await api.post(
    `/contracts/${contractId}/auth/face-capture/`,
    {
      face_front_image: frontImage,
      face_side_image: sideImage,
    },
  );
  return response.data;
};

/**
 * Procesar verificación de documento
 */
const processDocumentVerification = async (
  contractId: string,
  documentImage: string,
  documentType: string,
  documentNumber?: string,
): Promise<any> => {
  const response = await api.post(
    `/contracts/${contractId}/auth/document-capture/`,
    {
      document_image: documentImage,
      document_type: documentType,
      document_number: documentNumber || '',
    },
  );
  return response.data;
};

/**
 * Procesar verificación combinada (documento + rostro)
 */
const processCombinedVerification = async (
  contractId: string,
  combinedImage: string,
): Promise<any> => {
  const response = await api.post(
    `/contracts/${contractId}/auth/combined-capture/`,
    {
      combined_image: combinedImage,
    },
  );
  return response.data;
};

/**
 * Procesar verificación de voz
 */
const processVoiceVerification = async (
  contractId: string,
  voiceRecording: string,
  expectedText?: string,
): Promise<any> => {
  const response = await api.post(
    `/contracts/${contractId}/auth/voice-capture/`,
    {
      voice_recording: voiceRecording,
      expected_text: expectedText,
    },
  );
  return response.data;
};

/**
 * Completar autenticación biométrica
 */
const completeAuthentication = async (contractId: string): Promise<any> => {
  const response = await api.post(`/contracts/${contractId}/complete-auth/`);
  return response.data;
};

/**
 * Consultar estado de autenticación biométrica
 */
const getBiometricAuthenticationStatus = async (
  contractId: string,
): Promise<any> => {
  const response = await api.get(`/contracts/${contractId}/auth/status/`);
  return response.data;
};

/**
 * Generar PDF del contrato
 */
const generateContractPDF = async (contractId: string): Promise<any> => {
  const response = await api.post(`/contracts/${contractId}/generate-pdf/`);
  return response.data;
};

/**
 * Editar contrato antes de autenticación
 */
const editContractBeforeAuth = async (
  contractId: string,
  contractData: any,
): Promise<any> => {
  const response = await api.patch(
    `/contracts/${contractId}/edit-before-auth/`,
    contractData,
  );
  return response.data;
};

// ===== LEGACY BIOMETRIC VERIFICATION (DEPRECATED) =====

/**
 * @deprecated Use new biometric authentication flow instead
 */
const processBiometricVerification = async (
  biometricData: BiometricData,
): Promise<any> => {
  // Esta función debe conectarse con APIs reales de verificación biométrica
  // Por ahora retorna datos simulados
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        success: true,
        confidence: 0.95,
        verificationId: `bio_${Date.now()}`,
        facialRecognition: biometricData.facialRecognition,
        documentVerification: biometricData.documentVerification,
        fingerprint: biometricData.fingerprint,
      });
    }, 2000);
  });
};

/**
 * @deprecated Use processDocumentVerification instead
 */
const verifyIdentityDocument = async (documentImage: string): Promise<any> => {
  // Conectar con API real de OCR y verificación de documentos
  return new Promise(resolve => {
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
          issuingAuthority: 'Registraduría Nacional',
        },
      });
    }, 3000);
  });
};

/**
 * @deprecated Use processFaceCapture instead
 */
const verifyFacialRecognition = async (faceImage: string): Promise<any> => {
  // Conectar con API real de reconocimiento facial
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        success: true,
        confidence: 0.95,
        landmarks: {
          leftEye: { x: 150, y: 120 },
          rightEye: { x: 200, y: 120 },
          nose: { x: 175, y: 150 },
          mouth: { x: 175, y: 180 },
        },
      });
    }, 2000);
  });
};

// ===== COLOMBIAN CONTRACT INTEGRATION =====

const validateMatchForContract = async (matchId: string) => {
  const response = await api.post(
    `/matching/requests/${matchId}/validate-contract/`,
  );
  return response.data;
};

const createContractFromMatch = async (matchId: string, contractData: any) => {
  const response = await api.post(
    `/matching/requests/${matchId}/create-contract/`,
    contractData,
  );
  return response.data;
};

// ===== CONTRACT WORKFLOW ACTIONS =====

/**
 * Enviar contrato para revisión del arrendatario
 */
const sendContractForReview = async (contractId: string): Promise<any> => {
  const response = await api.patch(`/contracts/contracts/${contractId}/`, {
    status: 'pending_tenant_review',
  });
  return response.data;
};

/**
 * Respuesta del arrendatario a la revisión del contrato
 */
const tenantContractReview = async (
  contractId: string,
  action: 'approve' | 'request_changes',
  comments?: string,
): Promise<any> => {
  const response = await api.post('/contracts/tenant-review/', {
    contract_id: contractId,
    action: action,
    comments: comments || '',
  });
  return response.data;
};

/**
 * Obtener contratos pendientes de revisión para el arrendatario actual
 */
const getPendingTenantReviewContracts = async (): Promise<Contract[]> => {
  const response = await api.get('/contracts/contracts/', {
    params: {
      status: 'pending_tenant_review',
    },
  });
  // Handle both array and paginated response formats
  if (Array.isArray(response.data)) {
    return response.data;
  } else if (response.data && response.data.results) {
    return response.data.results;
  } else {
    return [];
  }
};

// ===================================================================
// NUEVAS FUNCIONES PARA MATCHED CANDIDATES VIEW
// ===================================================================

/**
 * Enviar recordatorio de autenticación biométrica al arrendatario
 */
export const sendBiometricReminder = async (contractId: string) => {
  const response = await api.post(
    `/contracts/${contractId}/send-biometric-reminder/`,
  );
  return response.data;
};

/**
 * Confirmar entrega de llaves de la propiedad
 */
export const confirmKeyDelivery = async (contractId: string) => {
  const response = await api.post(
    `/contracts/${contractId}/confirm-key-delivery/`,
  );
  return response.data;
};

/**
 * Iniciar ejecución del contrato
 */
export const startContractExecution = async (contractId: string) => {
  const response = await api.post(`/contracts/${contractId}/start-execution/`);
  return response.data;
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

  // Match → Contract integration
  validateMatchForContract,
  createContractFromMatch,

  // Contract Workflow Actions
  sendContractForReview,

  // New Matched Candidates APIs
  sendBiometricReminder,
  confirmKeyDelivery,
  startContractExecution,
  tenantContractReview,
  getPendingTenantReviewContracts,
};

export default contractService;
/* FORCE RELOAD 1754456937796 - CONTRACT_SERVICE - Nuclear fix applied */
