/**
 * Tests de Integración - Flujo Biométrico Completo
 * Prueba la integración completa del sistema biométrico con contratos
 * Incluye pruebas de rendimiento, seguridad y manejo de errores
 */

// The api module is already mocked globally in setupTests.ts via __mocks__/api.ts
import { api } from '../../services/api';
import contractService from '../../services/contractService';

// Test utilities
import {
  createMockContract,
  createMockSignatureData,
  createTestDates
} from '../../test-utils/contractTestUtils';

// Cast to jest.Mock for typing
const mockGet = api.get as jest.Mock;
const mockPost = api.post as jest.Mock;

// Mock contract data
const mockContract = createMockContract('READY_TO_SIGN', {
  id: 'biometric-test-contract-123',
  property_address: 'Apartamento Biométrico Test, El Poblado'
});

// Mock biometric responses
const createBiometricResponses = () => ({
  initialization: {
    authenticationId: 'auth-biometric-123',
    sessionTimeout: 900000,
    securityLevel: 'high',
    deviceFingerprint: 'device-fingerprint-789'
  },

  faceCapture: {
    authenticationId: 'auth-biometric-123',
    step: 'face_front',
    status: 'success',
    confidenceScore: 0.95,
    qualityScore: 0.92,
    biometricData: {
      faceDetected: true,
      eyesDetected: true,
      faceAngle: 2.1,
      lightingQuality: 0.88,
      imageSharpness: 0.94
    },
    nextStep: 'face_side',
    completedSteps: {
      face_front: true,
      face_side: false,
      document: false,
      combined: false,
      voice: false
    }
  },

  documentVerification: {
    authenticationId: 'auth-biometric-123',
    step: 'document',
    status: 'success',
    confidenceScore: 0.98,
    extractedData: {
      documentType: 'CC',
      documentNumber: '12345678',
      fullName: 'ANA MARIA GONZALEZ',
      birthDate: '1990-05-15',
      expirationDate: '2030-05-15',
      issuePlace: 'BOGOTA D.C.'
    },
    validationResults: {
      formatValid: true,
      hologramValid: true,
      fontConsistent: true,
      photoMatch: 0.94
    },
    nextStep: 'combined'
  },

  voiceRecording: {
    authenticationId: 'auth-biometric-123',
    step: 'voice',
    status: 'success',
    confidenceScore: 0.89,
    transcription: 'Yo Ana María González acepto los términos y condiciones de este contrato de arrendamiento',
    phraseMatch: 0.96,
    voiceAnalysis: {
      clarity: 0.91,
      backgroundNoise: 0.15,
      speechRate: 'normal',
      confidence: 0.89
    },
    nextStep: 'signature'
  },

  finalCompletion: {
    contract_id: 'biometric-test-contract-123',
    signature_completed: true,
    biometric_verified: true,
    confidence_scores: {
      face_confidence: 0.95,
      document_confidence: 0.98,
      voice_confidence: 0.89,
      signature_quality: 0.92,
      overall_confidence: 0.94
    },
    security_checks: {
      device_integrity: true,
      location_verified: true,
      session_valid: true,
      fraud_score: 0.02
    },
    signed_at: new Date().toISOString(),
    certificate_id: 'cert-biometric-456'
  }
});

describe('Biometric Flow Integration Tests', () => {
  let biometricResponses: ReturnType<typeof createBiometricResponses>;

  beforeEach(() => {
    biometricResponses = createBiometricResponses();
    jest.clearAllMocks();
  });

  // =====================================================================
  // PRUEBAS DE INTEGRACIÓN COMPLETA DEL FLUJO BIOMÉTRICO
  // =====================================================================

  describe('Complete Biometric Authentication Flow', () => {
    it('should complete full 5-step biometric authentication via services', async () => {
      // Step 1: Start biometric authentication
      mockPost.mockResolvedValueOnce({ data: biometricResponses.initialization });

      const initResult = await contractService.startBiometricAuthentication(mockContract.id);
      expect(initResult.authenticationId).toBe('auth-biometric-123');
      expect(initResult.securityLevel).toBe('high');

      // Step 2: Face capture (front and side)
      mockPost.mockResolvedValueOnce({ data: biometricResponses.faceCapture });

      const faceResult = await contractService.processFaceCapture(
        mockContract.id,
        'base64-front-image',
        'base64-side-image'
      );
      expect(faceResult.confidenceScore).toBe(0.95);
      expect(faceResult.completedSteps.face_front).toBe(true);

      // Step 3: Document verification
      mockPost.mockResolvedValueOnce({ data: biometricResponses.documentVerification });

      const docResult = await contractService.processDocumentVerification(
        mockContract.id,
        'base64-document-image',
        'CC'
      );
      expect(docResult.extractedData.documentNumber).toBe('12345678');
      expect(docResult.extractedData.fullName).toBe('ANA MARIA GONZALEZ');
      expect(docResult.validationResults.formatValid).toBe(true);

      // Step 4: Combined verification
      mockPost.mockResolvedValueOnce({
        data: {
          step: 'combined',
          status: 'success',
          confidenceScore: 0.94,
          nextStep: 'voice'
        }
      });

      const combinedResult = await contractService.processCombinedVerification(
        mockContract.id,
        'base64-combined-image'
      );
      expect(combinedResult.confidenceScore).toBe(0.94);

      // Step 5: Voice recording
      mockPost.mockResolvedValueOnce({ data: biometricResponses.voiceRecording });

      const voiceResult = await contractService.processVoiceVerification(
        mockContract.id,
        'base64-audio-data',
        'Yo Ana María González acepto los términos'
      );
      expect(voiceResult.transcription).toContain('acepto los términos');
      expect(voiceResult.confidenceScore).toBe(0.89);

      // Step 6: Complete authentication
      mockPost.mockResolvedValueOnce({ data: biometricResponses.finalCompletion });

      const completionResult = await contractService.completeAuthentication(mockContract.id);
      expect(completionResult.biometric_verified).toBe(true);
      expect(completionResult.confidence_scores.overall_confidence).toBe(0.94);
      expect(completionResult.certificate_id).toBe('cert-biometric-456');

      // Verify all 6 API calls were made
      expect(mockPost).toHaveBeenCalledTimes(6);
    });

    it('should handle sequential step dependencies correctly', async () => {
      // Initialization
      mockPost.mockResolvedValueOnce({ data: biometricResponses.initialization });
      const init = await contractService.startBiometricAuthentication(mockContract.id);

      // Face capture
      mockPost.mockResolvedValueOnce({ data: biometricResponses.faceCapture });
      const face = await contractService.processFaceCapture(mockContract.id, 'front', 'side');

      // Verify next step is correctly indicated
      expect(face.nextStep).toBe('face_side');
      expect(face.completedSteps.face_front).toBe(true);
      expect(face.completedSteps.document).toBe(false);

      // Document
      mockPost.mockResolvedValueOnce({ data: biometricResponses.documentVerification });
      const doc = await contractService.processDocumentVerification(mockContract.id, 'doc-img', 'CC');
      expect(doc.nextStep).toBe('combined');
    });

    it('should handle biometric quality failures and retry mechanism', async () => {
      // Low quality response
      const lowQualityResponse = {
        ...biometricResponses.faceCapture,
        status: 'warning',
        confidenceScore: 0.65,
        qualityScore: 0.55,
        message: 'Calidad insuficiente. Intenta con mejor iluminación.'
      };

      mockPost.mockResolvedValueOnce({ data: lowQualityResponse });

      const result = await contractService.processFaceCapture(
        mockContract.id,
        'low-quality-front',
        'low-quality-side'
      );

      expect(result.status).toBe('warning');
      expect(result.confidenceScore).toBe(0.65);
      expect(result.message).toContain('mejor iluminación');

      // Retry with better quality
      const highQualityResponse = {
        ...biometricResponses.faceCapture,
        confidenceScore: 0.95,
        qualityScore: 0.92
      };

      mockPost.mockResolvedValueOnce({ data: highQualityResponse });

      const retryResult = await contractService.processFaceCapture(
        mockContract.id,
        'better-front',
        'better-side'
      );

      expect(retryResult.confidenceScore).toBe(0.95);
      expect(retryResult.status).toBe('success');
    });
  });

  // =====================================================================
  // PRUEBAS DE VERIFICACIÓN DE DOCUMENTOS
  // =====================================================================

  describe('Document Verification Integration', () => {
    it('should verify Colombian Cédula de Ciudadanía', async () => {
      mockPost.mockResolvedValueOnce({ data: biometricResponses.documentVerification });

      const result = await contractService.processDocumentVerification(
        mockContract.id,
        'base64-cedula-image',
        'CC'
      );

      expect(result.extractedData.documentType).toBe('CC');
      expect(result.extractedData.documentNumber).toBe('12345678');
      expect(result.extractedData.fullName).toBe('ANA MARIA GONZALEZ');
      expect(result.extractedData.birthDate).toBe('1990-05-15');
      expect(result.validationResults.formatValid).toBe(true);
      expect(result.validationResults.hologramValid).toBe(true);
    });

    it('should handle unsupported document types', async () => {
      mockPost.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            error: 'unsupported_document',
            message: 'Tipo de documento no soportado',
            supported_types: ['CC', 'CE', 'PASAPORTE', 'LICENCIA', 'RUT']
          }
        }
      });

      try {
        await contractService.processDocumentVerification(
          mockContract.id,
          'unknown-doc-image',
          'UNKNOWN'
        );
        fail('Should have thrown');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBe('unsupported_document');
        expect(error.response.data.supported_types).toContain('CC');
      }
    });
  });

  // =====================================================================
  // PRUEBAS DE SEGURIDAD Y FRAUD DETECTION
  // =====================================================================

  describe('Security and Fraud Detection', () => {
    it('should detect and handle fraudulent attempts', async () => {
      mockPost.mockRejectedValueOnce({
        response: {
          status: 403,
          data: {
            error: 'fraud_detected',
            message: 'Actividad sospechosa detectada. Sesión bloqueada por seguridad.',
            fraud_indicators: [
              'multiple_devices_detected',
              'location_mismatch',
              'unusual_timing_pattern'
            ],
            security_action: 'session_terminated',
            contact_support: true
          }
        }
      });

      try {
        await contractService.processFaceCapture(mockContract.id, 'front', 'side');
        fail('Should have thrown');
      } catch (error: any) {
        expect(error.response.status).toBe(403);
        expect(error.response.data.error).toBe('fraud_detected');
        expect(error.response.data.fraud_indicators).toContain('multiple_devices_detected');
        expect(error.response.data.security_action).toBe('session_terminated');
      }
    });

    it('should handle session expiration', async () => {
      mockPost.mockRejectedValueOnce({
        response: {
          status: 401,
          data: {
            error: 'session_expired',
            message: 'La sesión de autenticación ha expirado por seguridad.'
          }
        }
      });

      try {
        await contractService.processFaceCapture(mockContract.id, 'front', 'side');
        fail('Should have thrown');
      } catch (error: any) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.error).toBe('session_expired');
      }
    });

    it('should handle multiple failed authentication attempts', async () => {
      // Simulate 3 failed attempts
      for (let i = 0; i < 3; i++) {
        mockPost.mockRejectedValueOnce({
          response: {
            status: 400,
            data: {
              error: 'authentication_failed',
              attempt: i + 1,
              max_attempts: 3,
              remaining_attempts: 2 - i,
              message: `Intento ${i + 1} de 3 fallido`
            }
          }
        });
      }

      for (let i = 0; i < 3; i++) {
        try {
          await contractService.processFaceCapture(mockContract.id, 'bad-front', 'bad-side');
          fail('Should have thrown');
        } catch (error: any) {
          expect(error.response.status).toBe(400);
          expect(error.response.data.attempt).toBe(i + 1);
          expect(error.response.data.remaining_attempts).toBe(2 - i);
        }
      }

      expect(mockPost).toHaveBeenCalledTimes(3);
    });
  });

  // =====================================================================
  // PRUEBAS DE RENDIMIENTO
  // =====================================================================

  describe('Performance and Optimization', () => {
    it('should handle all biometric steps within performance budget', async () => {
      // Setup all mock responses
      mockPost
        .mockResolvedValueOnce({ data: biometricResponses.initialization })
        .mockResolvedValueOnce({ data: biometricResponses.faceCapture })
        .mockResolvedValueOnce({ data: biometricResponses.documentVerification })
        .mockResolvedValueOnce({ data: biometricResponses.voiceRecording })
        .mockResolvedValueOnce({ data: biometricResponses.finalCompletion });

      const startTime = performance.now();

      await contractService.startBiometricAuthentication(mockContract.id);
      await contractService.processFaceCapture(mockContract.id, 'front', 'side');
      await contractService.processDocumentVerification(mockContract.id, 'doc', 'CC');
      await contractService.processVoiceVerification(mockContract.id, 'voice', 'phrase');
      await contractService.completeAuthentication(mockContract.id);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(1000);
      expect(mockPost).toHaveBeenCalledTimes(5);
    });

    it('should handle concurrent status checks efficiently', async () => {
      mockGet.mockResolvedValue({
        data: {
          status: 'in_progress',
          completedSteps: { face_front: true }
        }
      });

      const startTime = performance.now();

      const promises = Array.from({ length: 5 }, () =>
        contractService.getBiometricAuthenticationStatus(mockContract.id)
      );

      const results = await Promise.all(promises);
      const endTime = performance.now();

      expect(results).toHaveLength(5);
      expect(endTime - startTime).toBeLessThan(500);
      results.forEach(result => {
        expect(result.status).toBe('in_progress');
      });
    });
  });

  // =====================================================================
  // PRUEBAS DE INTEGRIDAD DE DATOS
  // =====================================================================

  describe('Data Integrity', () => {
    it('should maintain consistent authentication ID across all steps', async () => {
      const authId = 'auth-biometric-123';

      // All responses use the same authenticationId
      mockPost
        .mockResolvedValueOnce({ data: { ...biometricResponses.initialization, authenticationId: authId } })
        .mockResolvedValueOnce({ data: { ...biometricResponses.faceCapture, authenticationId: authId } })
        .mockResolvedValueOnce({ data: { ...biometricResponses.documentVerification, authenticationId: authId } });

      const init = await contractService.startBiometricAuthentication(mockContract.id);
      expect(init.authenticationId).toBe(authId);

      const face = await contractService.processFaceCapture(mockContract.id, 'front', 'side');
      expect(face.authenticationId).toBe(authId);

      const doc = await contractService.processDocumentVerification(mockContract.id, 'doc', 'CC');
      expect(doc.authenticationId).toBe(authId);
    });

    it('should track completed steps accurately', async () => {
      const steps = [
        { face_front: true, face_side: false, document: false, combined: false, voice: false },
        { face_front: true, face_side: true, document: false, combined: false, voice: false },
        { face_front: true, face_side: true, document: true, combined: false, voice: false },
      ];

      mockPost
        .mockResolvedValueOnce({ data: { completedSteps: steps[0] } })
        .mockResolvedValueOnce({ data: { completedSteps: steps[1] } })
        .mockResolvedValueOnce({ data: { completedSteps: steps[2] } });

      const result1 = await contractService.processFaceCapture(mockContract.id, 'front', 'side');
      expect(result1.completedSteps.face_front).toBe(true);
      expect(result1.completedSteps.document).toBe(false);

      const result2 = await contractService.processFaceCapture(mockContract.id, 'front2', 'side2');
      expect(result2.completedSteps.face_side).toBe(true);

      const result3 = await contractService.processDocumentVerification(mockContract.id, 'doc', 'CC');
      expect(result3.completedSteps.document).toBe(true);
    });
  });
});
