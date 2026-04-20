import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { useAuth } from '../../hooks/useAuth';
import '@testing-library/jest-dom';

// Mock the useAuth hook
jest.mock('../../hooks/useAuth');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock child component
const MockChild = () => <div>Protected Content</div>;

describe('ProtectedRoute', () => {
  const renderWithRouter = (route = '/dashboard') => {
    return render(
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path='/' element={<div>Landing Page</div>} />
          <Route
            path='/dashboard'
            element={
              <ProtectedRoute>
                <MockChild />
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children when authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        user_type: 'tenant',
        is_verified: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      } as any,
      token: 'mock-token',
      isAuthenticated: true,
      isLoading: false,
      login: {} as any,
      register: {} as any,
      logout: jest.fn(),
      updateUser: jest.fn(),
      resetInactivityTimer: jest.fn(),
      extendSession: jest.fn(),
      showSessionWarning: false,
      errorModal: { open: false, error: '', title: '' },
      showErrorModal: jest.fn(),
      hideErrorModal: jest.fn(),
    });

    renderWithRouter('/dashboard');

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  it('should show loading state while checking authentication', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      login: {} as any,
      register: {} as any,
      logout: jest.fn(),
      updateUser: jest.fn(),
      resetInactivityTimer: jest.fn(),
      extendSession: jest.fn(),
      showSessionWarning: false,
      errorModal: { open: false, error: '', title: '' },
      showErrorModal: jest.fn(),
      hideErrorModal: jest.fn(),
    });

    renderWithRouter('/dashboard');

    // The component shows "Cargando..." when loading
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('should redirect to landing page when not authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: {} as any,
      register: {} as any,
      logout: jest.fn(),
      updateUser: jest.fn(),
      resetInactivityTimer: jest.fn(),
      extendSession: jest.fn(),
      showSessionWarning: false,
      errorModal: { open: false, error: '', title: '' },
      showErrorModal: jest.fn(),
      hideErrorModal: jest.fn(),
    });

    renderWithRouter('/dashboard');

    await waitFor(() => {
      expect(screen.getByText('Landing Page')).toBeInTheDocument();
    });
  });
});
