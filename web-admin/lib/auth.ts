import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import axios from '@/lib/axios';
import { useRouter } from 'next/navigation';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  rt_id: number;
  rw_id: number;
  photo_url?: string;
}

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      const token = Cookies.get('admin_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get('/me');
        if (response.data && response.data.success) {
          setUser(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const logout = async () => {
    try {
      await axios.post('/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
    Cookies.remove('admin_token');
    setUser(null);
    router.push('/login');
  };

  return {
    user,
    loading,
    logout,
    isAuthenticated: !!user,
  };
};
