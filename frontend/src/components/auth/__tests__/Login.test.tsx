import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Login } from '../../../pages/auth/Login';
import { useAuth } from '../../../hooks/useAuth';
import '@testing-library/jest-dom';

// Mock useAuth
jest.mock('../../../hooks/useAuth');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock navigate
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

const createWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
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
    mockNavigate.mockClear();
    mockMutateAsync.mockClear();
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

  it('renders login form correctly', () => {
    render(<Login />, { wrapper: createWrapper });

    expect(
      screen.getByRole('heading', { name: /iniciar sesión/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /iniciar sesión/i }),
    ).toBeInTheDocument();
  });

  it('updates form fields when user types', async () => {
    const user = userEvent.setup();
    render(<Login />, { wrapper: createWrapper });

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(
      /contraseña/i,
    ) as HTMLInputElement;

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('password123');
  });

  it('handles successful login', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValueOnce({
      user: { id: '1', email: 'test@example.com' },
      access: 'token',
      refresh: 'refresh_token',
    });

    render(<Login />, { wrapper: createWrapper });

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

  it('shows loading state during login', () => {
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

    render(<Login />, { wrapper: createWrapper });

    expect(screen.getByText('Iniciando sesión...')).toBeInTheDocument();
  });

  it('shows forgot password link', () => {
    render(<Login />, { wrapper: createWrapper });
    expect(screen.getByText('¿Olvidaste tu contraseña?')).toBeInTheDocument();
  });

  it('shows register link', () => {
    render(<Login />, { wrapper: createWrapper });
    expect(
      screen.getByText('¿No tienes una cuenta? Regístrate'),
    ).toBeInTheDocument();
  });
});
