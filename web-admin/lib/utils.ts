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

export function formatCurrency(amount: number | string) {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const safeAmount = Number.isFinite(numericAmount as number) ? (numericAmount as number) : 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safeAmount);
}

export function getImageUrl(path: string | null | undefined) {
  if (!path) return '';
  
  // Dynamic API Base URL from env, with fallback
  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') || 'https://api.afnet.my.id';
  const API_STORAGE_BASE = `${baseUrl}/storage`;
  
  // Normalization
  const processedPath = path.trim();
  
  // Check for "storage" segment presence to extract relative path
  // Matches: /storage/..., storage/..., http://.../storage/...
  // We use a regex that looks for /storage/ or ^storage/
  const storageMatch = processedPath.match(/(?:^|\/)storage\/(.*)/);
  
  if (storageMatch) {
     // Found explicit storage path, e.g. "stores/1/logo.jpg"
     // storageMatch[1] contains everything after storage/
     const relativePath = storageMatch[1].replace(/^\/+/, ''); 
     return `${API_STORAGE_BASE}/${relativePath}`;
  }
  
  // If no "storage" segment found:
  
  // 1. External URLs (Google, UI Avatars, etc) - preserve them
  // BUT REJECT admin.afnet.my.id or localhost
  if (processedPath.startsWith('http')) {
     if (processedPath.includes('admin.afnet.my.id') || processedPath.includes('localhost')) {
        // It's a full URL but pointing to wrong host, and didn't have /storage/ (checked above)
        // Fallback: append pathname to storage base
        try {
           const url = new URL(processedPath);
           return `${API_STORAGE_BASE}${url.pathname}`;
        } catch (e) {
           return processedPath;
        }
     }
     return processedPath;
  }
  
  // 2. Relative paths without 'storage/' prefix
  // e.g. "stores/logo.jpg"
  return `${API_STORAGE_BASE}/${processedPath.replace(/^\/+/, '')}`;
}
