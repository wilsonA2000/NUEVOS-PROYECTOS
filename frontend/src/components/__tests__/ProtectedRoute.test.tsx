import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { useAuth } from '../../hooks/useAuth';
import { createWrapper } from '../../test-utils';
import { User } from '../../types';

// Mock the useAuth hook
jest.mock('../../hooks/useAuth');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock child component
const MockChild = () => <div>Protected Content</div>;

// Mock loading component
const MockLoading = () => <div>Loading...</div>;

const mockUser: User = {
  id: 1,
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  user_type: 'tenant',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockMutationResult = {
  data: undefined,
  error: null,
  variables: undefined,
  isError: false,
  isIdle: false,
  isLoading: false,
  isPaused: false,
  isSuccess: false,
  mutate: jest.fn(),
  mutateAsync: jest.fn(),
  reset: jest.fn(),
  status: 'idle',
};

describe('ProtectedRoute', () => {
  const renderWithRouter = (ui: React.ReactElement, { route = '/' } = {}) => {
    window.history.pushState({}, 'Test page', route);
    return render(
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/" element={<div>Landing Page</div>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <MockChild />
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children when authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      token: 'mock-token',
      isAuthenticated: true,
      isLoading: false,
      login: mockMutationResult,
      register: mockMutationResult,
      logout: jest.fn(),
      updateUser: jest.fn(),
      resetInactivityTimer: jest.fn(),
      extendSession: jest.fn(),
      showSessionWarning: false,
    });

    renderWithRouter(<ProtectedRoute><MockChild /></ProtectedRoute>, { route: '/dashboard' });

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  it('should show loading state while checking authentication', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      login: mockMutationResult,
      register: mockMutationResult,
      logout: jest.fn(),
      updateUser: jest.fn(),
      resetInactivityTimer: jest.fn(),
      extendSession: jest.fn(),
      showSessionWarning: false,
    });

    renderWithRouter(<ProtectedRoute><MockChild /></ProtectedRoute>, { route: '/dashboard' });

    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  it('should redirect to landing page when not authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: mockMutationResult,
      register: mockMutationResult,
      logout: jest.fn(),
      updateUser: jest.fn(),
      resetInactivityTimer: jest.fn(),
      extendSession: jest.fn(),
      showSessionWarning: false,
    });

    renderWithRouter(<ProtectedRoute><MockChild /></ProtectedRoute>, { route: '/dashboard' });

    await waitFor(() => {
      expect(screen.getByText('Landing Page')).toBeInTheDocument();
    });
  });
}); 