/**
 * Tests de Integración - Flujo Biométrico Completo
 * Prueba la integración completa del sistema biométrico con contratos
 * Incluye pruebas de rendimiento, seguridad y experiencia de usuario
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, jest, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import MockAdapter from 'axios-mock-adapter';
import React from 'react';

// Components under test
import BiometricContractSigning from '../../components/contracts/BiometricContractSigning';
import CameraCapture from '../../components/contracts/CameraCapture';
import DocumentVerification from '../../components/contracts/DocumentVerification';
import VoiceRecorder from '../../components/contracts/VoiceRecorder';
import DigitalSignaturePad from '../../components/contracts/DigitalSignaturePad';

// Services
import contractService from '../services/contractService';
import { api } from '../../services/api';

// Test utilities
import {
  createMockContract,
  createMockSignatureData,
  createTestDates
} from '../../test-utils/contractTestUtils';

// Mock API
let mockAxios: MockAdapter;

// Theme para testing
const theme = createTheme();

// Test wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>
    {children}
  </ThemeProvider>
);

// Mock browser APIs
const setupBrowserMocks = () => {
  // Camera API
  global.navigator.mediaDevices = {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }],
      getVideoTracks: () => [{ getSettings: () => ({ width: 640, height: 480 }) }]
    }),
    enumerateDevices: jest.fn().mockResolvedValue([
      { deviceId: 'camera1', kind: 'videoinput', label: 'Front Camera' },
      { deviceId: 'camera2', kind: 'videoinput', label: 'Back Camera' }
    ])
  } as any;

  // MediaRecorder API
  const mockMediaRecorder = {
    start: jest.fn(),
    stop: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    state: 'inactive',
    ondataavailable: null,
    onstop: null
  };

  global.MediaRecorder = jest.fn().mockImplementation(() => mockMediaRecorder) as any;
  global.MediaRecorder.isTypeSupported = jest.fn().mockReturnValue(true);

  // Canvas API
  const mockContext = {
    fillStyle: '',
    fillRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    clearRect: jest.fn(),
    drawImage: jest.fn(),
    getImageData: jest.fn(() => ({ 
      data: new Uint8ClampedArray(4),
      width: 640,
      height: 480
    })),
    putImageData: jest.fn(),
    createImageData: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    scale: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn()
  };

  global.HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue(mockContext);
  global.HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,mock-image-data');
  global.HTMLCanvasElement.prototype.toBlob = jest.fn((callback) => {
    callback(new Blob(['mock-blob'], { type: 'image/png' }));
  });

  // URL API
  global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
  global.URL.revokeObjectURL = jest.fn();

  // File API
  global.FileReader = jest.fn().mockImplementation(() => ({
    readAsDataURL: jest.fn(),
    result: 'data:image/png;base64,mock-file-data',
    onload: null,
    onerror: null
  })) as any;

  // Geolocation API
  global.navigator.geolocation = {
    getCurrentPosition: jest.fn((success) => {
      success({
        coords: {
          latitude: 4.5709,
          longitude: -74.2973,
          accuracy: 10
        }
      });
    })
  } as any;

  return mockMediaRecorder;
};

// Mock contract data
const mockContract = createMockContract('READY_TO_SIGN', {
  id: 'biometric-test-contract-123',
  property_address: 'Apartamento Biométrico Test, El Poblado'
});

// Mock biometric responses
const createBiometricResponses = () => ({
  initialization: {
    authenticationId: 'auth-biometric-123',
    sessionTimeout: 900000, // 15 minutes
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

  finalSignature: {
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
  let mockMediaRecorder: any;
  let biometricResponses: ReturnType<typeof createBiometricResponses>;

  beforeAll(() => {
    mockMediaRecorder = setupBrowserMocks();
    
    // Mock window.performance
    global.performance.now = jest.fn(() => Date.now());
    
    // Mock ResizeObserver
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn()
    }));
  });

  beforeEach(() => {
    mockAxios = new MockAdapter(api);
    biometricResponses = createBiometricResponses();
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockAxios.restore();
  });

  afterAll(() => {
    // Cleanup global mocks
    delete (global.navigator as any).mediaDevices;
    delete (global as any).MediaRecorder;
    delete (global as any).ResizeObserver;
  });

  // =====================================================================
  // PRUEBAS DE INTEGRACIÓN COMPLETA DEL FLUJO BIOMÉTRICO
  // =====================================================================

  describe('Complete Biometric Authentication Flow', () => {
    it('should complete full 5-step biometric authentication successfully', async () => {
      const user = userEvent.setup();
      const mockOnSuccess = jest.fn();
      const mockOnError = jest.fn();

      // Setup mock responses for complete flow
      mockAxios.onPost(`/api/v1/contracts/${mockContract.id}/start-biometric-authentication/`)
        .reply(200, biometricResponses.initialization);

      // Face capture steps
      mockAxios.onPost(/\/api\/v1\/contracts\/biometric\/auth-biometric-123\/face-capture\//)
        .replyOnce(200, biometricResponses.faceCapture)
        .onPost(/\/api\/v1\/contracts\/biometric\/auth-biometric-123\/face-capture\//)
        .replyOnce(200, {
          ...biometricResponses.faceCapture,
          step: 'face_side',
          completedSteps: { ...biometricResponses.faceCapture.completedSteps, face_side: true },
          nextStep: 'document'
        });

      // Document verification
      mockAxios.onPost(/\/api\/v1\/contracts\/biometric\/auth-biometric-123\/document-capture\//)
        .reply(200, biometricResponses.documentVerification);

      // Combined photo
      mockAxios.onPost(/\/api\/v1\/contracts\/biometric\/auth-biometric-123\/combined-capture\//)
        .reply(200, {
          ...biometricResponses.documentVerification,
          step: 'combined',
          completedSteps: { ...biometricResponses.documentVerification.completedSteps, combined: true },
          nextStep: 'voice'
        });

      // Voice recording
      mockAxios.onPost(/\/api\/v1\/contracts\/biometric\/auth-biometric-123\/voice-capture\//)
        .reply(200, biometricResponses.voiceRecording);

      // Final signature
      mockAxios.onPost(`/api/v1/contracts/${mockContract.id}/complete-biometric-signature/`)
        .reply(200, biometricResponses.finalSignature);

      render(
        <TestWrapper>
          <BiometricContractSigning
            open={true}
            onClose={jest.fn()}
            contractId={mockContract.id}
            onSuccess={mockOnSuccess}
            onError={mockOnError}
          />
        </TestWrapper>
      );

      // Step 1: Initialization
      await waitFor(() => {
        expect(screen.getByText('Firma Digital con Verificación Biométrica')).toBeInTheDocument();
        expect(screen.getByText('5 Pasos de Verificación Avanzada')).toBeInTheDocument();
      });

      // Step 2: Face capture (frontal)
      await waitFor(() => {
        expect(screen.getByText('Capturar Foto Frontal')).toBeInTheDocument();
      });

      const frontalButton = screen.getByText('Capturar Foto Frontal');
      await user.click(frontalButton);

      await waitFor(() => {
        expect(mockAxios.history.post).toHaveLength(2); // Init + face capture
      });

      // Step 3: Face capture (lateral)
      await waitFor(() => {
        expect(screen.getByText('Capturar Foto Lateral')).toBeInTheDocument();
      });

      const lateralButton = screen.getByText('Capturar Foto Lateral');
      await user.click(lateralButton);

      await waitFor(() => {
        expect(mockAxios.history.post).toHaveLength(3);
      });

      // Step 4: Document verification
      await waitFor(() => {
        expect(screen.getByText('Capturar Documento')).toBeInTheDocument();
      });

      const documentButton = screen.getByText('Capturar Documento');
      await user.click(documentButton);

      await waitFor(() => {
        expect(mockAxios.history.post).toHaveLength(4);
        expect(screen.getByText('ANA MARIA GONZALEZ')).toBeInTheDocument();
        expect(screen.getByText('12345678')).toBeInTheDocument();
      });

      // Step 5: Combined photo
      await waitFor(() => {
        expect(screen.getByText('Capturar Foto Combinada')).toBeInTheDocument();
      });

      const combinedButton = screen.getByText('Capturar Foto Combinada');
      await user.click(combinedButton);

      await waitFor(() => {
        expect(mockAxios.history.post).toHaveLength(5);
      });

      // Step 6: Voice recording
      await waitFor(() => {
        expect(screen.getByText('Comenzar Grabación')).toBeInTheDocument();
      });

      const recordButton = screen.getByText('Comenzar Grabación');
      await user.click(recordButton);

      // Simulate recording completion
      act(() => {
        mockMediaRecorder.ondataavailable?.({ data: new Blob(['audio-data']) });
        mockMediaRecorder.onstop?.();
      });

      const stopButton = await screen.findByText('Detener Grabación');
      await user.click(stopButton);

      await waitFor(() => {
        expect(mockAxios.history.post).toHaveLength(6);
        expect(screen.getByText(/acepto los términos/)).toBeInTheDocument();
      });

      // Step 7: Digital signature
      await waitFor(() => {
        expect(screen.getByText('Firmar Contrato')).toBeInTheDocument();
      });

      const signButton = screen.getByText('Firmar Contrato');
      await user.click(signButton);

      // Verify completion
      await waitFor(() => {
        expect(mockAxios.history.post).toHaveLength(7);
        expect(mockOnSuccess).toHaveBeenCalledWith(biometricResponses.finalSignature);
      }, { timeout: 10000 });
    });

    it('should handle biometric quality failures and retry mechanism', async () => {
      const user = userEvent.setup();

      // Setup low quality response that requires retry
      const lowQualityResponse = {
        ...biometricResponses.faceCapture,
        status: 'warning',
        confidenceScore: 0.65, // Below threshold
        qualityScore: 0.55,
        message: 'Calidad insuficiente. Intenta con mejor iluminación.'
      };

      const highQualityResponse = {
        ...biometricResponses.faceCapture,
        confidenceScore: 0.95,
        qualityScore: 0.92
      };

      mockAxios.onPost(`/api/v1/contracts/${mockContract.id}/start-biometric-authentication/`)
        .reply(200, biometricResponses.initialization);

      mockAxios.onPost(/\/api\/v1\/contracts\/biometric\/auth-biometric-123\/face-capture\//)
        .replyOnce(200, lowQualityResponse) // First attempt fails
        .onPost(/\/api\/v1\/contracts\/biometric\/auth-biometric-123\/face-capture\//)
        .replyOnce(200, highQualityResponse); // Second attempt succeeds

      render(
        <TestWrapper>
          <BiometricContractSigning
            open={true}
            onClose={jest.fn()}
            contractId={mockContract.id}
            onSuccess={jest.fn()}
            onError={jest.fn()}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Capturar Foto Frontal')).toBeInTheDocument();
      });

      // First attempt
      const captureButton = screen.getByText('Capturar Foto Frontal');
      await user.click(captureButton);

      // Should show quality warning
      await waitFor(() => {
        expect(screen.getByText(/Calidad insuficiente/)).toBeInTheDocument();
        expect(screen.getByText('Reintentar Captura')).toBeInTheDocument();
      });

      // Retry
      const retryButton = screen.getByText('Reintentar Captura');
      await user.click(retryButton);

      // Should succeed on second attempt
      await waitFor(() => {
        expect(screen.getByText(/Captura exitosa/)).toBeInTheDocument();
      });
    });

    it('should handle device permissions and browser compatibility', async () => {
      // Mock permission denied
      const mockGetUserMedia = jest.fn().mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'));
      global.navigator.mediaDevices.getUserMedia = mockGetUserMedia;

      render(
        <TestWrapper>
          <CameraCapture
            isActive={true}
            onCapture={jest.fn()}
            onError={jest.fn()}
            captureType="face_front"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Permisos de cámara requeridos/)).toBeInTheDocument();
        expect(screen.getByText(/Para continuar con la verificación/)).toBeInTheDocument();
      });

      // Test unsupported browser
      delete (global.navigator as any).mediaDevices;

      render(
        <TestWrapper>
          <CameraCapture
            isActive={true}
            onCapture={jest.fn()}
            onError={jest.fn()}
            captureType="face_front"
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Navegador no compatible/)).toBeInTheDocument();
      });
    });
  });

  // =====================================================================
  // PRUEBAS DE INTEGRACIÓN DE COMPONENTES ESPECÍFICOS
  // =====================================================================

  describe('Individual Component Integration', () => {
    it('should integrate document verification with OCR extraction', async () => {
      const user = userEvent.setup();
      const mockOnDocumentVerified = jest.fn();

      mockAxios.onPost(/\/api\/v1\/contracts\/biometric\/.+\/document-capture\//)
        .reply(200, biometricResponses.documentVerification);

      render(
        <TestWrapper>
          <DocumentVerification
            isActive={true}
            onDocumentVerified={mockOnDocumentVerified}
            onError={jest.fn()}
          />
        </TestWrapper>
      );

      // Select document type
      const documentSelect = screen.getByLabelText('Tipo de Documento');
      await user.click(documentSelect);
      await user.click(screen.getByText('Cédula de Ciudadanía'));

      // Capture document
      const captureButton = screen.getByText('Capturar Documento');
      await user.click(captureButton);

      // Verify OCR results
      await waitFor(() => {
        expect(screen.getByText('ANA MARIA GONZALEZ')).toBeInTheDocument();
        expect(screen.getByText('12345678')).toBeInTheDocument();
        expect(screen.getByText('1990-05-15')).toBeInTheDocument();
        expect(screen.getByText(/Confianza: 98%/)).toBeInTheDocument();
      });

      expect(mockOnDocumentVerified).toHaveBeenCalledWith(
        expect.objectContaining({
          extractedData: biometricResponses.documentVerification.extractedData
        })
      );
    });

    it('should integrate voice recording with transcription analysis', async () => {
      const user = userEvent.setup();
      const mockOnVoiceRecorded = jest.fn();

      mockAxios.onPost(/\/api\/v1\/contracts\/biometric\/.+\/voice-capture\//)
        .reply(200, biometricResponses.voiceRecording);

      render(
        <TestWrapper>
          <VoiceRecorder
            isActive={true}
            requiredPhrase="Yo Ana María González acepto los términos y condiciones de este contrato"
            onVoiceRecorded={mockOnVoiceRecorded}
            onError={jest.fn()}
          />
        </TestWrapper>
      );

      // Start recording
      const recordButton = screen.getByText('Comenzar Grabación');
      await user.click(recordButton);

      expect(mockMediaRecorder.start).toHaveBeenCalled();

      // Simulate recording data
      act(() => {
        mockMediaRecorder.ondataavailable?.({ 
          data: new Blob(['voice-data'], { type: 'audio/wav' }) 
        });
      });

      // Stop recording
      const stopButton = await screen.findByText('Detener Grabación');
      await user.click(stopButton);

      act(() => {
        mockMediaRecorder.onstop?.();
      });

      // Verify transcription results
      await waitFor(() => {
        expect(screen.getByText(/Transcripción:/)).toBeInTheDocument();
        expect(screen.getByText(/acepto los términos/)).toBeInTheDocument();
        expect(screen.getByText(/Coincidencia: 96%/)).toBeInTheDocument();
        expect(screen.getByText(/Calidad de audio: 91%/)).toBeInTheDocument();
      });

      expect(mockOnVoiceRecorded).toHaveBeenCalledWith(
        expect.objectContaining({
          transcription: biometricResponses.voiceRecording.transcription
        })
      );
    });

    it('should integrate digital signature with quality analysis', async () => {
      const user = userEvent.setup();
      const mockOnSignatureComplete = jest.fn();

      render(
        <TestWrapper>
          <DigitalSignaturePad
            isActive={true}
            contractTerms="Términos y condiciones del contrato de arrendamiento"
            onSignatureComplete={mockOnSignatureComplete}
            onError={jest.fn()}
          />
        </TestWrapper>
      );

      // Accept terms
      const termsCheckbox = screen.getByLabelText(/He leído y acepto/);
      await user.click(termsCheckbox);

      // Draw signature (simulate canvas drawing)
      const canvas = screen.getByRole('img', { name: /signature/i });
      
      // Simulate mouse events for signature
      fireEvent.mouseDown(canvas, { clientX: 50, clientY: 50 });
      fireEvent.mouseMove(canvas, { clientX: 100, clientY: 50 });
      fireEvent.mouseMove(canvas, { clientX: 150, clientY: 60 });
      fireEvent.mouseUp(canvas);

      // Complete signature
      const signButton = screen.getByText('Completar Firma');
      await user.click(signButton);

      await waitFor(() => {
        expect(mockOnSignatureComplete).toHaveBeenCalledWith(
          expect.objectContaining({
            signature_image: expect.stringContaining('data:image/png;base64'),
            quality_score: expect.any(Number)
          })
        );
      });
    });
  });

  // =====================================================================
  // PRUEBAS DE RENDIMIENTO Y OPTIMIZACIÓN
  // =====================================================================

  describe('Performance and Optimization', () => {
    it('should handle large image processing efficiently', async () => {
      const user = userEvent.setup();
      
      // Mock large image response
      const largeImageResponse = {
        ...biometricResponses.faceCapture,
        processing_time: 1250, // ms
        image_size: '1920x1080',
        compression_ratio: 0.65
      };

      mockAxios.onPost(`/api/v1/contracts/${mockContract.id}/start-biometric-authentication/`)
        .reply(200, biometricResponses.initialization);
      
      mockAxios.onPost(/\/api\/v1\/contracts\/biometric\/.+\/face-capture\//)
        .reply(200, largeImageResponse);

      const startTime = performance.now();

      render(
        <TestWrapper>
          <BiometricContractSigning
            open={true}
            onClose={jest.fn()}
            contractId={mockContract.id}
            onSuccess={jest.fn()}
            onError={jest.fn()}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Capturar Foto Frontal')).toBeInTheDocument();
      });

      const captureButton = screen.getByText('Capturar Foto Frontal');
      await user.click(captureButton);

      await waitFor(() => {
        expect(screen.getByText(/Confianza: 95%/)).toBeInTheDocument();
      });

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete within reasonable time (5 seconds)
      expect(totalTime).toBeLessThan(5000);
    });

    it('should handle memory management during long sessions', async () => {
      const mockOnError = jest.fn();

      // Simulate memory constraints
      const originalCreateObjectURL = global.URL.createObjectURL;
      let urlCount = 0;
      
      global.URL.createObjectURL = jest.fn(() => {
        urlCount++;
        if (urlCount > 10) {
          throw new Error('Memory limit exceeded');
        }
        return `blob:mock-url-${urlCount}`;
      });

      render(
        <TestWrapper>
          <CameraCapture
            isActive={true}
            onCapture={jest.fn()}
            onError={mockOnError}
            captureType="face_front"
          />
        </TestWrapper>
      );

      // Simulate multiple captures to test memory management
      for (let i = 0; i < 15; i++) {
        try {
          act(() => {
            // Simulate camera frame updates
            global.URL.createObjectURL(new Blob());
          });
        } catch (error) {
          // Expected memory error
        }
      }

      // Should handle memory errors gracefully
      expect(mockOnError).toHaveBeenCalledWith(
        expect.stringContaining('Memory limit')
      );

      // Restore original function
      global.URL.createObjectURL = originalCreateObjectURL;
    });
  });

  // =====================================================================
  // PRUEBAS DE SEGURIDAD Y FRAUD DETECTION
  // =====================================================================

  describe('Security and Fraud Detection', () => {
    it('should detect and handle fraudulent attempts', async () => {
      const user = userEvent.setup();
      const mockOnError = jest.fn();

      // Mock fraud detection response
      const fraudResponse = {
        authenticationId: 'auth-biometric-123',
        status: 'fraud_detected',
        fraud_indicators: [
          'multiple_devices_detected',
          'location_mismatch',
          'unusual_timing_pattern'
        ],
        confidence_score: 0.15, // Very low confidence
        message: 'Actividad sospechosa detectada. Sesión bloqueada por seguridad.'
      };

      mockAxios.onPost(`/api/v1/contracts/${mockContract.id}/start-biometric-authentication/`)
        .reply(200, biometricResponses.initialization);

      mockAxios.onPost(/\/api\/v1\/contracts\/biometric\/.+\/face-capture\//)
        .reply(403, fraudResponse);

      render(
        <TestWrapper>
          <BiometricContractSigning
            open={true}
            onClose={jest.fn()}
            contractId={mockContract.id}
            onSuccess={jest.fn()}
            onError={mockOnError}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Capturar Foto Frontal')).toBeInTheDocument();
      });

      const captureButton = screen.getByText('Capturar Foto Frontal');
      await user.click(captureButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          expect.stringContaining('Actividad sospechosa detectada')
        );
      });
    });

    it('should handle session timeouts and security violations', async () => {
      const mockOnError = jest.fn();

      // Mock session expired response
      mockAxios.onPost(`/api/v1/contracts/${mockContract.id}/start-biometric-authentication/`)
        .reply(200, biometricResponses.initialization);

      mockAxios.onPost(/\/api\/v1\/contracts\/biometric\/.+\/face-capture\//)
        .reply(401, {
          error: 'session_expired',
          message: 'La sesión de autenticación ha expirado por seguridad.'
        });

      render(
        <TestWrapper>
          <BiometricContractSigning
            open={true}
            onClose={jest.fn()}
            contractId={mockContract.id}
            onSuccess={jest.fn()}
            onError={mockOnError}
          />
        </TestWrapper>
      );

      // Fast-forward time to trigger timeout
      jest.useFakeTimers();
      act(() => {
        jest.advanceTimersByTime(16 * 60 * 1000); // 16 minutes
      });

      await waitFor(() => {
        expect(screen.getByText(/Sesión expirada/)).toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });

  // =====================================================================
  // PRUEBAS DE ACCESIBILIDAD E INTERNACIONALIZACIÓN
  // =====================================================================

  describe('Accessibility and Internationalization', () => {
    it('should support screen readers and keyboard navigation', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <BiometricContractSigning
            open={true}
            onClose={jest.fn()}
            contractId={mockContract.id}
            onSuccess={jest.fn()}
            onError={jest.fn()}
          />
        </TestWrapper>
      );

      // Check ARIA attributes
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby');
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-describedby');

      // Test keyboard navigation
      const firstButton = screen.getAllByRole('button')[0];
      firstButton.focus();
      expect(firstButton).toHaveFocus();

      await user.keyboard('{Tab}');
      const secondButton = screen.getAllByRole('button')[1];
      expect(secondButton).toHaveFocus();
    });

    it('should handle mobile touch interactions correctly', async () => {
      // Mock mobile environment
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 667, writable: true });

      // Mock touch events
      const mockTouchEvent = {
        touches: [{ clientX: 100, clientY: 100 }],
        preventDefault: jest.fn()
      };

      render(
        <TestWrapper>
          <DigitalSignaturePad
            isActive={true}
            contractTerms="Test terms"
            onSignatureComplete={jest.fn()}
            onError={jest.fn()}
          />
        </TestWrapper>
      );

      const canvas = screen.getByRole('img', { name: /signature/i });

      // Simulate touch drawing
      fireEvent.touchStart(canvas, mockTouchEvent);
      fireEvent.touchMove(canvas, {
        ...mockTouchEvent,
        touches: [{ clientX: 150, clientY: 100 }]
      });
      fireEvent.touchEnd(canvas);

      // Should handle touch events without errors
      expect(mockTouchEvent.preventDefault).toHaveBeenCalled();
    });
  });
});