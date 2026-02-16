'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/axios';
import Cookies from 'js-cookie';

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
      const token = Cookies.get('admin_token');
      if (!token) {
        setStatus({
          tenant_type: 'DEMO',
          tenant_status: 'DEMO',
          is_trial: false,
          remaining_trial_days: 0,
          action_required: null,
        });
        return;
      }

      const response = await api.get('/tenant/status');
      const payload = response.data && response.data.data ? response.data.data : response.data;

      if (payload && typeof payload.tenant_type === 'string') {
        setStatus(payload);
      }
    } catch (error) {
      setStatus({
        tenant_type: 'DEMO',
        tenant_status: 'DEMO',
        is_trial: false,
        remaining_trial_days: 0,
        action_required: null,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshStatus();
    
    // Refresh status periodically (e.g. every 5 minutes)
    const interval = setInterval(refreshStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
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
