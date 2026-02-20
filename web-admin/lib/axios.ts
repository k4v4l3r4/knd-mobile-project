import axios from 'axios';
import Cookies from 'js-cookie';

const rawBase = process.env.NEXT_PUBLIC_API_URL || '';
const baseURL = rawBase.endsWith('/api') ? rawBase : `${rawBase.replace(/\/$/, '')}/api`;

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const token = Cookies.get('admin_token');
      if (token !== 'DEMO_TOKEN_ACCESS_GRANTED') {
        Cookies.remove('admin_token');
        Cookies.remove('admin_token', { path: '/' });
        Cookies.remove('admin_token', { path: '/dashboard' });
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login?expired=1';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
