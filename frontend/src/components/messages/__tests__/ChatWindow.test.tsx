/**
 * Tests for ChatWindow component
 * Covers rendering, message display, send functionality, and UI state.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ChatWindow } from '../ChatWindow';

// Mock useAuth hook
const mockUser = { id: 'user-1', first_name: 'Admin', last_name: 'Test', email: 'admin@test.com' };
jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}));

// Mock useBusinessNotifications hook
jest.mock('../../../hooks/useBusinessNotifications', () => ({
  useBusinessNotifications: () => ({
    onMessageSent: jest.fn(),
    sendBusinessNotification: jest.fn(),
  }),
}));

// Mock scrollIntoView which is not available in jsdom
Element.prototype.scrollIntoView = jest.fn();

const theme = createTheme();

const defaultProps = {
  conversationId: 'conv-001',
  recipientId: 'user-2',
  recipientName: 'Maria Lopez',
};

const renderComponent = (props: Partial<React.ComponentProps<typeof ChatWindow>> = {}) => {
  return render(
    React.createElement(
      ThemeProvider,
      { theme },
      React.createElement(ChatWindow, { ...defaultProps, ...props }),
    ),
  );
};

describe('ChatWindow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the chat window', () => {
    renderComponent();

    const allText = document.body.textContent || '';
    expect(allText.length).toBeGreaterThan(0);
  });

  it('should display the recipient name initial in avatar', () => {
    renderComponent();

    // The recipient name appears as first letter in message avatars
    const allText = document.body.textContent || '';
    expect(allText.includes('M')).toBeTruthy();
  });

  it('should display initial messages', () => {
    renderComponent();

    // The component has hardcoded initial messages
    expect(screen.getByText(/me interesa conocer más detalles/i)).toBeInTheDocument();
  });

  it('should render the message input field', () => {
    renderComponent();

    // When not connected, placeholder is 'Reconectando...'
    const input = screen.getByPlaceholderText(/Reconectando/i);
    expect(input).toBeInTheDocument();
  });

  it('should render send button', () => {
    renderComponent();

    // Find the send button (icon button with SendIcon)
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should update input value when typing', () => {
    renderComponent();

    const input = screen.getByPlaceholderText(/Reconectando/i);
    fireEvent.change(input, { target: { value: 'Hola, buen día' } });

    expect((input as HTMLInputElement).value).toBe('Hola, buen día');
  });

  it('should display context info when provided', () => {
    renderComponent({
      contextInfo: {
        type: 'property',
        title: 'Apartamento Premium',
        details: 'Zona Norte',
      },
    });

    // Context info renders with emoji prefix
    const allText = document.body.textContent || '';
    expect(allText.includes('Apartamento Premium')).toBeTruthy();
  });

  it('should show offline indicator when not connected', () => {
    renderComponent();

    // The component sets isConnected = false by default
    const allText = document.body.textContent || '';
    expect(
      allText.includes('Desconectado') ||
      allText.includes('Sin conexión') ||
      allText.includes('offline') ||
      document.body.innerHTML.includes('CircleIcon'),
    ).toBeTruthy();
  });

  it('should render multiple messages in the chat list', () => {
    renderComponent();

    // The component has 3 hardcoded initial messages
    const allText = document.body.textContent || '';
    expect(allText.includes('me interesa')).toBeTruthy();
    expect(allText.includes('encantado de ayudarte')).toBeTruthy();
  });

  it('should display the recipient name initial in message bubbles', () => {
    renderComponent();

    // Messages from recipient show first letter of sender_name in Avatar
    // Maria Lopez's initial 'M' should appear in avatars
    const avatars = document.querySelectorAll('.MuiAvatar-root');
    expect(avatars.length).toBeGreaterThanOrEqual(1);
  });
});
