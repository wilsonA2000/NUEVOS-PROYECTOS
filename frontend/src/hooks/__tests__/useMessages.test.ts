import { renderHook, waitFor } from '@testing-library/react';
import { useMessages } from '../useMessages';
import { createWrapper } from '../../test-utils';
import '@testing-library/jest-dom';
import mockAxios from '../../__mocks__/axios';
import { Message } from '../../types';

jest.mock('../useLanguage', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: jest.fn(),
    t: (key: string) => key,
  }),
}));

describe('useMessages', () => {
  const mockMessages: Message[] = [
    {
      id: 1,
      sender_id: 1,
      receiver_id: 2,
      property_id: 1,
      content: 'Test message 1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      sender_id: 2,
      receiver_id: 1,
      property_id: 1,
      content: 'Test message 2',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  const mockNewMessage: Message = {
    id: 3,
    sender_id: 1,
    receiver_id: 2,
    property_id: 1,
    content: 'New test message',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockUpdatedMessage: Message = {
    ...mockMessages[0],
    content: 'Updated test message',
  };

  // Variable local para simular el estado mutable de los mensajes
  let messagesState: Message[];

  beforeEach(() => {
    mockAxios.__resetMockData();
    messagesState = [...mockMessages];
    mockAxios.__setMockData({ get: messagesState });

    // Configurar los mocks de axios para que usen messagesState
    mockAxios.__setMockData({
      get: messagesState,
      post: (data: any) => {
        const newMessage = { ...data, id: messagesState.length + 1, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' };
        messagesState.push(newMessage);
        return newMessage;
      },
      patch: (data: any) => {
        const index = messagesState.findIndex(m => m.id === data.id);
        if (index !== -1) {
          messagesState[index] = { ...messagesState[index], ...data.data };
        }
        return messagesState[index];
      },
      delete: (id: number) => {
        const index = messagesState.findIndex(m => m.id === id);
        if (index !== -1) {
          messagesState.splice(index, 1);
        }
        return true;
      },
    });
  });

  it('should fetch messages successfully', async () => {
    const { result } = renderHook(() => useMessages(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.messages).toBeDefined();
      expect(result.current.messages).toHaveLength(2);
    });
  });

  it('should create a new message', async () => {
    const { result } = renderHook(() => useMessages(), { wrapper: createWrapper() });

    const newMessage = {
      sender_id: 1,
      receiver_id: 2,
      property_id: 1,
      content: 'New message',
    };

    await result.current.create.mutateAsync(newMessage);

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(3);
      expect(result.current.messages?.[2].content).toBe('New message');
    });
  });

  it('should update a message', async () => {
    const { result } = renderHook(() => useMessages(), { wrapper: createWrapper() });

    const updatedData = {
      content: 'Updated message',
    };

    await result.current.update.mutateAsync({ id: 1, data: updatedData });

    await waitFor(() => {
      expect(result.current.messages?.[0].content).toBe('Updated message');
    });
  });

  it('should delete a message', async () => {
    const { result } = renderHook(() => useMessages(), { wrapper: createWrapper() });

    await result.current.remove.mutateAsync(1);

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages?.[0].id).toBe(2);
    });
  });
}); 