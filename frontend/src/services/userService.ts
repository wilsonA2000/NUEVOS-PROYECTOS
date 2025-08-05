import { api } from './api';
import { User, UpdateProfileDto, UserResume, UpdateResumeDto, UserSettings } from '../types/user';

export const userService = {
  // Perfil público
  async updateProfile(data: UpdateProfileDto): Promise<User> {
    try {
      const response = await api.put<User>('/users/profile/', data);
      return response.data;
    } catch (error: any) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },

  async uploadAvatar(file: File): Promise<{ avatar_url: string }> {
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const response = await api.post<{ avatar_url: string }>('/users/avatar/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      throw error;
    }
  },

  // Hoja de vida
  async getResume(): Promise<UserResume> {
    try {
      const response = await api.get<UserResume>('/users/resume/');
      return response.data;
    } catch (error: any) {
      console.error('Error getting resume:', error);
      throw error;
    }
  },

  async updateResume(data: UpdateResumeDto): Promise<UserResume> {
    try {
      const response = await api.put<UserResume>('/users/resume/', data);
      return response.data;
    } catch (error: any) {
      console.error('Error updating resume:', error);
      throw error;
    }
  },

  async createResume(data: UpdateResumeDto): Promise<UserResume> {
    try {
      const response = await api.post<UserResume>('/users/resume/', data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating resume:', error);
      throw error;
    }
  },

  // Ajustes
  async getSettings(): Promise<UserSettings> {
    try {
      const response = await api.get<UserSettings>('/users/settings/');
      return response.data;
    } catch (error: any) {
      console.error('Error getting settings:', error);
      throw error;
    }
  },

  async updateSettings(data: Partial<UserSettings>): Promise<UserSettings> {
    try {
      const response = await api.put<UserSettings>('/users/settings/', data);
      return response.data;
    } catch (error: any) {
      console.error('Error updating settings:', error);
      throw error;
    }
  },

  // Verificación de código de entrevista
  async verifyInterviewCode(code: string, email: string): Promise<{ valid: boolean; message?: string }> {
    try {
      const response = await api.post('/users/verify-interview-code/', { code, email });
      return response.data;
    } catch (error: any) {
      console.error('Error verifying interview code:', error);
      throw error;
    }
  },

  // Registro con código de entrevista
  async registerWithCode(data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    user_type: 'landlord' | 'tenant' | 'service_provider';
    phone_number: string;
    interview_code: string;
  }): Promise<User> {
    try {
      const response = await api.post<User>('/users/register/', data);
      return response.data;
    } catch (error: any) {
      console.error('Error registering user:', error);
      throw error;
    }
  }
}; 