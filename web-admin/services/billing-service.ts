import api from '@/lib/axios';
import { 
  BillingSummary, 
  Plan, 
  Invoice, 
  HierarchyResponse,
  PaymentInstruction
} from '@/types/billing';

export const BillingService = {
  // Get billing summary (status, subscription, active invoice)
  getSummary: async (): Promise<BillingSummary> => {
    const response = await api.get('/billing/current');
    return response.data;
  },

  // Get available plans
  getPlans: async (): Promise<Plan[]> => {
    // This might be static or from API. Assuming API or static for now.
    // Since backend instructions didn't specify a plans endpoint, we might mock this 
    // or use a convention. For now, let's return static plans as per requirements.
    return [
      {
        id: 'BASIC_RW_MONTHLY',
        name: 'Paket Basic Bulanan',
        price: 150000,
        type: 'MONTHLY',
        description: 'Pembayaran fleksibel setiap bulan',
        features: ['Manajemen Warga', 'Keuangan Transparan', 'Laporan PDF', 'Mobile App Warga']
      },
      {
        id: 'BASIC_RW_YEARLY',
        name: 'Paket Basic Tahunan',
        price: 1500000, // 2 months free
        type: 'YEARLY',
        description: 'Hemat 2 bulan dengan bayar tahunan',
        features: ['Semua Fitur Bulanan', 'Prioritas Support', 'Hemat Rp 300.000']
      },
      {
        id: 'LIFETIME_RW',
        name: 'Paket Lifetime',
        price: 5000000,
        type: 'LIFETIME',
        description: 'Sekali bayar untuk selamanya',
        features: ['Akses Seumur Hidup', 'Bebas Biaya Bulanan', 'Semua Update Masa Depan']
      }
    ];
  },

  // Subscribe to a plan
  subscribe: async (planId: string): Promise<{ invoice_id: number, message: string }> => {
    const response = await api.post('/billing/subscribe', { plan_id: planId });
    return response.data;
  },

  // Get current invoice details
  getCurrentInvoice: async (): Promise<Invoice> => {
    const response = await api.get('/invoices/current');
    return response.data;
  },

  // Download invoice PDF
  downloadInvoice: async (id: number): Promise<Blob> => {
    const response = await api.get(`/invoices/${id}/download`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Initiate payment (get instruction)
  pay: async (invoiceId: number, channel: 'MANUAL' | 'FLIP'): Promise<{ 
    status: string, 
    payment_mode: string, 
    provider: string, 
    instruction: any 
  }> => {
    const response = await api.post('/payments/pay', { 
      invoice_id: invoiceId,
      payment_channel: channel 
    });
    return response.data;
  },

  // Confirm payment (Admin only)
  confirmPayment: async (invoiceId: number): Promise<{ success: true }> => {
    const response = await api.post(`/payments/${invoiceId}/confirm-manual`);
    return response.data;
  },

  // Get Billing Hierarchy (RW Only)
  getHierarchy: async (): Promise<HierarchyResponse> => {
    const response = await api.get('/billing/hierarchy');
    return response.data;
  },

  // Get all invoices (Admin view)
  getAllInvoices: async (params?: any): Promise<any> => {
    const response = await api.get('/invoices', { params });
    return response.data;
  }
};
