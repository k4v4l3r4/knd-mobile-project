import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  rt_id: number;
  // Added fields for Warga details
  status_in_family?: string;
  kk_number?: string;
  photo_url?: string | null;
  nik?: string;
  address?: string | null;
  block?: string | null;
  address_rt?: string | null;
  address_rw?: string | null;
  data_verified_at?: string | null;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data?: {
    user: User;
    token: string;
  };
}

const normalizeApiError = (error: any, fallbackMessage: string) => {
  const status = error?.response?.status;
  const dataResp = error?.response?.data;
  const message = dataResp?.message;
  const errors = dataResp?.errors;

  let displayMessage = fallbackMessage;

  if (typeof dataResp === 'string') {
    displayMessage = dataResp.includes('<html') ? `Server Error (${status || '-'})` : dataResp;
  } else if (status === 422 && errors && typeof errors === 'object') {
    const firstKey = Object.keys(errors)[0];
    const firstErr = firstKey ? errors[firstKey] : null;
    displayMessage = Array.isArray(firstErr) && firstErr.length > 0 ? firstErr[0] : (message || displayMessage);
  } else if (typeof message === 'string' && message.trim() !== '') {
    displayMessage = message;
  } else if (typeof error?.message === 'string' && error.message.trim() !== '') {
    displayMessage = error.message;
  } else if (status) {
    displayMessage = `${displayMessage} (Status: ${status})`;
  }

  return { status, displayMessage };
};

export const authService = {
  async login(phone: string, password: string): Promise<LoginResponse> {
    try {
      const response = await api.post('/login', { phone, password });
      return response.data;
    } catch (error: any) {
      const { displayMessage } = normalizeApiError(error, 'Terjadi kesalahan koneksi');
      throw new Error(displayMessage);
    }
  },
  
  async forgotPassword(phone: string): Promise<any> {
    try {
      const response = await api.post('/auth/forgot-password', { phone });
      return response.data;
    } catch (error: any) {
      const { displayMessage } = normalizeApiError(error, 'Terjadi kesalahan koneksi');
      throw new Error(displayMessage);
    }
  },

  async verifyOtp(phone: string, otp: string): Promise<any> {
    try {
      const response = await api.post('/auth/verify-otp', { phone, otp });
      return response.data;
    } catch (error: any) {
      const { displayMessage } = normalizeApiError(error, 'Terjadi kesalahan koneksi');
      throw new Error(displayMessage);
    }
  },

  async resetPassword(phone: string, password: string, token: string): Promise<any> {
    try {
      const response = await api.post('/auth/reset-password', { phone, password, token });
      return response.data;
    } catch (error: any) {
      const { displayMessage } = normalizeApiError(error, 'Terjadi kesalahan koneksi');
      throw new Error(displayMessage);
    }
  },

  async registerWarga(data: any): Promise<any> {
    try {
      const response = await api.post('/register', data);
      return response.data;
    } catch (error: any) {
      const { displayMessage } = normalizeApiError(error, 'Terjadi kesalahan koneksi');
      throw new Error(displayMessage);
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
