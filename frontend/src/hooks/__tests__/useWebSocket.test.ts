import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '../useWebSocket';

// Mock useAuth hook - default to unauthenticated to prevent WebSocket connection loops
jest.mock('../useAuth', () => ({
  useAuth: jest.fn(() => ({
    token: null,
    isAuthenticated: false,
  })),
}));

import { useAuth } from '../useAuth';
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock WebSocket - no auto-open to avoid infinite re-render loops with React effects
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState: number = MockWebSocket.CONNECTING;
  onopen: ((event: any) => void) | null = null;
  onclose: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onmessage: ((event: any) => void) | null = null;

  constructor(url: string, _protocols?: string | string[]) {
    this.url = url;
  }

  send = jest.fn();
  close = jest.fn((code?: number) => {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({ code: code || 1000, reason: '', wasClean: true });
    }
  });
}

// Replace global WebSocket
(global as any).WebSocket = MockWebSocket;

describe('useWebSocket Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      token: null,
      isAuthenticated: false,
    } as any);
  });

  it('should return initial disconnected state when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      token: null,
      isAuthenticated: false,
    } as any);

    const { result } = renderHook(() => useWebSocket('/ws/test/'));

    expect(result.current.isConnected).toBe(false);
    expect(result.current.connectionState).toBe('disconnected');
    expect(result.current.socket).toBeNull();
  });

  it('should expose sendMessage function', () => {
    mockUseAuth.mockReturnValue({
      token: null,
      isAuthenticated: false,
    } as any);

    const { result } = renderHook(() => useWebSocket('/ws/test/'));

    expect(typeof result.current.sendMessage).toBe('function');
  });

  it('should expose sendJsonMessage function', () => {
    mockUseAuth.mockReturnValue({
      token: null,
      isAuthenticated: false,
    } as any);

    const { result } = renderHook(() => useWebSocket('/ws/test/'));

    expect(typeof result.current.sendJsonMessage).toBe('function');
  });

  it('should expose reconnect function', () => {
    mockUseAuth.mockReturnValue({
      token: null,
      isAuthenticated: false,
    } as any);

    const { result } = renderHook(() => useWebSocket('/ws/test/'));

    expect(typeof result.current.reconnect).toBe('function');
  });

  it('should expose disconnect function', () => {
    mockUseAuth.mockReturnValue({
      token: null,
      isAuthenticated: false,
    } as any);

    const { result } = renderHook(() => useWebSocket('/ws/test/'));

    expect(typeof result.current.disconnect).toBe('function');
  });

  it('should accept options object as parameter', () => {
    mockUseAuth.mockReturnValue({
      token: null,
      isAuthenticated: false,
    } as any);

    const { result } = renderHook(() =>
      useWebSocket({
        url: '/ws/notifications/',
        reconnectAttempts: 3,
        reconnectInterval: 5000,
        heartbeatInterval: 15000,
      })
    );

    expect(result.current.connectionState).toBe('disconnected');
    expect(typeof result.current.sendMessage).toBe('function');
  });

  it('should default isConnected to false', () => {
    // When not authenticated, no connection is attempted
    mockUseAuth.mockReturnValue({
      token: null,
      isAuthenticated: false,
    } as any);

    const { result } = renderHook(() => useWebSocket('/ws/test/'));
    expect(result.current.isConnected).toBe(false);
  });

  it('should not send message when socket is not connected', () => {
    mockUseAuth.mockReturnValue({
      token: null,
      isAuthenticated: false,
    } as any);

    const { result } = renderHook(() => useWebSocket('/ws/test/'));

    // This should not throw even when disconnected
    act(() => {
      result.current.sendMessage({ type: 'test', data: 'hello' });
    });

    // No error thrown - message silently dropped
    expect(result.current.isConnected).toBe(false);
  });

  it('should return lastMessage as undefined initially', () => {
    mockUseAuth.mockReturnValue({
      token: null,
      isAuthenticated: false,
    } as any);

    const { result } = renderHook(() => useWebSocket('/ws/test/'));

    expect(result.current.lastMessage).toBeUndefined();
  });
});
