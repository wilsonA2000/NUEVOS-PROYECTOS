import { renderHook, waitFor, act } from '@testing-library/react';
import { useUser } from '../useUser';

// Mock the api module
jest.mock('../../services/api', () => ({
  api: {
    get: jest.fn(),
    patch: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  },
}));

// Mock useLanguage if needed
jest.mock('../useLanguage', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: jest.fn(),
    t: (key: string) => key,
  }),
}));

import { api } from '../../services/api';

const mockApi = api as jest.Mocked<typeof api>;

describe('useUser', () => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    role: 'tenant' as const,
    is_verified: true,
  };

  const mockUpdatedUser = {
    ...mockUser,
    first_name: 'Updated',
    last_name: 'Name',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('should fetch user data successfully when token exists', async () => {
    localStorage.setItem('access_token', 'test-token');
    mockApi.get.mockResolvedValueOnce({ data: mockUser });

    const { result } = renderHook(() => useUser());

    // Initially loading
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.error).toBeNull();
    expect(mockApi.get).toHaveBeenCalledWith('/users/me/');
  });

  it('should not fetch user when no token exists', async () => {
    const { result } = renderHook(() => useUser());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(mockApi.get).not.toHaveBeenCalled();
  });

  it('should handle fetch error', async () => {
    localStorage.setItem('access_token', 'test-token');
    mockApi.get.mockRejectedValueOnce({
      response: { data: { message: 'Unauthorized' } },
    });

    const { result } = renderHook(() => useUser());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.error).toBe('Unauthorized');
  });

  it('should update user data successfully', async () => {
    localStorage.setItem('access_token', 'test-token');
    mockApi.get.mockResolvedValueOnce({ data: mockUser });
    mockApi.patch.mockResolvedValueOnce({ data: mockUpdatedUser });

    const { result } = renderHook(() => useUser());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.user).toEqual(mockUser);
    });

    let updateResult: any;
    await act(async () => {
      updateResult = await result.current.updateUser({
        first_name: 'Updated',
        last_name: 'Name',
      });
    });

    expect(updateResult).toEqual(mockUpdatedUser);
    expect(result.current.user).toEqual(mockUpdatedUser);
    expect(mockApi.patch).toHaveBeenCalledWith('/users/me/', {
      first_name: 'Updated',
      last_name: 'Name',
    });
  });
});
