import { renderHook, act, waitFor } from '@testing-library/react';
import { useNotifications } from '../useNotifications';
import { api } from '../../services/api';

// Mock api
jest.mock('../../services/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockApi = api as jest.Mocked<typeof api>;

// Mock useWebSocket
jest.mock('../useWebSocket', () => ({
  useWebSocket: jest.fn(() => ({
    sendMessage: jest.fn(),
    lastMessage: null,
    isConnected: false,
  })),
}));

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

describe('useNotifications Hook', () => {
  const mockNotifications = [
    {
      id: 'notif-1',
      title: 'New Message',
      message: 'You have a new message',
      notification_type: 'message',
      priority: 'medium',
      is_read: false,
      created_at: '2025-01-01T00:00:00Z',
    },
    {
      id: 'notif-2',
      title: 'Contract Update',
      message: 'Your contract has been updated',
      notification_type: 'contract',
      priority: 'high',
      is_read: true,
      created_at: '2025-01-02T00:00:00Z',
    },
    {
      id: 'notif-3',
      title: 'Payment Received',
      message: 'Payment of $2,500,000 received',
      notification_type: 'payment',
      priority: 'low',
      is_read: false,
      created_at: '2025-01-03T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.get.mockResolvedValue({ data: mockNotifications });
  });

  it('should fetch notifications on mount', async () => {
    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockApi.get).toHaveBeenCalledWith('/core/notifications/');
    expect(result.current.notifications).toEqual(mockNotifications);
  });

  it('should calculate unread count correctly', async () => {
    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // 2 unread notifications (notif-1 and notif-3)
    expect(result.current.unreadCount).toBe(2);
  });

  it('should mark a notification as read', async () => {
    mockApi.patch.mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.markAsRead('notif-1');
    });

    expect(mockApi.patch).toHaveBeenCalledWith('/core/notifications/notif-1/', {
      is_read: true,
    });
    expect(result.current.unreadCount).toBe(1);
  });

  it('should mark all notifications as read', async () => {
    mockApi.post.mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.markAllAsRead();
    });

    expect(mockApi.post).toHaveBeenCalledWith(
      '/core/notifications/mark_all_read/'
    );
    expect(result.current.unreadCount).toBe(0);
  });

  it('should delete a notification', async () => {
    mockApi.delete.mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteNotification('notif-1');
    });

    expect(mockApi.delete).toHaveBeenCalledWith('/core/notifications/notif-1/');
    expect(result.current.notifications).toHaveLength(2);
    // Unread count should decrease since notif-1 was unread
    expect(result.current.unreadCount).toBe(1);
  });

  it('should navigate on notification click with action_url', async () => {
    const notifWithUrl = {
      ...mockNotifications[0],
      action_url: '/app/messages/123',
    };
    mockApi.get.mockResolvedValue({ data: [notifWithUrl] });
    mockApi.patch.mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.handleNotificationClick(notifWithUrl as any);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/app/messages/123');
  });

  it('should navigate to default route based on notification type', async () => {
    mockApi.patch.mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.handleNotificationClick(mockNotifications[0] as any);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/app/messages');
  });

  it('should navigate to contracts for contract notification type', async () => {
    mockApi.patch.mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const contractNotif = { ...mockNotifications[1], is_read: false };

    act(() => {
      result.current.handleNotificationClick(contractNotif as any);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/app/contracts');
  });

  it('should handle API error when fetching notifications', async () => {
    mockApi.get.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should return empty array on error
    expect(result.current.notifications).toEqual([]);
  });

  it('should handle response data with results property', async () => {
    mockApi.get.mockResolvedValue({ data: { results: mockNotifications } });

    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.notifications).toEqual(mockNotifications);
  });

  it('should expose isConnected as false when WebSocket is disabled', async () => {
    const { result } = renderHook(() => useNotifications());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isConnected).toBe(false);
  });
});
