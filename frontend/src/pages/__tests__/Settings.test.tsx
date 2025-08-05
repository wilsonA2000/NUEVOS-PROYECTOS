import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Settings from '../Settings';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import { useGlobalState } from '../../hooks/useGlobalState';
import { createWrapper } from '../../test-utils';
import '@testing-library/jest-dom';

// Mock hooks
jest.mock('../../hooks/useTheme', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../../hooks/useLanguage', () => ({
  useLanguage: jest.fn(),
}));

jest.mock('../../hooks/useGlobalState', () => ({
  useGlobalState: jest.fn(),
}));

const routerWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

const combinedWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryWrapper = createWrapper();
  return queryWrapper({ children: routerWrapper({ children }) });
};

describe('Settings', () => {
  const mockSetThemeMode = jest.fn();
  const mockSetLanguage = jest.fn();
  const mockSetSidebarOpen = jest.fn();
  const mockSetNotificationsEnabled = jest.fn();
  const mockSetSoundEnabled = jest.fn();
  const mockSetVibrationEnabled = jest.fn();
  const mockResetState = jest.fn();

  beforeEach(() => {
    (useTheme as unknown as jest.Mock).mockReturnValue({
      mode: 'light',
      setThemeMode: mockSetThemeMode,
    });

    (useLanguage as unknown as jest.Mock).mockReturnValue({
      language: 'en',
      setLanguage: mockSetLanguage,
      t: (key: string) => key,
    });

    (useGlobalState as unknown as jest.Mock).mockReturnValue({
      sidebarOpen: true,
      notificationsEnabled: true,
      soundEnabled: true,
      vibrationEnabled: true,
      setSidebarOpen: mockSetSidebarOpen,
      setNotificationsEnabled: mockSetNotificationsEnabled,
      setSoundEnabled: mockSetSoundEnabled,
      setVibrationEnabled: mockSetVibrationEnabled,
      resetState: mockResetState,
    });
  });

  it('should render all settings sections', () => {
    render(<Settings />, { wrapper: combinedWrapper });

    expect(screen.getByText('settings')).toBeInTheDocument();
    expect(screen.getByText('language')).toBeInTheDocument();
    expect(screen.getByText('theme')).toBeInTheDocument();
    expect(screen.getByText('sidebar')).toBeInTheDocument();
    expect(screen.getByText('notifications')).toBeInTheDocument();
    expect(screen.getByText('sound')).toBeInTheDocument();
    expect(screen.getByText('vibration')).toBeInTheDocument();
  });

  it('should change language when selecting a new option', () => {
    render(<Settings />, { wrapper: combinedWrapper });

    const languageSelect = screen.getAllByRole('combobox')[0];
    fireEvent.mouseDown(languageSelect);
    const spanishOption = screen.getByText('Español');
    fireEvent.click(spanishOption);

    expect(mockSetLanguage).toHaveBeenCalledWith('es');
  });

  it('should change theme when selecting a new option', () => {
    render(<Settings />, { wrapper: combinedWrapper });

    const themeSelect = screen.getAllByRole('combobox')[1];
    fireEvent.mouseDown(themeSelect);
    const darkOption = screen.getByText('dark');
    fireEvent.click(darkOption);

    expect(mockSetThemeMode).toHaveBeenCalledWith('dark');
  });

  it('should toggle sidebar visibility', () => {
    render(<Settings />, { wrapper: combinedWrapper });

    const sidebarSwitch = screen.getByLabelText('sidebar');
    fireEvent.click(sidebarSwitch);

    expect(mockSetSidebarOpen).toHaveBeenCalledWith(false);
  });

  it('should toggle notifications', () => {
    render(<Settings />, { wrapper: combinedWrapper });

    const notificationsSwitch = screen.getByLabelText('notifications');
    fireEvent.click(notificationsSwitch);

    expect(mockSetNotificationsEnabled).toHaveBeenCalledWith(false);
  });

  it('should toggle sound', () => {
    render(<Settings />, { wrapper: combinedWrapper });

    const soundSwitch = screen.getByLabelText('sound');
    fireEvent.click(soundSwitch);

    expect(mockSetSoundEnabled).toHaveBeenCalledWith(false);
  });

  it('should toggle vibration', () => {
    render(<Settings />, { wrapper: combinedWrapper });

    const vibrationSwitch = screen.getByLabelText('vibration');
    fireEvent.click(vibrationSwitch);

    expect(mockSetVibrationEnabled).toHaveBeenCalledWith(false);
  });

  it('should reset all settings when clicking reset button', () => {
    render(<Settings />, { wrapper: combinedWrapper });

    const resetButton = screen.getByText('reset');
    fireEvent.click(resetButton);

    expect(mockResetState).toHaveBeenCalled();
  });
}); 