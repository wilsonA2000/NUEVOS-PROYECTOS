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
    attachments: []
  };

  const mockThread = {
    id: 'thread_1',
    subject: 'Property Inquiry',
    participants: ['1', '2'],
    last_message: mockMessage,
    message_count: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  const mockCreateMessageDto = {
    subject: 'New Inquiry',
    content: 'Hello, I have a question about the property',
    recipient_id: '1',
    thread_id: 'thread_1'
  };

  describe('getMessages', () => {
    it('should fetch all messages successfully', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [mockMessage] });

      const result = await messageService.getMessages();

      expect(mockedApi.get).toHaveBeenCalledWith('/messages/messages/');
      expect(result).toEqual([mockMessage]);
    });

    it('should fetch messages with filters', async () => {
      const filters = {
        thread_id: 'thread_1',
        read: false,
        sender_id: '2'
      };

      mockedApi.get.mockResolvedValueOnce({ data: [mockMessage] });

      const result = await messageService.getMessages(filters);

      expect(mockedApi.get).toHaveBeenCalledWith('/messages/messages/', { params: filters });
      expect(result).toEqual([mockMessage]);
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
    it('should send message successfully', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: mockMessage });

      const result = await messageService.sendMessage(mockCreateMessageDto);

      expect(mockedApi.post).toHaveBeenCalledWith('/messages/messages/', mockCreateMessageDto);
      expect(result).toEqual(mockMessage);
    });

    it('should handle validation errors', async () => {
      const mockError = {
        response: {
          status: 400,
          data: { content: ['This field is required'] }
        }
      };

      mockedApi.post.mockRejectedValueOnceOnce(mockError);

      await expect(messageService.sendMessage(mockCreateMessageDto)).rejects.toThrow();
    });
  });

  describe('replyToMessage', () => {
    it('should reply to message successfully', async () => {
      const replyData = {
        content: 'Thank you for your inquiry',
        thread_id: 'thread_1'
      };

      const replyMessage = { ...mockMessage, id: '2', content: replyData.content };
      mockedApi.post.mockResolvedValueOnce({ data: replyMessage });

      const result = await messageService.replyToMessage('1', replyData);

      expect(mockedApi.post).toHaveBeenCalledWith('/messages/messages/1/reply/', replyData);
      expect(result).toEqual(replyMessage);
    });
  });

  describe('markAsRead', () => {
    it('should mark message as read successfully', async () => {
      const readMessage = { ...mockMessage, read: true };
      mockedApi.patch.mockResolvedValueOnce({ data: readMessage });

      const result = await messageService.markAsRead('1');

      expect(mockedApi.patch).toHaveBeenCalledWith('/messages/messages/1/', { read: true });
      expect(result).toEqual(readMessage);
    });
  });

  describe('markAsUnread', () => {
    it('should mark message as unread successfully', async () => {
      const unreadMessage = { ...mockMessage, read: false };
      mockedApi.patch.mockResolvedValueOnce({ data: unreadMessage });

      const result = await messageService.markAsUnread('1');

      expect(mockedApi.patch).toHaveBeenCalledWith('/messages/messages/1/', { read: false });
      expect(result).toEqual(unreadMessage);
    });
  });

  describe('deleteMessage', () => {
    it('should delete message successfully', async () => {
      mockedApi.delete.mockResolvedValueOnce({ data: {} });

      await messageService.deleteMessage('1');

      expect(mockedApi.delete).toHaveBeenCalledWith('/messages/messages/1/');
    });
  });

  describe('getThreads', () => {
    it('should fetch all threads successfully', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [mockThread] });

      const result = await messageService.getThreads();

      expect(mockedApi.get).toHaveBeenCalledWith('/messages/threads/');
      expect(result).toEqual([mockThread]);
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
        initial_message: 'Starting a new conversation'
      };

      mockedApi.post.mockResolvedValueOnce({ data: mockThread });

      const result = await messageService.createThread(threadData);

      expect(mockedApi.post).toHaveBeenCalledWith('/messages/threads/', threadData);
      expect(result).toEqual(mockThread);
    });
  });

  describe('archiveThread', () => {
    it('should archive thread successfully', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: { archived: true } });

      const result = await messageService.archiveThread('thread_1');

      expect(mockedApi.post).toHaveBeenCalledWith('/messages/threads/thread_1/archive/');
      expect(result).toEqual({ archived: true });
    });
  });

  describe('unarchiveThread', () => {
    it('should unarchive thread successfully', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: { archived: false } });

      const result = await messageService.unarchiveThread('thread_1');

      expect(mockedApi.post).toHaveBeenCalledWith('/messages/threads/thread_1/unarchive/');
      expect(result).toEqual({ archived: false });
    });
  });

  describe('uploadAttachment', () => {
    it('should upload attachment successfully', async () => {
      const formData = new FormData();
      formData.append('file', new File(['test'], 'document.pdf'));

      mockedApi.post.mockResolvedValueOnce({ data: { attachment_id: 'att_123', filename: 'document.pdf' } });

      const result = await messageService.uploadAttachment('1', formData);

      expect(mockedApi.post).toHaveBeenCalledWith('/messages/messages/1/attachments/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      expect(result).toEqual({ attachment_id: 'att_123', filename: 'document.pdf' });
    });
  });

  describe('getUnreadCount', () => {
    it('should fetch unread message count successfully', async () => {
      mockedApi.get.mockResolvedValueOnce({ data: { unread_count: 5 } });

      const result = await messageService.getUnreadCount();

      expect(mockedApi.get).toHaveBeenCalledWith('/messages/unread-count/');
      expect(result).toEqual({ unread_count: 5 });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all messages as read successfully', async () => {
      mockedApi.post.mockResolvedValueOnce({ data: { marked_count: 5 } });

      const result = await messageService.markAllAsRead();

      expect(mockedApi.post).toHaveBeenCalledWith('/messages/mark-all-read/');
      expect(result).toEqual({ marked_count: 5 });
    });
  });

  describe('searchMessages', () => {
    it('should search messages successfully', async () => {
      const searchQuery = 'property inquiry';
      mockedApi.get.mockResolvedValueOnce({ data: [mockMessage] });

      const result = await messageService.searchMessages(searchQuery);

      expect(mockedApi.get).toHaveBeenCalledWith('/messages/search/', { params: { q: searchQuery } });
      expect(result).toEqual([mockMessage]);
    });

    it('should search with filters', async () => {
      const searchQuery = 'property';
      const filters = { sender_id: '2', read: false };

      mockedApi.get.mockResolvedValueOnce({ data: [mockMessage] });

      const result = await messageService.searchMessages(searchQuery, filters);

      expect(mockedApi.get).toHaveBeenCalledWith('/messages/search/', { 
        params: { q: searchQuery, ...filters } 
      });
      expect(result).toEqual([mockMessage]);
    });
  });

  describe('getTemplates', () => {
    it('should fetch message templates successfully', async () => {
      const templates = [
        { id: '1', name: 'Welcome', content: 'Welcome to our platform!' },
        { id: '2', name: 'Follow-up', content: 'Thank you for your interest' }
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
        content: 'Thank you for your inquiry about our property...'
      };

      const template = { id: '3', ...templateData };
      mockedApi.post.mockResolvedValueOnce({ data: template });

      const result = await messageService.createTemplate(templateData);

      expect(mockedApi.post).toHaveBeenCalledWith('/messages/templates/', templateData);
      expect(result).toEqual(template);
    });
  });

  describe('getMessageStats', () => {
    it('should fetch message statistics successfully', async () => {
      const stats = {
        total_messages: 100,
        unread_messages: 5,
        total_threads: 25,
        active_threads: 10
      };

      mockedApi.get.mockResolvedValueOnce({ data: stats });

      const result = await messageService.getMessageStats();

      expect(mockedApi.get).toHaveBeenCalledWith('/messages/stats/');
      expect(result).toEqual(stats);
    });
  });
});