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

// Create a fresh wrapper for each test to avoid stale query cache
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useMessages', () => {
  const mockMessages = [
    {
      id: '1',
      senderId: '1',
      recipientId: '2',
      subject: 'Test',
      content: 'Test message 1',
      isRead: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      senderId: '2',
      recipientId: '1',
      subject: 'Test 2',
      content: 'Test message 2',
      isRead: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockMessageService.getMessages.mockResolvedValue(mockMessages as any);
    mockMessageService.getThreads.mockResolvedValue([] as any);
    mockMessageService.getFolders.mockResolvedValue([] as any);
    mockMessageService.getTemplates.mockResolvedValue([] as any);
    mockMessageService.getConversations.mockResolvedValue([] as any);
    mockMessageService.getUnreadCount.mockResolvedValue(0 as any);
    mockMessageService.getMessagingStats.mockResolvedValue({} as any);
  });

  it('should fetch messages successfully', async () => {
    const { result } = renderHook(() => useMessages(), { wrapper: createTestWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.messages).toEqual(mockMessages);
    expect(mockMessageService.getMessages).toHaveBeenCalled();
  });

  it('should return messages as undefined initially', () => {
    // Use a delayed mock to ensure we can observe initial state
    mockMessageService.getMessages.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockMessages as any), 5000))
    );

    const { result } = renderHook(() => useMessages(), { wrapper: createTestWrapper() });

    // Messages should be undefined before the query resolves
    expect(result.current.messages).toBeUndefined();
  });

  it('should create a message via mutation', async () => {
    const newMessage = {
      recipientId: '2',
      subject: 'New',
      content: 'New message',
    };
    mockMessageService.createMessage.mockResolvedValue({ id: '3', ...newMessage } as any);

    const { result } = renderHook(() => useMessages(), { wrapper: createTestWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.createMessage.mutateAsync(newMessage as any);
    });

    expect(mockMessageService.createMessage).toHaveBeenCalled();
    // Verify first argument matches our data
    const callArgs = mockMessageService.createMessage.mock.calls[0];
    expect(callArgs[0]).toEqual(newMessage);
  });

  it('should delete a message via mutation', async () => {
    mockMessageService.deleteMessage.mockResolvedValue(undefined as any);

    const { result } = renderHook(() => useMessages(), { wrapper: createTestWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.deleteMessage.mutateAsync('1');
    });

    expect(mockMessageService.deleteMessage).toHaveBeenCalled();
    const callArgs = mockMessageService.deleteMessage.mock.calls[0];
    expect(callArgs[0]).toBe('1');
  });

  it('should expose thread and folder data', async () => {
    const { result } = renderHook(() => useMessages(), { wrapper: createTestWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.threads).toEqual([]);
    expect(result.current.folders).toEqual([]);
    expect(result.current.templates).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });
});
