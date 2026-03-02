import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { authEvents } from './authEvent';

// Function to dynamically determine the API URL
const getBaseUrl = () => {
  // Use production URL for release builds
  if (!__DEV__) {
    return 'https://api.afnet.my.id/api';
  }

  // Development: try to infer LAN IP from Expo debugger host
  const debuggerHost = Constants.expoConfig?.hostUri;
  if (debuggerHost) {
    const ip = debuggerHost.split(':')[0];
    return `http://${ip}:8000/api`;
  }

  // Fallback to local network IP (adjust if needed)
  return 'http://192.168.1.3:8000/api';
};

export const BASE_URL = getBaseUrl();
console.log('API Configuration:', BASE_URL);

export const getStorageUrl = (path: string | null) => {
  if (!path) return null;
  
  // Determine Base Storage URL dynamically
  const BASE_STORAGE_URL = BASE_URL.replace(/\/api$/, '/storage');

  // Handle absolute URLs
  if (path.startsWith('http')) {
     // If it matches current storage, return as is
     if (path.startsWith(BASE_STORAGE_URL)) return path;

     // Special handling for localhost/IP mismatches (e.g. emulator vs device, or dev vs prod)
     if ((path.includes('localhost') || path.includes('127.0.0.1'))) {
         // If we are in production (or at least using a non-local API), replace the local host
         if (!BASE_URL.includes('localhost') && !BASE_URL.includes('127.0.0.1')) {
             const apiHost = BASE_URL.split('/')[2].split(':')[0]; // extract IP/domain
             // If apiHost is empty (e.g. malformed), fallback to path
             if (!apiHost) return path;
             
             // Replace localhost/127.0.0.1 with the correct host
             return path.replace('localhost', apiHost).replace('127.0.0.1', apiHost);
         }
     }
     
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
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Interceptor untuk menyisipkan token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('user_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
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
