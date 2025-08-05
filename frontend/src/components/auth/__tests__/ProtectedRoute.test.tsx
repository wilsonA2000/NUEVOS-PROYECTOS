import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';
import { useAuth } from '../../../hooks/useAuth';

// Mock the useAuth hook
jest.mock('../../../hooks/useAuth');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock Navigate component
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Navigate: ({ to, state, replace }: any) => {
    mockNavigate(to, state, replace);
    return <div data-testid="navigate-component">Navigate to {to}</div>;
  },
  useLocation: () => ({
    pathname: '/dashboard',
    search: '',
    hash: '',
    state: null,
    key: 'default'
  })
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const TestChild = () => <div data-testid="protected-content">Protected Content</div>;

  it('should render loading state when authentication is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      login: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn()
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <TestChild />
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('should redirect to home when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn()
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <TestChild />
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      '/',
      { from: expect.any(Object) },
      true
    );
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('should render children when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 1,
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'landlord',
        is_verified: true
      },
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn()
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <TestChild />
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('should preserve location state when redirecting', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn()
    });

    render(
      <MemoryRouter initialEntries={['/protected-page']}>
        <ProtectedRoute>
          <TestChild />
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      '/',
      { from: expect.objectContaining({ pathname: '/dashboard' }) },
      true
    );
  });
});