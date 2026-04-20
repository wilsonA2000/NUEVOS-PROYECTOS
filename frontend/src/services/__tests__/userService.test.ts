/**
 * Tests for userService.
 * Covers profile management, resume CRUD, settings, interview code verification,
 * avatar upload, and error handling.
 */

import { userService } from '../userService';
import { api } from '../api';

// Mock the API module
jest.mock('../api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===== PROFILE =====

  describe('updateProfile', () => {
    it('should update user profile with PATCH', async () => {
      const updateData = {
        first_name: 'Updated',
        phone_number: '+573009876543',
      };
      const mockUser = { id: '1', email: 'test@test.com', ...updateData };
      mockedApi.patch.mockResolvedValueOnce({ data: mockUser });

      const result = await userService.updateProfile(updateData as any);

      expect(mockedApi.patch).toHaveBeenCalledWith(
        '/users/profile/',
        updateData
      );
      expect(result.first_name).toBe('Updated');
    });

    it('should propagate errors on profile update', async () => {
      mockedApi.patch.mockRejectedValueOnce(new Error('Validation Error'));

      await expect(userService.updateProfile({} as any)).rejects.toThrow(
        'Validation Error'
      );
    });
  });

  // ===== AVATAR =====

  describe('uploadAvatar', () => {
    it('should upload avatar with multipart form data', async () => {
      const mockFile = new File(['test-image'], 'avatar.jpg', {
        type: 'image/jpeg',
      });
      const mockResponse = {
        avatar_url: 'https://example.com/avatars/avatar.jpg',
      };
      mockedApi.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await userService.uploadAvatar(mockFile);

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/users/avatar/',
        expect.any(FormData),
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      expect(result.avatar_url).toBe('https://example.com/avatars/avatar.jpg');
    });

    it('should propagate errors on avatar upload', async () => {
      const mockFile = new File(['test'], 'avatar.jpg');
      mockedApi.post.mockRejectedValueOnce(new Error('File too large'));

      await expect(userService.uploadAvatar(mockFile)).rejects.toThrow(
        'File too large'
      );
    });
  });

  // ===== RESUME =====

  describe('getResume', () => {
    it('should fetch user resume', async () => {
      const mockResume = { id: 'r-1', bio: 'Test bio', experience: [] };
      mockedApi.get.mockResolvedValueOnce({ data: mockResume });

      const result = await userService.getResume();

      expect(mockedApi.get).toHaveBeenCalledWith('/users/resume/');
      expect(result.bio).toBe('Test bio');
    });

    it('should propagate errors when resume not found', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('Not Found'));

      await expect(userService.getResume()).rejects.toThrow('Not Found');
    });
  });

  describe('updateResume', () => {
    it('should update resume with PUT', async () => {
      const resumeData = {
        bio: 'Updated bio',
        skills: ['React', 'TypeScript'],
      };
      const mockResume = { id: 'r-1', ...resumeData };
      mockedApi.put.mockResolvedValueOnce({ data: mockResume });

      const result = await userService.updateResume(resumeData as any);

      expect(mockedApi.put).toHaveBeenCalledWith('/users/resume/', resumeData);
      expect(result.bio).toBe('Updated bio');
    });
  });

  describe('createResume', () => {
    it('should create a new resume', async () => {
      const resumeData = { bio: 'My resume', experience: ['Dev at Company'] };
      const mockResume = { id: 'r-new', ...resumeData };
      mockedApi.post.mockResolvedValueOnce({ data: mockResume });

      const result = await userService.createResume(resumeData as any);

      expect(mockedApi.post).toHaveBeenCalledWith('/users/resume/', resumeData);
      expect(result.id).toBe('r-new');
    });

    it('should propagate errors on resume creation', async () => {
      mockedApi.post.mockRejectedValueOnce(new Error('Duplicate resume'));

      await expect(userService.createResume({} as any)).rejects.toThrow(
        'Duplicate resume'
      );
    });
  });

  // ===== SETTINGS =====

  describe('getSettings', () => {
    it('should fetch user settings', async () => {
      const mockSettings = { notifications_enabled: true, language: 'es' };
      mockedApi.get.mockResolvedValueOnce({ data: mockSettings });

      const result = await userService.getSettings();

      expect(mockedApi.get).toHaveBeenCalledWith('/users/settings/');
      expect(result.notifications_enabled).toBe(true);
    });
  });

  describe('updateSettings', () => {
    it('should update settings with PUT', async () => {
      const settingsData = { notifications_enabled: false };
      const mockSettings = { notifications_enabled: false, language: 'es' };
      mockedApi.put.mockResolvedValueOnce({ data: mockSettings });

      const result = await userService.updateSettings(settingsData as any);

      expect(mockedApi.put).toHaveBeenCalledWith(
        '/users/settings/',
        settingsData
      );
      expect(result.notifications_enabled).toBe(false);
    });

    it('should propagate errors on settings update', async () => {
      mockedApi.put.mockRejectedValueOnce(new Error('Invalid settings'));

      await expect(userService.updateSettings({} as any)).rejects.toThrow(
        'Invalid settings'
      );
    });
  });

  // ===== INTERVIEW CODE =====

  describe('verifyInterviewCode', () => {
    it('should verify a valid interview code', async () => {
      const mockResponse = { valid: true, message: 'Code is valid' };
      mockedApi.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await userService.verifyInterviewCode(
        'ABC123',
        'user@test.com'
      );

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/users/verify-interview-code/',
        {
          code: 'ABC123',
          email: 'user@test.com',
        }
      );
      expect(result.valid).toBe(true);
    });

    it('should return invalid for wrong code', async () => {
      const mockResponse = { valid: false, message: 'Invalid code' };
      mockedApi.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await userService.verifyInterviewCode(
        'WRONG',
        'user@test.com'
      );

      expect(result.valid).toBe(false);
    });

    it('should propagate errors on verification failure', async () => {
      mockedApi.post.mockRejectedValueOnce(new Error('Server Error'));

      await expect(
        userService.verifyInterviewCode('CODE', 'user@test.com')
      ).rejects.toThrow('Server Error');
    });
  });

  // ===== REGISTER WITH CODE =====

  describe('registerWithCode', () => {
    it('should register user with interview code', async () => {
      const registrationData = {
        email: 'new@test.com',
        password: 'securepass123',
        first_name: 'New',
        last_name: 'User',
        user_type: 'tenant' as const,
        phone_number: '+573001234567',
        interview_code: 'VALID-CODE',
      };
      const mockUser = { id: 'u-1', email: 'new@test.com', first_name: 'New' };
      mockedApi.post.mockResolvedValueOnce({ data: mockUser });

      const result = await userService.registerWithCode(registrationData);

      expect(mockedApi.post).toHaveBeenCalledWith(
        '/users/register/',
        registrationData
      );
      expect(result.email).toBe('new@test.com');
    });

    it('should propagate errors for invalid registration data', async () => {
      mockedApi.post.mockRejectedValueOnce(
        new Error('Email already registered')
      );

      await expect(
        userService.registerWithCode({
          email: 'existing@test.com',
          password: 'pass',
          first_name: 'X',
          last_name: 'Y',
          user_type: 'tenant',
          phone_number: '+57300',
          interview_code: 'CODE',
        })
      ).rejects.toThrow('Email already registered');
    });
  });

  // ===== ERROR HANDLING =====

  describe('Error Handling', () => {
    it('should propagate network errors', async () => {
      mockedApi.get.mockRejectedValueOnce(new Error('Network Error'));

      await expect(userService.getResume()).rejects.toThrow('Network Error');
    });

    it('should propagate server errors', async () => {
      mockedApi.patch.mockRejectedValueOnce(new Error('Internal Server Error'));

      await expect(userService.updateProfile({} as any)).rejects.toThrow(
        'Internal Server Error'
      );
    });
  });
});
