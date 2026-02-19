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
    try {
      const response = await api.get('/billing/current');
      return response.data;
    } catch (error) {
      const now = new Date().toISOString();
      return {
        tenant_status: 'DEMO',
        billing_mode: 'RT',
        subscription: {
          id: 0,
          plan_name: 'Paket Lifetime Demo',
          type: 'LIFETIME',
          status: 'ACTIVE',
          start_date: now,
          end_date: null,
          remaining_days: null,
        },
        pending_invoice: null,
        can_subscribe: false,
        message: 'Mode Demo: Semua fitur billing aktif tanpa tagihan.',
      };
    }
  },

  // Get available plans
  getPlans: async (): Promise<Plan[]> => {
    const basePlans: Plan[] = [
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

    try {
      const response = await api.get('/billing/plans');
      const remotePlans: { id: string; price: number; discount_percent?: number | null }[] =
        response.data?.data || [];

      const map = new Map(remotePlans.map((p) => [p.id, p]));

      return basePlans.map((plan) => {
        const override = map.get(plan.id);
        if (!override) {
          return plan;
        }

        const price = override.price ?? plan.price;
        const discountPercent =
          typeof override.discount_percent === 'number' ? override.discount_percent : 0;

        let originalPrice: number | null = null;
        if (discountPercent > 0 && discountPercent < 100) {
          originalPrice = Math.round(price / (1 - discountPercent / 100));
        }

        return {
          ...plan,
          price,
          discountPercent: discountPercent || null,
          originalPrice,
        };
      });
    } catch (error) {
      return basePlans;
    }
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
  pay: async (invoiceId: number, channel: 'MANUAL' | 'DANA'): Promise<{ 
    status: string; 
    payment_mode: string; 
    provider: string; 
    instruction: PaymentInstruction; 
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
  getAllInvoices: async (params?: Record<string, string | number | undefined>): Promise<unknown> => {
    const response = await api.get('/invoices', { params });
    return response.data;
  }
};
