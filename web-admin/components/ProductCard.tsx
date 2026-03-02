import React from 'react';
import { 
  ShoppingBag, 
  Trash2, 
  BadgeCheck,
  Utensils,
  Wrench,
  MessageCircle,
  Shirt,
  Smartphone,
  Home,
  Sparkles,
  Palette,
  Car,
  Edit
} from 'lucide-react';
import { Product } from '@/types/umkm';
import { formatPhoneNumber } from '@/lib/phoneUtils';

interface ProductCardProps {
  product: Product;
  isAdmin?: boolean;
  onDelete?: (id: number, name: string) => void;
  onEdit?: (product: Product) => void;
  onClick?: (product: Product) => void;
  getImageUrl: (path: string) => string;
  formatRupiah: (price: string | number) => string;
}

export default function ProductCard({ 
  product, 
  isAdmin, 
  onDelete, 
  onEdit,
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
    else if (product.category === 'FASHION') CategoryIcon = Shirt;
    else if (product.category === 'ELECTRONIC') CategoryIcon = Smartphone;
    else if (product.category === 'HOUSEHOLD') CategoryIcon = Home;
    else if (product.category === 'BEAUTY') CategoryIcon = Sparkles;
    else if (product.category === 'HOBBY') CategoryIcon = Palette;
    else if (product.category === 'AUTOMOTIVE') CategoryIcon = Car;
    
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
    'GOODS': 'Barang Lainnya',
    'SERVICE': 'Jasa',
    'FASHION': 'Fashion',
    'ELECTRONIC': 'Elektronik',
    'HOUSEHOLD': 'Rumah Tangga',
    'BEAUTY': 'Kecantikan',
    'HOBBY': 'Hobi',
    'AUTOMOTIVE': 'Otomotif'
  };

  return (
    <div 
      onClick={() => onClick && onClick(product)}
      className={`bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col h-full ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="relative aspect-square bg-slate-50 overflow-hidden">
        {product.image_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={new Date().getTime()}
            src={getImageUrl(product.image_url)}
            alt={product.name}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
          />
        ) : renderImagePlaceholder()}
        
        {/* Floating Status Badge */}
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
          {product.stock === 0 ? (
             <span className="px-2.5 py-1 bg-slate-800/90 backdrop-blur-md text-[10px] font-bold text-white rounded-lg shadow-sm border border-slate-600/50 flex items-center gap-1">
               <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
               HABIS
             </span>
          ) : product.store?.is_open_now ? (
             <span className="px-2.5 py-1 bg-emerald-500/90 backdrop-blur-md text-[10px] font-bold text-white rounded-lg shadow-sm border border-emerald-400/50 flex items-center gap-1">
               <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
               BUKA
             </span>
          ) : (
             <span className="px-2.5 py-1 bg-rose-500/90 backdrop-blur-md text-[10px] font-bold text-white rounded-lg shadow-sm border border-rose-400/50 flex items-center gap-1">
               <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
               TUTUP
             </span>
          )}
        </div>

        {(product.rating && product.rating > 0) ? (
          <div className="absolute top-2 right-2">
             <span className="px-1.5 py-0.5 bg-white/90 backdrop-blur-md text-[10px] font-bold text-slate-700 rounded shadow-sm flex items-center gap-1">
                <span className="text-orange-400">★</span> {product.rating}
             </span>
          </div>
        ) : null}
      </div>

      <div className="p-3 flex-1 flex flex-col">
        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm line-clamp-2 mb-1.5 h-10 leading-5 group-hover:text-emerald-600 transition-colors" title={product.name}>
          {product.name}
        </h3>

        <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mb-1.5 tracking-tight">
          {formatRupiah(product.price)}
        </div>

        <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 mb-3 font-medium">
          <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
            {product.store?.city || '-'}
          </span>
          {/* Only show 'Terjual' if total_sold is valid and > 0 */}
          {product.total_sold && product.total_sold > 0 && (
            <>
              <span className="w-0.5 h-0.5 bg-slate-300 dark:bg-slate-600 rounded-full"></span>
              <span>Terjual {product.total_sold}</span>
            </>
          )}
        </div>

        <div className="mt-auto pt-3 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5 overflow-hidden flex-1 mr-2">
              <div className="flex items-center gap-1 min-w-0">
                {product.store?.status === 'verified' ? (
                  <BadgeCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" fill="currentColor" color="white" />
                ) : (
                  <ShoppingBag className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                )}
                <span className="text-xs text-slate-500 truncate">
                  {product.store?.name || product.user?.name || 'Warga RT'}
                </span>
              </div>
            </div>

            <div className="flex gap-1">
              {isAdmin && onEdit && (
                 <button
                   onClick={(e) => { e.stopPropagation(); onEdit(product); }}
                   className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                   title="Edit"
                 >
                   <Edit size={14} />
                 </button>
              )}
              {isAdmin && onDelete && (
                 <button
                   onClick={(e) => { e.stopPropagation(); onDelete(product.id, product.name); }}
                   className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                   title="Hapus"
                 >
                   <Trash2 size={14} />
                 </button>
              )}
              {!isAdmin && (
                  <a 
                    href={`https://wa.me/${formatPhoneNumber(product.whatsapp)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                    title="Chat Penjual"
                  >
                    <MessageCircle size={16} />
                  </a>
              )}
            </div>
        </div>
      </div>
    </div>
  );

}
