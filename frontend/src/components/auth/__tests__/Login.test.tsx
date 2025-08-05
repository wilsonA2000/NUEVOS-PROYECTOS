import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../../contexts/AuthContext';
import Login from '../../../pages/Login';
import { authService } from '../../../services/authService';
import { toast } from 'react-toastify';

// Mock de servicios
jest.mock('../../../services/authService');
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock de navigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
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
      <BrowserRouter>
        <AuthProvider>{children}</AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Login Component', () => {
  const mockLogin = authService.login as jest.MockedFunction<typeof authService.login>;
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    localStorage.clear();
  });

  it('renders login form correctly', () => {
    render(<Login />, { wrapper: createWrapper });

    expect(screen.getByText(/iniciar sesión/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
    expect(screen.getByText(/¿no tienes una cuenta/i)).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<Login />, { wrapper: createWrapper });

    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email es requerido/i)).toBeInTheDocument();
      expect(screen.getByText(/contraseña es requerida/i)).toBeInTheDocument();
    });
  });

  it('validates email format', async () => {
    render(<Login />, { wrapper: createWrapper });

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid-email');
    
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email inválido/i)).toBeInTheDocument();
    });
  });

  it('handles successful login', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      user_type: 'tenant',
      is_verified: true,
    };

    mockLogin.mockResolvedValueOnce(mockUser);

    render(<Login />, { wrapper: createWrapper });

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(toast.success).toHaveBeenCalledWith('¡Bienvenido de vuelta!');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('handles login error - invalid credentials', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Credenciales inválidas'));

    render(<Login />, { wrapper: createWrapper });

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Credenciales inválidas');
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('handles login error - unverified account', async () => {
    mockLogin.mockRejectedValueOnce(
      new Error('Tu cuenta no está autorizada para acceder a VeriHome')
    );

    render(<Login />, { wrapper: createWrapper });

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });

    await user.type(emailInput, 'unverified@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Tu cuenta no está autorizada para acceder a VeriHome'
      );
    });
  });

  it('handles network error', async () => {
    mockLogin.mockRejectedValueOnce(
      new Error('Error de conexión. Por favor, verifica tu conexión a internet.')
    );

    render(<Login />, { wrapper: createWrapper });

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Error de conexión. Por favor, verifica tu conexión a internet.'
      );
    });
  });

  it('shows loading state during login', async () => {
    mockLogin.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    render(<Login />, { wrapper: createWrapper });

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/contraseña/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(screen.getByText(/iniciando sesión/i)).toBeInTheDocument();
  });

  it('navigates to register page when clicking sign up link', async () => {
    render(<Login />, { wrapper: createWrapper });

    const signUpLink = screen.getByText(/regístrate aquí/i);
    await user.click(signUpLink);

    expect(mockNavigate).toHaveBeenCalledWith('/register');
  });

  it('navigates to forgot password page when clicking forgot password link', async () => {
    render(<Login />, { wrapper: createWrapper });

    const forgotPasswordLink = screen.getByText(/¿olvidaste tu contraseña/i);
    await user.click(forgotPasswordLink);

    expect(mockNavigate).toHaveBeenCalledWith('/forgot-password');
  });

  it('toggles password visibility', async () => {
    render(<Login />, { wrapper: createWrapper });

    const passwordInput = screen.getByLabelText(/contraseña/i);
    const toggleButton = screen.getByLabelText(/mostrar contraseña/i);

    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('persists email in localStorage when remember me is checked', async () => {
    render(<Login />, { wrapper: createWrapper });

    const emailInput = screen.getByLabelText(/email/i);
    const rememberMeCheckbox = screen.getByLabelText(/recordarme/i);

    await user.type(emailInput, 'test@example.com');
    await user.click(rememberMeCheckbox);

    expect(localStorage.getItem('rememberedEmail')).toBe('test@example.com');
  });

  it('loads remembered email on mount', () => {
    localStorage.setItem('rememberedEmail', 'remembered@example.com');

    render(<Login />, { wrapper: createWrapper });

    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toHaveValue('remembered@example.com');
  });
});