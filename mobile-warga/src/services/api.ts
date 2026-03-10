import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { authEvents } from './authEvent';

// Function to dynamically determine the API URL
export const BASE_URL = 'https://api.afnet.my.id/api';
console.log('API Configuration:', BASE_URL);

export const getStorageUrl = (path: string | null) => {
  if (!path) return null;
  
  // Base URL is now fixed to production
  const BASE_STORAGE_URL = 'https://api.afnet.my.id/storage';

  // Handle absolute URLs
  if (path.startsWith('http')) {
     return path;
  }

  // Handle relative paths
  let cleanPath = path.startsWith('/') ? path.substring(1) : path;
  
  // Remove 'storage/' prefix if present to avoid duplication
  if (cleanPath.startsWith('storage/')) {
      cleanPath = cleanPath.substring('storage/'.length);
  }

  return `${BASE_STORAGE_URL}/${cleanPath}`;
};

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120000, // 120s global timeout for slow uploads
  headers: {
    'Accept': 'application/json',
    // Removed User-Agent to avoid potential Cloudflare blocks for unknown UAs
  },
});

// Interceptor untuk menyisipkan token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('user_token');

      if (token) {
        const headers: any = config.headers || {};
        headers.Authorization = `Bearer ${token}`;
        config.headers = headers;
      }
    } catch (error) {
      // console.log('Error getting token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor response untuk handle 401 global
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // --- DEBUG LOG FOR CLOUDFLARE/SERVER ERROR ---
    if (error.response) {
       console.log('DEBUG_ERROR Response:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
       });
    } else {
       console.log('DEBUG_ERROR Message:', error.message);
    }

    if (error.response) {
      if (error.response.status === 401) {
        console.log('Global 401 detected, emitting UNAUTHORIZED event');
        authEvents.emit('UNAUTHORIZED');
      } else if (error.response.status === 402) {
        console.log('Global 402 detected, emitting PAYMENT_REQUIRED event');
        authEvents.emit('PAYMENT_REQUIRED');
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Network Error Details:', {
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        fullUrl: error.config?.baseURL ? `${error.config.baseURL}${error.config.url}` : error.config?.url,
        method: error.config?.method,
        message: error.message
      });
    }
    return Promise.reject(error);
  }
);

export const getTenantStatus = async () => {
  try {
    const response = await api.get('/tenant/status');
    return response.data;
  } catch (error) {
    console.error('Error fetching tenant status:', error);
    throw error;
  }
};

export const getPaymentConfig = async () => {
  try {
    const response = await api.get('/tenant/payment-config');
    return response.data;
  } catch (error) {
    console.error('Error fetching payment config:', error);
    throw error;
  }
};

export default api;
