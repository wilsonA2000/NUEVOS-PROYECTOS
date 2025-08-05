import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

// Import components to test
import { PropertyForm } from '../properties/PropertyForm';
import { ContractForm } from '../contracts/ContractForm';
import { MessageForm } from '../messages/MessageForm';
import { PaymentForm } from '../payments/PaymentForm';
import { Layout } from '../Layout';

// Mock services
jest.mock('../../services/api');
jest.mock('../../services/propertyService');
jest.mock('../../services/contractService');
jest.mock('../../services/messageService');
jest.mock('../../services/paymentService');

// Test wrapper with providers
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Critical Components Tests', () => {
  let wrapper: any;

  beforeEach(() => {
    wrapper = createTestWrapper();
    jest.clearAllMocks();
  });

  describe('PropertyForm Component', () => {
    it('should render all required fields', () => {
      render(<PropertyForm onSubmit={jest.fn()} />, { wrapper });

      // Check for essential form fields
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/price/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/bedrooms/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/bathrooms/i)).toBeInTheDocument();
    });

    it('should validate required fields', async () => {
      const mockSubmit = jest.fn();
      render(<PropertyForm onSubmit={mockSubmit} />, { wrapper });

      const submitButton = screen.getByRole('button', { name: /submit|save|crear/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        // Should show validation errors for required fields
        expect(screen.getByText(/title.*required/i)).toBeInTheDocument();
        expect(screen.getByText(/price.*required/i)).toBeInTheDocument();
      });

      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('should submit form with valid data', async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn();
      render(<PropertyForm onSubmit={mockSubmit} />, { wrapper });

      // Fill out form
      await user.type(screen.getByLabelText(/title/i), 'Beautiful Apartment');
      await user.type(screen.getByLabelText(/description/i), 'Great location');
      await user.type(screen.getByLabelText(/price/i), '1000');
      await user.type(screen.getByLabelText(/address/i), '123 Main St');
      await user.type(screen.getByLabelText(/city/i), 'Madrid');

      const submitButton = screen.getByRole('button', { name: /submit|save|crear/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Beautiful Apartment',
            description: 'Great location',
            price: '1000',
            address: '123 Main St',
            city: 'Madrid'
          })
        );
      });
    });
  });

  describe('ContractForm Component', () => {
    it('should render contract form fields', () => {
      render(<ContractForm onSubmit={jest.fn()} />, { wrapper });

      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/property/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/tenant/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/start.*date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end.*date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/monthly.*rent/i)).toBeInTheDocument();
    });

    it('should validate date ranges', async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn();
      render(<ContractForm onSubmit={mockSubmit} />, { wrapper });

      // Set end date before start date
      await user.type(screen.getByLabelText(/start.*date/i), '2024-12-31');
      await user.type(screen.getByLabelText(/end.*date/i), '2024-01-01');

      const submitButton = screen.getByRole('button', { name: /submit|save|crear/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/end date.*after.*start date/i)).toBeInTheDocument();
      });

      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('should calculate contract duration correctly', async () => {
      const user = userEvent.setup();
      render(<ContractForm onSubmit={jest.fn()} />, { wrapper });

      await user.type(screen.getByLabelText(/start.*date/i), '2024-01-01');
      await user.type(screen.getByLabelText(/end.*date/i), '2024-12-31');

      await waitFor(() => {
        expect(screen.getByText(/12.*months/i)).toBeInTheDocument();
      });
    });
  });

  describe('MessageForm Component', () => {
    it('should render message form fields', () => {
      render(<MessageForm onSubmit={jest.fn()} />, { wrapper });

      expect(screen.getByLabelText(/recipient/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/subject/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/message|content/i)).toBeInTheDocument();
    });

    it('should validate message content length', async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn();
      render(<MessageForm onSubmit={mockSubmit} />, { wrapper });

      // Enter a very short message
      await user.type(screen.getByLabelText(/message|content/i), 'Hi');

      const submitButton = screen.getByRole('button', { name: /send|submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/message.*too short/i)).toBeInTheDocument();
      });

      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('should support file attachments', () => {
      render(<MessageForm onSubmit={jest.fn()} />, { wrapper });

      const fileInput = screen.getByLabelText(/attach.*file/i);
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute('type', 'file');
    });
  });

  describe('PaymentForm Component', () => {
    it('should render payment form fields', () => {
      render(<PaymentForm onSubmit={jest.fn()} />, { wrapper });

      expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/payment.*method/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/due.*date/i)).toBeInTheDocument();
    });

    it('should validate payment amount', async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn();
      render(<PaymentForm onSubmit={mockSubmit} />, { wrapper });

      // Enter invalid amount
      await user.type(screen.getByLabelText(/amount/i), '-100');

      const submitButton = screen.getByRole('button', { name: /submit|pay/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/amount.*positive/i)).toBeInTheDocument();
      });

      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('should format currency correctly', async () => {
      const user = userEvent.setup();
      render(<PaymentForm onSubmit={jest.fn()} />, { wrapper });

      const amountInput = screen.getByLabelText(/amount/i);
      await user.type(amountInput, '1000');

      await waitFor(() => {
        expect(screen.getByText(/€1,000/i)).toBeInTheDocument();
      });
    });
  });

  describe('Layout Component', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      user_type: 'tenant'
    };

    it('should render navigation menu for authenticated user', () => {
      render(
        <Layout user={mockUser} isAuthenticated={true}>
          <div>Content</div>
        </Layout>,
        { wrapper }
      );

      expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/properties/i)).toBeInTheDocument();
      expect(screen.getByText(/contracts/i)).toBeInTheDocument();
      expect(screen.getByText(/messages/i)).toBeInTheDocument();
    });

    it('should show login prompt for unauthenticated user', () => {
      render(
        <Layout user={null} isAuthenticated={false}>
          <div>Content</div>
        </Layout>,
        { wrapper }
      );

      expect(screen.getByText(/sign in|login/i)).toBeInTheDocument();
      expect(screen.getByText(/register|sign up/i)).toBeInTheDocument();
    });

    it('should display user menu when authenticated', async () => {
      const user = userEvent.setup();
      render(
        <Layout user={mockUser} isAuthenticated={true}>
          <div>Content</div>
        </Layout>,
        { wrapper }
      );

      // Click on user avatar/menu
      const userMenu = screen.getByText(/Test User/i);
      await user.click(userMenu);

      await waitFor(() => {
        expect(screen.getByText(/profile/i)).toBeInTheDocument();
        expect(screen.getByText(/settings/i)).toBeInTheDocument();
        expect(screen.getByText(/logout/i)).toBeInTheDocument();
      });
    });

    it('should handle responsive navigation', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      render(
        <Layout user={mockUser} isAuthenticated={true}>
          <div>Content</div>
        </Layout>,
        { wrapper }
      );

      // Should show mobile menu button
      expect(screen.getByLabelText(/menu|navigation/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation Edge Cases', () => {
    it('should handle special characters in property title', async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn();
      render(<PropertyForm onSubmit={mockSubmit} />, { wrapper });

      await user.type(screen.getByLabelText(/title/i), 'Apartamento "Especial" & Co.');

      const submitButton = screen.getByRole('button', { name: /submit|save|crear/i });
      await user.click(submitButton);

      // Should not show validation error for special characters
      await waitFor(() => {
        expect(screen.queryByText(/invalid.*characters/i)).not.toBeInTheDocument();
      });
    });

    it('should validate email format in message recipient', async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn();
      render(<MessageForm onSubmit={mockSubmit} />, { wrapper });

      await user.type(screen.getByLabelText(/recipient/i), 'invalid-email');

      const submitButton = screen.getByRole('button', { name: /send|submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/valid.*email/i)).toBeInTheDocument();
      });

      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('should handle very large payment amounts', async () => {
      const user = userEvent.setup();
      render(<PaymentForm onSubmit={jest.fn()} />, { wrapper });

      await user.type(screen.getByLabelText(/amount/i), '999999999');

      await waitFor(() => {
        expect(screen.getByText(/€999,999,999/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for form fields', () => {
      render(<PropertyForm onSubmit={jest.fn()} />, { wrapper });

      const titleInput = screen.getByLabelText(/title/i);
      expect(titleInput).toHaveAttribute('aria-label');
      expect(titleInput).toHaveAttribute('aria-required', 'true');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<PropertyForm onSubmit={jest.fn()} />, { wrapper });

      const titleInput = screen.getByLabelText(/title/i);
      titleInput.focus();

      // Tab through form fields
      await user.tab();
      expect(screen.getByLabelText(/description/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/price/i)).toHaveFocus();
    });

    it('should announce validation errors to screen readers', async () => {
      const user = userEvent.setup();
      render(<PropertyForm onSubmit={jest.fn()} />, { wrapper });

      const submitButton = screen.getByRole('button', { name: /submit|save|crear/i });
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(/title.*required/i);
        expect(errorMessage).toHaveAttribute('role', 'alert');
      });
    });
  });
});