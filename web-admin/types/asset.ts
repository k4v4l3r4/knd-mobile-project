export interface Asset {
  id: number;
  rt_id: number;
  name: string;
  description: string;
  total_quantity: number;
  available_quantity: number;
  condition: 'BAIK' | 'RUSAK';
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssetLoan {
  id: number;
  user_id: number;
  asset_id: number;
  quantity: number;
  loan_date: string;
  return_date: string | null;
  status: 'PENDING' | 'APPROVED' | 'RETURNED' | 'REJECTED';
  admin_note: string | null;
  user: {
    id: number;
    name: string;
    phone: string;
  };
  asset: Asset;
  created_at: string;
  updated_at: string;
}
