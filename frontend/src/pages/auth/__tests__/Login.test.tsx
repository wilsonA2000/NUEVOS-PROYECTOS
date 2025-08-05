import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Login } from '../Login';
import { useAuth } from '../../../hooks/useAuth';
import { theme } from '../../../lib/theme';

// Mock the useAuth hook
jest.mock('../../../hooks/useAuth');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({
    pathname: '/login',
    search: '',
    hash: '',
    state: null,
    key: 'default'
  })
}));

// Test wrapper component
const TestWrapper = ({ children, initialEntries = ['/login'] }: { 
  children: React.ReactNode;
  initialEntries?: string[];
}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={initialEntries}>
          {children}
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('Login Component', () => {
  const mockLogin = {
    mutateAsync: jest.fn(),
    isPending: false,
    error: null,
    data: null,
    isError: false,
    isSuccess: false,
    isIdle: true,
    reset: jest.fn(),
    mutate: jest.fn(),
    variables: undefined,
    context: undefined,
    failureCount: 0,
    failureReason: null,
    isPaused: false,
    status: 'idle' as const
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: mockLogin,
      logout: jest.fn(),
      refreshToken: jest.fn()
    });
  });

  it('should render login form correctly', () => {
    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    expect(screen.getByText('Iniciar Sesión')).toBeInTheDocument();
    expect(screen.getByText('Ingresa tus credenciales para acceder a tu cuenta')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
    expect(screen.getByText('¿Olvidaste tu contraseña?')).toBeInTheDocument();
    expect(screen.getByText('¿No tienes una cuenta? Regístrate')).toBeInTheDocument();
  });

  it('should update form fields when user types', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/contraseña/i) as HTMLInputElement;

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('password123');
  });

  it('should clear error when user types in input fields', async () => {
    const user = userEvent.setup();
    
    // Mock a failed login attempt first
    mockLogin.mutateAsync.mockRejectedValueOnce(new Error('Invalid credentials'));
    
    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });

    // Submit form with empty values to trigger error
    await user.click(submitButton);
    
    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    // Type in email field should clear error
    await user.type(emailInput, 'test@example.com');
    
    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  it('should handle successful login', async () => {
    const user = userEvent.setup();
    mockLogin.mutateAsync.mockResolvedValueOnce({
      user: { id: 1, email: 'test@example.com' },
      access: 'token',
      refresh: 'refresh_token'
    });

    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockLogin.mutateAsync).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      });
    });
  });

  it('should handle login error with proper error message', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Credenciales inválidas';
    mockLogin.mutateAsync.mockRejectedValueOnce({
      response: { 
        status: 401,
        data: { detail: errorMessage }
      }
    });

    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/credenciales inválidas/i)).toBeInTheDocument();
    });
  });

  it('should handle network error', async () => {
    const user = userEvent.setup();
    mockLogin.mutateAsync.mockRejectedValueOnce({
      message: 'Network Error'
    });

    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/no se pudo conectar con el servidor/i)).toBeInTheDocument();
    });
  });

  it('should show loading state during login', async () => {
    const user = userEvent.setup();
    
    // Mock pending state
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: { ...mockLogin, isPending: true },
      logout: jest.fn(),
      refreshToken: jest.fn()
    });

    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    const submitButton = screen.getByRole('button', { name: /iniciando sesión/i });
    expect(submitButton).toBeDisabled();
    expect(screen.getByText('Iniciando sesión...')).toBeInTheDocument();
  });

  it('should redirect when already authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, email: 'test@example.com', first_name: 'Test', last_name: 'User', role: 'tenant', is_verified: true },
      isAuthenticated: true,
      isLoading: false,
      login: mockLogin,
      logout: jest.fn(),
      refreshToken: jest.fn()
    });

    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('should display success message from location state', () => {
    const mockLocationWithMessage = jest.fn(() => ({
      pathname: '/login',
      search: '',
      hash: '',
      state: { message: 'Registro exitoso. Por favor, inicia sesión.' },
      key: 'default'
    }));

    jest.doMock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate,
      useLocation: mockLocationWithMessage
    }));

    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    expect(screen.getByText('Registro exitoso. Por favor, inicia sesión.')).toBeInTheDocument();
  });

  it('should handle rate limiting error', async () => {
    const user = userEvent.setup();
    mockLogin.mutateAsync.mockRejectedValueOnce({
      response: { status: 429 }
    });

    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/demasiados intentos/i)).toBeInTheDocument();
    });
  });
});