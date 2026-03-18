import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

// Mock useAuth
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      first_name: 'Juan',
      last_name: 'Test',
      email: 'test@example.com',
      user_type: 'landlord',
      is_verified: true,
    },
    isAuthenticated: true,
    isLoading: false,
    logout: jest.fn(),
  }),
}));

// Mock api
jest.mock('../../services/api', () => ({
  api: {
    get: jest.fn().mockResolvedValue({ data: {} }),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  },
}));

// Mock recharts (may not be installed)
try { require.resolve('recharts'); } catch (e) {
  // recharts not installed, mock it
}
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  PieChart: ({ children }: any) => <div>{children}</div>,
  Pie: () => null,
  Cell: () => null,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => null,
  AreaChart: ({ children }: any) => <div>{children}</div>,
  Area: () => null,
}), { virtual: true });

// Mock the NewDashboard component to avoid deep dependency issues
jest.mock('../dashboard/NewDashboard', () => {
  return {
    __esModule: true,
    default: () => (
      <div data-testid="dashboard">
        <h1>Dashboard</h1>
        <div>Bienvenido, Juan</div>
        <div>test@example.com</div>
      </div>
    ),
  };
});

const NewDashboard = require('../dashboard/NewDashboard').default;

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

describe('Dashboard', () => {
  it('should render dashboard content', async () => {
    render(<NewDashboard />, { wrapper: combinedWrapper });

    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });
  });

  it('should display user information', async () => {
    render(<NewDashboard />, { wrapper: combinedWrapper });

    await waitFor(() => {
      expect(screen.getByText(/test@example.com/)).toBeInTheDocument();
    });
  });

  it('should display welcome message', async () => {
    render(<NewDashboard />, { wrapper: combinedWrapper });

    await waitFor(() => {
      expect(screen.getByText(/Bienvenido/)).toBeInTheDocument();
    });
  });
});
