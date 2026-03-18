import { notificationService } from '../notificationService';
import { api } from '../api';
import { jest } from '@jest/globals';

// Mock the API
jest.mock('../api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockNotification = {
    id: '1',
    title: 'New Message',
    message: 'You have received a new message from John Doe',
    type: 'message' as const,
    user_id: '1',
    is_read: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    data: {
      message_id: 'msg_123',
      sender_name: 'John Doe'
    }
  };

  describe('getNotifications', () => {
    it('should fetch notifications successfully with default page', async () => {
      const paginatedResponse = { results: [mockNotification], count: 1 };
      mockedApi.get.mockResolvedValueOnce({ data: paginatedResponse });

      const result = await notificationService.getNotifications();

      expect(mockedApi.get).toHaveBeenCalledWith('/core/notifications/?page=1');
      expect(result).toEqual(paginatedResponse);
    });

    it('should fetch notifications with specific page', async () => {
      const paginatedResponse = { results: [mockNotification], count: 1 };
      mockedApi.get.mockResolvedValueOnce({ data: paginatedResponse });

      const result = await notificationService.getNotifications(2);

      expect(mockedApi.get).toHaveBeenCalledWith('/core/notifications/?page=2');
      expect(result).toEqual(paginatedResponse);
    });

    it('should handle API errors', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('API Error'));

      await expect(notificationService.getNotifications()).rejects.toThrow('API Error');
    });
  });

  describe('getNotification', () => {
    it('should fetch single notification successfully', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: mockNotification });

      const result = await notificationService.getNotification('1');

      expect(mockedApi.get).toHaveBeenCalledWith('/core/notifications/1/');
      expect(result).toEqual(mockNotification);
    });
  });

  describe('createNotification', () => {
    it('should create notification successfully', async () => {
      const createData = {
        title: 'Payment Due',
        message: 'Your rent payment is due in 3 days',
        type: 'payment',
      };

      mockedApi.post.mockResolvedValueOnce({ data: mockNotification });

      const result = await notificationService.createNotification(createData);

      expect(mockedApi.post).toHaveBeenCalledWith('/core/notifications/', createData);
      expect(result).toEqual(mockNotification);
    });

    it('should handle validation errors', async () => {
      const mockError = new Error('Validation failed');

      mockedApi.post.mockRejectedValueOnce(mockError);

      await expect(notificationService.createNotification({})).rejects.toThrow('Validation failed');
    });
  });

  describe('updateNotification', () => {
    it('should update notification successfully', async () => {
      const updatedNotification = { ...mockNotification, title: 'Updated' };
      mockedApi.put.mockResolvedValueOnce({ data: updatedNotification });

      const result = await notificationService.updateNotification('1', { title: 'Updated' });

      expect(mockedApi.put).toHaveBeenCalledWith('/core/notifications/1/', { title: 'Updated' });
      expect(result).toEqual(updatedNotification);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read successfully', async () => {
      const readNotification = { ...mockNotification, is_read: true };
      mockedApi.patch.mockResolvedValueOnce({ data: readNotification });

      const result = await notificationService.markAsRead('1');

      expect(mockedApi.patch).toHaveBeenCalledWith('/core/notifications/1/', { is_read: true });
      expect(result).toEqual(readNotification);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read successfully', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: {} });

      await notificationService.markAllAsRead();

      expect(mockedApi.post).toHaveBeenCalledWith('/core/notifications/mark-all-read/');
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification successfully', async () => {
      mockedApi.delete.mockResolvedValueOnce({ data: {} });

      await notificationService.deleteNotification('1');

      expect(mockedApi.delete).toHaveBeenCalledWith('/core/notifications/1/');
    });
  });

  describe('getUnreadCount', () => {
    it('should fetch unread notification count successfully', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: { count: 7 } });

      const result = await notificationService.getUnreadCount();

      expect(mockedApi.get).toHaveBeenCalledWith('/core/notifications/unread_count/');
      expect(result).toEqual({ count: 7 });
    });

    it('should return default count on error', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('API Error'));

      const result = await notificationService.getUnreadCount();

      expect(result).toEqual({ count: 0 });
    });
  });

  describe('getActivityLogs', () => {
    it('should fetch activity logs successfully', async () => {
      const logs = [{ id: '1', action: 'login', timestamp: '2024-01-01T00:00:00Z' }];
      mockedApi.get.mockResolvedValueOnce({ data: logs });

      const result = await notificationService.getActivityLogs();

      expect(mockedApi.get).toHaveBeenCalledWith('/core/activity-logs/');
      expect(result).toEqual(logs);
    });
  });

  describe('createActivityLog', () => {
    it('should create activity log successfully', async () => {
      const logData = { action: 'login', details: 'User logged in' };
      mockedApi.post.mockResolvedValueOnce({ data: { id: '1', ...logData } });

      const result = await notificationService.createActivityLog(logData);

      expect(mockedApi.post).toHaveBeenCalledWith('/core/activity-logs/', logData);
      expect(result).toEqual({ id: '1', ...logData });
    });
  });

  describe('getSystemAlerts', () => {
    it('should fetch system alerts successfully', async () => {
      const alerts = [{ id: '1', message: 'System update scheduled', severity: 'info' }];
      mockedApi.get.mockResolvedValueOnce({ data: alerts });

      const result = await notificationService.getSystemAlerts();

      expect(mockedApi.get).toHaveBeenCalledWith('/core/system-alerts/');
      expect(result).toEqual(alerts);
    });
  });

  describe('createSystemAlert', () => {
    it('should create system alert successfully', async () => {
      const alertData = { message: 'Maintenance window', severity: 'warning' };
      mockedApi.post.mockResolvedValueOnce({ data: { id: '1', ...alertData } });

      const result = await notificationService.createSystemAlert(alertData);

      expect(mockedApi.post).toHaveBeenCalledWith('/core/system-alerts/', alertData);
      expect(result).toEqual({ id: '1', ...alertData });
    });
  });

  describe('getDashboardStats', () => {
    it('should fetch dashboard stats successfully', async () => {
      const stats = { total_notifications: 100, unread: 15 };
      mockedApi.get.mockResolvedValueOnce({ data: stats });

      const result = await notificationService.getDashboardStats();

      expect(mockedApi.get).toHaveBeenCalledWith('/core/stats/dashboard/');
      expect(result).toEqual(stats);
    });
  });

  describe('getSystemOverview', () => {
    it('should fetch system overview successfully', async () => {
      const overview = { status: 'healthy', uptime: '99.9%' };
      mockedApi.get.mockResolvedValueOnce({ data: overview });

      const result = await notificationService.getSystemOverview();

      expect(mockedApi.get).toHaveBeenCalledWith('/core/stats/overview/');
      expect(result).toEqual(overview);
    });
  });
});
