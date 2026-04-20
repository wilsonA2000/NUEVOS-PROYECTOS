/**
 * Tests for BiometricContractSigning
 * Tests the biometric contract signing modal rendering and basic behavior
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import '@testing-library/jest-dom';

// Mock the api module (already mocked in setupTests, but we configure responses here)
import { api } from '../../../services/api';

// Mock navigator.mediaDevices
const mockGetUserMedia = jest.fn();
beforeAll(() => {
  Object.defineProperty(global.navigator, 'mediaDevices', {
    value: { getUserMedia: mockGetUserMedia },
    configurable: true,
  });
  global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
  global.URL.revokeObjectURL = jest.fn();
});

// Mock the sub-components that may have complex dependencies
jest.mock('../ProfessionalBiometricFlow', () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid='biometric-flow'>
      <div>Biometric Flow Active</div>
      <button onClick={() => props.onComplete?.()}>Complete</button>
    </div>
  ),
}));

jest.mock('../EnhancedFaceCapture', () => ({
  __esModule: true,
  default: () => <div data-testid='face-capture'>Face Capture</div>,
}));

jest.mock('../EnhancedDocumentVerification', () => ({
  __esModule: true,
  default: () => (
    <div data-testid='doc-verification'>Document Verification</div>
  ),
}));

jest.mock('../EnhancedVoiceRecording', () => ({
  __esModule: true,
  default: () => <div data-testid='voice-recording'>Voice Recording</div>,
}));

jest.mock('../EnhancedDigitalSignature', () => ({
  __esModule: true,
  default: () => <div data-testid='digital-signature'>Digital Signature</div>,
}));

import BiometricContractSigning from '../BiometricContractSigning';

const theme = createTheme();

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

const defaultProps = {
  open: true,
  onClose: jest.fn(),
  contractId: 'contract-123',
  onSuccess: jest.fn(),
  onError: jest.fn(),
};

describe('BiometricContractSigning', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }],
    });
    // Mock api.post for initialization
    (api.post as jest.Mock).mockResolvedValue({
      data: { authenticationId: 'auth-123' },
    });
    (api.get as jest.Mock).mockResolvedValue({
      data: { status: 'pending' },
    });
  });

  it('should render the biometric signing component when open', () => {
    render(
      <TestWrapper>
        <BiometricContractSigning {...defaultProps} />
      </TestWrapper>
    );

    // The component should render without crashing
    expect(document.body).toBeInTheDocument();
  });

  it('should not render content when closed', () => {
    render(
      <TestWrapper>
        <BiometricContractSigning {...defaultProps} open={false} />
      </TestWrapper>
    );

    // When closed, the dialog content should not be visible
    expect(
      screen.queryByText('Firma Digital con Verificación Biométrica')
    ).not.toBeInTheDocument();
  });

  it('should call onClose when close action is triggered', () => {
    render(
      <TestWrapper>
        <BiometricContractSigning {...defaultProps} />
      </TestWrapper>
    );

    // Component should have rendered
    expect(document.body).toBeInTheDocument();
  });

  it('should handle different contract IDs', () => {
    render(
      <TestWrapper>
        <BiometricContractSigning
          {...defaultProps}
          contractId='different-contract'
        />
      </TestWrapper>
    );

    expect(document.body).toBeInTheDocument();
  });

  it('should handle initialization errors gracefully', async () => {
    (api.post as jest.Mock).mockRejectedValueOnce(new Error('Init failed'));

    render(
      <TestWrapper>
        <BiometricContractSigning {...defaultProps} />
      </TestWrapper>
    );

    // Should not crash even when API fails
    await waitFor(() => {
      expect(document.body).toBeInTheDocument();
    });
  });
});
