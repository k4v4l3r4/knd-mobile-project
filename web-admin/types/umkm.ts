export interface UserData {
  id: number;
  name: string;
  phone: string;
  photo_url: string | null;
  role: string;
  rt_id: number;
}

export interface Store {
  id: number;
  name: string;
  status: 'pending' | 'verified' | 'rejected';
  verified_at: string | null;
  user: UserData;
  description: string;
  image_url: string | null;
  category: 'FOOD' | 'GOODS' | 'SERVICE';
  contact: string;
  address: string;
  products?: Product[];
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
  whatsapp: string;
  category: 'FOOD' | 'GOODS' | 'SERVICE';
  created_at: string;
  shopee_url?: string | null;
  tokopedia_url?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  tiktok_url?: string | null;
}
