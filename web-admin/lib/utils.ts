import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRole(role?: string) {
  if (!role) return 'Administrator';
  
  const map: Record<string, string> = {
    'SUPER_ADMIN': 'Super Admin',
    'ADMIN_RT': 'Admin RT',
    'Admin RT (Super Admin)': 'Super Admin',
    'ADMIN_RW': 'Admin RW',
    'WARGA_TETAP': 'Warga Tetap',
    'WARGA_KOST': 'Warga Kost',
    'JURAGAN_KOST': 'Juragan Kost',
    'SECURITY': 'Security',
  };

  return map[role] || role.replace(/_/g, ' ');
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
