import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Login } from '../Login';
import { useAuth } from '../../../hooks/useAuth';
import '@testing-library/jest-dom';

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
    key: 'default',
  }),
}));

const theme = createTheme();

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={['/login']}>{children}</MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('Login Component', () => {
  const mockMutateAsync = jest.fn();
  const mockLogin = {
    mutateAsync: mockMutateAsync,
    isPending: false,
    error: null,
    data: null,
    isError: false,
    isSuccess: false,
    isIdle: true,
    reset: jest.fn(),
    mutate: jest.fn(),
    variables: undefined,
    failureCount: 0,
    failureReason: null,
    isPaused: false,
    status: 'idle' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: mockLogin as any,
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
  });

  it('should render login form correctly', () => {
    render(
      <TestWrapper>
        <Login />
      </TestWrapper>,
    );

    expect(
      screen.getByRole('heading', { name: /iniciar sesión/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Ingresa tus credenciales para acceder a tu cuenta'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /iniciar sesión/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('¿Olvidaste tu contraseña?')).toBeInTheDocument();
    expect(
      screen.getByText('¿No tienes una cuenta? Regístrate'),
    ).toBeInTheDocument();
  });

  it('should update form fields when user types', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <Login />
      </TestWrapper>,
    );

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(
      /contraseña/i,
    ) as HTMLInputElement;

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('password123');
  });

  it('should handle successful login', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValueOnce({
      user: { id: '1', email: 'test@example.com' },
      access: 'token',
      refresh: 'refresh_token',
    });

    render(
      <TestWrapper>
        <Login />
      </TestWrapper>,
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', {
      name: /iniciar sesión/i,
    });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('should handle login error', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockRejectedValueOnce(
      new Error('No existe una cuenta con ese email'),
    );

    render(
      <TestWrapper>
        <Login />
      </TestWrapper>,
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', {
      name: /iniciar sesión/i,
    });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/No existe una cuenta/i)).toBeInTheDocument();
    });
  });

  it('should show loading state during login', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: { ...mockLogin, isPending: true } as any,
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

    render(
      <TestWrapper>
        <Login />
      </TestWrapper>,
    );

    expect(screen.getByText('Iniciando sesión...')).toBeInTheDocument();
  });

  it('should redirect when already authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: '1',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        user_type: 'tenant',
        is_verified: true,
        created_at: '',
        updated_at: '',
      } as any,
      token: 'token',
      isAuthenticated: true,
      isLoading: false,
      login: mockLogin as any,
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

    render(
      <TestWrapper>
        <Login />
      </TestWrapper>,
    );

    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
  });
});
