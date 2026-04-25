import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CedulaCapture from '../CedulaCapture';

jest.mock('../../../hooks/useOpenCV', () => ({
  useOpenCV: jest.fn(),
}));

import { useOpenCV } from '../../../hooks/useOpenCV';

const mockedUseOpenCV = useOpenCV as jest.MockedFunction<typeof useOpenCV>;

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
  it('muestra loader mientras OpenCV no está listo', () => {
    mockedUseOpenCV.mockReturnValue({ cv: null, ready: false, error: null });
    render(<CedulaCapture side='anverso' onCapture={jest.fn()} />);
    expect(
      screen.getByText(/Cargando motor de detección/i),
    ).toBeInTheDocument();
  });

  it('muestra error si OpenCV falla al cargar', () => {
    mockedUseOpenCV.mockReturnValue({
      cv: null,
      ready: false,
      error: 'CDN unreachable',
    });
    render(<CedulaCapture side='anverso' onCapture={jest.fn()} />);
    expect(screen.getByText(/CDN unreachable/i)).toBeInTheDocument();
  });

  it('renderiza UI de captura con título correcto por lado (anverso)', async () => {
    mockedUseOpenCV.mockReturnValue({
      cv: {} as never,
      ready: true,
      error: null,
    });
    render(<CedulaCapture side='anverso' onCapture={jest.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/Anverso/i)).toBeInTheDocument();
    });
  });

  it('renderiza UI de captura con título correcto por lado (reverso)', async () => {
    mockedUseOpenCV.mockReturnValue({
      cv: {} as never,
      ready: true,
      error: null,
    });
    render(<CedulaCapture side='reverso' onCapture={jest.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/Reverso/i)).toBeInTheDocument();
    });
  });

  it('expone botón Cancelar cuando se pasa onCancel', async () => {
    mockedUseOpenCV.mockReturnValue({
      cv: {} as never,
      ready: true,
      error: null,
    });
    render(
      <CedulaCapture
        side='anverso'
        onCapture={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Cancelar/i })).toBeInTheDocument();
    });
  });
});
