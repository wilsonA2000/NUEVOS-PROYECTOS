import { messageService } from '../messageService';
import { api } from '../api';
import { jest } from '@jest/globals';

// Mock the API
jest.mock('../api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('MessageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockMessage = {
    id: '1',
    subject: 'Property Inquiry',
    content: 'I am interested in your property listing',
    sender_id: '2',
    recipient_id: '1',
    thread_id: 'thread_1',
    read: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    attachments: [],
  };

  const mockThread = {
    id: 'thread_1',
    subject: 'Property Inquiry',
    participants: ['1', '2'],
    last_message: mockMessage,
    message_count: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  describe('getMessages', () => {
    it('should fetch messages successfully with defaults', async () => {
      const paginatedResponse = {
        results: [mockMessage],
        count: 1,
        next: null,
        previous: null,
      };
      mockedApi.get.mockResolvedValueOnce({ data: paginatedResponse });

      const result = await messageService.getMessages();

      expect(mockedApi.get).toHaveBeenCalledWith('/messages/messages/', {
        params: { page: 1, limit: 20 },
      });
      expect(result).toEqual(paginatedResponse);
    });

    it('should fetch messages with threadId filter', async () => {
      const paginatedResponse = {
        results: [mockMessage],
        count: 1,
        next: null,
        previous: null,
      };
      mockedApi.get.mockResolvedValueOnce({ data: paginatedResponse });

      const result = await messageService.getMessages('thread_1');

      expect(mockedApi.get).toHaveBeenCalledWith('/messages/messages/', {
        params: { page: 1, limit: 20, thread: 'thread_1' },
      });
      expect(result).toEqual(paginatedResponse);
    });

    it('should handle API errors', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('API Error'));

      await expect(messageService.getMessages()).rejects.toThrow('API Error');
    });
  });

  describe('getMessage', () => {
    it('should fetch single message successfully', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: mockMessage });

      const result = await messageService.getMessage('1');

      expect(mockedApi.get).toHaveBeenCalledWith('/messages/messages/1/');
      expect(result).toEqual(mockMessage);
    });
  });

  describe('sendMessage', () => {
    it('should send message successfully using createMessage', async () => {
      const sendData = {
        thread_id: 'thread_1',
        content: 'Hello, I have a question about the property',
      };

      mockedApi.post.mockResolvedValueOnce({ data: mockMessage });

      const result = await messageService.sendMessage(sendData);

      expect(mockedApi.post).toHaveBeenCalled();
      expect(result).toEqual(mockMessage);
    });
  });

  describe('updateMessage', () => {
    it('should update message successfully', async () => {
      const updatedMessage = { ...mockMessage, content: 'Updated content' };
      mockedApi.put.mockResolvedValueOnce({ data: updatedMessage });

      const result = await messageService.updateMessage('1', {
        content: 'Updated content',
      } as any);

      expect(mockedApi.put).toHaveBeenCalledWith('/messages/messages/1/', {
        content: 'Updated content',
      });
      expect(result).toEqual(updatedMessage);
    });
  });

  describe('deleteMessage', () => {
    it('should delete message successfully', async () => {
      mockedApi.delete.mockResolvedValueOnce({ data: {} });

      await messageService.deleteMessage('1');

      expect(mockedApi.delete).toHaveBeenCalledWith('/messages/messages/1/');
    });
  });

  describe('markMessageAsRead', () => {
    it('should mark message as read successfully', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: {} });

      await messageService.markMessageAsRead('1');

      expect(mockedApi.post).toHaveBeenCalledWith('/messages/mark-read/1/');
    });
  });

  describe('markMessagesAsRead', () => {
    it('should mark multiple messages as read successfully', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: {} });

      await messageService.markMessagesAsRead(['1', '2']);

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/messages/mark-multiple-read/',
        { message_ids: ['1', '2'] }
      );
    });
  });

  describe('markAsUnread', () => {
    it('should mark messages as unread successfully', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: {} });

      await messageService.markAsUnread(['1', '2']);

      expect(mockedApi.post).toHaveBeenCalledWith('/messages/mark-unread/', {
        ids: ['1', '2'],
      });
    });
  });

  describe('getThreads', () => {
    it('should fetch all threads successfully', async () => {
      const paginatedResponse = {
        results: [mockThread],
        count: 1,
        next: null,
        previous: null,
      };
      mockedApi.get.mockResolvedValueOnce({ data: paginatedResponse });

      const result = await messageService.getThreads();

      expect(mockedApi.get).toHaveBeenCalledWith('/messages/threads/', {
        params: { page: 1, limit: 20 },
      });
      expect(result).toEqual(paginatedResponse);
    });
  });

  describe('getThread', () => {
    it('should fetch single thread successfully', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: mockThread });

      const result = await messageService.getThread('thread_1');

      expect(mockedApi.get).toHaveBeenCalledWith('/messages/threads/thread_1/');
      expect(result).toEqual(mockThread);
    });
  });

  describe('createThread', () => {
    it('should create thread successfully', async () => {
      const threadData = {
        subject: 'New Thread',
        participants: ['1', '2'],
        initial_message: 'Starting a new conversation',
      };

      mockedApi.post.mockResolvedValueOnce({ data: mockThread });

      const result = await messageService.createThread(threadData);

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/messages/threads/',
        threadData
      );
      expect(result).toEqual(mockThread);
    });
  });

  describe('archiveThread', () => {
    it('should archive thread successfully', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: { archived: true } });

      const result = await messageService.archiveThread('thread_1');

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/messages/threads/thread_1/archive/'
      );
      expect(result).toEqual({ archived: true });
    });
  });

  describe('unarchiveThread', () => {
    it('should unarchive thread successfully', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: { archived: false } });

      const result = await messageService.unarchiveThread('thread_1');

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/messages/threads/thread_1/unarchive/'
      );
      expect(result).toEqual({ archived: false });
    });
  });

  describe('getUnreadCount', () => {
    it('should fetch unread message count successfully', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: { count: 5 } });

      const result = await messageService.getUnreadCount();

      expect(mockedApi.get).toHaveBeenCalledWith('/messages/unread-count/');
      expect(result).toBe(5);
    });

    it('should return 0 on error', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('API Error'));

      const result = await messageService.getUnreadCount();

      expect(result).toBe(0);
    });
  });

  describe('markThreadAsRead', () => {
    it('should mark thread as read successfully', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: {} });

      await messageService.markThreadAsRead('thread_1');

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/messages/threads/thread_1/mark-read/'
      );
    });
  });

  describe('searchMessages', () => {
    it('should search messages successfully', async () => {
      const searchParams = { query: 'property inquiry' };
      const searchResult = { results: [mockMessage], count: 1 };
      mockedApi.get.mockResolvedValueOnce({ data: searchResult });

      const result = await messageService.searchMessages(searchParams);

      expect(mockedApi.get).toHaveBeenCalledWith('/messages/search/', {
        params: searchParams,
      });
      expect(result).toEqual(searchResult);
    });

    it('should search with filters', async () => {
      const searchParams = {
        query: 'property',
        sender: '2',
        date_from: '2024-01-01',
      };

      const searchResult = { results: [mockMessage], count: 1 };
      mockedApi.get.mockResolvedValueOnce({ data: searchResult });

      const result = await messageService.searchMessages(searchParams);

      expect(mockedApi.get).toHaveBeenCalledWith('/messages/search/', {
        params: searchParams,
      });
      expect(result).toEqual(searchResult);
    });
  });

  describe('getTemplates', () => {
    it('should fetch message templates successfully', async () => {
      const templates = [
        { id: '1', name: 'Welcome', content: 'Welcome to our platform!' },
        { id: '2', name: 'Follow-up', content: 'Thank you for your interest' },
      ];

      mockedApi.get.mockResolvedValueOnce({ data: templates });

      const result = await messageService.getTemplates();

      expect(mockedApi.get).toHaveBeenCalledWith('/messages/templates/');
      expect(result).toEqual(templates);
    });
  });

  describe('createTemplate', () => {
    it('should create message template successfully', async () => {
      const templateData = {
        name: 'Property Inquiry Response',
        content: 'Thank you for your inquiry about our property...',
      };

      const template = { id: '3', ...templateData };
      mockedApi.post.mockResolvedValueOnce({ data: template });

      const result = await messageService.createTemplate(templateData);

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/messages/templates/',
        templateData
      );
      expect(result).toEqual(template);
    });
  });

  describe('getMessagingStats', () => {
    it('should fetch messaging statistics successfully', async () => {
      const stats = {
        total_messages: 100,
        unread_messages: 5,
        total_threads: 25,
        active_threads: 10,
        messages_today: 3,
        messages_this_week: 15,
      };

      mockedApi.get.mockResolvedValueOnce({ data: stats });

      const result = await messageService.getMessagingStats();

      expect(mockedApi.get).toHaveBeenCalledWith('/messages/stats/');
      expect(result).toEqual(stats);
    });
  });

  describe('quickReply', () => {
    it('should send quick reply successfully', async () => {
      const replyData = { original_message_id: '1', content: 'Thank you!' };
      mockedApi.post.mockResolvedValueOnce({ data: mockMessage });

      const result = await messageService.quickReply(replyData);

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/messages/quick-reply/',
        replyData
      );
      expect(result).toEqual(mockMessage);
    });
  });

  describe('starMessage', () => {
    it('should star message successfully', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: mockMessage });

      const result = await messageService.starMessage('1');

      expect(mockedApi.post).toHaveBeenCalledWith('/messages/star/1/');
      expect(result).toEqual(mockMessage);
    });
  });

  describe('canCommunicate', () => {
    it('should check communication ability', async () => {
      const response = { can_communicate: true };
      mockedApi.get.mockResolvedValueOnce({ data: response });

      const result = await messageService.canCommunicate('user_1');

      expect(mockedApi.get).toHaveBeenCalledWith(
        '/messages/can-communicate/user_1/'
      );
      expect(result).toEqual(response);
    });
  });

  describe('getFolders', () => {
    it('should fetch folders successfully', async () => {
      const folders = [{ id: '1', name: 'Important' }];
      mockedApi.get.mockResolvedValueOnce({ data: folders });

      const result = await messageService.getFolders();

      expect(mockedApi.get).toHaveBeenCalledWith('/messages/folders/');
      expect(result).toEqual(folders);
    });
  });
});
