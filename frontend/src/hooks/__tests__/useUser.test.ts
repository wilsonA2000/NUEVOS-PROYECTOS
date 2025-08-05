import { renderHook, waitFor } from '@testing-library/react';
import { useUser } from '../useUser';
import { createWrapper } from '../../test-utils';
import mockAxios from '../../__mocks__/axios';
import { User } from '../../types';

jest.mock('../useLanguage', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: jest.fn(),
    t: (key: string) => key,
  }),
}));

describe('useUser', () => {
  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    role: 'tenant',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockUpdatedUser: User = {
    ...mockUser,
    first_name: 'Updated',
    last_name: 'Name',
  };

  beforeEach(() => {
    mockAxios.__setMockData({
      get: mockUser,
      patch: mockUpdatedUser,
    });
  });

  it('should fetch user data successfully', async () => {
    const { result } = renderHook(() => useUser(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
  });

  it('should update user data successfully', async () => {
    const { result } = renderHook(() => useUser(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const updateResult = await result.current.update.mutateAsync({
      first_name: 'Updated',
      last_name: 'Name',
    });

    expect(updateResult).toEqual(mockUpdatedUser);
  });
}); 