export type TenantStatus = 'DEMO' | 'TRIAL' | 'ACTIVE' | 'EXPIRED';
export type BillingMode = 'RT' | 'RW';
export type SubscriptionType = 'MONTHLY' | 'YEARLY' | 'LIFETIME';
export type InvoiceStatus = 'DRAFT' | 'UNPAID' | 'PAYMENT_RECEIVED' | 'PAID' | 'CANCELED' | 'REFUNDED' | 'FAILED' | 'PENDING';
export type PaymentMode = 'SPLIT' | 'CENTRALIZED';
export type PaymentChannel = 'MANUAL' | 'DANA' | 'XENDIT' | 'MIDTRANS';

export interface Subscription {
  id: number;
  plan_name: string;
  type: SubscriptionType;
  status: string;
  start_date: string; // ISO date
  end_date: string | null; // ISO date, null for lifetime
  remaining_days: number | null;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  status: InvoiceStatus;
  amount: number; // Added to match usage (alias for total_amount often used in frontend)
  total_amount: number;
  invoice_type: string; // Added for Super Admin view (SUBSCRIPTION, LIFETIME, etc.)
  payment_mode: PaymentMode;
  payment_channel: PaymentChannel | null;
  payment_code: string | null;
  payment_instruction: any | null; // JSON structure depends on provider
  created_at: string;
  due_date: string;
  items?: InvoiceItem[];
  tenant?: { // Added for Super Admin view
    id: number;
    name: string;
  };
}

export interface InvoiceItem {
  id: number;
  description: string;
  amount: number;
}

export interface BillingSummary {
  tenant_status: TenantStatus;
  billing_mode: BillingMode;
  subscription: Subscription | null;
  pending_invoice: Invoice | null;
  can_subscribe: boolean;
  message?: string; // For RT under RW billing
}

export interface Plan {
  id: string; // e.g., 'BASIC_RW_MONTHLY'
  name: string;
  price: number;
  type: SubscriptionType;
  description: string;
  features: string[];
}

export interface PaymentInstruction {
  bank_name: string;
  account_number: string;
  account_holder: string;
  amount: number;
  payment_code?: string;
  expires_at?: string;
}

export interface HierarchyItem {
  id: number;
  name: string; // RT Name
  status: TenantStatus;
  billing_source: 'RW_FUNDED' | 'LIFETIME' | 'SELF_FUNDED';
  subscription_end_date: string | null;
}

export interface HierarchyResponse {
  rw_name: string;
  rts: HierarchyItem[];
}
