export interface RevenueSummary {
  total_revenue: number;
  subscription_revenue: number;
  lifetime_revenue: number;
  paid_invoices: number;
  unpaid_invoices: number;
  active_subscriptions: number;
  lifetime_tenants: number;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
}

export interface TenantBilling {
  id: number;
  tenant_name: string;
  rt_rw: string;
  billing_mode: string;
  status: string;
  plan_code: string;
  subscription_type: string;
  ends_at: string | null;
  trial_ends_at: string | null;
}

export interface PaymentSettings {
  subscription_mode: 'CENTRALIZED';
  iuran_warga_mode: 'CENTRALIZED' | 'SPLIT';
  umkm_mode: 'CENTRALIZED' | 'SPLIT';
  umkm_scope: 'GLOBAL' | 'RW';
  
  iuran_warga_config: {
    platform_fee_percent: number;
  };
  
  umkm_config: {
    umkm_share_percent: number;
    platform_fee_percent: number;
    rt_share_percent: number;
    is_rt_share_enabled: boolean;
  };
}
