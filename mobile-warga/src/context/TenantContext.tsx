import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTenantStatus } from '../services/api';
import { AppState } from 'react-native';

export interface TenantStatus {
  tenant_type: 'LIVE' | 'DEMO';
  tenant_status: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'DEMO';
  is_trial: boolean;
  remaining_trial_days: number;
  action_required: string | null;
  trial_end_at?: string;
}

interface TenantContextType {
  status: TenantStatus | null;
  loading: boolean;
  refreshStatus: () => Promise<void>;
  isExpired: boolean;
  isTrial: boolean;
  isDemo: boolean;
  daysRemaining: number;
}

const TenantContext = createContext<TenantContextType>({
  status: null,
  loading: false,
  refreshStatus: async () => {},
  isExpired: false,
  isTrial: false,
  isDemo: false,
  daysRemaining: 0,
});

export const useTenant = () => useContext(TenantContext);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<TenantStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('user_token');
      if (!token) return;
      
      // Don't set loading true here to avoid UI flicker on background refresh
      // Only set if we have no data at all maybe?
      // setLoading(true); 
      
      const data = await getTenantStatus();
      setStatus(data);
      await AsyncStorage.setItem('tenant_status_cache', JSON.stringify(data));
    } catch (error) {
      console.log('Failed to fetch tenant status, using cache if available');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const cached = await AsyncStorage.getItem('tenant_status_cache');
      if (cached) {
        setStatus(JSON.parse(cached));
      }
      refreshStatus();
    };

    init();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        refreshStatus();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const isExpired = status?.tenant_status === 'EXPIRED';
  const isTrial = status?.is_trial ?? false;
  const isDemo = status?.tenant_type === 'DEMO';
  const daysRemaining = status?.remaining_trial_days ?? 0;

  return (
    <TenantContext.Provider value={{
      status,
      loading,
      refreshStatus,
      isExpired,
      isTrial,
      isDemo,
      daysRemaining
    }}>
      {children}
    </TenantContext.Provider>
  );
};
