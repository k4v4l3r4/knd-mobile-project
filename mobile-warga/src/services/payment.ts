import api, { getStorageUrl } from './api';
import { Platform } from 'react-native';

export interface PaymentConfig {
  bank_name?: string;
  bank_code?: string;
  bank_account_number?: string;
  bank_account_name?: string;
  qris_image_url?: string | null;
  cash_contact_name?: string | null;
  cash_contact_phone?: string | null;
  cash_contact_address?: string | null;
  dana_number?: string | null;
  dana_name?: string | null;
}

export interface PaymentInstruction {
  channel?: string;
  amount_total?: number | string;
  payment_mode?: 'CENTRALIZED' | 'SPLIT';
  meta?: {
    payment_url?: string;
    split_config?: {
      platform_fee_percent?: number;
      rt_share_percent?: number;
      is_rt_share_enabled?: boolean;
    };
  };
}

export interface PaymentResponse {
  success: boolean;
  message: string;
  instruction?: PaymentInstruction;
  data?: any;
}

export const paymentService = {
  /**
   * Get payment configuration (bank accounts, QRIS, etc.)
   */
  async getConfig(): Promise<PaymentConfig> {
    try {
      // Parallel requests for better performance
      const [configResponse, walletsResponse] = await Promise.all([
        api.get('/tenant/payment-config').catch(() => ({ data: {} })), // Fallback to empty object if fails
        api.get('/settings/wallets').catch(() => ({ data: { data: [] } })) // Fallback to empty array
      ]);

      let config = configResponse.data?.data || configResponse.data || {};
      const wallets = walletsResponse.data?.data || walletsResponse.data || [];

      // Find primary wallet (BANK type with QR code preferred, or just BANK)
      const primaryWallet = wallets.find((w: any) => w.type === 'BANK' && w.qr_code_url) 
                         || wallets.find((w: any) => w.type === 'BANK');

      // Find cash wallet
      const cashWallet = wallets.find((w: any) => w.type === 'CASH');

      if (primaryWallet) {
        // Merge wallet data into config
        config = {
          ...config,
          bank_name: primaryWallet.bank_name || config.bank_name,
          bank_code: primaryWallet.bank_name || config.bank_code, // Assuming bank_name is the code/name
          bank_account_number: primaryWallet.account_number || config.bank_account_number,
          bank_account_name: primaryWallet.name || config.bank_account_name,
          qris_image_url: primaryWallet.qr_code_url ? getStorageUrl(primaryWallet.qr_code_url) : config.qris_image_url
        };
      }

      if (cashWallet) {
        config = {
          ...config,
          cash_contact_name: cashWallet.name || config.cash_contact_name,
          cash_contact_phone: cashWallet.account_number || config.cash_contact_phone
        };
      }

      return config;
    } catch (error) {
      console.error('Error fetching payment config:', error);
      throw error;
    }
  },

  /**
   * Submit a payment proof
   */
  async submitPayment(data: {
    amount: string;
    payment_method: string;
    description: string;
    photoUri: string;
    feeIds?: number[];
  }): Promise<PaymentResponse> {
    const formData = new FormData();
    const cleanAmount = data.amount.replace(/[^0-9]/g, '');

    if (!data.feeIds || data.feeIds.length === 0) {
      formData.append('amount', cleanAmount);
    }

    formData.append('payment_method', data.payment_method);
    formData.append('description', data.description);

    if (data.feeIds && data.feeIds.length > 0) {
      data.feeIds.forEach((id) => {
        formData.append('fee_ids[]', String(id));
      });
    }

    const filename = data.photoUri.split('/').pop() || 'proof.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    // @ts-ignore
    formData.append('proof', {
      uri: data.photoUri,
      name: filename,
      type: type,
    });

    const endpoint = (data.feeIds && data.feeIds.length > 0) 
      ? '/warga/pay' 
      : '/transactions/confirm';

    try {
      // Let api.ts handle Content-Type removal
      const response = await api.post(endpoint, formData);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { success: false, message: 'Terjadi kesalahan koneksi' };
    }
  }
};
