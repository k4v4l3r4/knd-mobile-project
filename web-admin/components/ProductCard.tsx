import React from 'react';
import Image from 'next/image';
import { 
  ShoppingBag, 
  Trash2, 
  BadgeCheck,
  Utensils,
  Wrench,
  MessageCircle
} from 'lucide-react';
import { Product } from '@/types/umkm';

interface ProductCardProps {
  product: Product;
  isAdmin?: boolean;
  onDelete?: (id: number, name: string) => void;
  onClick?: (product: Product) => void;
  getImageUrl: (path: string) => string;
  formatRupiah: (price: string | number) => string;
}

export default function ProductCard({ 
  product, 
  isAdmin, 
  onDelete, 
  onClick,
  getImageUrl,
  formatRupiah 
}: ProductCardProps) {
  
  // 1. Placeholder Logic: Colorful Initials Avatar
  const renderImagePlaceholder = () => {
    const initial = product.name ? product.name.charAt(0).toUpperCase() : '?';
    
    // Determine category icon
    let CategoryIcon = ShoppingBag; // Default for GOODS
    if (product.category === 'FOOD') CategoryIcon = Utensils;
    else if (product.category === 'SERVICE') CategoryIcon = Wrench;
    
    return (
      <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/40 dark:to-orange-800/40 flex flex-col items-center justify-center relative group-hover:from-orange-200 group-hover:to-orange-300 dark:group-hover:from-orange-800/40 dark:group-hover:to-orange-700/40 transition-colors duration-500">
        <span className="text-6xl font-black text-orange-400/50 dark:text-orange-500/30 select-none transform -rotate-12 group-hover:scale-110 transition-transform duration-500">
          {initial}
        </span>
        <div className="absolute bottom-4 right-4 p-2.5 bg-white/40 dark:bg-black/20 backdrop-blur-md rounded-2xl border border-white/50 dark:border-white/10 shadow-sm text-orange-600 dark:text-orange-400">
          <CategoryIcon size={20} strokeWidth={2.5} />
        </div>
      </div>
    );
  };

  // 2. Avatar Logic: Fallback to ui-avatars.com
  const avatarUrl = product.user?.photo_url 
    ? getImageUrl(product.user.photo_url)
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(product.user?.name || 'User')}&background=random&color=fff&size=128`;

  // 3. Marketplace Logic
  // TODO: Remove dummy logic after real data is populated
  const isDemoProduct = product.name.toLowerCase().includes('nasi uduk');
  
  const shopeeUrl = product.shopee_url || (isDemoProduct ? 'https://shopee.co.id' : null);
  const tokopediaUrl = product.tokopedia_url || (isDemoProduct ? 'https://tokopedia.com' : null);
  const facebookUrl = product.facebook_url || (isDemoProduct ? 'https://facebook.com' : null);
  const instagramUrl = product.instagram_url || (isDemoProduct ? 'https://instagram.com' : null);
  const tiktokUrl = product.tiktok_url || (isDemoProduct ? 'https://tiktok.com' : null);

  const hasOnlineStore = shopeeUrl || tokopediaUrl || facebookUrl || instagramUrl || tiktokUrl;

  const CATEGORY_LABELS: Record<string, string> = {
    'FOOD': 'Kuliner',
    'GOODS': 'Barang',
    'SERVICE': 'Jasa'
  };

  return (
    <div 
      onClick={() => onClick && onClick(product)}
      className={`bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-300 group flex flex-col h-full ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Image Section */}
      <div className="relative h-48 bg-slate-100 overflow-hidden">
        {product.image_url ? (
          <Image
            src={getImageUrl(product.image_url)}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : renderImagePlaceholder()}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Status Badge (Dummy Logic) - Top Left as requested */}
        <div className="absolute top-4 left-4">
           <span className="px-2.5 py-1 bg-white/95 backdrop-blur-md text-[10px] font-extrabold text-emerald-600 rounded-lg shadow-sm border border-emerald-100 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              BUKA
           </span>
        </div>

        {/* Category Badge - Moved to Top Right */}
        <div className="absolute top-4 right-4">
           <span className="px-3 py-1 bg-white/90 backdrop-blur-md text-xs font-bold text-emerald-700 rounded-full shadow-sm border border-white/50">
              {CATEGORY_LABELS[product.category] || product.category || 'Umum'}
           </span>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-5 flex-1 flex flex-col">
        <div className="mb-1">
          <h3 className="font-bold text-slate-800 line-clamp-1 text-lg group-hover:text-emerald-600 transition-colors">
            {product.name}
          </h3>
        </div>

        {/* Seller Info */}
        <div className="flex items-center gap-2 mb-3">
          <Image 
            src={avatarUrl} 
            alt={product.user?.name || 'Seller'} 
            width={24} 
            height={24} 
            className="rounded-full bg-slate-100 border border-slate-200"
            unoptimized
          />
          <div className="flex items-center gap-1 overflow-hidden">
            <span className="text-xs font-medium text-slate-600 truncate">
              {product.store?.name || product.user?.name || 'Warga RT'}
            </span>
            {product.store?.status === 'verified' && (
              <div className="flex items-center gap-1 bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-100 flex-shrink-0">
                 <BadgeCheck className="w-3 h-3 text-blue-500" fill="currentColor" color="white" />
                 <span className="text-[10px] font-bold text-blue-600 tracking-tight leading-none">Verified RT/RW</span>
              </div>
            )}
          </div>
        </div>
        
        <p className="text-slate-500 text-sm line-clamp-4 mb-4 flex-1 leading-relaxed">
          {product.description || 'Tidak ada deskripsi produk.'}
        </p>

        {/* Marketplace Section (New) */}
        {hasOnlineStore && (
          <div className="flex items-center gap-2 mb-4 pt-2 border-t border-slate-50">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Toko Online:</span>
             
             {/* Shopee (Orange) */}
             {shopeeUrl && (
               <a href={shopeeUrl} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center hover:bg-orange-100 transition-all cursor-pointer hover:scale-110" title="Tersedia di Shopee">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-[#EE4D2D]" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19.125 5.719h-2.906c-0.219-2.031-1.922-3.625-4.031-3.625s-3.812 1.594-4.031 3.625h-2.906c-1.125 0-2.031 0.938-1.906 2.062l1.375 12.375c0.125 1.125 1.094 2.031 2.219 2.031h9.312c1.125 0 2.094-0.906 2.219-2.031l1.375-12.375c0.125-1.125-0.781-2.062-1.906-2.062zM12.188 3.75c1.281 0 2.344 0.969 2.5 2.219h-5c0.156-1.25 1.219-2.219 2.5-2.219zM14.656 13.906c-0.625 0.5-1.531 0.781-2.594 0.781-2.062 0-3.344-1.125-3.344-3.031 0-1.844 1.25-3.031 3.25-3.031 0.906 0 1.625 0.25 2.188 0.656 0.25 0.188 0.312 0.531 0.125 0.781-0.156 0.25-0.531 0.312-0.781 0.125-0.406-0.281-0.906-0.469-1.531-0.469-1.219 0-1.906 0.688-1.906 1.938 0 1.094 0.656 1.938 2.031 1.938 0.594 0 1.094-0.156 1.438-0.406 0.25-0.188 0.594-0.156 0.781 0.094 0.219 0.25 0.156 0.625-0.062 0.812z" />
                  </svg>
               </a>
             )}
             
             {/* Tokopedia (Green) */}
             {tokopediaUrl && (
               <a href={tokopediaUrl} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center hover:bg-emerald-100 transition-all cursor-pointer hover:scale-110" title="Tersedia di Tokopedia">
                  <svg viewBox="0 0 1024 1024" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                    {/* Bag Body - Green */}
                    <path d="M620.4 326.4c-5.6-56.4-51.8-100.3-108-100.3-56.1 0-102.3 43.5-108.7 99.6l29.1 2.3c5.2-40.5 38.6-71.8 79.4-71.8 40.8 0 74.6 31.8 78.9 72.8l29.3-2.6zm94.3-6.5c-32 0-63.9-1.7-95.8 1.1l-29.1 2.6c-25.9 2.3-54.3 8.9-77.6 20.9-24.8-12.9-50.2-19.8-77.9-22l-29.1-2.3c-32-2.6-63.8-.4-95.8-.4h-17.5v418.3h294.4c80.4 0 146.1-67.7 146.1-150.5V319.9h-17.7z" fill="#42B549" />
                    {/* Eyes - White */}
                    <path d="M331.4 496.1c0-48.6 38.3-88.1 85.5-88.1s85.5 39.4 85.5 88.1c0 48.6-38.3 88.1-85.5 88.1-47.3 0-85.5-39.5-85.5-88.1z m276 0c-47.2 0-85.5-39.4-85.5-88.1 0-48.6 38.3-88.1 85.5-88.1s85.5 39.4 85.5 88.1c0 48.6-38.3 88.1-85.5 88.1z" fill="#FFFFFF" />
                    {/* Pupils - Black */}
                    <path d="M427.6 441.4c30.5 0 55.2 25.5 55.2 56.8 0 31.4-24.7 56.9-55.2 56.9-30.5 0-55.2-25.5-55.2-56.9 0-10.5 2.8-20.3 7.6-28.7 3.9 10 13.5 17.1 24.7 17.1 14.7 0 26.6-12.2 26.6-27.4 0-6.8-2.4-13-6.4-17.8h2.7z m168.8 0c30.5 0 55.2 25.5 55.2 56.8 0 31.4-24.7 56.9-55.2 56.9-30.5 0-55.2-25.5-55.2-56.9 0-10.5 2.7-20.3 7.5-28.7 4 10 13.5 17.1 24.7 17.1 14.7 0 26.6-12.2 26.6-27.4 0-6.8-2.4-13-6.4-17.8h2.8z" fill="#000000" />
                    {/* Beak - Orange */}
                    <path d="M512 632.9c-12.7-13.9-25.4-27.7-38.1-41.5 8-14.2 23.1-21.3 38.1-21.2 15 0 30.1 7 38.1 21.2-12.7 13.8-25.4 27.6-38.1 41.5z" fill="#FFC200" />
                  </svg>
               </a>
             )}
             
             {/* Instagram (Purple) */}
             {instagramUrl && (
               <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-purple-50 border border-purple-100 flex items-center justify-center hover:bg-purple-100 transition-all cursor-pointer hover:scale-110" title="Cek Instagram">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-purple-600" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
               </a>
             )}
             
             {/* Facebook (Blue) */}
             {facebookUrl && (
               <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center hover:bg-blue-100 transition-all cursor-pointer hover:scale-110" title="Cek Facebook">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-blue-600" xmlns="http://www.w3.org/2000/svg">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
               </a>
             )}

             {/* TikTok (Black) */}
             {tiktokUrl && (
               <a href={tiktokUrl} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center hover:bg-gray-100 transition-all cursor-pointer hover:scale-110" title="Cek TikTok">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-black" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                  </svg>
               </a>
             )}
          </div>
        )}

        {/* Footer: Price & Actions */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Harga</span>
            <span className="text-lg font-black text-emerald-600 tracking-tight">
              {formatRupiah(product.price)}
            </span>
          </div>
          
          <div className="flex gap-2">
            {isAdmin && onDelete && (
              <button
                onClick={() => onDelete(product.id, product.name)}
                className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                title="Hapus Produk"
              >
                <Trash2 size={18} />
              </button>
            )}
            <a 
              href={`https://wa.me/${product.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2 font-bold text-sm hover:scale-105 active:scale-95"
              title="Hubungi Penjual"
            >
              <MessageCircle size={18} className="fill-white/20" />
              <span>Pesan</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
