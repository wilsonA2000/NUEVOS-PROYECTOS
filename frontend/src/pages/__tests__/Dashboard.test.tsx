import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '../Dashboard';
import { useUser } from '../../hooks/useUser';
import { useProperties } from '../../hooks/useProperties';
import { useMessages } from '../../hooks/useMessages';
import { useLanguage } from '../../hooks/useLanguage';
import { useNotification } from '../../hooks/useNotification';
import { createWrapper } from '../../test-utils';

// Mock de date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date: any, formatStr: any) => 'Mocked Date'),
  subMonths: jest.fn((date: any, months: any) => new Date()),
  startOfMonth: jest.fn((date: any) => new Date()),
  endOfMonth: jest.fn((date: any) => new Date())
}));

jest.mock('date-fns/locale', () => ({
  es: {},
  enUS: {}
}));

// Mock de useLanguage
jest.mock('../../hooks/useLanguage', () => ({
  useLanguage: jest.fn().mockReturnValue({
    language: 'en',
    setLanguage: jest.fn(),
    t: (key: string) => key,
  }),
}));

// Mock de useUser
jest.mock('../../hooks/useUser', () => ({
  useUser: () => ({
    user: {
      first_name: 'Juan',
      email: 'test@example.com',
      role: 'admin',
      created_at: '2022-01-01T00:00:00Z',
    },
    isLoading: false,
  })
}));

// Mock de useProperties
jest.mock('../../hooks/useProperties', () => ({
  useProperties: () => ({
    properties: [
      { id: 1, status: 'available', price: 1000, name: 'Test Property 1' },
      { id: 2, status: 'rented', price: 2000, name: 'Test Property 2' },
      { id: 3, status: 'maintenance', price: 1500, name: 'Test Property 3' },
    ],
    isLoading: false,
  })
}));

// Mock de useMessages
jest.mock('../../hooks/useMessages', () => ({
  useMessages: () => ({
    messages: [
      { id: 1, is_read: false, created_at: '2023-12-01T10:00:00Z' },
      { id: 2, is_read: true, created_at: '2023-11-01T10:00:00Z' },
    ],
    isLoading: false,
  })
}));

// Mock de useNotification
jest.mock('../../hooks/useNotification', () => ({
  useNotification: () => ({
    success: jest.fn(),
    error: jest.fn(),
  })
}));

const routerWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

const combinedWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryWrapper = createWrapper();
  return queryWrapper({ children: routerWrapper({ children }) });
};

describe('Dashboard', () => {
  beforeEach(() => {
    (useLanguage as jest.Mock).mockReturnValue({
      t: (key: string) => key,
      language: 'en',
    });
  });

  it('should render loading state initially', () => {
    render(<Dashboard />, { wrapper: combinedWrapper });
    expect(screen.getByText('common.loading')).toBeInTheDocument();
  });

  it('should render dashboard content after loading', async () => {
    render(<Dashboard />, { wrapper: combinedWrapper });

    await waitFor(() => {
      expect(screen.getByText('dashboard.welcome')).toBeInTheDocument();
    });

    // Check if all sections are rendered
    expect(screen.getByText('dashboard.properties')).toBeInTheDocument();
    expect(screen.getByText('dashboard.messages')).toBeInTheDocument();
    expect(screen.getByText('dashboard.userInfo')).toBeInTheDocument();
    expect(screen.getByText('dashboard.propertyStatus')).toBeInTheDocument();
    expect(screen.getByText('dashboard.messagesByMonth')).toBeInTheDocument();
    expect(screen.getByText('dashboard.incomeByMonth')).toBeInTheDocument();
    expect(screen.getByText('dashboard.recentProperties')).toBeInTheDocument();
  });

  it('should display correct property counts', async () => {
    render(<Dashboard />, { wrapper: combinedWrapper });

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument(); // Total properties
    });

    expect(screen.getByText('1')).toBeInTheDocument(); // Available properties
    expect(screen.getByText('1')).toBeInTheDocument(); // Rented properties
    expect(screen.getByText('0')).toBeInTheDocument(); // Maintenance properties
  });

  it('should display correct message counts', async () => {
    render(<Dashboard />, { wrapper: combinedWrapper });

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument(); // Total messages
    });

    expect(screen.getByText('1')).toBeInTheDocument(); // Unread messages
  });

  it('should display user information', async () => {
    render(<Dashboard />, { wrapper: combinedWrapper });

    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('admin')).toBeInTheDocument();
    });
  });

  it('should display recent properties', async () => {
    render(<Dashboard />, { wrapper: combinedWrapper });

    await waitFor(() => {
      expect(screen.getByText('Test Property 1')).toBeInTheDocument();
      expect(screen.getByText('Test Property 2')).toBeInTheDocument();
    });
  });
}); 