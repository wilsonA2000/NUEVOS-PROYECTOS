/**
 * Tests for AdminMaintenance page
 * Covers rendering of maintenance cards, health check, confirmation dialogs,
 * action execution, and error handling.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import AdminMaintenance from '../AdminMaintenance';

// Mock useAdminAuth hook
jest.mock('../../../hooks/useAdminAuth', () => ({
  useAdminAuth: jest.fn(),
}));

// Mock api service
jest.mock('../../../services/api', () => {
  const mockApi = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  };
  return {
    __esModule: true,
    default: mockApi,
    api: mockApi,
  };
});

import { useAdminAuth } from '../../../hooks/useAdminAuth';
import api from '../../../services/api';

const mockedUseAdminAuth = useAdminAuth as jest.MockedFunction<
  typeof useAdminAuth
>;
const mockedApi = api as jest.Mocked<typeof api>;

const theme = createTheme();

const renderComponent = () => {
  return render(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(
        ThemeProvider,
        { theme },
        React.createElement(AdminMaintenance),
      ),
    ),
  );
};

describe('AdminMaintenance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAdminAuth.mockReturnValue({
      isAdmin: true,
      isStaff: true,
      isSuperuser: true,
      isLoading: false,
      error: null,
      checkAdminAccess: jest.fn().mockReturnValue(true),
      redirectIfNotAdmin: jest.fn(),
      adminPermissions: {
        canApproveContracts: true,
        canRejectContracts: true,
        canViewAuditLogs: true,
        canExportReports: true,
        canManageUsers: true,
        canAccessSecurityPanel: true,
      },
    });
  });

  it('should render the maintenance page title', () => {
    renderComponent();

    expect(screen.getByText('Mantenimiento del Sistema')).toBeInTheDocument();
    expect(
      screen.getByText(/Operaciones de mantenimiento/i),
    ).toBeInTheDocument();
  });

  it('should render all 5 maintenance cards', () => {
    renderComponent();

    expect(screen.getByText('Health Check')).toBeInTheDocument();
    expect(screen.getByText('Limpieza de Logs')).toBeInTheDocument();
    expect(screen.getByText('Gestion de Cache')).toBeInTheDocument();
    expect(screen.getByText('Sesiones Activas')).toBeInTheDocument();
    expect(screen.getByText('Optimizacion de BD')).toBeInTheDocument();
  });

  it('should return null when user is not admin', () => {
    mockedUseAdminAuth.mockReturnValue({
      isAdmin: false,
      isStaff: false,
      isSuperuser: false,
      isLoading: false,
      error: 'No permission',
      checkAdminAccess: jest.fn().mockReturnValue(false),
      redirectIfNotAdmin: jest.fn(),
      adminPermissions: {
        canApproveContracts: false,
        canRejectContracts: false,
        canViewAuditLogs: false,
        canExportReports: false,
        canManageUsers: false,
        canAccessSecurityPanel: false,
      },
    });

    const { container } = renderComponent();

    expect(container.innerHTML).toBe('');
  });

  it('should execute health check when button is clicked', async () => {
    const healthResponse = {
      database: { status: 'healthy', latency_ms: 5 },
      redis: { status: 'healthy', latency_ms: 2 },
      storage: { status: 'healthy', usage_percent: 45 },
      celery: { status: 'healthy', active_workers: 4 },
      overall: 'healthy',
    };
    mockedApi.get.mockResolvedValueOnce({ data: healthResponse });

    renderComponent();

    const healthButton = screen.getByText('Ejecutar Health Check');
    fireEvent.click(healthButton);

    await waitFor(() => {
      expect(mockedApi.get).toHaveBeenCalledWith('/core/maintenance/health/');
    });

    await waitFor(() => {
      expect(screen.getByText('Base de Datos')).toBeInTheDocument();
      expect(screen.getByText(/Latencia: 5ms/)).toBeInTheDocument();
    });
  });

  it('should show confirmation dialog when clicking log cleanup', () => {
    renderComponent();

    const cleanupButton = screen.getByText('Limpiar Logs Antiguos');
    fireEvent.click(cleanupButton);

    expect(screen.getByText('Limpiar Logs')).toBeInTheDocument();
    expect(screen.getByText(/Se eliminaran los logs/i)).toBeInTheDocument();
    expect(screen.getByText('Confirmar')).toBeInTheDocument();
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });

  it('should close confirmation dialog on cancel', async () => {
    renderComponent();

    // Open dialog
    const cleanupButton = screen.getByText('Limpiar Logs Antiguos');
    fireEvent.click(cleanupButton);

    expect(screen.getByText('Limpiar Logs')).toBeInTheDocument();

    // Cancel
    const cancelButton = screen.getByText('Cancelar');
    fireEvent.click(cancelButton);

    // Dialog should close (MUI Dialog may animate out)
    await waitFor(() => {
      expect(
        screen.queryByText(/Se eliminaran los logs/i),
      ).not.toBeInTheDocument();
    });
  });

  it('should execute clear-logs action after confirmation', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { message: 'Logs limpiados exitosamente' },
    });

    renderComponent();

    // Open dialog
    fireEvent.click(screen.getByText('Limpiar Logs Antiguos'));

    // Confirm
    fireEvent.click(screen.getByText('Confirmar'));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/core/maintenance/clear-logs/',
      );
    });

    await waitFor(() => {
      expect(
        screen.getByText('Logs limpiados exitosamente'),
      ).toBeInTheDocument();
    });
  });

  it('should show confirmation dialog for cache cleanup', () => {
    renderComponent();

    const cacheButton = screen.getByText('Limpiar Cache');
    fireEvent.click(cacheButton);

    expect(screen.getByText(/Se limpiara toda la cache/i)).toBeInTheDocument();
  });

  it('should show confirmation dialog for session cleanup', () => {
    renderComponent();

    const sessionButton = screen.getByText('Limpiar Sesiones Expiradas');
    fireEvent.click(sessionButton);

    expect(
      screen.getByText(/Se cerraran todas las sesiones/i),
    ).toBeInTheDocument();
  });

  it('should show error message when API call fails', async () => {
    mockedApi.get.mockRejectedValueOnce({
      response: { data: { detail: 'Error de conexion a la base de datos' } },
    });

    renderComponent();

    fireEvent.click(screen.getByText('Ejecutar Health Check'));

    await waitFor(() => {
      expect(
        screen.getByText('Error de conexion a la base de datos'),
      ).toBeInTheDocument();
    });
  });

  it('should show success message after successful action', async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { message: 'Operacion completada exitosamente' },
    });

    renderComponent();

    // Open and confirm DB optimization
    fireEvent.click(screen.getByText('Optimizar Base de Datos'));
    fireEvent.click(screen.getByText('Confirmar'));

    await waitFor(() => {
      expect(
        screen.getByText('Operacion completada exitosamente'),
      ).toBeInTheDocument();
    });
  });
});
