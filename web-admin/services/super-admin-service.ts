import api from '@/lib/axios';
import { RevenueSummary, MonthlyRevenue, TenantBilling, PaymentSettings } from '@/types/super-admin';
import { Invoice } from '@/types/billing';

export const SuperAdminService = {
  getPaymentSettings: async (): Promise<PaymentSettings> => {
    const response = await api.get('/super-admin/payment-settings');
    return response.data.data;
  },

  updatePaymentSettings: async (settings: PaymentSettings): Promise<PaymentSettings> => {
    const response = await api.post('/super-admin/payment-settings', settings);
    return response.data.data;
  },

  getRevenueSummary: async (): Promise<RevenueSummary> => {
    const response = await api.get('/super-admin/revenue/summary');
    return response.data.data;
  },

  getMonthlyRevenue: async (year?: number): Promise<MonthlyRevenue[]> => {
    const response = await api.get('/super-admin/revenue/monthly', { params: { year } });
    return response.data.data;
  },

  getTenants: async (params?: any): Promise<{ data: TenantBilling[], meta: any }> => {
    const response = await api.get('/super-admin/tenants', { params });
    // Controller returns: { status, data: [], meta: {} }
    return {
      data: response.data.data,
      meta: response.data.meta
    };
  },

  getInvoices: async (params?: any): Promise<{ data: Invoice[], meta: any }> => {
    const response = await api.get('/super-admin/invoices', { params });
    // Controller returns: { status, data: { data: [], current_page, ... } }
    const paginator = response.data.data;
    return {
      data: paginator.data,
      meta: {
        current_page: paginator.current_page,
        last_page: paginator.last_page,
        per_page: paginator.per_page,
        total: paginator.total
      }
    };
  },

  downloadInvoice: async (id: number): Promise<Blob> => {
    const response = await api.get(`/super-admin/invoices/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  }
};
