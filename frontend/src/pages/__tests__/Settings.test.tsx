import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

// Mock dependencies
jest.mock('../../services/userService', () => ({
  userService: {
    getSettings: jest.fn().mockResolvedValue({
      notifications: {
        email_notifications: true,
        sms_notifications: false,
        newsletter: true,
        property_alerts: true,
        message_notifications: true,
        payment_reminders: true,
      },
      privacy: {
        profile_visibility: 'public',
        show_contact_info: true,
        show_property_history: false,
        allow_messages: true,
      },
      preferences: {
        language: 'es',
        timezone: 'America/Bogota',
        currency: 'COP',
        date_format: 'DD/MM/YYYY',
        theme: 'light',
      },
      security: {
        two_factor_enabled: false,
        login_notifications: true,
        session_timeout: 30,
      },
    }),
    updateSettings: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('../../components/users/UserStatusSelector', () => () => <div>User Status</div>);
jest.mock('../../components/common/OptimizedWebSocketStatus', () => () => <div>WebSocket Status</div>);

// Import after mocks
import Settings from '../settings/Settings';

const combinedWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Settings', () => {
  it('should render settings page with title', async () => {
    render(<Settings />, { wrapper: combinedWrapper });

    await waitFor(() => {
      expect(screen.getByText('Ajustes')).toBeInTheDocument();
    });
  });

  it('should render real-time control section', async () => {
    render(<Settings />, { wrapper: combinedWrapper });

    await waitFor(() => {
      expect(screen.getByText(/Control de Tiempo Real/i)).toBeInTheDocument();
    });
  });

  it('should render without crashing', async () => {
    render(<Settings />, { wrapper: combinedWrapper });

    await waitFor(() => {
      expect(document.body).toBeInTheDocument();
    });
  });
});
