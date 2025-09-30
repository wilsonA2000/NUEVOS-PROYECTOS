/**
 * Tests Unitarios para BiometricContractSigning
 * Cubre el sistema completo de firma biométrica integrado con contratos
 * Incluye tests del flujo de 5 pasos con validaciones y seguridad
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import MockAdapter from 'axios-mock-adapter';

import BiometricContractSigning from '../BiometricContractSigning';
import { contractService } from '../../../services/contractService';
import { api } from '../../../services/api';
import { createMockContract, createMockSignatureData, createTestDates } from '../../../test-utils/contractTestUtils';

// Mock del API
let mockAxios: MockAdapter;

// Mock de APIs del navegador
const mockGetUserMedia = jest.fn();
const mockMediaRecorder = {
  start: jest.fn(),
  stop: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  state: 'inactive'
};

// Mock Canvas API
const mockCanvas = {
  getContext: jest.fn(() => ({
    fillStyle: '',
    fillRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) }))
  })),
  toDataURL: jest.fn(() => 'data:image/png;base64,mock-signature-data'),
  width: 300,
  height: 150
};

// Setup global mocks
beforeAll(() => {
  global.navigator.mediaDevices = {
    getUserMedia: mockGetUserMedia
  } as any;

  global.MediaRecorder = jest.fn().mockImplementation(() => mockMediaRecorder) as any;
  
  global.HTMLCanvasElement.prototype.getContext = mockCanvas.getContext;
  global.HTMLCanvasElement.prototype.toDataURL = mockCanvas.toDataURL;
  
  // Mock URL.createObjectURL
  global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
  global.URL.revokeObjectURL = jest.fn();
});

// Theme para testing
const theme = createTheme();

// Wrapper para providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>
    {children}
  </ThemeProvider>
);

// Mock data
const mockContract = createMockContract('READY_TO_SIGN', {
  id: 'contract-123',
  landlord_approved: true,
  tenant_approved: true
});

const mockBiometricResponse = {
  authenticationId: 'auth-123',
  step: 'face_front',
  status: 'success',
  confidenceScore: 0.95,
  message: 'Captura frontal completada exitosamente',
  nextStep: 'face_side',
  completedSteps: {
    face_front: true,
    face_side: false,
    document: false,
    combined: false,
    voice: false
  },
  biometricData: {
    faceConfidence: 0.95,
    imageQuality: 0.90,
    timestamp: new Date().toISOString()
  }
};

const mockSignatureResponse = {
  contract_id: 'contract-123',
  signature_completed: true,
  biometric_verified: true,
  confidence_scores: {
    face_confidence: 0.95,
    document_confidence: 0.98,
    voice_confidence: 0.92,
    overall_confidence: 0.95
  },
  signed_at: new Date().toISOString()
};

// Default props
const defaultProps = {
  open: true,
  onClose: jest.fn(),
  contractId: 'contract-123',
  onSuccess: jest.fn(),
  onError: jest.fn()
};

describe('BiometricContractSigning', () => {
  beforeEach(() => {
    mockAxios = new MockAdapter(api);
    jest.clearAllMocks();
    
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }]
    });
  });

  afterEach(() => {
    mockAxios.restore();
  });

  // =====================================================================
  // TESTS DE RENDERIZADO Y INICIALIZACIÓN
  // =====================================================================

  describe('Rendering and Initialization', () => {
    it('should render the biometric signing modal', async () => {
      mockAxios.onPost('/api/v1/contracts/contract-123/start-biometric-authentication/')
        .reply(200, { authenticationId: 'auth-123' });

      render(
        <TestWrapper>
          <BiometricContractSigning {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Firma Digital con Verificación Biométrica')).toBeInTheDocument();
      expect(screen.getByText('5 Pasos de Verificación Avanzada')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(
        <TestWrapper>
          <BiometricContractSigning {...defaultProps} open={false} />
        </TestWrapper>
      );

      expect(screen.queryByText('Firma Digital con Verificación Biométrica')).not.toBeInTheDocument();
    });

    it('should initialize biometric authentication on mount', async () => {
      mockAxios.onPost('/api/v1/contracts/contract-123/start-biometric-authentication/')
        .reply(200, { authenticationId: 'auth-123' });

      render(
        <TestWrapper>
          <BiometricContractSigning {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockAxios.history.post).toHaveLength(1);
        expect(mockAxios.history.post[0].url).toContain('start-biometric-authentication');
      });
    });

    it('should handle initialization errors', async () => {
      mockAxios.onPost('/api/v1/contracts/contract-123/start-biometric-authentication/')
        .reply(500, { error: 'Authentication service unavailable' });

      render(
        <TestWrapper>
          <BiometricContractSigning {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalledWith(
          expect.stringContaining('Error al inicializar autenticación biométrica')
        );
      });
    });
  });

  // =====================================================================
  // TESTS DEL STEPPER DE PROGRESO
  // =====================================================================

  describe('Progress Stepper', () => {
    beforeEach(() => {
      mockAxios.onPost('/api/v1/contracts/contract-123/start-biometric-authentication/')
        .reply(200, { authenticationId: 'auth-123' });
    });

    it('should display all 5 verification steps', async () => {
      render(
        <TestWrapper>
          <BiometricContractSigning {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Foto Frontal')).toBeInTheDocument();
        expect(screen.getByText('Foto Lateral')).toBeInTheDocument();
        expect(screen.getByText('Documento ID')).toBeInTheDocument();
        expect(screen.getByText('Foto Combinada')).toBeInTheDocument();
        expect(screen.getByText('Grabación de Voz')).toBeInTheDocument();
      });
    });

    it('should show current step as active', async () => {
      render(
        <TestWrapper>
          <BiometricContractSigning {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        const activeStep = screen.getByText('Foto Frontal').closest('.MuiStep-root');
        expect(activeStep).toHaveClass('Mui-active');
      });
    });

    it('should update step progress as steps complete', async () => {
      mockAxios.onPost('/api/v1/contracts/biometric/auth-123/face-capture/')
        .reply(200, mockBiometricResponse);

      const user = userEvent.setup();

      render(
        <TestWrapper>
          <BiometricContractSigning {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Capturar Foto Frontal')).toBeInTheDocument();
      });

      const captureButton = screen.getByText('Capturar Foto Frontal');
      await user.click(captureButton);

      await waitFor(() => {
        const completedStep = screen.getByText('Foto Frontal').closest('.MuiStep-root');
        expect(completedStep).toHaveClass('Mui-completed');
      });
    });
  });

  // =====================================================================
  // TESTS DE CAPTURA FACIAL
  // =====================================================================

  describe('Face Capture Steps', () => {
    beforeEach(() => {
      mockAxios.onPost('/api/v1/contracts/contract-123/start-biometric-authentication/')
        .reply(200, { authenticationId: 'auth-123' });
    });

    it('should request camera permissions for face capture', async () => {
      render(
        <TestWrapper>
          <BiometricContractSigning {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledWith({ video: true });
      });
    });

    it('should capture frontal face photo successfully', async () => {
      mockAxios.onPost('/api/v1/contracts/biometric/auth-123/face-capture/')
        .reply(200, mockBiometricResponse);

      const user = userEvent.setup();

      render(
        <TestWrapper>
          <BiometricContractSigning {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Capturar Foto Frontal')).toBeInTheDocument();
      });

      const captureButton = screen.getByText('Capturar Foto Frontal');
      await user.click(captureButton);

      await waitFor(() => {
        expect(mockAxios.history.post).toHaveLength(2); // Init + face capture
        expect(mockAxios.history.post[1].url).toContain('face-capture');
      });
    });

    it('should handle face capture errors', async () => {
      mockAxios.onPost('/api/v1/contracts/biometric/auth-123/face-capture/')
        .reply(400, { error: 'Face not detected clearly' });

      const user = userEvent.setup();

      render(
        <TestWrapper>
          <BiometricContractSigning {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Capturar Foto Frontal')).toBeInTheDocument();
      });

      const captureButton = screen.getByText('Capturar Foto Frontal');
      await user.click(captureButton);

      await waitFor(() => {
        expect(screen.getByText(/No se pudo detectar claramente/)).toBeInTheDocument();
      });
    });

    it('should show quality feedback for face photos', async () => {
      const lowQualityResponse = {
        ...mockBiometricResponse,
        confidenceScore: 0.65,
        message: 'Calidad de imagen baja. Intenta nuevamente con mejor iluminación.'
      };

      mockAxios.onPost('/api/v1/contracts/biometric/auth-123/face-capture/')
        .reply(200, lowQualityResponse);

      const user = userEvent.setup();

      render(
        <TestWrapper>
          <BiometricContractSigning {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Capturar Foto Frontal')).toBeInTheDocument();
      });

      const captureButton = screen.getByText('Capturar Foto Frontal');
      await user.click(captureButton);

      await waitFor(() => {
        expect(screen.getByText(/Calidad de imagen baja/)).toBeInTheDocument();
        expect(screen.getByText('Reintentar Captura')).toBeInTheDocument();
      });
    });

    it('should progress to lateral face capture after frontal', async () => {
      const frontalResponse = { ...mockBiometricResponse, nextStep: 'face_side' };
      const lateralResponse = {
        ...mockBiometricResponse,
        step: 'face_side',
        nextStep: 'document',
        completedSteps: { ...mockBiometricResponse.completedSteps, face_side: true }
      };

      mockAxios.onPost('/api/v1/contracts/biometric/auth-123/face-capture/')
        .replyOnce(200, frontalResponse)
        .onPost('/api/v1/contracts/biometric/auth-123/face-capture/')
        .replyOnce(200, lateralResponse);

      const user = userEvent.setup();

      render(
        <TestWrapper>
          <BiometricContractSigning {...defaultProps} />
        </TestWrapper>
      );

      // Capture frontal
      await waitFor(() => {
        expect(screen.getByText('Capturar Foto Frontal')).toBeInTheDocument();
      });

      const frontalButton = screen.getByText('Capturar Foto Frontal');
      await user.click(frontalButton);

      // Should progress to lateral
      await waitFor(() => {
        expect(screen.getByText('Capturar Foto Lateral')).toBeInTheDocument();
      });

      const lateralButton = screen.getByText('Capturar Foto Lateral');
      await user.click(lateralButton);

      await waitFor(() => {
        expect(mockAxios.history.post).toHaveLength(3); // Init + 2 captures
      });
    });
  });

  // =====================================================================
  // TESTS DE VERIFICACIÓN DE DOCUMENTOS
  // =====================================================================

  describe('Document Verification', () => {
    beforeEach(() => {
      mockAxios.onPost('/api/v1/contracts/contract-123/start-biometric-authentication/')
        .reply(200, { authenticationId: 'auth-123' });
    });

    it('should show document verification step', async () => {
      // Mock completed face steps to reach document step
      const documentStepResponse = {
        ...mockBiometricResponse,
        step: 'document',
        completedSteps: {
          face_front: true,
          face_side: true,
          document: false,
          combined: false,
          voice: false
        }
      };

      mockAxios.onPost('/api/v1/contracts/biometric/auth-123/document-capture/')
        .reply(200, documentStepResponse);

      render(
        <TestWrapper>
          <BiometricContractSigning {...defaultProps} />
        </TestWrapper>
      );

      // Simulate progression to document step
      act(() => {
        // This would be triggered by completing face steps
        // For testing, we'll directly set the state
      });

      await waitFor(() => {
        expect(screen.getByText('Capturar Documento de Identidad')).toBeInTheDocument();
      });
    });

    it('should support different document types', async () => {
      const documentResponse = {
        ...mockBiometricResponse,
        step: 'document',
        extractedData: {
          documentType: 'CC',
          documentNumber: '12345678',
          fullName: 'JUAN CARLOS PEREZ',
          birthDate: '1985-03-15',
          expirationDate: '2030-03-15'
        }
      };

      mockAxios.onPost('/api/v1/contracts/biometric/auth-123/document-capture/')
        .reply(200, documentResponse);

      const user = userEvent.setup();

      render(
        <TestWrapper>
          <BiometricContractSigning {...defaultProps} />
        </TestWrapper>
      );

      // Mock document selection
      const documentSelect = screen.getByLabelText('Tipo de Documento');
      await user.click(documentSelect);
      await user.click(screen.getByText('Cédula de Ciudadanía'));

      const captureButton = screen.getByText('Capturar Documento');
      await user.click(captureButton);

      await waitFor(() => {
        expect(screen.getByText('JUAN CARLOS PEREZ')).toBeInTheDocument();
        expect(screen.getByText('12345678')).toBeInTheDocument();
      });
    });

    it('should validate document authenticity', async () => {
      const invalidDocumentResponse = {
        ...mockBiometricResponse,
        step: 'document',
        status: 'error',
        message: 'Documento no válido o ilegible',
        confidenceScore: 0.30
      };

      mockAxios.onPost('/api/v1/contracts/biometric/auth-123/document-capture/')
        .reply(200, invalidDocumentResponse);

      const user = userEvent.setup();

      render(
        <TestWrapper>
          <BiometricContractSigning {...defaultProps} />
        </TestWrapper>
      );

      const captureButton = screen.getByText('Capturar Documento');
      await user.click(captureButton);

      await waitFor(() => {
        expect(screen.getByText(/Documento no válido/)).toBeInTheDocument();
        expect(screen.getByText('Intentar Nuevamente')).toBeInTheDocument();
      });
    });
  });

  // =====================================================================
  // TESTS DE GRABACIÓN DE VOZ
  // =====================================================================

  describe('Voice Recording', () => {
    beforeEach(() => {
      mockAxios.onPost('/api/v1/contracts/contract-123/start-biometric-authentication/')
        .reply(200, { authenticationId: 'auth-123' });

      mockGetUserMedia.mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }]
      });
    });

    it('should request microphone permissions', async () => {
      render(
        <TestWrapper>
          <BiometricContractSigning {...defaultProps} />
        </TestWrapper>
      );

      // Mock progression to voice step
      act(() => {
        // Simulate reaching voice recording step
      });

      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
      });
    });

    it('should record voice with contract phrase', async () => {
      const voiceResponse = {
        ...mockBiometricResponse,
        step: 'voice',
        transcription: 'Yo Juan Carlos Pérez acepto los términos de este contrato',
        voiceConfidence: 0.88,
        phraseMatch: 0.92
      };

      mockAxios.onPost('/api/v1/contracts/biometric/auth-123/voice-capture/')
        .reply(200, voiceResponse);

      const user = userEvent.setup();

      render(
        <TestWrapper>
          <BiometricContractSigning {...defaultProps} />
        </TestWrapper>
      );

      const recordButton = screen.getByText('Comenzar Grabación');
      await user.click(recordButton);

      // Simulate recording
      expect(mockMediaRecorder.start).toHaveBeenCalled();

      // Simulate stop recording
      const stopButton = screen.getByText('Detener Grabación');
      await user.click(stopButton);

      expect(mockMediaRecorder.stop).toHaveBeenCalled();

      await waitFor(() => {
        expect(screen.getByText(/Transcripción:/)).toBeInTheDocument();
        expect(screen.getByText(/acepto los términos/)).toBeInTheDocument();
      });
    });

    it('should handle voice recognition errors', async () => {
      const voiceErrorResponse = {
        ...mockBiometricResponse,
        step: 'voice',
        status: 'error',
        message: 'No se pudo procesar el audio claramente',
        voiceConfidence: 0.45
      };

      mockAxios.onPost('/api/v1/contracts/biometric/auth-123/voice-capture/')
        .reply(200, voiceErrorResponse);

      const user = userEvent.setup();

      render(
        <TestWrapper>
          <BiometricContractSigning {...defaultProps} />
        </TestWrapper>
      );

      const recordButton = screen.getByText('Comenzar Grabación');
      await user.click(recordButton);

      const stopButton = screen.getByText('Detener Grabación');
      await user.click(stopButton);

      await waitFor(() => {
        expect(screen.getByText(/No se pudo procesar el audio/)).toBeInTheDocument();
        expect(screen.getByText('Grabar Nuevamente')).toBeInTheDocument();
      });
    });
  });

  // =====================================================================
  // TESTS DE FIRMA DIGITAL
  // =====================================================================

  describe('Digital Signature', () => {
    beforeEach(() => {
      mockAxios.onPost('/api/v1/contracts/contract-123/start-biometric-authentication/')
        .reply(200, { authenticationId: 'auth-123' });
    });

    it('should render signature pad after biometric completion', async () => {
      // Mock completed biometric steps
      const completedResponse = {
        ...mockBiometricResponse,
        step: 'signature',
        completedSteps: {
          face_front: true,
          face_side: true,
          document: true,
          combined: true,
          voice: true
        },
        overallConfidence: 0.94,
        readyForSignature: true
      };

      mockAxios.onGet('/api/v1/contracts/biometric/auth-123/status/')
        .reply(200, completedResponse);

      render(
        <TestWrapper>
          <BiometricContractSigning {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Firma Digital')).toBeInTheDocument();
        expect(screen.getByText('Firmar Contrato')).toBeInTheDocument();
      });
    });

    it('should capture signature on canvas', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <BiometricContractSigning {...defaultProps} />
        </TestWrapper>
      );

      // Mock canvas interactions
      const canvas = screen.getByRole('img', { name: /signature/i });
      
      await user.pointer([
        { target: canvas, coords: { x: 50, y: 50 } },
        { target: canvas, coords: { x: 100, y: 50 } },
        { target: canvas, coords: { x: 150, y: 50 } }
      ]);

      expect(mockCanvas.getContext).toHaveBeenCalled();
    });

    it('should validate signature quality', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <BiometricContractSigning {...defaultProps} />
        </TestWrapper>
      );

      // Try to submit without signature
      const signButton = screen.getByText('Firmar Contrato');
      await user.click(signButton);

      expect(screen.getByText('Por favor, firme en el área designada')).toBeInTheDocument();
    });

    it('should complete contract signing successfully', async () => {
      mockAxios.onPost('/api/v1/contracts/contract-123/complete-biometric-signature/')
        .reply(200, mockSignatureResponse);

      const user = userEvent.setup();

      render(
        <TestWrapper>
          <BiometricContractSigning {...defaultProps} />
        </TestWrapper>
      );

      // Mock signature creation
      mockCanvas.toDataURL.mockReturnValue('data:image/png;base64,signature-data');

      const signButton = screen.getByText('Firmar Contrato');
      await user.click(signButton);

      await waitFor(() => {
        expect(mockAxios.history.post).toContainEqual(
          expect.objectContaining({
            url: expect.stringContaining('complete-biometric-signature')
          })
        );
      });

      expect(defaultProps.onSuccess).toHaveBeenCalledWith(mockSignatureResponse);
    });
  });

  // =====================================================================
  // TESTS DE SEGURIDAD Y VALIDACIÓN
  // =====================================================================

  describe('Security and Validation', () => {
    beforeEach(() => {
      mockAxios.onPost('/api/v1/contracts/contract-123/start-biometric-authentication/')
        .reply(200, { authenticationId: 'auth-123' });
    });

    it('should enforce minimum confidence thresholds', async () => {
      const lowConfidenceResponse = {
        ...mockBiometricResponse,
        confidenceScore: 0.60, // Below minimum threshold
        status: 'warning',
        message: 'Confianza insuficiente. Se requiere mayor precisión.'
      };

      mockAxios.onPost('/api/v1/contracts/biometric/auth-123/face-capture/')
        .reply(200, lowConfidenceResponse);

      const user = userEvent.setup();

      render(
        <TestWrapper>
          <BiometricContractSigning {...defaultProps} />
        </TestWrapper>
      );

      const captureButton = screen.getByText('Capturar Foto Frontal');
      await user.click(captureButton);

      await waitFor(() => {
        expect(screen.getByText(/Confianza insuficiente/)).toBeInTheDocument();
        expect(screen.getByText('Reintentar')).toBeInTheDocument();
      });
    });

    it('should implement timeout protection', async () => {
      jest.useFakeTimers();

      render(
        <TestWrapper>
          <BiometricContractSigning {...defaultProps} />
        </TestWrapper>
      );

      // Fast-forward time to trigger timeout
      act(() => {
        jest.advanceTimersByTime(15 * 60 * 1000); // 15 minutes
      });

      await waitFor(() => {
        expect(screen.getByText(/Sesión expirada/)).toBeInTheDocument();
      });

      jest.useRealTimers();
    });

    it('should validate device capabilities', async () => {
      // Mock unsupported device
      mockGetUserMedia.mockRejectedValue(new Error('NotAllowedError'));

      render(
        <TestWrapper>
          <BiometricContractSigning {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/Permisos de cámara requeridos/)).toBeInTheDocument();
      });
    });

    it('should prevent multiple concurrent processes', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <BiometricContractSigning {...defaultProps} />
        </TestWrapper>
      );

      const captureButton = screen.getByText('Capturar Foto Frontal');
      
      // Click multiple times rapidly
      await user.click(captureButton);
      await user.click(captureButton);
      await user.click(captureButton);

      // Should only make one API call
      await waitFor(() => {
        expect(mockAxios.history.post.filter(req => 
          req.url?.includes('face-capture')
        )).toHaveLength(1);
      });
    });

    it('should implement retry limits', async () => {
      const user = userEvent.setup();

      // Mock repeated failures
      mockAxios.onPost('/api/v1/contracts/biometric/auth-123/face-capture/')
        .reply(400, { error: 'Capture failed' });

      render(
        <TestWrapper>
          <BiometricContractSigning {...defaultProps} />
        </TestWrapper>
      );

      const captureButton = screen.getByText('Capturar Foto Frontal');

      // Retry multiple times
      for (let i = 0; i < 5; i++) {
        await user.click(captureButton);
        await waitFor(() => {
          expect(screen.getByText('Reintentar')).toBeInTheDocument();
        });
        
        const retryButton = screen.getByText('Reintentar');
        await user.click(retryButton);
      }

      // Should show max retries exceeded
      await waitFor(() => {
        expect(screen.getByText(/Máximo de intentos excedido/)).toBeInTheDocument();
      });
    });
  });

  // =====================================================================
  // TESTS DE CASOS EDGE Y MANEJO DE ERRORES
  // =====================================================================

  describe('Edge Cases and Error Handling', () => {
    beforeEach(() => {
      mockAxios.onPost('/api/v1/contracts/contract-123/start-biometric-authentication/')
        .reply(200, { authenticationId: 'auth-123' });
    });

    it('should handle network disconnection gracefully', async () => {
      const user = userEvent.setup();

      mockAxios.onPost('/api/v1/contracts/biometric/auth-123/face-capture/')
        .networkError();

      render(
        <TestWrapper>
          <BiometricContractSigning {...defaultProps} />
        </TestWrapper>
      );

      const captureButton = screen.getByText('Capturar Foto Frontal');
      await user.click(captureButton);

      await waitFor(() => {
        expect(screen.getByText(/Error de conexión/)).toBeInTheDocument();
        expect(screen.getByText('Reintentar')).toBeInTheDocument();
      });
    });

    it('should handle server errors with appropriate messages', async () => {
      const user = userEvent.setup();

      mockAxios.onPost('/api/v1/contracts/biometric/auth-123/face-capture/')
        .reply(500, { error: 'Internal server error' });

      render(
        <TestWrapper>
          <BiometricContractSigning {...defaultProps} />
        </TestWrapper>
      );

      const captureButton = screen.getByText('Capturar Foto Frontal');
      await user.click(captureButton);

      await waitFor(() => {
        expect(screen.getByText(/Error del servidor/)).toBeInTheDocument();
      });
    });

    it('should clean up resources on unmount', () => {
      const { unmount } = render(
        <TestWrapper>
          <BiometricContractSigning {...defaultProps} />
        </TestWrapper>
      );

      unmount();

      // Should have cleaned up media streams, timers, etc.
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should handle invalid contract ID', async () => {
      mockAxios.onPost('/api/v1/contracts/invalid-contract/start-biometric-authentication/')
        .reply(404, { error: 'Contract not found' });

      render(
        <TestWrapper>
          <BiometricContractSigning {...defaultProps} contractId="invalid-contract" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalledWith(
          expect.stringContaining('Contrato no encontrado')
        );
      });
    });

    it('should handle missing browser APIs gracefully', () => {
      // Mock missing MediaDevices API
      const originalMediaDevices = global.navigator.mediaDevices;
      delete (global.navigator as any).mediaDevices;

      render(
        <TestWrapper>
          <BiometricContractSigning {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText(/Navegador no compatible/)).toBeInTheDocument();

      // Restore
      global.navigator.mediaDevices = originalMediaDevices;
    });
  });
});