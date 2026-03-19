import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Layout from '../layout/Layout';
import { useAuth } from '../../hooks/useAuth';
import { createWrapper } from '../../test-utils';
import '@testing-library/jest-dom';

// Mock useAuth hook
jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

// Mock react-i18next to return known translations
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'nav.dashboard': 'Dashboard',
        'nav.properties': 'Propiedades',
        'nav.contracts': 'Contratos',
        'nav.payments': 'Pagos',
        'nav.messages': 'Mensajes',
        'nav.ratings': 'Calificaciones',
        'nav.services': 'Servicios',
        'nav.requests': 'Solicitudes',
        'nav.home': 'Inicio',
        'nav.profile': 'Perfil',
        'nav.resume': 'Hoja de Vida',
        'nav.settings': 'Configuración',
        'nav.adminLegal': 'Admin Legal',
        'auth.logout': 'Cerrar sesión',
      };
      return translations[key] || key;
    },
    i18n: { language: 'es', changeLanguage: jest.fn() },
  }),
}));

// Mock child components that might cause issues
jest.mock('../notifications/PushNotificationCenter', () => () => null);
jest.mock('../users/UserStatusSelector', () => () => null);
jest.mock('../common/OptimizedWebSocketStatus', () => () => null);
jest.mock('../common/ContextSwitcher', () => () => null);
jest.mock('../common/LanguageSelector', () => () => null);

const routerWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

const combinedWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryWrapper = createWrapper();
  return queryWrapper({ children: routerWrapper({ children }) });
};

describe('Layout', () => {
  beforeEach(() => {
    (useAuth as unknown as jest.Mock).mockReturnValue({
      user: {
        id: 'user-1',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        user_type: 'landlord',
      },
      isAuthenticated: true,
      isLoading: false,
      logout: jest.fn(),
    });
  });

  it('should render layout with main content area', () => {
    render(<Layout />, { wrapper: combinedWrapper });

    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('should render navigation menu items in Spanish', () => {
    render(<Layout />, { wrapper: combinedWrapper });

    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Propiedades').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Contratos').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Pagos').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Mensajes').length).toBeGreaterThanOrEqual(1);
  });

  it('should render app title', () => {
    render(<Layout />, { wrapper: combinedWrapper });

    const titles = screen.getAllByText('VeriHome');
    expect(titles.length).toBeGreaterThanOrEqual(1);
  });
});
