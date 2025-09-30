/**
 * Tests Unitarios para TenantInvitationSystem
 * Cubre el sistema de invitaciones con tokens seguros, múltiples métodos de envío
 * y toda la funcionalidad de gestión de invitaciones
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import MockAdapter from 'axios-mock-adapter';

import TenantInvitationSystem from '../TenantInvitationSystem';
import { LandlordContractService } from '../../../services/landlordContractService';
import { LandlordControlledContractData } from '../../../types/landlordContract';
import { api } from '../../../services/api';

// Mock del API
let mockAxios: MockAdapter;

// Theme para testing
const theme = createTheme();

// Wrapper para providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>
    {children}
  </ThemeProvider>
);

// Mock data
const mockContract: LandlordControlledContractData = {
  id: 'contract-123',
  contract_number: 'VH-2025-001',
  current_state: 'DRAFT',
  property_address: 'Apartamento 501, Torre Central, El Poblado',
  property_type: 'apartamento',
  property_area: 80,
  property_stratum: 5,
  property_furnished: true,
  monthly_rent: 2500000,
  security_deposit: 2500000,
  contract_duration_months: 12,
  rent_increase_type: 'ipc',
  payment_day: 5,
  utilities_included: false,
  pets_allowed: false,
  smoking_allowed: false,
  guests_policy: 'limited',
  max_occupants: 2,
  guarantor_required: true,
  maintenance_responsibility: 'tenant',
  utilities_responsibility: 'tenant',
  insurance_responsibility: 'tenant',
  special_clauses: [],
  landlord_data: {
    full_name: 'Juan Carlos Pérez',
    document_type: 'CC',
    document_number: '12345678',
    phone: '+57 300 123 4567',
    email: 'juan.perez@example.com',
    address: 'Calle 123 #45-67',
    city: 'Bogotá',
    emergency_contact: 'María Pérez'
  },
  landlord_approved: false,
  tenant_approved: false,
  landlord_signed: false,
  tenant_signed: false,
  published: false,
  workflow_history: []
};

const mockInvitationResponse = {
  invitation_id: 'inv-456',
  invitation_token: 'secure-token-789',
  expires_at: '2025-01-08T10:00:00Z',
  invitation_url: 'https://verihome.com/contracts/invitation/secure-token-789'
};

const mockInvitationsHistory = {
  invitations: [
    {
      id: 'inv-123',
      tenant_email: 'test@example.com',
      tenant_name: 'Usuario de Prueba',
      invitation_method: 'email',
      status: 'pending',
      created_at: '2025-01-01T10:00:00Z',
      expires_at: '2025-01-08T10:00:00Z'
    },
    {
      id: 'inv-124',
      tenant_email: 'accepted@example.com',
      invitation_method: 'sms',
      status: 'accepted',
      created_at: '2025-01-01T09:00:00Z',
      expires_at: '2025-01-08T09:00:00Z',
      accepted_at: '2025-01-02T14:30:00Z'
    }
  ]
};

// Mock props
const defaultProps = {
  contract: mockContract,
  open: true,
  onClose: jest.fn(),
  onInvitationSent: jest.fn(),
  onError: jest.fn()
};

describe('TenantInvitationSystem', () => {
  beforeEach(() => {
    mockAxios = new MockAdapter(api);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockAxios.restore();
  });

  // =====================================================================
  // TESTS DE RENDERIZADO Y UI
  // =====================================================================

  describe('Rendering and UI', () => {
    it('should render the invitation system modal', () => {
      render(
        <TestWrapper>
          <TenantInvitationSystem {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Invitar Arrendatario')).toBeInTheDocument();
      expect(screen.getByText('Apartamento 501, Torre Central, El Poblado')).toBeInTheDocument();
      expect(screen.getByText('$2.500.000')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(
        <TestWrapper>
          <TenantInvitationSystem {...defaultProps} open={false} />
        </TestWrapper>
      );

      expect(screen.queryByText('Invitar Arrendatario')).not.toBeInTheDocument();
    });

    it('should display contract information correctly', () => {
      render(
        <TestWrapper>
          <TenantInvitationSystem {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('Apartamento 501, Torre Central, El Poblado')).toBeInTheDocument();
      expect(screen.getByText('$2.500.000')).toBeInTheDocument();
      expect(screen.getByText('12 meses')).toBeInTheDocument();
      expect(screen.getByText('Juan Carlos Pérez')).toBeInTheDocument();
    });

    it('should show all invitation method options', () => {
      render(
        <TestWrapper>
          <TenantInvitationSystem {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText('📧 Email')).toBeInTheDocument();
      expect(screen.getByText('📱 SMS')).toBeInTheDocument();
      expect(screen.getByText('💬 WhatsApp')).toBeInTheDocument();
    });
  });

  // =====================================================================
  // TESTS DE FORMULARIO Y VALIDACIÓN
  // =====================================================================

  describe('Form Validation', () => {
    it('should validate required email field', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <TenantInvitationSystem {...defaultProps} />
        </TestWrapper>
      );

      const sendButton = screen.getByText('Enviar Invitación');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Email es requerido')).toBeInTheDocument();
      });
    });

    it('should validate email format', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <TenantInvitationSystem {...defaultProps} />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText('Email del Arrendatario *');
      await user.type(emailInput, 'invalid-email');
      
      const sendButton = screen.getByText('Enviar Invitación');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Email inválido')).toBeInTheDocument();
      });
    });

    it('should validate phone number when SMS is selected', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <TenantInvitationSystem {...defaultProps} />
        </TestWrapper>
      );

      // Select SMS method
      const smsButton = screen.getByText('📱 SMS');
      await user.click(smsButton);

      // Try to send without phone
      const sendButton = screen.getByText('Enviar Invitación');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Teléfono es requerido para SMS')).toBeInTheDocument();
      });
    });

    it('should validate phone number format', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <TenantInvitationSystem {...defaultProps} />
        </TestWrapper>
      );

      const phoneInput = screen.getByLabelText('Teléfono del Arrendatario');
      await user.type(phoneInput, '123'); // Invalid phone

      // Select SMS to trigger phone validation
      const smsButton = screen.getByText('📱 SMS');
      await user.click(smsButton);

      const sendButton = screen.getByText('Enviar Invitación');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Formato de teléfono inválido')).toBeInTheDocument();
      });
    });

    it('should validate personal message length', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <TenantInvitationSystem {...defaultProps} />
        </TestWrapper>
      );

      const messageInput = screen.getByLabelText('Mensaje Personal (Opcional)');
      const longMessage = 'A'.repeat(501); // Exceed 500 character limit
      await user.type(messageInput, longMessage);

      const sendButton = screen.getByText('Enviar Invitación');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Mensaje demasiado largo (máximo 500 caracteres)')).toBeInTheDocument();
      });
    });
  });

  // =====================================================================
  // TESTS DE FUNCIONALIDAD DE INVITACIÓN
  // =====================================================================

  describe('Invitation Functionality', () => {
    it('should send email invitation successfully', async () => {
      const user = userEvent.setup();

      mockAxios.onPost(`/api/v1/contracts/landlord/contracts/${mockContract.id}/create-invitation/`)
        .reply(201, mockInvitationResponse);

      mockAxios.onPost('/api/v1/contracts/invitations/inv-456/send/')
        .reply(200, { success: true, method: 'email', sent_at: '2025-01-01T10:00:00Z' });

      render(
        <TestWrapper>
          <TenantInvitationSystem {...defaultProps} />
        </TestWrapper>
      );

      // Fill form
      const emailInput = screen.getByLabelText('Email del Arrendatario *');
      await user.type(emailInput, 'test@example.com');

      const nameInput = screen.getByLabelText('Nombre del Arrendatario (Opcional)');
      await user.type(nameInput, 'Juan Pérez');

      const messageInput = screen.getByLabelText('Mensaje Personal (Opcional)');
      await user.type(messageInput, 'Te invito a revisar este contrato');

      // Send invitation
      const sendButton = screen.getByText('Enviar Invitación');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('¡Invitación Enviada!')).toBeInTheDocument();
      });

      expect(defaultProps.onInvitationSent).toHaveBeenCalledWith(expect.objectContaining({
        id: mockContract.id
      }));
    });

    it('should send SMS invitation successfully', async () => {
      const user = userEvent.setup();

      mockAxios.onPost(`/api/v1/contracts/landlord/contracts/${mockContract.id}/create-invitation/`)
        .reply(201, mockInvitationResponse);

      mockAxios.onPost('/api/v1/contracts/invitations/inv-456/send/')
        .reply(200, { success: true, method: 'sms', sent_at: '2025-01-01T10:00:00Z' });

      render(
        <TestWrapper>
          <TenantInvitationSystem {...defaultProps} />
        </TestWrapper>
      );

      // Fill form
      const emailInput = screen.getByLabelText('Email del Arrendatario *');
      await user.type(emailInput, 'test@example.com');

      const phoneInput = screen.getByLabelText('Teléfono del Arrendatario');
      await user.type(phoneInput, '+57 300 123 4567');

      // Select SMS method
      const smsButton = screen.getByText('📱 SMS');
      await user.click(smsButton);

      // Send invitation
      const sendButton = screen.getByText('Enviar Invitación');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('¡Invitación Enviada!')).toBeInTheDocument();
      });

      // Verify SMS method was used
      expect(mockAxios.history.post).toHaveLength(2);
      const invitationRequest = JSON.parse(mockAxios.history.post[0].data);
      expect(invitationRequest.invitation_method).toBe('sms');
    });

    it('should send WhatsApp invitation successfully', async () => {
      const user = userEvent.setup();

      mockAxios.onPost(`/api/v1/contracts/landlord/contracts/${mockContract.id}/create-invitation/`)
        .reply(201, mockInvitationResponse);

      mockAxios.onPost('/api/v1/contracts/invitations/inv-456/send/')
        .reply(200, { success: true, method: 'whatsapp', sent_at: '2025-01-01T10:00:00Z' });

      render(
        <TestWrapper>
          <TenantInvitationSystem {...defaultProps} />
        </TestWrapper>
      );

      // Fill form
      const emailInput = screen.getByLabelText('Email del Arrendatario *');
      await user.type(emailInput, 'test@example.com');

      const phoneInput = screen.getByLabelText('Teléfono del Arrendatario');
      await user.type(phoneInput, '+57 300 123 4567');

      // Select WhatsApp method
      const whatsappButton = screen.getByText('💬 WhatsApp');
      await user.click(whatsappButton);

      // Send invitation
      const sendButton = screen.getByText('Enviar Invitación');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('¡Invitación Enviada!')).toBeInTheDocument();
      });

      // Verify WhatsApp method was used
      expect(mockAxios.history.post).toHaveLength(2);
      const invitationRequest = JSON.parse(mockAxios.history.post[0].data);
      expect(invitationRequest.invitation_method).toBe('whatsapp');
    });

    it('should handle invitation creation errors', async () => {
      const user = userEvent.setup();

      mockAxios.onPost(`/api/v1/contracts/landlord/contracts/${mockContract.id}/create-invitation/`)
        .reply(400, { error: 'Invalid tenant email' });

      render(
        <TestWrapper>
          <TenantInvitationSystem {...defaultProps} />
        </TestWrapper>
      );

      // Fill form with valid data
      const emailInput = screen.getByLabelText('Email del Arrendatario *');
      await user.type(emailInput, 'test@example.com');

      // Try to send
      const sendButton = screen.getByText('Enviar Invitación');
      await user.click(sendButton);

      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalled();
      });
    });

    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup();

      mockAxios.onPost(`/api/v1/contracts/landlord/contracts/${mockContract.id}/create-invitation/`)
        .networkError();

      render(
        <TestWrapper>
          <TenantInvitationSystem {...defaultProps} />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText('Email del Arrendatario *');
      await user.type(emailInput, 'test@example.com');

      const sendButton = screen.getByText('Enviar Invitación');
      await user.click(sendButton);

      await waitFor(() => {
        expect(defaultProps.onError).toHaveBeenCalledWith(
          expect.stringContaining('Error de conexión')
        );
      });
    });
  });

  // =====================================================================
  // TESTS DE HISTORIAL DE INVITACIONES
  // =====================================================================

  describe('Invitation History', () => {
    it('should load and display invitation history', async () => {
      mockAxios.onGet(`/api/v1/contracts/landlord/contracts/${mockContract.id}/invitations/`)
        .reply(200, mockInvitationsHistory);

      render(
        <TestWrapper>
          <TenantInvitationSystem {...defaultProps} />
        </TestWrapper>
      );

      // Wait for history to load
      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
        expect(screen.getByText('accepted@example.com')).toBeInTheDocument();
      });

      // Check status chips
      expect(screen.getByText('Pendiente')).toBeInTheDocument();
      expect(screen.getByText('Aceptada')).toBeInTheDocument();
    });

    it('should show empty state when no invitations exist', async () => {
      mockAxios.onGet(`/api/v1/contracts/landlord/contracts/${mockContract.id}/invitations/`)
        .reply(200, { invitations: [] });

      render(
        <TestWrapper>
          <TenantInvitationSystem {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('No hay invitaciones enviadas aún')).toBeInTheDocument();
      });
    });

    it('should handle history loading errors', async () => {
      mockAxios.onGet(`/api/v1/contracts/landlord/contracts/${mockContract.id}/invitations/`)
        .reply(500, { error: 'Server error' });

      render(
        <TestWrapper>
          <TenantInvitationSystem {...defaultProps} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Error al cargar historial')).toBeInTheDocument();
      });
    });

    it('should allow resending invitations', async () => {
      const user = userEvent.setup();

      mockAxios.onGet(`/api/v1/contracts/landlord/contracts/${mockContract.id}/invitations/`)
        .reply(200, mockInvitationsHistory);

      mockAxios.onPost('/api/v1/contracts/invitations/inv-123/resend/')
        .reply(200, { success: true, method: 'email', sent_at: '2025-01-01T11:00:00Z' });

      render(
        <TestWrapper>
          <TenantInvitationSystem {...defaultProps} />
        </TestWrapper>
      );

      // Wait for history to load
      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });

      // Find and click resend button
      const resendButtons = screen.getAllByText('Reenviar');
      await user.click(resendButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Invitación reenviada exitosamente')).toBeInTheDocument();
      });
    });

    it('should allow canceling pending invitations', async () => {
      const user = userEvent.setup();

      mockAxios.onGet(`/api/v1/contracts/landlord/contracts/${mockContract.id}/invitations/`)
        .reply(200, mockInvitationsHistory);

      mockAxios.onPost('/api/v1/contracts/invitations/inv-123/cancel/')
        .reply(200, { success: true });

      render(
        <TestWrapper>
          <TenantInvitationSystem {...defaultProps} />
        </TestWrapper>
      );

      // Wait for history to load
      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });

      // Find and click cancel button
      const cancelButtons = screen.getAllByText('Cancelar');
      await user.click(cancelButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Invitación cancelada exitosamente')).toBeInTheDocument();
      });
    });
  });

  // =====================================================================
  // TESTS DE NAVEGACIÓN Y FLUJO
  // =====================================================================

  describe('Navigation and Flow', () => {
    it('should switch between invitation form and history tabs', async () => {
      const user = userEvent.setup();

      mockAxios.onGet(`/api/v1/contracts/landlord/contracts/${mockContract.id}/invitations/`)
        .reply(200, mockInvitationsHistory);

      render(
        <TestWrapper>
          <TenantInvitationSystem {...defaultProps} />
        </TestWrapper>
      );

      // Should start on form tab
      expect(screen.getByLabelText('Email del Arrendatario *')).toBeInTheDocument();

      // Switch to history tab
      const historyTab = screen.getByText('Historial');
      await user.click(historyTab);

      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });

      // Switch back to form
      const formTab = screen.getByText('Nueva Invitación');
      await user.click(formTab);

      expect(screen.getByLabelText('Email del Arrendatario *')).toBeInTheDocument();
    });

    it('should close modal when close button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TenantInvitationSystem {...defaultProps} />
        </TestWrapper>
      );

      const closeButton = screen.getByText('Cancelar');
      await user.click(closeButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should show loading state during invitation creation', async () => {
      const user = userEvent.setup();

      // Delay the response to test loading state
      mockAxios.onPost(`/api/v1/contracts/landlord/contracts/${mockContract.id}/create-invitation/`)
        .reply(() => new Promise(resolve => setTimeout(() => resolve([201, mockInvitationResponse]), 1000)));

      render(
        <TestWrapper>
          <TenantInvitationSystem {...defaultProps} />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText('Email del Arrendatario *');
      await user.type(emailInput, 'test@example.com');

      const sendButton = screen.getByText('Enviar Invitación');
      await user.click(sendButton);

      // Should show loading state
      expect(screen.getByText('Enviando...')).toBeInTheDocument();
      expect(sendButton).toBeDisabled();
    });
  });

  // =====================================================================
  // TESTS DE ACCESIBILIDAD
  // =====================================================================

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <TestWrapper>
          <TenantInvitationSystem {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByLabelText('Email del Arrendatario *')).toBeInTheDocument();
      expect(screen.getByLabelText('Teléfono del Arrendatario')).toBeInTheDocument();
      expect(screen.getByLabelText('Nombre del Arrendatario (Opcional)')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TenantInvitationSystem {...defaultProps} />
        </TestWrapper>
      );

      // Tab through form fields
      await user.tab();
      expect(screen.getByLabelText('Email del Arrendatario *')).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText('Teléfono del Arrendatario')).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText('Nombre del Arrendatario (Opcional)')).toHaveFocus();
    });

    it('should announce errors to screen readers', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TenantInvitationSystem {...defaultProps} />
        </TestWrapper>
      );

      const sendButton = screen.getByText('Enviar Invitación');
      await user.click(sendButton);

      await waitFor(() => {
        const errorMessage = screen.getByText('Email es requerido');
        expect(errorMessage).toHaveAttribute('role', 'alert');
      });
    });
  });

  // =====================================================================
  // TESTS DE CASOS EDGE
  // =====================================================================

  describe('Edge Cases', () => {
    it('should handle contract without ID', () => {
      const contractWithoutId = { ...mockContract, id: undefined };

      render(
        <TestWrapper>
          <TenantInvitationSystem {...defaultProps} contract={contractWithoutId} />
        </TestWrapper>
      );

      expect(screen.getByText('Error: Contrato inválido')).toBeInTheDocument();
    });

    it('should handle very long tenant names gracefully', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <TenantInvitationSystem {...defaultProps} />
        </TestWrapper>
      );

      const nameInput = screen.getByLabelText('Nombre del Arrendatario (Opcional)');
      const longName = 'A'.repeat(200);
      await user.type(nameInput, longName);

      // Should truncate or handle gracefully
      expect(nameInput).toHaveValue(longName.substring(0, 100)); // Assuming 100 char limit
    });

    it('should handle special characters in form fields', async () => {
      const user = userEvent.setup();

      mockAxios.onPost(`/api/v1/contracts/landlord/contracts/${mockContract.id}/create-invitation/`)
        .reply(201, mockInvitationResponse);

      mockAxios.onPost('/api/v1/contracts/invitations/inv-456/send/')
        .reply(200, { success: true, method: 'email', sent_at: '2025-01-01T10:00:00Z' });

      render(
        <TestWrapper>
          <TenantInvitationSystem {...defaultProps} />
        </TestWrapper>
      );

      // Test special characters
      const emailInput = screen.getByLabelText('Email del Arrendatario *');
      await user.type(emailInput, 'test+special@example.com');

      const nameInput = screen.getByLabelText('Nombre del Arrendatario (Opcional)');
      await user.type(nameInput, 'José María Ñáñez-Pérez');

      const messageInput = screen.getByLabelText('Mensaje Personal (Opcional)');
      await user.type(messageInput, '¡Hola! ¿Cómo estás? Te invito...');

      const sendButton = screen.getByText('Enviar Invitación');
      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('¡Invitación Enviada!')).toBeInTheDocument();
      });
    });

    it('should handle expired invitations in history', async () => {
      const expiredInvitationsHistory = {
        invitations: [
          {
            id: 'inv-expired',
            tenant_email: 'expired@example.com',
            invitation_method: 'email',
            status: 'expired',
            created_at: '2024-12-01T10:00:00Z',
            expires_at: '2024-12-08T10:00:00Z'
          }
        ]
      };

      mockAxios.onGet(`/api/v1/contracts/landlord/contracts/${mockContract.id}/invitations/`)
        .reply(200, expiredInvitationsHistory);

      render(
        <TestWrapper>
          <TenantInvitationSystem {...defaultProps} />
        </TestWrapper>
      );

      // Switch to history tab
      const historyTab = screen.getByText('Historial');
      await userEvent.setup().click(historyTab);

      await waitFor(() => {
        expect(screen.getByText('Expirada')).toBeInTheDocument();
        expect(screen.getByText('expired@example.com')).toBeInTheDocument();
      });

      // Expired invitations should not have resend button
      expect(screen.queryByText('Reenviar')).not.toBeInTheDocument();
    });
  });
});