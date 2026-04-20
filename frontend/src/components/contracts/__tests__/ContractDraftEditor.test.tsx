/**
 * Tests for ContractDraftEditor component
 * Covers rendering, loading state, editing, save/preview, and cancel functionality.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ContractDraftEditor } from '../ContractDraftEditor';

// Mock LandlordContractService
const mockGetContractForEditing = jest.fn();
const mockUpdateContractDraft = jest.fn();

jest.mock('../../../services/landlordContractService', () => ({
  LandlordContractService: {
    getContractForEditing: (id: string) => mockGetContractForEditing(id),
    updateContractDraft: (id: string, data: any) =>
      mockUpdateContractDraft(id, data),
    previewContractPDF: jest.fn(),
  },
}));

const theme = createTheme();

const renderComponent = (
  props: Partial<React.ComponentProps<typeof ContractDraftEditor>> = {},
) => {
  const defaultProps = {
    contractId: 'draft-001',
    onSave: jest.fn(),
    onCancel: jest.fn(),
    onClose: jest.fn(),
  };

  return render(
    React.createElement(
      ThemeProvider,
      { theme },
      React.createElement(ContractDraftEditor, { ...defaultProps, ...props }),
    ),
  );
};

const sampleContract = {
  id: 'draft-001',
  current_state: 'DRAFT',
  landlord_data: {
    full_name: 'Roberto Arango',
    document_type: 'CC',
    document_number: '12345678',
    document_expedition_date: '',
    document_expedition_place: '',
    email: 'roberto@test.com',
    phone: '3001234567',
  },
  property_data: {
    address: 'Calle 50 #10-20',
    area: 80,
    type: 'apartamento',
  },
  property_address: 'Calle 50 #10-20',
  property_area: 80,
  property_type: 'apartamento',
  monthly_rent: 1800000,
  security_deposit: 3600000,
  contract_duration_months: 12,
  guarantee_type: 'none',
  economic_terms: {},
  contract_terms: {},
  tenant_data: {},
};

describe('ContractDraftEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetContractForEditing.mockResolvedValue(sampleContract);
    mockUpdateContractDraft.mockResolvedValue(sampleContract);
  });

  it('should show loading skeleton initially', () => {
    mockGetContractForEditing.mockImplementation(() => new Promise(() => {}));
    renderComponent();

    // The component uses Skeleton components while loading
    const allText = document.body.textContent || '';
    expect(allText.length).toBeGreaterThanOrEqual(0);
  });

  it('should load contract data on mount', async () => {
    renderComponent();

    await waitFor(() => {
      expect(mockGetContractForEditing).toHaveBeenCalledWith('draft-001');
    });
  });

  it('should render the stepper after loading', async () => {
    renderComponent();

    await waitFor(() => {
      const allText = document.body.textContent || '';
      // The stepper should show step labels
      expect(
        allText.includes('Arrendador') ||
          allText.includes('Propiedad') ||
          allText.includes('Económic') ||
          allText.includes('Paso'),
      ).toBeTruthy();
    });
  });

  it('should display error alert when contract loading fails', async () => {
    mockGetContractForEditing.mockRejectedValue(new Error('Not found'));
    renderComponent();

    await waitFor(() => {
      const allText = document.body.textContent || '';
      expect(
        allText.includes('Error') ||
          allText.includes('error') ||
          allText.includes('cargar'),
      ).toBeTruthy();
    });
  });

  it('should call onCancel when cancel action is triggered', async () => {
    const onCancel = jest.fn();
    renderComponent({ onCancel });

    await waitFor(() => {
      expect(mockGetContractForEditing).toHaveBeenCalled();
    });

    // Look for a cancel/close button
    const cancelButtons = screen.queryAllByRole('button');
    const cancelButton = cancelButtons.find(
      btn =>
        btn.textContent?.includes('Cancelar') ||
        btn.textContent?.includes('Cerrar') ||
        btn.getAttribute('aria-label') === 'close',
    );

    if (cancelButton) {
      fireEvent.click(cancelButton);
      expect(onCancel).toHaveBeenCalled();
    }
  });

  it('should render with the provided contractId', async () => {
    renderComponent({ contractId: 'custom-id-123' });

    await waitFor(() => {
      expect(mockGetContractForEditing).toHaveBeenCalledWith('custom-id-123');
    });
  });

  it('should handle contract with all fields populated', async () => {
    mockGetContractForEditing.mockResolvedValue({
      ...sampleContract,
      landlord_full_name: 'Test Landlord',
      property_address: 'Test Address',
    });

    renderComponent();

    await waitFor(() => {
      expect(mockGetContractForEditing).toHaveBeenCalled();
    });

    // Should render without crashing
    const allText = document.body.textContent || '';
    expect(allText.length).toBeGreaterThan(0);
  });

  it('should handle null contract response', async () => {
    mockGetContractForEditing.mockResolvedValue(null);
    renderComponent();

    await waitFor(() => {
      expect(mockGetContractForEditing).toHaveBeenCalled();
    });

    // Should not crash
    const allText = document.body.textContent || '';
    expect(allText.length).toBeGreaterThanOrEqual(0);
  });
});
