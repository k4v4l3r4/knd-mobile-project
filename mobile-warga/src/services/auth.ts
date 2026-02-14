import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  rt_id: number;
  // Add other fields as needed
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data?: {
    user: User;
    token: string;
  };
}

export const authService = {
  async login(phone: string, password: string): Promise<LoginResponse> {
    try {
      const response = await api.post('/login', { phone, password });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { success: false, message: 'Terjadi kesalahan koneksi' };
    }
  },

  async logout(): Promise<void> {
    try {
      await api.post('/logout');
    } catch (error) {
      console.error('Logout error on server:', error);
    } finally {
      // Always clear local storage
      await AsyncStorage.multiRemove(['user_token', 'user_data']);
    }
  },

  async getUser(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  },

  async hasRole(role: string): Promise<boolean> {
    const user = await this.getUser();
    return user?.role === role;
  }
};
