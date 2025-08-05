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
    read: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    data: {
      message_id: 'msg_123',
      sender_name: 'John Doe'
    }
  };

  const mockCreateNotificationDto = {
    title: 'Payment Due',
    message: 'Your rent payment is due in 3 days',
    type: 'payment' as const,
    user_id: '1',
    data: {
      payment_id: 'pay_456',
      due_date: '2024-01-04'
    }
  };

  describe('getNotifications', () => {
    it('should fetch all notifications successfully', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [mockNotification] });

      const result = await notificationService.getNotifications();

      expect(mockedApi.get).toHaveBeenCalledWith('/notifications/notifications/');
      expect(result).toEqual([mockNotification]);
    });

    it('should fetch notifications with filters', async () => {
      const filters = {
        type: 'message',
        read: false,
        limit: 10
      };

      mockedApi.get.mockResolvedValueOnce({ data: [mockNotification] });

      const result = await notificationService.getNotifications(filters);

      expect(mockedApi.get).toHaveBeenCalledWith('/notifications/notifications/', { params: filters });
      expect(result).toEqual([mockNotification]);
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

      expect(mockedApi.get).toHaveBeenCalledWith('/notifications/notifications/1/');
      expect(result).toEqual(mockNotification);
    });
  });

  describe('createNotification', () => {
    it('should create notification successfully', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: mockNotification });

      const result = await notificationService.createNotification(mockCreateNotificationDto);

      expect(mockedApi.post).toHaveBeenCalledWith('/notifications/notifications/', mockCreateNotificationDto);
      expect(result).toEqual(mockNotification);
    });

    it('should handle validation errors', async () => {
      const mockError = {
        response: {
          status: 400,
          data: { title: ['This field is required'] }
        }
      };

      mockedApi.post.mockRejectedValueOnce(mockError);

      await expect(notificationService.createNotification(mockCreateNotificationDto)).rejects.toThrow();
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read successfully', async () => {
      const readNotification = { ...mockNotification, read: true };
      mockedApi.patch.mockResolvedValueOnce({ data: readNotification });

      const result = await notificationService.markAsRead('1');

      expect(mockedApi.patch).toHaveBeenCalledWith('/notifications/notifications/1/', { read: true });
      expect(result).toEqual(readNotification);
    });
  });

  describe('markAsUnread', () => {
    it('should mark notification as unread successfully', async () => {
      const unreadNotification = { ...mockNotification, read: false };
      mockedApi.patch.mockResolvedValueOnce({ data: unreadNotification });

      const result = await notificationService.markAsUnread('1');

      expect(mockedApi.patch).toHaveBeenCalledWith('/notifications/notifications/1/', { read: false });
      expect(result).toEqual(unreadNotification);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read successfully', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: { marked_count: 5 } });

      const result = await notificationService.markAllAsRead();

      expect(mockedApi.post).toHaveBeenCalledWith('/notifications/mark-all-read/');
      expect(result).toEqual({ marked_count: 5 });
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification successfully', async () => {
      mockedApi.delete.mockResolvedValueOnce({ data: {} });

      await notificationService.deleteNotification('1');

      expect(mockedApi.delete).toHaveBeenCalledWith('/notifications/notifications/1/');
    });
  });

  describe('deleteAllRead', () => {
    it('should delete all read notifications successfully', async () => {
      mockedApi.delete.mockResolvedValueOnce({ data: { deleted_count: 10 } });

      const result = await notificationService.deleteAllRead();

      expect(mockedApi.delete).toHaveBeenCalledWith('/notifications/delete-all-read/');
      expect(result).toEqual({ deleted_count: 10 });
    });
  });

  describe('getUnreadCount', () => {
    it('should fetch unread notification count successfully', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: { unread_count: 7 } });

      const result = await notificationService.getUnreadCount();

      expect(mockedApi.get).toHaveBeenCalledWith('/notifications/unread-count/');
      expect(result).toEqual({ unread_count: 7 });
    });
  });

  describe('getSettings', () => {
    it('should fetch notification settings successfully', async () => {
      const settings = {
        email_notifications: true,
        push_notifications: true,
        sms_notifications: false,
        message_notifications: true,
        payment_notifications: true,
        contract_notifications: true
      };

      mockedApi.get.mockResolvedValueOnce({ data: settings });

      const result = await notificationService.getSettings();

      expect(mockedApi.get).toHaveBeenCalledWith('/notifications/settings/');
      expect(result).toEqual(settings);
    });
  });

  describe('updateSettings', () => {
    it('should update notification settings successfully', async () => {
      const settingsUpdate = {
        email_notifications: false,
        push_notifications: true
      };

      const updatedSettings = {
        email_notifications: false,
        push_notifications: true,
        sms_notifications: false,
        message_notifications: true,
        payment_notifications: true,
        contract_notifications: true
      };

      mockedApi.patch.mockResolvedValueOnce({ data: updatedSettings });

      const result = await notificationService.updateSettings(settingsUpdate);

      expect(mockedApi.patch).toHaveBeenCalledWith('/notifications/settings/', settingsUpdate);
      expect(result).toEqual(updatedSettings);
    });
  });

  describe('subscribeToPush', () => {
    it('should subscribe to push notifications successfully', async () => {
      const subscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/...',
        keys: {
          p256dh: 'key1',
          auth: 'key2'
        }
      };

      mockedApi.post.mockResolvedValueOnce({ data: { success: true } });

      const result = await notificationService.subscribeToPush(subscription);

      expect(mockedApi.post).toHaveBeenCalledWith('/notifications/push/subscribe/', subscription);
      expect(result).toEqual({ success: true });
    });
  });

  describe('unsubscribeFromPush', () => {
    it('should unsubscribe from push notifications successfully', async () => {
      const endpoint = 'https://fcm.googleapis.com/fcm/send/...';

      mockedApi.post.mockResolvedValueOnce({ data: { success: true } });

      const result = await notificationService.unsubscribeFromPush(endpoint);

      expect(mockedApi.post).toHaveBeenCalledWith('/notifications/push/unsubscribe/', { endpoint });
      expect(result).toEqual({ success: true });
    });
  });

  describe('sendTestNotification', () => {
    it('should send test notification successfully', async () => {
      const testData = {
        type: 'push',
        title: 'Test Notification',
        message: 'This is a test notification'
      };

      mockedApi.post.mockResolvedValueOnce({ data: { sent: true } });

      const result = await notificationService.sendTestNotification(testData);

      expect(mockedApi.post).toHaveBeenCalledWith('/notifications/test/', testData);
      expect(result).toEqual({ sent: true });
    });
  });

  describe('getTemplates', () => {
    it('should fetch notification templates successfully', async () => {
      const templates = [
        {
          id: '1',
          name: 'Welcome Message',
          type: 'message',
          title: 'Welcome to VeriHome',
          content: 'Welcome to our platform!'
        }
      ];

      mockedApi.get.mockResolvedValueOnce({ data: templates });

      const result = await notificationService.getTemplates();

      expect(mockedApi.get).toHaveBeenCalledWith('/notifications/templates/');
      expect(result).toEqual(templates);
    });
  });

  describe('createTemplate', () => {
    it('should create notification template successfully', async () => {
      const templateData = {
        name: 'Payment Reminder',
        type: 'payment',
        title: 'Payment Due',
        content: 'Your payment is due in {{days}} days'
      };

      const template = { id: '2', ...templateData };
      mockedApi.post.mockResolvedValueOnce({ data: template });

      const result = await notificationService.createTemplate(templateData);

      expect(mockedApi.post).toHaveBeenCalledWith('/notifications/templates/', templateData);
      expect(result).toEqual(template);
    });
  });

  describe('updateTemplate', () => {
    it('should update notification template successfully', async () => {
      const templateUpdate = {
        title: 'Updated Payment Due',
        content: 'Your payment is due today'
      };

      const updatedTemplate = {
        id: '1',
        name: 'Payment Reminder',
        type: 'payment',
        ...templateUpdate
      };

      mockedApi.put.mockResolvedValueOnce({ data: updatedTemplate });

      const result = await notificationService.updateTemplate('1', templateUpdate);

      expect(mockedApi.put).toHaveBeenCalledWith('/notifications/templates/1/', templateUpdate);
      expect(result).toEqual(updatedTemplate);
    });
  });

  describe('deleteTemplate', () => {
    it('should delete notification template successfully', async () => {
      mockedApi.delete.mockResolvedValueOnce({ data: {} });

      await notificationService.deleteTemplate('1');

      expect(mockedApi.delete).toHaveBeenCalledWith('/notifications/templates/1/');
    });
  });

  describe('getDeliveryHistory', () => {
    it('should fetch notification delivery history successfully', async () => {
      const history = [
        {
          id: '1',
          notification_id: '1',
          delivery_method: 'push',
          status: 'delivered',
          delivered_at: '2024-01-01T12:00:00Z'
        }
      ];

      mockedApi.get.mockResolvedValueOnce({ data: history });

      const result = await notificationService.getDeliveryHistory();

      expect(mockedApi.get).toHaveBeenCalledWith('/notifications/delivery-history/');
      expect(result).toEqual(history);
    });

    it('should fetch delivery history with filters', async () => {
      const filters = {
        notification_id: '1',
        delivery_method: 'email',
        status: 'failed'
      };

      mockedApi.get.mockResolvedValueOnce({ data: [] });

      await notificationService.getDeliveryHistory(filters);

      expect(mockedApi.get).toHaveBeenCalledWith('/notifications/delivery-history/', { params: filters });
    });
  });

  describe('getStats', () => {
    it('should fetch notification statistics successfully', async () => {
      const stats = {
        total_notifications: 100,
        unread_notifications: 15,
        delivered_notifications: 85,
        failed_notifications: 5,
        click_through_rate: 0.65
      };

      mockedApi.get.mockResolvedValueOnce({ data: stats });

      const result = await notificationService.getStats();

      expect(mockedApi.get).toHaveBeenCalledWith('/notifications/stats/');
      expect(result).toEqual(stats);
    });
  });
});