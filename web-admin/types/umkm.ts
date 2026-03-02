export interface UserData {
  id: number;
  name: string;
  email?: string;
  phone: string;
  photo_url: string | null;
  role: string;
  rt_id: number;
  rw_id?: number;
  address_summary?: string;
}

export interface Store {
  id: number;
  name: string;
  status: 'pending' | 'verified' | 'rejected';
  verified_at: string | null;
  user: UserData;
  description: string;
  image_url: string | null;
  logo_url?: string | null;
  rt_rw?: string;
  rt_id?: number;
  rw_id?: number;
  city?: string | null;
  category: 'FOOD' | 'FASHION' | 'ELECTRONIC' | 'HOUSEHOLD' | 'SERVICE' | 'BEAUTY' | 'HOBBY' | 'AUTOMOTIVE' | 'GOODS';
  contact: string;
  address: string;
  products?: Product[];
  is_open?: boolean;
  operating_hours?: Record<string, { open: string; close: string; is_closed: boolean }> | null;
  is_open_now?: boolean;
}

export interface VariantOption {
  name: string;
  price: number;
}

export interface ProductVariant {
  id?: number;
  product_id?: number;
  name: string;
  type: 'CHOICE' | 'ADDON';
  price: number;
  is_required: boolean;
  options: VariantOption[];
}

export interface Product {
  id: number;
  user_id: number;
  user: UserData;
  store?: Store;
  name: string;
  description: string;
  price: string | number;
  image_url: string | null;
  images?: string[] | null;
  whatsapp: string;
  category: 'FOOD' | 'FASHION' | 'ELECTRONIC' | 'HOUSEHOLD' | 'SERVICE' | 'BEAUTY' | 'HOBBY' | 'AUTOMOTIVE' | 'GOODS';
  created_at: string;
  shopee_url?: string | null;
  tokopedia_url?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
  discount_price?: string | number | null;
  stock?: number;
  shipping_type?: 'PICKUP' | 'LOCAL' | 'COURIER' | string;
  shipping_fee_flat?: string | number | null;
  variant_note?: string | null;
  specifications?: string | null;
  labels?: string[] | null;
  variants?: ProductVariant[];
  total_sold?: number;
  rating?: number;
  rating_count?: number;
  satisfaction_rate?: number;
  wishlist_count?: number;
  view_count?: number;
}
