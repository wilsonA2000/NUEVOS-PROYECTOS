import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../../contexts/AuthContext';
import Register from '../../../pages/Register';
import { authService } from '../../../services/authService';
import { toast } from 'react-toastify';

// Mock de servicios
jest.mock('../../../services/authService');
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
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

describe('Register Component', () => {
  const mockRegister = authService.register as jest.MockedFunction<typeof authService.register>;
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
  });

  it('renders registration form correctly', () => {
    render(<Register />, { wrapper: createWrapper });

    expect(screen.getByText(/crear cuenta/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/apellido/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^contraseña/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmar contraseña/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tipo de usuario/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/teléfono/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /registrarse/i })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<Register />, { wrapper: createWrapper });

    const submitButton = screen.getByRole('button', { name: /registrarse/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/nombre es requerido/i)).toBeInTheDocument();
      expect(screen.getByText(/apellido es requerido/i)).toBeInTheDocument();
      expect(screen.getByText(/email es requerido/i)).toBeInTheDocument();
      expect(screen.getByText(/contraseña es requerida/i)).toBeInTheDocument();
    });
  });

  it('validates email format', async () => {
    render(<Register />, { wrapper: createWrapper });

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid-email');
    
    const submitButton = screen.getByRole('button', { name: /registrarse/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email inválido/i)).toBeInTheDocument();
    });
  });

  it('validates password requirements', async () => {
    render(<Register />, { wrapper: createWrapper });

    const passwordInput = screen.getByLabelText(/^contraseña/i);
    await user.type(passwordInput, 'weak');
    
    const submitButton = screen.getByRole('button', { name: /registrarse/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/la contraseña debe tener al menos 8 caracteres/i)).toBeInTheDocument();
    });
  });

  it('validates password confirmation match', async () => {
    render(<Register />, { wrapper: createWrapper });

    const passwordInput = screen.getByLabelText(/^contraseña/i);
    const confirmPasswordInput = screen.getByLabelText(/confirmar contraseña/i);

    await user.type(passwordInput, 'Password123!');
    await user.type(confirmPasswordInput, 'DifferentPassword123!');
    
    const submitButton = screen.getByRole('button', { name: /registrarse/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/las contraseñas no coinciden/i)).toBeInTheDocument();
    });
  });

  it('handles successful registration for tenant', async () => {
    const mockUser = {
      id: 1,
      email: 'tenant@example.com',
      first_name: 'John',
      last_name: 'Doe',
      user_type: 'tenant',
      is_verified: false,
      phone_number: '+1234567890',
      avatar: null,
    };

    mockRegister.mockResolvedValueOnce(mockUser);

    render(<Register />, { wrapper: createWrapper });

    // Llenar el formulario
    await user.type(screen.getByLabelText(/nombre/i), 'John');
    await user.type(screen.getByLabelText(/apellido/i), 'Doe');
    await user.type(screen.getByLabelText(/email/i), 'tenant@example.com');
    await user.type(screen.getByLabelText(/^contraseña/i), 'Password123!');
    await user.type(screen.getByLabelText(/confirmar contraseña/i), 'Password123!');
    await user.selectOptions(screen.getByLabelText(/tipo de usuario/i), 'tenant');
    await user.type(screen.getByLabelText(/teléfono/i), '+1234567890');
    
    // Aceptar términos
    await user.click(screen.getByLabelText(/acepto los términos/i));

    const submitButton = screen.getByRole('button', { name: /registrarse/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        first_name: 'John',
        last_name: 'Doe',
        email: 'tenant@example.com',
        password: 'Password123!',
        user_type: 'tenant',
        phone_number: '+1234567890',
      });
      expect(toast.success).toHaveBeenCalledWith(
        'Registro exitoso. Por favor, revisa tu email para verificar tu cuenta.'
      );
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('handles successful registration for landlord with interview code', async () => {
    const mockUser = {
      id: 2,
      email: 'landlord@example.com',
      first_name: 'Jane',
      last_name: 'Smith',
      user_type: 'landlord',
      is_verified: false,
      phone_number: '+0987654321',
      avatar: null,
    };

    mockRegister.mockResolvedValueOnce(mockUser);

    render(<Register />, { wrapper: createWrapper });

    // Llenar el formulario
    await user.type(screen.getByLabelText(/nombre/i), 'Jane');
    await user.type(screen.getByLabelText(/apellido/i), 'Smith');
    await user.type(screen.getByLabelText(/email/i), 'landlord@example.com');
    await user.type(screen.getByLabelText(/^contraseña/i), 'Password123!');
    await user.type(screen.getByLabelText(/confirmar contraseña/i), 'Password123!');
    await user.selectOptions(screen.getByLabelText(/tipo de usuario/i), 'landlord');
    await user.type(screen.getByLabelText(/teléfono/i), '+0987654321');
    
    // Aparece campo de código de entrevista para landlord
    await waitFor(() => {
      expect(screen.getByLabelText(/código de entrevista/i)).toBeInTheDocument();
    });
    
    await user.type(screen.getByLabelText(/código de entrevista/i), 'INTERVIEW123');
    
    // Aceptar términos
    await user.click(screen.getByLabelText(/acepto los términos/i));

    const submitButton = screen.getByRole('button', { name: /registrarse/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'landlord@example.com',
        password: 'Password123!',
        user_type: 'landlord',
        phone_number: '+0987654321',
        interview_code: 'INTERVIEW123',
      });
    });
  });

  it('handles registration error - email already exists', async () => {
    mockRegister.mockRejectedValueOnce(new Error('Este email ya está registrado'));

    render(<Register />, { wrapper: createWrapper });

    // Llenar el formulario mínimo
    await user.type(screen.getByLabelText(/nombre/i), 'John');
    await user.type(screen.getByLabelText(/apellido/i), 'Doe');
    await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
    await user.type(screen.getByLabelText(/^contraseña/i), 'Password123!');
    await user.type(screen.getByLabelText(/confirmar contraseña/i), 'Password123!');
    await user.selectOptions(screen.getByLabelText(/tipo de usuario/i), 'tenant');
    await user.click(screen.getByLabelText(/acepto los términos/i));

    const submitButton = screen.getByRole('button', { name: /registrarse/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Este email ya está registrado');
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('handles network error during registration', async () => {
    mockRegister.mockRejectedValueOnce(
      new Error('Error de conexión. Por favor, verifica tu conexión a internet.')
    );

    render(<Register />, { wrapper: createWrapper });

    // Llenar el formulario mínimo
    await user.type(screen.getByLabelText(/nombre/i), 'John');
    await user.type(screen.getByLabelText(/apellido/i), 'Doe');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^contraseña/i), 'Password123!');
    await user.type(screen.getByLabelText(/confirmar contraseña/i), 'Password123!');
    await user.selectOptions(screen.getByLabelText(/tipo de usuario/i), 'tenant');
    await user.click(screen.getByLabelText(/acepto los términos/i));

    const submitButton = screen.getByRole('button', { name: /registrarse/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Error de conexión. Por favor, verifica tu conexión a internet.'
      );
    });
  });

  it('shows loading state during registration', async () => {
    mockRegister.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    render(<Register />, { wrapper: createWrapper });

    // Llenar el formulario mínimo
    await user.type(screen.getByLabelText(/nombre/i), 'John');
    await user.type(screen.getByLabelText(/apellido/i), 'Doe');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^contraseña/i), 'Password123!');
    await user.type(screen.getByLabelText(/confirmar contraseña/i), 'Password123!');
    await user.selectOptions(screen.getByLabelText(/tipo de usuario/i), 'tenant');
    await user.click(screen.getByLabelText(/acepto los términos/i));

    const submitButton = screen.getByRole('button', { name: /registrarse/i });
    await user.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(screen.getByText(/registrando/i)).toBeInTheDocument();
  });

  it('toggles password visibility', async () => {
    render(<Register />, { wrapper: createWrapper });

    const passwordInput = screen.getByLabelText(/^contraseña/i);
    const toggleButton = screen.getAllByLabelText(/mostrar contraseña/i)[0];

    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('requires terms acceptance', async () => {
    render(<Register />, { wrapper: createWrapper });

    // Llenar el formulario sin aceptar términos
    await user.type(screen.getByLabelText(/nombre/i), 'John');
    await user.type(screen.getByLabelText(/apellido/i), 'Doe');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^contraseña/i), 'Password123!');
    await user.type(screen.getByLabelText(/confirmar contraseña/i), 'Password123!');
    await user.selectOptions(screen.getByLabelText(/tipo de usuario/i), 'tenant');

    const submitButton = screen.getByRole('button', { name: /registrarse/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/debes aceptar los términos/i)).toBeInTheDocument();
    });
  });

  it('navigates to login page when clicking sign in link', async () => {
    render(<Register />, { wrapper: createWrapper });

    const signInLink = screen.getByText(/inicia sesión aquí/i);
    await user.click(signInLink);

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('opens terms modal when clicking terms link', async () => {
    render(<Register />, { wrapper: createWrapper });

    const termsLink = screen.getByText(/términos y condiciones/i);
    await user.click(termsLink);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/términos y condiciones de verihome/i)).toBeInTheDocument();
    });
  });

  it('opens privacy modal when clicking privacy link', async () => {
    render(<Register />, { wrapper: createWrapper });

    const privacyLink = screen.getByText(/política de privacidad/i);
    await user.click(privacyLink);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/política de privacidad de verihome/i)).toBeInTheDocument();
    });
  });
});