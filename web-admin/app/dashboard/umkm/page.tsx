'use client';

import React, { useEffect, useState } from 'react';
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
  Wrench
} from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';
import ProductCard from '@/components/ProductCard';
import { Product, Store, UserData } from '@/types/umkm';
import { useTenant } from '@/context/TenantContext';
import { DemoLabel } from '@/components/TenantStatusComponents';
import Cookies from 'js-cookie';

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

  // Product Detail State & Logic
  const [quantity, setQuantity] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  
  // Category Logic
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('ALL');

  const CATEGORY_STRUCTURE: Record<string, { label: string, icon: React.ElementType, subs: string[] }> = {
    'FOOD': {
      label: 'Kuliner',
      icon: Utensils,
      subs: []
    },
    'GOODS': {
      label: 'Barang',
      icon: ShoppingBag,
      subs: []
    },
    'SERVICE': {
      label: 'Jasa',
      icon: Wrench,
      subs: []
    }
  };
  useEffect(() => {
    if (selectedProduct) {
      setQuantity(1);
      setSelectedAddons([]);
    }
  }, [selectedProduct]);

  // Reset subcategory when group changes
  useEffect(() => {
    setSelectedSubCategory('ALL');
  }, [selectedGroup]);

  const getProductStats = (id: number) => {
    // Deterministic pseudo-random based on ID
    const rating = (4.5 + (id % 5) / 10).toFixed(1);
    const sold = 50 + (id * 12) % 450;
    const match = 95 + (id % 5);
    const viewing = 3 + (id % 12);
    const repliesIn = 2 + (id % 8);
    return { rating, sold, match, viewing, repliesIn };
  };

  const MOCK_ADDONS = [
    { id: '1', name: 'Nasi Putih', price: 5000 },
    { id: '2', name: 'Telur Dadar', price: 4000 },
    { id: '3', name: 'Sambal Terasi', price: 2000 },
    { id: '4', name: 'Es Teh Manis', price: 3000 },
  ];

  const toggleAddon = (addonName: string) => {
    setSelectedAddons(prev => 
      prev.includes(addonName) 
        ? prev.filter(a => a !== addonName) 
        : [...prev, addonName]
    );
  };

  const calculateTotal = (basePrice: number) => {
    const addonsPrice = selectedAddons.reduce((acc, name) => {
      const addon = MOCK_ADDONS.find(a => a.name === name);
      return acc + (addon?.price || 0);
    }, 0);
    return (basePrice + addonsPrice) * quantity;
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
          phone: '081234567801',
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
          user_id: 1,
          name: 'Warung Sembako RT 01',
          description: 'Warung kebutuhan sehari-hari warga RT 01.',
          address: 'Jl. Melati No. 10, RT 01',
          whatsapp: '081234567801',
          status: 'verified',
          logo_url: null
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
            user_id: 2,
            name: 'Katering Bu Siti',
            description: 'Katering rumahan untuk acara keluarga dan kantor.',
            address: 'Jl. Mawar No. 5, RT 01',
            whatsapp: '081234567802',
            status: 'pending',
            logo_url: null
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
            store_id: 1,
            name: 'Nasi Kotak Komplit',
            description: 'Nasi kotak dengan lauk ayam goreng, sayur, sambal, dan buah.',
            price: '25000',
            category: 'FOOD',
            photo_url: null,
            whatsapp: '081234567801',
            store: {
              id: 1,
              user_id: 1,
              name: 'Warung Sembako RT 01',
              description: 'Warung kebutuhan sehari-hari warga RT 01.',
              address: 'Jl. Melati No. 10, RT 01',
              whatsapp: '081234567801',
              status: 'verified',
              logo_url: null
            },
            user: {
              id: 1,
              name: 'Budi Santoso',
              email: 'budi.santoso@example.com',
              phone: '081234567801',
              role: 'ADMIN_RT',
              photo_url: null
            }
          },
          {
            id: 2,
            user_id: 2,
            store_id: 2,
            name: 'Jasa Cuci Motor',
            description: 'Cuci motor higienis dan cepat, bisa dipanggil ke rumah.',
            price: '15000',
            category: 'SERVICE',
            photo_url: null,
            whatsapp: '081234567802',
            store: {
              id: 2,
              user_id: 2,
              name: 'Cuci Motor Pak Andi',
              description: 'Layanan cuci motor panggilan di lingkungan RT.',
              address: 'Jl. Kenanga No. 3, RT 01',
              whatsapp: '081234567802',
              status: 'verified',
              logo_url: null
            },
            user: {
              id: 2,
              name: 'Andi Wijaya',
              email: 'andi.wijaya@example.com',
              phone: '081234567802',
              role: 'WARGA',
              photo_url: null
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

  const formatRupiah = (price: string | number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(Number(price));
  };

  const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://127.0.0.1:8000';
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${baseUrl}/storage/${cleanPath}`;
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          product.user?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.store?.name.toLowerCase().includes(searchQuery.toLowerCase());
    
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
    const variantText = selectedAddons.length > 0 
      ? `\n✨ Varian: ${selectedAddons.join(', ')}` 
      : '';
    
    const message = `Halo, saya mau pesan via RT Online SuperApp:%0A%0A` +
      `🛍️ *${selectedProduct.name}*%0A` +
      `📦 Jumlah: ${quantity}%0A` +
      `${variantText}%0A%0A` +
      `💰 Total: *${formatRupiah(total)}*%0A%0A` +
      `Mohon diproses ya, terima kasih!`;

    const waUrl = `https://wa.me/${selectedProduct.whatsapp.replace(/^0/, '62')}?text=${message}`;
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
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 max-w-md group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-emerald-500 dark:group-focus-within:text-emerald-400 transition-colors" size={20} />
              <input
                type="text"
                placeholder="Cari produk atau penjual..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:border-emerald-500 outline-none transition-all shadow-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
              />
            </div>
            
            {/* Unified Category Chips (Scrollable on Mobile) */}
            <div className="flex flex-col gap-4 w-full md:w-auto">
              
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
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm animate-pulse">
                  <div className="h-48 bg-slate-100 dark:bg-slate-800" />
                  <div className="p-6 space-y-4">
                    <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
                    <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                    <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-xl mt-4" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300 dark:text-slate-600">
                 <ShoppingBag className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Tidak ada produk ditemukan</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-2">
                {searchQuery ? 'Coba kata kunci pencarian lain.' : 'Belum ada warga yang menambahkan produk.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
              {filteredProducts.map((product) => (
                <ProductCard 
                  key={product.id}
                  product={product}
                  isAdmin={isAdmin || false} // Provide fallback
                  onDelete={confirmDelete}
                  onClick={setSelectedProduct}
                  getImageUrl={getImageUrl}
                  formatRupiah={formatRupiah}
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
                              {store.image_url ? (
                                <Image 
                                  src={getImageUrl(store.image_url)} 
                                  alt={store.name} 
                                  width={64} 
                                  height={64} 
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
            <div className="w-full md:w-[45%] bg-slate-100 dark:bg-slate-800 relative h-[300px] md:h-auto flex flex-col flex-shrink-0">
              <div className="relative w-full h-full">
                {selectedProduct.image_url ? (
                  <Image
                    src={getImageUrl(selectedProduct.image_url)}
                    alt={selectedProduct.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-[#FDF6E3] dark:bg-slate-800 relative overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-orange-300/20 dark:bg-orange-900/20 rounded-full blur-3xl"></div>
                    <div className="relative z-10 bg-white/40 dark:bg-slate-700/40 backdrop-blur-sm p-8 rounded-[2rem] shadow-[inset_-4px_-4px_8px_rgba(0,0,0,0.05),inset_4px_4px_8px_rgba(255,255,255,0.8)] dark:shadow-none flex flex-col items-center">
                        <ShoppingBag size={64} className="text-orange-400 dark:text-orange-300 mb-3" strokeWidth={1.5} />
                        <p className="text-sm font-bold text-orange-800/70 dark:text-orange-200/70">Foto Belum Tersedia</p>
                    </div>
                  </div>
                )}
                
                {/* Real-time Status Badges */}
                <div className="absolute top-5 left-5 flex flex-col gap-2 z-10">
                   <div className="bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 animate-pulse ring-2 ring-white/20">
                      <span className="w-2 h-2 bg-white rounded-full shadow-[0_0_4px_rgba(255,255,255,0.8)]" />
                      BUKA
                   </div>
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
                    const stats = getProductStats(selectedProduct.id);
                    return (
                      <>
                        <div className="flex items-center flex-wrap gap-2 text-sm mb-4">
                          <button className="flex items-center gap-1.5 text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1.5 rounded-xl border border-yellow-200 dark:border-yellow-800/50 font-bold hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition-all active:scale-95">
                             <Star size={14} fill="currentColor" />
                             {stats.rating}
                             <span className="text-yellow-600/70 dark:text-yellow-400/70 font-medium ml-0.5 text-xs">(100+ Ulasan)</span>
                          </button>
                          <button className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-sm">
                             <ShoppingBag size={14} />
                             Terjual {stats.sold}+
                          </button>
                          <button className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/50 font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all active:scale-95">
                             <ThumbsUp size={14} />
                             {stats.match}% Sesuai
                          </button>
                        </div>

                        {/* Product Title */}
                        <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white leading-tight mb-2 tracking-tight">
                          {selectedProduct.name}
                        </h2>

                        {/* Live Insight */}
                        <div className="flex items-center gap-2 text-rose-500 text-xs font-semibold mb-6 animate-pulse bg-rose-50 dark:bg-rose-900/20 w-fit px-2 py-1 rounded-lg">
                           <Eye size={14} />
                           {stats.viewing} tetangga sedang melihat produk ini
                        </div>

                        {/* Price */}
                        <div className="text-3xl font-extrabold text-slate-900 dark:text-white mb-8 tracking-tight flex items-baseline gap-1">
                           {formatRupiah(selectedProduct.price)}
                           <span className="text-sm font-medium text-slate-400 dark:text-slate-500 line-through decoration-slate-400/50 decoration-2">
                             {formatRupiah(Number(selectedProduct.price) * 1.2)}
                           </span>
                        </div>

                        {/* Store Identity Card */}
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-[20px] border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4 mb-8 group hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors cursor-pointer">
                           <div className="w-14 h-14 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden relative border-2 border-white dark:border-slate-600 shadow-md group-hover:scale-105 transition-transform">
                              <Image 
                                src={selectedProduct.user?.photo_url ? getImageUrl(selectedProduct.user.photo_url) : `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedProduct.user?.name || 'User')}`} 
                                alt={selectedProduct.user?.name}
                                fill
                                className="object-cover"
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
                                 <a 
                                   href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedProduct.store?.address || 'Blok C / RT 03')}`}
                                   target="_blank"
                                   rel="noopener noreferrer"
                                   className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-xl border border-emerald-100 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all cursor-pointer group/location shadow-sm hover:shadow-md hover:shadow-emerald-900/5"
                                   title="Lihat Lokasi di Google Maps"
                                 >
                                    <div className="relative">
                                      <MapPin size={14} className="text-emerald-600 dark:text-emerald-400" />
                                      <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
                                      </span>
                                    </div>
                                    <span className="truncate max-w-[200px] font-bold text-xs">
                                      {selectedProduct.store?.address || 'Blok C / RT 03'}
                                    </span>
                                 </a>
                                 <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                 <span className="text-emerald-600 font-medium">Aktif 5 menit lalu</span>
                              </div>
                           </div>
                           <div className="text-right hidden sm:block pl-4 border-l border-slate-100 dark:border-slate-700">
                              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Balas Chat</p>
                              <p className="text-emerald-600 font-bold text-sm flex items-center justify-end gap-1">
                                 <Zap size={14} fill="currentColor" />
                                 &lt; {stats.repliesIn} Menit
                              </p>
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

                        {/* Add-ons (Varian Lauk) */}
                        <div className="mb-8">
                           <div className="flex items-center justify-between mb-3">
                              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                <Package size={16} className="text-slate-400" />
                                Varian Tambahan
                              </h3>
                              <span className="text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">Opsional</span>
                           </div>
                           <div className="flex flex-wrap gap-2.5">
                              {MOCK_ADDONS.map(addon => {
                                 const isSelected = selectedAddons.includes(addon.name);
                                 return (
                                    <button
                                       key={addon.id}
                                       onClick={() => toggleAddon(addon.name)}
                                       className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border flex items-center gap-2 group ${
                                          isSelected 
                                             ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20 transform scale-[1.02]' 
                                             : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/10'
                                       }`}
                                    >
                                       {isSelected ? <CheckCircle2 size={16} /> : <div className="w-4 h-4 rounded-full border-2 border-slate-300 group-hover:border-emerald-400" />}
                                       {addon.name} 
                                       <span className={`text-xs font-bold ${isSelected ? 'text-emerald-100' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                         +{formatRupiah(addon.price)}
                                       </span>
                                    </button>
                                 );
                              })}
                           </div>
                        </div>

                        {/* Social Proof hidden as requested */}
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
                       Estimasi Tiba: <span className="font-bold text-slate-700 dark:text-slate-200">15-20 Menit</span>
                    </span>
                    <span className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700">
                       <MapPin size={14} className="text-emerald-600"/> 
                       Ongkir: <span className="font-bold text-slate-700 dark:text-slate-200">Rp 2.000</span> (RT 03 Gratis)
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
