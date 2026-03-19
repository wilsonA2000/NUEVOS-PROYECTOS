import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMessages } from '../useMessages';

// Mock useAuth to avoid needing AuthProvider
jest.mock('../useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: '1', email: 'test@example.com' },
  }),
}));

// Mock the messageService
jest.mock('../../services/messageService', () => ({
  messageService: {
    getMessages: jest.fn(),
    getThreads: jest.fn(),
    getFolders: jest.fn(),
    getTemplates: jest.fn(),
    getConversations: jest.fn(),
    getUnreadCount: jest.fn(),
    getMessagingStats: jest.fn(),
    createMessage: jest.fn(),
    updateMessage: jest.fn(),
    deleteMessage: jest.fn(),
    sendMessage: jest.fn(),
    quickReply: jest.fn(),
    markAsRead: jest.fn(),
    markAsUnread: jest.fn(),
    starMessage: jest.fn(),
    createThread: jest.fn(),
    updateThread: jest.fn(),
    deleteThread: jest.fn(),
    markConversationRead: jest.fn(),
    archiveConversation: jest.fn(),
    createFolder: jest.fn(),
    updateFolder: jest.fn(),
    deleteFolder: jest.fn(),
    createTemplate: jest.fn(),
    updateTemplate: jest.fn(),
    deleteTemplate: jest.fn(),
    createConversation: jest.fn(),
    updateConversation: jest.fn(),
    deleteConversation: jest.fn(),
    searchMessages: jest.fn(),
    canCommunicate: jest.fn(),
  },
}));

jest.mock('../useLanguage', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: jest.fn(),
    t: (key: string) => key,
  }),
}));

import { messageService } from '../../services/messageService';
const mockMessageService = messageService as jest.Mocked<typeof messageService>;

// Create a fresh wrapper for each test
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
};

describe('useMessages Hook', () => {
  const mockMessages = [
    {
      id: '1',
      senderId: '1',
      recipientId: '2',
      subject: 'Test Subject',
      content: 'Test message 1',
      isRead: false,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    },
    {
      id: '2',
      senderId: '2',
      recipientId: '1',
      subject: 'Reply',
      content: 'Test message 2',
      isRead: true,
      createdAt: '2025-01-02T00:00:00Z',
      updatedAt: '2025-01-02T00:00:00Z',
    },
  ];

  const mockThreads = [
    { id: 'thread-1', subject: 'Thread 1', participants: ['1', '2'] },
  ];

  const mockFolders = [
    { id: 'folder-1', name: 'Important', message_count: 5 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockMessageService.getMessages.mockResolvedValue(mockMessages as any);
    mockMessageService.getThreads.mockResolvedValue(mockThreads as any);
    mockMessageService.getFolders.mockResolvedValue(mockFolders as any);
    mockMessageService.getTemplates.mockResolvedValue([] as any);
    mockMessageService.getConversations.mockResolvedValue([] as any);
    mockMessageService.getUnreadCount.mockResolvedValue(3 as any);
    mockMessageService.getMessagingStats.mockResolvedValue({ total: 10 } as any);
  });

  it('should fetch messages successfully when authenticated', async () => {
    const { result } = renderHook(() => useMessages(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.messages).toEqual(mockMessages);
    });

    expect(result.current.isLoading).toBe(false);
    expect(mockMessageService.getMessages).toHaveBeenCalled();
  });

  it('should fetch threads and folders', async () => {
    const { result } = renderHook(() => useMessages(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.threads).toEqual(mockThreads);
      expect(result.current.folders).toEqual(mockFolders);
    });
  });

  it('should fetch unread count', async () => {
    const { result } = renderHook(() => useMessages(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.unreadCount).toBe(3);
    });
  });

  it('should create a message via mutation', async () => {
    const newMessage = { recipientId: '2', subject: 'New', content: 'Hello' };
    mockMessageService.createMessage.mockResolvedValue({ id: '3', ...newMessage } as any);

    const { result } = renderHook(() => useMessages(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.createMessage.mutateAsync(newMessage as any);
    });

    expect(mockMessageService.createMessage).toHaveBeenCalled();
    expect(mockMessageService.createMessage.mock.calls[0][0]).toEqual(newMessage);
  });

  it('should send a message via mutation', async () => {
    const messageData = { recipientId: '2', content: 'Quick message' };
    mockMessageService.sendMessage.mockResolvedValue({ id: '4', ...messageData } as any);

    const { result } = renderHook(() => useMessages(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.sendMessage.mutateAsync(messageData as any);
    });

    expect(mockMessageService.sendMessage).toHaveBeenCalled();
  });

  it('should delete a message via mutation', async () => {
    mockMessageService.deleteMessage.mockResolvedValue(undefined as any);

    const { result } = renderHook(() => useMessages(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteMessage.mutateAsync('1');
    });

    expect(mockMessageService.deleteMessage).toHaveBeenCalled();
    expect(mockMessageService.deleteMessage.mock.calls[0][0]).toBe('1');
  });

  it('should update a message via mutation', async () => {
    mockMessageService.updateMessage.mockResolvedValue({ id: '1', content: 'Updated' } as any);

    const { result } = renderHook(() => useMessages(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.updateMessage.mutateAsync({
        id: '1',
        data: { content: 'Updated' },
      });
    });

    expect(mockMessageService.updateMessage).toHaveBeenCalledWith('1', { content: 'Updated' });
  });

  it('should create a thread via mutation', async () => {
    const threadData = { subject: 'New Thread', participants: ['1', '2'] };
    mockMessageService.createThread.mockResolvedValue({ id: 'thread-2', ...threadData } as any);

    const { result } = renderHook(() => useMessages(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.createThread.mutateAsync(threadData as any);
    });

    expect(mockMessageService.createThread).toHaveBeenCalled();
  });

  it('should create a folder via mutation', async () => {
    const folderData = { name: 'Archive' };
    mockMessageService.createFolder.mockResolvedValue({ id: 'folder-2', ...folderData } as any);

    const { result } = renderHook(() => useMessages(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.createFolder.mutateAsync(folderData as any);
    });

    expect(mockMessageService.createFolder).toHaveBeenCalled();
  });

  it('should handle search messages mutation', async () => {
    const searchResults = [mockMessages[0]];
    mockMessageService.searchMessages.mockResolvedValue(searchResults as any);

    const { result } = renderHook(() => useMessages(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.searchMessages.mutateAsync('test query' as any);
    });

    expect(mockMessageService.searchMessages).toHaveBeenCalled();
  });

  it('should handle message creation error', async () => {
    mockMessageService.createMessage.mockRejectedValue(new Error('Send failed'));

    const { result } = renderHook(() => useMessages(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      try {
        await result.current.createMessage.mutateAsync({} as any);
      } catch {
        // Expected
      }
    });

    await waitFor(() => {
      expect(result.current.createMessage.isError).toBe(true);
    });
  });
});
