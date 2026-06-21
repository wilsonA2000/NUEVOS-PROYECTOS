import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CedulaCapture from '../CedulaCapture';

beforeEach(() => {
  Object.defineProperty(global.navigator, 'mediaDevices', {
    value: {
      getUserMedia: jest.fn().mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }],
      }),
    },
    configurable: true,
  });

  Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
    value: jest.fn().mockResolvedValue(undefined),
    configurable: true,
  });
});

describe('CedulaCapture', () => {
  it('renderiza el título correcto por lado (anverso)', async () => {
    render(<CedulaCapture side='anverso' onCapture={jest.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/Anverso/i)).toBeInTheDocument();
    });
  });

  it('renderiza el título correcto por lado (reverso)', async () => {
    render(<CedulaCapture side='reverso' onCapture={jest.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/Reverso/i)).toBeInTheDocument();
    });
  });

  it('muestra el botón Capturar', async () => {
    render(<CedulaCapture side='anverso' onCapture={jest.fn()} />);
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Capturar/i }),
      ).toBeInTheDocument();
    });
  });

  it('expone botón Cancelar cuando se pasa onCancel', async () => {
    render(
      <CedulaCapture
        side='anverso'
        onCapture={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Cancelar/i }),
      ).toBeInTheDocument();
    });
  });
});
