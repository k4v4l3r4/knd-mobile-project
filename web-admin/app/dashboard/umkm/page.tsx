'use client';

import React, { useEffect, useState, useRef } from 'react';
import api from '@/lib/axios';
import { 
  Store as StoreIcon, 
  Trash2, 
  ShoppingBag, 
  Search,
  AlertCircle,
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  BadgeCheck,
  Package,
  Users,
  Tags,
  MessageCircle,
  Plus,
  Minus,
  MapPin,
  Clock,
  Star,
  ThumbsUp,
  Eye,
  Zap,
  FileText,
  Utensils,
  Wrench,
  Shirt,
  Smartphone,
  Home,
  Sparkles,
  Palette,
  Car,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';
import ProductCard from '@/components/ProductCard';
import { Product, Store, UserData } from '@/types/umkm';
import { useTenant } from '@/context/TenantContext';
import { DemoLabel } from '@/components/TenantStatusComponents';
import Cookies from 'js-cookie';
import { getImageUrl, formatCurrency } from '@/lib/utils';
import { formatPhoneNumber } from '@/lib/phoneUtils';
import { ProductGridSkeleton } from '@/components/skeletons/ProductGridSkeleton';

export default function UmkmPage() {
  const { isDemo, isExpired, status } = useTenant();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [myStore, setMyStore] = useState<Store | null>(null);
  const [pendingStores, setPendingStores] = useState<Store[]>([]);
  const [activeTab, setActiveTab] = useState<'products' | 'approvals'>('products');
  
  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<{id: number, name: string} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  
  // Bulk Selection State
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [isSelectAllMode, setIsSelectAllMode] = useState(false);

  // Product Detail State & Logic
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantOptions, setSelectedVariantOptions] = useState<Record<string, {name: string, price: number}[]>>({});
  
  // Category Logic
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('ALL');
  
  // Search Auto-Focus
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus search input when tab switches to products or on initial load
    if (activeTab === 'products') {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

  const CATEGORY_STRUCTURE: Record<string, { label: string, icon: React.ElementType, subs: string[] }> = {
    'FOOD': {
      label: 'Kuliner',
      icon: Utensils,
      subs: []
    },
    'FASHION': {
      label: 'Fashion',
      icon: Shirt,
      subs: []
    },
    'ELECTRONIC': {
      label: 'Elektronik',
      icon: Smartphone,
      subs: []
    },
    'HOUSEHOLD': {
      label: 'Rumah Tangga',
      icon: Home,
      subs: []
    },
    'SERVICE': {
      label: 'Jasa',
      icon: Wrench,
      subs: []
    },
    'BEAUTY': {
      label: 'Kecantikan',
      icon: Sparkles,
      subs: []
    },
    'HOBBY': {
      label: 'Hobi',
      icon: Palette,
      subs: []
    },
    'AUTOMOTIVE': {
      label: 'Otomotif',
      icon: Car,
      subs: []
    },
    'GOODS': {
      label: 'Barang Lainnya',
      icon: ShoppingBag,
      subs: []
    }
  };
  useEffect(() => {
    if (selectedProduct) {
      setQuantity(1);
      setActiveImageIndex(0);
      setSelectedVariantOptions({});
      // Pre-select required single choice variants (optional enhancement)
      if (selectedProduct.variants) {
         const initialSelections: Record<string, {name: string, price: number}[]> = {};
         selectedProduct.variants.forEach(v => {
            if (v.type === 'CHOICE' && v.is_required && v.options.length > 0) {
               initialSelections[v.name] = [v.options[0]];
            }
         });
         setSelectedVariantOptions(initialSelections);
      }
    }
  }, [selectedProduct]);

  // Reset subcategory when group changes
  useEffect(() => {
    setSelectedSubCategory('ALL');
  }, [selectedGroup]);

  const handleOptionSelect = (variantName: string, type: 'CHOICE' | 'ADDON', option: {name: string, price: number}) => {
    setSelectedVariantOptions(prev => {
      const currentSelections = prev[variantName] || [];
      
      if (type === 'CHOICE') {
        // Replace selection
        return { ...prev, [variantName]: [option] };
      } else {
        // Toggle selection for ADDON
        const exists = currentSelections.find(o => o.name === option.name);
        if (exists) {
           return { ...prev, [variantName]: currentSelections.filter(o => o.name !== option.name) };
        } else {
           return { ...prev, [variantName]: [...currentSelections, option] };
        }
      }
    });
  };

  const calculateTotal = (basePrice: number) => {
    let total = basePrice;
    Object.values(selectedVariantOptions).forEach(options => {
       options.forEach(opt => {
          total += (opt.price || 0);
       });
    });
    return total * quantity;
  };

  useEffect(() => {
    if (!status) return;
    fetchCurrentUser();
    fetchProducts();
  }, [status]);

  useEffect(() => {
    if (currentUser) {
      fetchMyStore();
      if (['ADMIN_RT', 'SUPER_ADMIN', 'admin', 'rt'].includes(currentUser.role)) {
        fetchPendingStores();
      }
    }
  }, [currentUser]);

  const fetchCurrentUser = async () => {
    try {
      const adminToken = Cookies.get('admin_token');
      if (isDemo || !adminToken) {
        const demoUser: UserData = {
          id: 1,
          name: 'Budi Santoso',
          email: 'budi.santoso@example.com',
          phone: '6281234567801',
          role: 'ADMIN_RT',
          photo_url: null,
          rt_id: 1
        };
        setCurrentUser(demoUser);
        return;
      }
      const response = await api.get('/me');
      setCurrentUser(response.data.data);
    } catch (error) {
      if (!isDemo) {
        console.error('Error fetching user:', error);
      }
    }
  };

  const fetchMyStore = async () => {
    try {
      if (isDemo) {
        const demoStore: Store = {
          id: 1,
          name: 'Warung Sembako RT 001',
          status: 'verified',
          verified_at: new Date().toISOString(),
          user: {
            id: 1,
            name: 'Budi Santoso',
            email: 'budi.santoso@example.com',
            phone: '6281234567801',
            role: 'ADMIN_RT',
            photo_url: null,
            rt_id: 1
          },
          description: 'Warung kebutuhan sehari-hari warga RT 001.',
          image_url: null,
          category: 'FOOD',
          contact: '6281234567801',
          address: 'Jl. Melati No. 10, RT 001',
          products: []
        };
        setMyStore(demoStore);
        return;
      }
      const response = await api.get('/stores/my');
      setMyStore(response.data.data);
    } catch (error) {
      if (!isDemo) {
        console.error('Error fetching my store:', error);
      }
    }
  };

  const fetchPendingStores = async () => {
    try {
      if (isDemo) {
        const demoPending: Store[] = [
          {
            id: 2,
            name: 'Katering Bu Siti',
            status: 'pending',
            verified_at: null,
            user: {
              id: 2,
              name: 'Siti Aminah',
              email: 'siti.aminah@example.com',
              phone: '6281234567802',
              role: 'WARGA',
              photo_url: null,
              rt_id: 1
            },
            description: 'Katering rumahan untuk acara keluarga dan kantor.',
            image_url: null,
            category: 'FOOD',
            contact: '6281234567802',
            address: 'Jl. Mawar No. 5, RT 001',
            products: []
          }
        ];
        setPendingStores(demoPending);
        return;
      }
      const response = await api.get('/admin/stores?status=pending');
      setPendingStores(response.data.data);
    } catch (error) {
      if (!isDemo) {
        console.error('Error fetching pending stores:', error);
      }
    }
  };

  const verifyStore = async (storeId: number, status: 'verified' | 'rejected') => {
    const toastId = toast.loading('Memproses...');
    try {
      await api.post(`/admin/stores/${storeId}/verify`, { status });
      toast.success(status === 'verified' ? 'Toko berhasil disetujui' : 'Toko ditolak', { id: toastId });
      setPendingStores(prev => prev.filter(s => s.id !== storeId));
      fetchProducts(); // Refresh products to show verified ones if any (though pending stores usually don't have public products yet)
    } catch (error) {
      console.error('Error verifying store:', error);
      toast.error('Gagal memproses toko', { id: toastId });
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const adminToken = Cookies.get('admin_token');
      if (isDemo || !adminToken) {
        const demoProducts: Product[] = [
          {
            id: 1,
            user_id: 1,
            name: 'Nasi Kotak Komplit',
            description: 'Nasi kotak dengan lauk ayam goreng, sayur, sambal, dan buah.',
            price: '25000',
            category: 'FOOD',
            image_url: null,
            whatsapp: '6281234567801',
            created_at: new Date().toISOString(),
            store: {
              id: 1,
              name: 'Warung Sembako RT 001',
              status: 'verified',
              verified_at: new Date().toISOString(),
              user: {
                id: 1,
                name: 'Budi Santoso',
                email: 'budi.santoso@example.com',
                phone: '6281234567801',
                role: 'ADMIN_RT',
                photo_url: null,
                rt_id: 1
              },
              description: 'Warung kebutuhan sehari-hari warga RT 001.',
              image_url: null,
              category: 'FOOD',
              contact: '6281234567801',
              address: 'Jl. Melati No. 10, RT 001',
              products: []
            },
            user: {
              id: 1,
              name: 'Budi Santoso',
              email: 'budi.santoso@example.com',
              phone: '6281234567801',
              role: 'ADMIN_RT',
              photo_url: null,
              rt_id: 1
            }
          },
          {
            id: 2,
            user_id: 2,
            name: 'Jasa Cuci Motor',
            description: 'Cuci motor higienis dan cepat, bisa dipanggil ke rumah.',
            price: '15000',
            category: 'SERVICE',
            image_url: null,
            whatsapp: '6281234567802',
            created_at: new Date().toISOString(),
            store: {
              id: 2,
              name: 'Cuci Motor Pak Andi',
              status: 'verified',
              verified_at: new Date().toISOString(),
              user: {
                id: 2,
                name: 'Andi Wijaya',
                email: 'andi.wijaya@example.com',
                phone: '6281234567802',
                role: 'WARGA',
                photo_url: null,
                rt_id: 1
              },
              description: 'Layanan cuci motor panggilan di lingkungan RT.',
              image_url: null,
              category: 'SERVICE',
              contact: '6281234567802',
              address: 'Jl. Kenanga No. 3, RT 001',
              products: []
            },
            user: {
              id: 2,
              name: 'Andi Wijaya',
              email: 'andi.wijaya@example.com',
              phone: '6281234567802',
              role: 'WARGA',
              photo_url: null,
              rt_id: 1
            }
          }
        ];
        setProducts(demoProducts);
        return;
      }
      const response = await api.get('/products');
      if (response.data.data) {
        setProducts(response.data.data);
      }
    } catch (error) {
      if (!isDemo) {
        console.error('Error fetching products:', error);
        toast.error('Gagal mengambil data produk');
      }
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (id: number, name: string) => {
    setProductToDelete({ id, name });
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!productToDelete) return;

    if (isDemo) {
      toast.error('Mode Demo: Tidak dapat menghapus produk');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }
    
    setIsDeleting(true);
    try {
      await api.delete(`/products/${productToDelete.id}`);
      setProducts(prev => prev.filter(p => p.id !== productToDelete.id));
      toast.success('Produk berhasil dihapus');
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Gagal menghapus produk');
    } finally {
      setIsDeleting(false);
      setProductToDelete(null);
    }
  };

  // Bulk Selection Handlers
  const handleToggleSelectProduct = (productId: number) => {
    setSelectedProductIds(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    if (selectedProductIds.length === filteredProducts.length) {
      // Deselect all
      setSelectedProductIds([]);
    } else {
      // Select all visible products
      setSelectedProductIds(filteredProducts.map(p => p.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProductIds.length === 0) {
      toast.error('Pilih produk yang akan dihapus');
      return;
    }

    if (isDemo) {
      toast.error('Mode Demo: Tidak dapat menghapus produk');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }

    if (!window.confirm(`Apakah Anda yakin ingin menghapus ${selectedProductIds.length} produk yang dipilih?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await Promise.all(
        selectedProductIds.map(id => api.delete(`/products/${id}`))
      );
      setProducts(prev => prev.filter(p => !selectedProductIds.includes(p.id)));
      toast.success(`${selectedProductIds.length} produk berhasil dihapus`);
      setSelectedProductIds([]);
    } catch (error) {
      console.error('Error bulk deleting products:', error);
      toast.error('Gagal menghapus produk');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatRupiah = (price: string | number) => {
    return formatCurrency(Number(price));
  };

  // Helper for image URL replaced by imported getImageUrl
  
  // Filter products
  const filteredProducts = products.filter(product => {
    const query = searchQuery.trim().toLowerCase();

    const matchesSearch =
      query === '' ||
      [
        product.name,
        product.description,
        product.user?.name,
        product.user?.phone,
        product.store?.name,
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(query));
    
    let matchesCategory = true;
    
    if (selectedGroup === 'ALL') {
       matchesCategory = true;
    } else if (selectedGroup === 'TERVERIFIKASI') {
       matchesCategory = product.store?.status === 'verified';
    } else {
       // Check if product category is in the group
       const groupConfig = CATEGORY_STRUCTURE[selectedGroup];
       if (groupConfig) {
         if (selectedSubCategory !== 'ALL') {
            matchesCategory = product.category === selectedSubCategory;
         } else {
            // Direct match since product.category corresponds to the group keys (FOOD, GOODS, SERVICE)
            matchesCategory = product.category === selectedGroup; 
         }
       } else {
         // Fallback for groups not in structure (if any)
         matchesCategory = false;
       }
    }
    
    return matchesSearch && matchesCategory;
  });

  // Get unique categories for fallback/debug if needed
  const rawCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
  // const categories = ['ALL', 'TERVERIFIKASI', ...rawCategories]; // Deprecated in favor of new structure

  const handleBuy = () => {
    if (!selectedProduct) return;
    
    if (!selectedProduct.whatsapp) {
      toast.error('Penjual belum menyantumkan nomor WhatsApp');
      return;
    }

    const total = calculateTotal(Number(selectedProduct.price));
    
    let variantText = '';
    const variantEntries = Object.entries(selectedVariantOptions);
    if (variantEntries.length > 0) {
       variantText = '\n✨ Varian:\n' + variantEntries.map(([name, options]) => {
          return `- ${name}: ${options.map(o => o.name).join(', ')}`;
       }).join('\n');
    }
    
    const message = `Halo, saya mau pesan via RT Online SuperApp:%0A%0A` +
      `🛍️ *${selectedProduct.name}*%0A` +
      `📦 Jumlah: ${quantity}%0A` +
      `${encodeURIComponent(variantText)}%0A%0A` +
      `💰 Total: *${formatRupiah(total)}*%0A%0A` +
      `Mohon diproses ya, terima kasih!%0A%0A` +
      `Catatan: Pembayaran akan mengikuti mode yang diatur RT (CENTRALIZED atau SPLIT) dan dapat diproses melalui gateway sesuai kebijakan RT.`;

    const waUrl = `https://wa.me/${formatPhoneNumber(selectedProduct.whatsapp)}?text=${message}`;
    window.open(waUrl, '_blank');
  };

  const isAdmin = currentUser && ['ADMIN_RT', 'SUPER_ADMIN', 'admin', 'rt'].includes(currentUser.role);

  return (
    <div className="space-y-8 pb-10">
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] border border-emerald-100 dark:border-slate-800 shadow-sm relative overflow-hidden group transition-colors duration-300">
         <div className="absolute right-0 top-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <StoreIcon size={120} className="text-emerald-600 dark:text-emerald-500" />
         </div>
         <div className="relative z-10">
           <div className="flex items-center gap-3 mb-2">
             <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
               <StoreIcon size={24} />
             </div>
             <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">UMKM Warga</h1>
             <DemoLabel />
           </div>
           <p className="text-slate-500 dark:text-slate-400 font-medium max-w-lg">
             Kelola produk UMKM yang dijual oleh warga. Monitor aktivitas jual beli dan kategori produk.
           </p>
           <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 max-w-xl">
             Catatan: Scope UMKM dapat diatur oleh Super Admin menjadi global lintas RW atau hanya RW tertentu. Pengaturan ini mempengaruhi produk yang tampil di marketplace.
           </p>
         </div>
      </div>

      {/* Warning Banner for Pending Store */}
      {myStore && myStore.status === 'pending' && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-6 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-500 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-orange-800 dark:text-orange-400">Toko Anda sedang direview</h3>
            <p className="text-orange-700 dark:text-orange-300 mt-1">
              Toko Anda sedang direview oleh Admin RT. Anda belum bisa berjualan atau menambah produk baru sampai toko disetujui.
            </p>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-5 hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-300 group">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl group-hover:scale-110 transition-transform">
            <Package className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total Produk</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{products.length}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-5 hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-300 group">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl group-hover:scale-110 transition-transform">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total Penjual</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">
              {new Set(products.map(p => p.user_id)).size}
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-5 hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-300 group">
          <div className="p-4 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-2xl group-hover:scale-110 transition-transform">
            <Tags className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Kategori</p>
            <p className="text-3xl font-bold text-slate-800 dark:text-white">{rawCategories.length}</p>
          </div>
        </div>
      </div>

      {/* Admin Tabs */}
      {isAdmin && (
        <div className="flex gap-4 border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTab('products')}
            className={`pb-4 px-2 font-semibold transition-all whitespace-nowrap ${
              activeTab === 'products'
                ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Daftar Produk
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={`pb-4 px-2 font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'approvals'
                ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Approval Penjual Baru
            {pendingStores.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {pendingStores.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Content based on Tab */}
      {activeTab === 'products' ? (
        <>
          {/* Filters & Search */}
          <div className="flex flex-col gap-6">
            <div className="sticky top-0 z-30 py-3 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md shadow-sm border-b border-gray-100 dark:border-gray-800 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="relative flex-1 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 group-focus-within:text-emerald-500 dark:group-focus-within:text-emerald-400 transition-colors" size={20} />
                  <input
                    ref={searchInputRef}
                    autoFocus
                    type="text"
                    placeholder="Cari produk atau penjual..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:border-emerald-500 outline-none transition-all shadow-sm text-slate-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-600"
                  />
                </div>
                
                {/* Select All Toggle Button */}
                {filteredProducts.length > 0 && (
                  <button
                    onClick={handleSelectAll}
                    className={`px-4 py-3 rounded-xl font-semibold whitespace-nowrap transition-all border flex items-center gap-2 ${
                      selectedProductIds.length === filteredProducts.length
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-300 hover:text-emerald-600'
                    }`}
                    title={selectedProductIds.length === filteredProducts.length ? 'Batal pilih semua' : 'Pilih semua produk'}
                  >
                    {selectedProductIds.length === filteredProducts.length ? (
                      <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Terpilih
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Pilih Semua
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
            
            {/* Unified Category Chips (Scrollable on Mobile) */}
            <div className="flex flex-col gap-4 w-full">
              
              {/* Level 1: Main Groups */}
              <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                <button
                  onClick={() => setSelectedGroup('ALL')}
                  className={`px-5 py-3 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all border flex-shrink-0 ${
                    selectedGroup === 'ALL'
                      ? 'bg-slate-800 text-white border-slate-800 shadow-lg shadow-slate-800/20 dark:bg-white dark:text-slate-900'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  Semua
                </button>
                
                {Object.entries(CATEGORY_STRUCTURE).map(([key, config]) => {
                  const Icon = config.icon;
                  const isActive = selectedGroup === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedGroup(key)}
                      className={`px-5 py-3 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all border flex-shrink-0 flex items-center gap-2 ${
                        isActive
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10'
                      }`}
                    >
                      <Icon size={18} />
                      {config.label}
                    </button>
                  );
                })}

                <button
                  onClick={() => setSelectedGroup('TERVERIFIKASI')}
                  className={`px-5 py-3 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all border flex-shrink-0 flex items-center gap-2 ${
                    selectedGroup === 'TERVERIFIKASI'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10'
                  }`}
                >
                  <BadgeCheck size={18} />
                  Verified RT/RW
                </button>
              </div>

              {/* Level 2: Subcategories (Only shown when a group is active) */}
              {CATEGORY_STRUCTURE[selectedGroup] && (
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 animate-in slide-in-from-top-2 duration-300">
                  <button
                    onClick={() => setSelectedSubCategory('ALL')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex-shrink-0 ${
                      selectedSubCategory === 'ALL'
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800'
                        : 'bg-transparent text-slate-500 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Semua {CATEGORY_STRUCTURE[selectedGroup].label}
                  </button>
                  {CATEGORY_STRUCTURE[selectedGroup].subs.map((sub) => (
                    <button
                      key={sub}
                      onClick={() => setSelectedSubCategory(sub)}
                      className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all border flex-shrink-0 ${
                        selectedSubCategory === sub
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-300 hover:text-emerald-600'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Product Grid */}
          {/* Bulk Action Toolbar */}
          {selectedProductIds.length > 0 && (
            <div className="sticky top-4 z-30 bg-emerald-600 dark:bg-emerald-700 text-white rounded-2xl p-4 shadow-xl shadow-emerald-600/20 mb-6 animate-in fade-in slide-in-from-top-4 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <Trash2 size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-lg">{selectedProductIds.length} produk dipilih</p>
                    <p className="text-xs text-emerald-100 opacity-90">Siap untuk dihapus</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedProductIds([])}
                    className="px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl font-semibold transition-all text-sm"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={isDeleting}
                    className="px-6 py-2.5 bg-white text-emerald-600 hover:bg-emerald-50 rounded-xl font-bold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        Menghapus...
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} />
                        Hapus Terpilih
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Product Grid */}
          {loading ? (
            <ProductGridSkeleton count={10} />
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-300">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300 dark:text-slate-600">
                 <ShoppingBag className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Tidak ada produk ditemukan</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-2">
                {searchQuery ? 'Coba kata kunci pencarian lain.' : 'Belum ada warga yang menambahkan produk.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {filteredProducts.map((product) => (
                <ProductCard 
                  key={product.id}
                  product={product}
                  isAdmin={isAdmin || false}
                  onDelete={confirmDelete}
                  onClick={setSelectedProduct}
                  getImageUrl={getImageUrl}
                  formatRupiah={formatRupiah}
                  isSelected={selectedProductIds.includes(product.id)}
                  onToggleSelect={handleToggleSelectProduct}
                  showCheckbox={true}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        /* --- APPROVALS TAB --- */
        <div className="space-y-6">
           {pendingStores.length === 0 ? (
             <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800">
               <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300 dark:text-slate-600">
                  <CheckCircle2 className="w-10 h-10" />
               </div>
               <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Semua Beres!</h3>
               <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-2">
                 Tidak ada toko baru yang perlu persetujuan saat ini.
               </p>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pendingStores.map((store) => (
                  <div key={store.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-4">
                     <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4">
                           <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center overflow-hidden">
                              {(store.logo_url || store.image_url) ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img 
                                  key={new Date().getTime()}
                                  src={getImageUrl(store.image_url)} 
                                  alt={store.name} 
                                  className="object-cover w-full h-full"
                                />
                              ) : (
                                <StoreIcon className="text-slate-400 dark:text-slate-500" />
                              )}
                           </div>
                           <div>
                              <h3 className="font-bold text-lg text-slate-800 dark:text-white">{store.name}</h3>
                              <p className="text-slate-500 dark:text-slate-400 text-sm">Oleh: {store.user?.name}</p>
                              <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Diajukan: {new Date().toLocaleDateString('id-ID')}</p> 
                           </div>
                        </div>
                        <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-bold rounded-full">
                           PENDING
                        </span>
                     </div>
                     
                     <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl space-y-3">
                        {/* Store Details */}
                        <div className="grid grid-cols-2 gap-2 text-sm">
                           <div>
                              <p className="text-slate-400 dark:text-slate-500 text-xs">Kategori</p>
                              <p className="text-slate-700 dark:text-slate-300 font-medium">
                                {CATEGORY_STRUCTURE[store.category]?.label || store.category || '-'}
                              </p>
                           </div>
                           <div>
                              <p className="text-slate-400 dark:text-slate-500 text-xs">Kontak</p>
                              <p className="text-slate-700 dark:text-slate-300 font-medium">{store.contact || '-'}</p>
                           </div>
                           <div className="col-span-2">
                              <p className="text-slate-400 dark:text-slate-500 text-xs">Alamat</p>
                              <p className="text-slate-700 dark:text-slate-300 font-medium">{store.address || '-'}</p>
                           </div>
                        </div>

                        <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                           <p className="text-slate-400 dark:text-slate-500 text-xs mb-1">Deskripsi</p>
                           <p className="text-sm text-slate-600 dark:text-slate-300 italic">&quot;{store.description || 'Tidak ada deskripsi'}&quot;</p>
                        </div>
                     </div>

                     {/* Preview Products */}
                     {store.products && store.products.length > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
                           <p className="text-slate-400 dark:text-slate-500 text-xs mb-3 font-semibold uppercase tracking-wider">Produk ({store.products.length})</p>
                           <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                              {store.products.slice(0, 5).map(product => (
                                 <div key={product.id} className="flex-shrink-0 w-24 group/prod cursor-pointer">
                                    <div className="w-24 h-24 bg-white dark:bg-slate-700 rounded-xl overflow-hidden mb-2 relative border border-slate-200 dark:border-slate-600 shadow-sm">
                                       {product.image_url ? (
                                          <Image 
                                             src={getImageUrl(product.image_url)} 
                                             alt={product.name}
                                             fill
                                             className="object-cover group-hover/prod:scale-110 transition-transform duration-300"
                                          />
                                       ) : (
                                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                                             <ShoppingBag size={24} />
                                          </div>
                                       )}
                                    </div>
                                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{product.name}</p>
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">{formatRupiah(product.price)}</p>
                                 </div>
                              ))}
                           </div>
                        </div>
                     )}

                     <div className="flex gap-3 mt-2">
                        <button
                           onClick={() => verifyStore(store.id, 'rejected')}
                           className="flex-1 py-3 px-4 rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2"
                        >
                           <XCircle size={18} />
                           Tolak
                        </button>
                        <button
                           onClick={() => verifyStore(store.id, 'verified')}
                           className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                        >
                           <CheckCircle2 size={18} />
                           Setujui Toko
                        </button>
                     </div>
                  </div>
                ))}
             </div>
           )}
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 border border-transparent dark:border-slate-800">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-center text-slate-800 dark:text-white mb-2">Hapus Produk?</h3>
            <p className="text-center text-slate-500 dark:text-slate-400 mb-8">
              Apakah Anda yakin ingin menghapus produk <span className="font-semibold text-slate-800 dark:text-slate-200">&quot;{productToDelete?.name}&quot;</span>? 
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-3.5 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                disabled={isDeleting}
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-3.5 px-4 rounded-2xl bg-red-500 text-white font-semibold hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2"
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="animate-spin" /> : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setSelectedProduct(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-[24px] w-full max-w-5xl h-[85vh] md:h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col md:flex-row relative ring-1 ring-slate-900/5" onClick={e => e.stopPropagation()}>
            
            {/* Close Button */}
            <button 
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 z-30 p-2 bg-white/80 dark:bg-black/50 backdrop-blur-md text-slate-500 dark:text-slate-300 rounded-full hover:bg-white dark:hover:bg-black/70 transition-all shadow-sm hover:rotate-90 duration-300"
            >
              <X size={24} />
            </button>

            {/* Left: Image Section */}
            <div className="w-full md:w-[45%] bg-slate-100 dark:bg-slate-800 relative h-[300px] md:h-auto flex flex-col flex-shrink-0 group/slider">
              <div className="relative w-full h-full">
                {(() => {
                  const productImages = (selectedProduct.images && selectedProduct.images.length > 0) 
                    ? selectedProduct.images 
                    : (selectedProduct.image_url ? [selectedProduct.image_url] : []);
                  
                  if (productImages.length > 0) {
                    return (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          key={`${selectedProduct.id}-${activeImageIndex}-${new Date().getTime()}`}
                          src={getImageUrl(productImages[activeImageIndex])}
                          alt={`${selectedProduct.name} - Image ${activeImageIndex + 1}`}
                          className="object-cover w-full h-full transition-opacity duration-300"
                        />
                        
                        {/* Navigation Arrows (only if multiple images) */}
                        {productImages.length > 1 && (
                          <>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveImageIndex(prev => (prev === 0 ? productImages.length - 1 : prev - 1));
                              }}
                              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 dark:bg-black/50 text-slate-800 dark:text-white hover:bg-white dark:hover:bg-black/70 backdrop-blur-sm shadow-sm opacity-0 group-hover/slider:opacity-100 transition-opacity z-20"
                            >
                              <ChevronLeft size={24} />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveImageIndex(prev => (prev === productImages.length - 1 ? 0 : prev + 1));
                              }}
                              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 dark:bg-black/50 text-slate-800 dark:text-white hover:bg-white dark:hover:bg-black/70 backdrop-blur-sm shadow-sm opacity-0 group-hover/slider:opacity-100 transition-opacity z-20"
                            >
                              <ChevronRight size={24} />
                            </button>
                            
                            {/* Dots Indicator */}
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 p-2 bg-black/20 backdrop-blur-md rounded-full z-20">
                              {productImages.map((_, idx) => (
                                <button
                                  key={idx}
                                  onClick={(e) => { e.stopPropagation(); setActiveImageIndex(idx); }}
                                  className={`w-2 h-2 rounded-full transition-all ${idx === activeImageIndex ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/80'}`}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    );
                  } else {
                    return (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-[#FDF6E3] dark:bg-slate-800 relative overflow-hidden">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-orange-300/20 dark:bg-orange-900/20 rounded-full blur-3xl"></div>
                        <div className="relative z-10 bg-white/40 dark:bg-slate-700/40 backdrop-blur-sm p-8 rounded-[2rem] shadow-[inset_-4px_-4px_8px_rgba(0,0,0,0.05),inset_4px_4px_8px_rgba(255,255,255,0.8)] dark:shadow-none flex flex-col items-center">
                            <ShoppingBag size={64} className="text-orange-400 dark:text-orange-300 mb-3" strokeWidth={1.5} />
                            <p className="text-sm font-bold text-orange-800/70 dark:text-orange-200/70">Foto Belum Tersedia</p>
                        </div>
                      </div>
                    );
                  }
                })()}
                
                {/* Real-time Status Badges */}
                <div className="absolute top-5 left-5 flex flex-col gap-2 z-10">
                   {selectedProduct.store?.is_open_now ? (
                     <div className="bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 animate-pulse ring-2 ring-white/20">
                        <span className="w-2 h-2 bg-white rounded-full shadow-[0_0_4px_rgba(255,255,255,0.8)]" />
                        BUKA
                     </div>
                   ) : (
                     <div className="bg-rose-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg shadow-rose-500/20 flex items-center gap-1.5 ring-2 ring-white/20">
                        <span className="w-2 h-2 bg-white rounded-full opacity-50" />
                        TUTUP
                     </div>
                   )}
                   {selectedProduct.store?.status === 'verified' && (
                     <div className="bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg shadow-blue-500/20 flex items-center gap-1.5 ring-2 ring-white/20">
                        <BadgeCheck size={14} />
                        Verified RT/RW
                     </div>
                   )}
                </div>
              </div>
            </div>

            {/* Right: Content Section */}
            <div className="w-full md:w-[55%] flex flex-col h-full min-h-0 bg-[#FFFBF2] dark:bg-slate-900">
              
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-6 md:p-8">
                  
                  {/* Statistics Row (Clickable) */}
                  {(() => {
                    const rating = selectedProduct.rating || 0;
                    const reviewCount = selectedProduct.rating_count || 0;
                    const satisfaction = selectedProduct.satisfaction_rate || 0;
                    const viewing = selectedProduct.view_count || 0;

                    return (
                      <>
                        <div className="flex items-center flex-wrap gap-2 text-sm mb-4">
                          {/* Rating Button */}
                          {(rating > 0 || reviewCount > 0) ? (
                            <button className="flex items-center gap-1.5 text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1.5 rounded-xl border border-yellow-200 dark:border-yellow-800/50 font-bold hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition-all active:scale-95">
                               <Star size={14} fill="currentColor" />
                               {rating > 0 ? rating : 'Baru'}
                               <span className="text-yellow-600/70 dark:text-yellow-400/70 font-medium ml-0.5 text-xs">
                                 ({reviewCount > 0 ? `${reviewCount} Ulasan` : 'Belum ada ulasan'})
                               </span>
                            </button>
                          ) : null}

                          {selectedProduct.total_sold && selectedProduct.total_sold > 0 && (
                            <button className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-sm">
                               <ShoppingBag size={14} />
                               Terjual {selectedProduct.total_sold}
                            </button>
                          )}

                          {satisfaction > 0 && (
                            <button className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/50 font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all active:scale-95">
                               <ThumbsUp size={14} />
                               {satisfaction}% Sesuai
                            </button>
                          )}
                        </div>

                        {/* Product Title */}
                        <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white leading-tight mb-2 tracking-tight">
                          {selectedProduct.name}
                        </h2>

                        {/* Price */}
                        <div className="text-3xl font-extrabold text-slate-900 dark:text-white mb-8 tracking-tight flex items-baseline gap-1">
                           {(selectedProduct.discount_price && Number(selectedProduct.discount_price) > 0 && Number(selectedProduct.discount_price) < Number(selectedProduct.price)) ? (
                             <>
                               {formatRupiah(selectedProduct.discount_price)}
                               <span className="text-sm font-medium text-slate-400 dark:text-slate-500 line-through decoration-slate-400/50 decoration-2">
                                 {formatRupiah(selectedProduct.price)}
                               </span>
                             </>
                           ) : (
                             formatRupiah(selectedProduct.price)
                           )}
                        </div>

                        {/* Store Identity Card */}
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-[20px] border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4 mb-8 group hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors cursor-pointer">
                           <div className="w-14 h-14 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden relative border-2 border-white dark:border-slate-600 shadow-md group-hover:scale-105 transition-transform">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img 
                                key={new Date().getTime()}
                                src={getImageUrl(selectedProduct.store?.image_url || selectedProduct.store?.user?.photo_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedProduct.store?.name || 'Store')}`}
                                alt={selectedProduct.store?.name || selectedProduct.user?.name}
                                className="object-cover w-full h-full"
                              />
                              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></div>
                           </div>
                           <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                 <h3 className="font-bold text-slate-800 dark:text-white truncate text-base group-hover:text-emerald-600 transition-colors">
                                   {selectedProduct.store?.name || selectedProduct.user?.name}
                                 </h3>
                                 <BadgeCheck size={18} className="text-blue-500 fill-blue-50" />
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                <span className="truncate max-w-[240px] font-semibold">
                                  {selectedProduct.store?.city || '-'}
                                </span>
                              </div>
                           </div>
                        </div>

                        {/* Description */}
                        <div className="mb-8">
                           <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 uppercase tracking-wider flex items-center gap-2">
                             <FileText size={16} className="text-slate-400" />
                             Deskripsi
                           </h3>
                           <div className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                              {selectedProduct.description || 'Tidak ada deskripsi produk ini.'}
                           </div>
                        </div>

                        {/* Dynamic Variants */}
                        {selectedProduct.variants && selectedProduct.variants.length > 0 ? (
                          <div className="mb-8 space-y-6">
                             {selectedProduct.variants.map((variant) => (
                               <div key={variant.id || variant.name}>
                                  <div className="flex items-center justify-between mb-3">
                                     <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                       <Package size={16} className="text-slate-400" />
                                       {variant.name}
                                     </h3>
                                     <span className={`text-xs font-medium px-2 py-1 rounded-lg ${variant.is_required ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                       {variant.is_required ? 'Wajib' : 'Opsional'}
                                     </span>
                                  </div>
                                  <div className="flex flex-wrap gap-2.5">
                                     {variant.options.map((option) => {
                                        const isSelected = selectedVariantOptions[variant.name]?.some(o => o.name === option.name);
                                        const isChoice = variant.type === 'CHOICE';
                                        
                                        return (
                                           <button
                                              key={option.name}
                                              onClick={() => handleOptionSelect(variant.name, variant.type, option)}
                                              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border flex items-center gap-2 group relative overflow-hidden ${
                                                 isSelected 
                                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20 transform scale-[1.02] ring-2 ring-emerald-100 dark:ring-emerald-900' 
                                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/10'
                                              }`}
                                           >
                                              {/* Icon: Radio (Circle) for CHOICE, Checkbox (Square) for ADDON */}
                                              {isChoice ? (
                                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-white' : 'border-slate-300 group-hover:border-emerald-400'}`}>
                                                   {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                                </div>
                                              ) : (
                                                <div className={`w-4 h-4 rounded-[4px] border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-white bg-white/20' : 'border-slate-300 group-hover:border-emerald-400'}`}>
                                                   {isSelected && <CheckCircle2 size={12} className="text-white" />}
                                                </div>
                                              )}
                                              
                                              {option.name} 
                                              {option.price > 0 && (
                                                <span className={`text-xs font-bold ${isSelected ? 'text-emerald-100' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                  +{formatRupiah(option.price)}
                                                </span>
                                              )}
                                           </button>
                                        );
                                     })}
                                  </div>
                               </div>
                             ))}
                          </div>
                        ) : null}

                        {/* Social Proof & Trust Signals */}
                        {(selectedProduct.wishlist_count && selectedProduct.wishlist_count > 0) ? (
                          <div className="mb-8 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                              <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                                 <div className="flex -space-x-2">
                                    {[1,2,3].map(i => (
                                      <div key={i} className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-800" />
                                    ))}
                                 </div>
                                 <span className="font-medium">
                                   <strong className="text-slate-900 dark:text-white">{selectedProduct.wishlist_count} orang</strong> memasukkan ini ke keranjang
                                 </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-900/10 px-3 py-2 rounded-xl w-fit">
                                 <BadgeCheck size={14} />
                                 Transaksi Aman & Terpantau Admin RT
                              </div>
                          </div>
                        ) : null}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Sticky Bottom Action Bar */}
              <div className="p-4 md:p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-20 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.05)]">
                 {/* Logistics Info */}
                 <div className="flex flex-wrap justify-between text-xs text-slate-500 dark:text-slate-400 mb-4 px-1 gap-2">
                    <span className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700">
                       <Clock size={14} className="text-emerald-600"/> 
                       {(() => {
                          let estimate = 'Tergantung Kurir';
                          const type = selectedProduct.shipping_type;
                          if (type === 'LOCAL') estimate = 'Instant (15-30 Menit)';
                          else if (type === 'PICKUP') estimate = 'Siap Diambil';
                          else if (type === 'COURIER') estimate = 'Ekspedisi (1-3 Hari)';
                          
                          return (
                             <>Estimasi Tiba: <span className="font-bold text-slate-700 dark:text-slate-200">{estimate}</span></>
                          );
                       })()}
                    </span>
                    <span className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700">
                       <MapPin size={14} className="text-emerald-600"/> 
                       {(() => {
                          const rtId = Number(selectedProduct.store?.rt_id || 0);
                          
                          const shippingFee = Number(selectedProduct.shipping_fee_flat || 0);
                          const isLocal = selectedProduct.shipping_type === 'LOCAL';
                          const rtLabel = rtId > 0 ? `RT ${String(rtId).padStart(3, '0')}` : null;
                          
                          if (isLocal && shippingFee === 0) {
                             return (
                               <span className="font-bold text-slate-700 dark:text-slate-200">
                                 {rtLabel ? `(${rtLabel} Gratis)` : '(Gratis Ongkir)'}
                               </span>
                             );
                          }
                          
                          return (
                             <>
                               Ongkir: <span className="font-bold text-slate-700 dark:text-slate-200">{formatRupiah(shippingFee)}</span>
                               {isLocal && rtLabel && <span className="font-bold text-slate-700 dark:text-slate-200"> ({rtLabel} Gratis)</span>}
                             </>
                          );
                       })()}
                    </span>
                 </div>

                 <div className="flex gap-3 h-14">
                    {/* Quantity Selector */}
                    <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 rounded-2xl px-4 border border-slate-200 dark:border-slate-700 h-full">
                       <button 
                          onClick={() => setQuantity(q => Math.max(1, q - 1))}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-slate-700 shadow-sm text-slate-600 hover:text-emerald-600 hover:scale-110 transition-all"
                       >
                          <Minus size={16} />
                       </button>
                       <span className="font-bold text-lg w-6 text-center text-slate-800 dark:text-white tabular-nums">{quantity}</span>
                       <button 
                          onClick={() => setQuantity(q => q + 1)}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-600 shadow-lg shadow-emerald-600/30 text-white hover:bg-emerald-700 hover:scale-110 transition-all"
                       >
                          <Plus size={16} />
                       </button>
                    </div>

                    {/* Chat Button */}
                    <a 
                       href={selectedProduct.whatsapp ? `https://wa.me/${selectedProduct.whatsapp.replace(/^0/, '62')}?text=Halo, saya tertarik dengan produk ${selectedProduct.name}` : '#'}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="w-14 h-14 flex items-center justify-center border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-slate-600 dark:text-slate-300 hover:border-emerald-600 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all relative group flex-shrink-0"
                       title="Chat Penjual"
                    >
                       <MessageCircle size={24} className="group-hover:scale-110 transition-transform" />
                    </a>

                    {/* Buy Button */}
                    <button 
                       onClick={handleBuy}
                       className="flex-1 bg-emerald-600 text-white rounded-2xl font-bold flex flex-col items-center justify-center hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 active:scale-[0.98] group relative overflow-hidden"
                    >
                       <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:animate-shimmer" />
                       <span className="text-base">Beli Sekarang</span>
                       <span className="text-xs font-normal opacity-90">Total: {formatRupiah(calculateTotal(Number(selectedProduct.price)))}</span>
                    </button>
                 </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
