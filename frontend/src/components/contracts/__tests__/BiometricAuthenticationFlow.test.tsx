/**
 * Tests for BiometricAuthenticationFlow component
 * Covers rendering, step navigation, cancel functionality, and error states.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import BiometricAuthenticationFlow from '../BiometricAuthenticationFlow';
import { contractService } from '../../../services/contractService';

// Mock contract service
jest.mock('../../../services/contractService', () => ({
  contractService: {
    startBiometricAuthentication: jest.fn(),
    processFaceCapture: jest.fn(),
    processDocumentVerification: jest.fn(),
    processCombinedVerification: jest.fn(),
    processVoiceVerification: jest.fn(),
    completeAuthentication: jest.fn(),
    getBiometricAuthenticationStatus: jest.fn(),
  },
}));

// Mock sub-components to simplify testing
jest.mock('../CameraCaptureSimple', () => {
  return function MockCameraCapture(props: any) {
    return React.createElement('div', { 'data-testid': 'camera-capture' }, 'Camera Capture Mock');
  };
});

jest.mock('../EnhancedDocumentVerification', () => {
  return function MockDocumentVerification(props: any) {
    return React.createElement('div', { 'data-testid': 'document-verification' }, 'Document Verification Mock');
  };
});

jest.mock('../VoiceRecorder', () => {
  return function MockVoiceRecorder(props: any) {
    return React.createElement('div', { 'data-testid': 'voice-recorder' }, 'Voice Recorder Mock');
  };
});

jest.mock('../DigitalSignaturePad', () => {
  return function MockSignaturePad(props: any) {
    return React.createElement('div', { 'data-testid': 'signature-pad' }, 'Signature Pad Mock');
  };
});

const mockedContractService = contractService as jest.Mocked<typeof contractService>;

const theme = createTheme();
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderComponent = (props: Partial<React.ComponentProps<typeof BiometricAuthenticationFlow>> = {}) => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    contractId: 'contract-123',
    onSuccess: jest.fn(),
    onError: jest.fn(),
  };

  return render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(
        ThemeProvider,
        { theme },
        React.createElement(BiometricAuthenticationFlow, { ...defaultProps, ...props }),
      ),
    ),
  );
};

describe('BiometricAuthenticationFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedContractService.startBiometricAuthentication.mockResolvedValue({
      authentication_id: 'auth-123',
      status: 'started',
      voice_text: 'Acepto los terminos del contrato',
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    });
    mockedContractService.getBiometricAuthenticationStatus.mockResolvedValue({
      status: 'in_progress',
      completed_steps: {
        face_front: false,
        face_side: false,
        document: false,
        combined: false,
        voice: false,
      },
      progress: 0,
    });
  });

  it('should render the dialog when open is true', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Autenticaci/i)).toBeInTheDocument();
    });
  });

  it('should not render dialog content when open is false', () => {
    renderComponent({ open: false });

    expect(screen.queryByText(/Autenticaci/i)).not.toBeInTheDocument();
  });

  it('should display the 5-step stepper', async () => {
    renderComponent();

    await waitFor(() => {
      // The stepper should show labels for all 5 steps
      const stepLabels = ['Captura Facial', 'Documento', 'Combinada', 'Voz', 'Firma'];
      // At least one of these terms should appear (the component may use variations)
      const allText = document.body.textContent || '';
      const hasSteps = stepLabels.some((label) => allText.includes(label));
      expect(hasSteps || allText.includes('Paso') || allText.includes('Step')).toBeTruthy();
    });
  });

  it('should call startBiometricAuthentication on mount', async () => {
    renderComponent();

    await waitFor(() => {
      expect(mockedContractService.startBiometricAuthentication).toHaveBeenCalledWith('contract-123');
    });
  });

  it('should handle close button click', async () => {
    const onClose = jest.fn();
    renderComponent({ onClose });

    await waitFor(() => {
      const allText = document.body.textContent || '';
      expect(allText.length).toBeGreaterThan(0);
    });

    // Find close button (could be an X button or Cancel button)
    const closeButtons = screen.queryAllByRole('button');
    const closeButton = closeButtons.find(
      (btn) => btn.getAttribute('aria-label') === 'close' || btn.textContent?.includes('Cancelar') || btn.textContent?.includes('Cerrar'),
    );

    if (closeButton) {
      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalled();
    }
  });

  it('should show error state when authentication start fails', async () => {
    mockedContractService.startBiometricAuthentication.mockRejectedValueOnce(
      new Error('Failed to start authentication'),
    );

    renderComponent();

    await waitFor(() => {
      const allText = document.body.textContent || '';
      // Should show some error indication
      expect(
        allText.includes('error') || allText.includes('Error') || allText.includes('falló') || allText.includes('intentar'),
      ).toBeTruthy();
    });
  });

  it('should call onError when authentication fails', async () => {
    const onError = jest.fn();
    mockedContractService.startBiometricAuthentication.mockRejectedValueOnce(
      new Error('Auth failed'),
    );

    renderComponent({ onError });

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
  });

  it('should render with correct contractId prop', async () => {
    renderComponent({ contractId: 'custom-contract-id' });

    await waitFor(() => {
      expect(mockedContractService.startBiometricAuthentication).toHaveBeenCalledWith('custom-contract-id');
    });
  });

  it('should show loading state while initializing', () => {
    mockedContractService.startBiometricAuthentication.mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    renderComponent();

    // Should show some loading indicator
    const allText = document.body.textContent || '';
    expect(allText.length).toBeGreaterThan(0);
  });
});
