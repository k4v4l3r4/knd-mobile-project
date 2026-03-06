'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/axios';
import axios from 'axios';
import { Switch } from "@/components/ui/switch";
import { 
  Store as StoreIcon, 
  MapPin, 
  Phone, 
  Clock, 
  Edit, 
  Plus, 
  Package, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Trash2,
  MoreVertical,
  Power,
  ShoppingBag
} from "lucide-react";
import toast from 'react-hot-toast';
import Image from 'next/image';
import Link from 'next/link';
import { Product, Store, UserData } from '@/types/umkm';
import { useTenant } from '@/context/TenantContext';
import { DemoLabel } from '@/components/TenantStatusComponents';
import Cookies from 'js-cookie';
import ProductCard from '@/components/ProductCard';
import StoreForm from '@/components/umkm/StoreForm';
import ProductForm from '@/components/umkm/ProductForm';
import { getImageUrl, formatCurrency } from '@/lib/utils';
import { formatPhoneNumber } from '@/lib/phoneUtils';

export default function MyStorePage() {
  const { isDemo, isExpired, status } = useTenant();
  const [loading, setLoading] = useState(true);
  const [myStore, setMyStore] = useState<Store | null>(null);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);

  // Modal States
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>(undefined);

  useEffect(() => {
    if (!status) return;
    fetchData();
  }, [status]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchCurrentUser(), fetchMyStore()]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const adminToken = Cookies.get('admin_token');
      if (isDemo || !adminToken) {
        // Demo user fallback
        return; 
      }
      const response = await api.get('/me');
      setCurrentUser(response.data.data);
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchMyStore = async () => {
    try {
      if (isDemo) {
        // Demo data logic (simplified)
        const demoStore: Store = {
          id: 1,
          name: 'Warung Sembako RT 01',
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
          description: 'Warung kebutuhan sehari-hari warga RT 01.',
          image_url: null,
          category: 'FOOD',
          contact: '6281234567801',
          address: 'Jl. Melati No. 10, RT 01',
          products: []
        };
        setMyStore(demoStore);
        return;
      }
      const response = await api.get('/stores/my');
      setMyStore(response.data.data);
    } catch (error) {
      // If 404, it means no store
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        setMyStore(null);
      } else if (!isDemo) {
        console.error('Error fetching my store:', error);
      }
    }
  };

  const handleDeleteProduct = async (id: number, name: string) => {
    if (isDemo) {
      toast.error('Mode Demo: Tidak dapat menghapus produk.');
      return;
    }

    if (!window.confirm(`Apakah Anda yakin ingin menghapus produk "${name}"?`)) {
      return;
    }

    try {
      await api.delete(`/products/${id}`);
      toast.success('Produk berhasil dihapus');
      fetchMyStore(); // Refresh data
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast.error(error.response?.data?.message || 'Gagal menghapus produk');
    }
  };

  const openEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsProductModalOpen(true);
  };

  const handleToggleOpen = async (checked: boolean) => {
    if (!myStore) return;
    if (isDemo) {
        toast.error('Mode Demo: Tidak dapat mengubah status toko.');
        return;
    }
    
    // Optimistic update
    const previousState = (myStore as any).is_open;
    const previousOpenNow = (myStore as any).is_open_now;

    setMyStore(prev => prev ? { ...prev, is_open: checked } : null);
    
    try {
        await api.post(`/stores/${myStore.id}`, {
            _method: 'PUT',
            is_open: checked ? 1 : 0
        });
        toast.success(checked ? 'Toko dibuka' : 'Toko ditutup sementara');
        fetchMyStore(); 
    } catch (error) {
        setMyStore(prev => prev ? { ...prev, is_open: previousState, is_open_now: previousOpenNow } : null);
        console.error('Error toggling store status:', error);
        toast.error('Gagal mengubah status toko');
    }
  };

  const handleDeleteStore = async () => {
    if (!myStore) return;
    
    if (isDemo) {
      toast.error('Mode Demo: Tidak dapat menghapus toko.');
      return;
    }

    if (!window.confirm(`Apakah Anda yakin ingin menghapus toko "${myStore.name}"? Semua produk juga akan dihapus.`)) {
      return;
    }

    try {
      await api.delete(`/stores/${myStore.id}`);
      toast.success('Toko berhasil dihapus');
      setMyStore(null);
    } catch (error: any) {
      console.error('Error deleting store:', error);
      toast.error(error.response?.data?.message || 'Gagal menghapus toko');
    }
  };

  const openAddProduct = () => {
    setSelectedProduct(undefined);
    setIsProductModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] border border-emerald-100 dark:border-slate-800 shadow-sm relative overflow-hidden group transition-colors duration-300">
         <div className="absolute right-0 top-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <StoreIcon size={120} className="text-emerald-600 dark:text-emerald-500" />
         </div>
         <div className="relative z-10">
           <div className="flex items-center gap-3 mb-2">
             <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
               <StoreIcon size={24} />
             </div>
             <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Toko Saya</h1>
             <DemoLabel />
           </div>
           <p className="text-slate-500 dark:text-slate-400 font-medium max-w-lg">
             Kelola informasi toko dan produk Anda.
           </p>
         </div>
         
         {myStore && (
            <div className="relative z-10 flex gap-3">
               <button 
                  onClick={openAddProduct}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center gap-2"
               >
                  <Plus size={18} />
                  Tambah Produk
               </button>
               <button 
                  onClick={() => setIsStoreModalOpen(true)}
                  className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2"
               >
                  <Edit size={18} />
                  Edit Toko
               </button>
               <button 
                  onClick={handleDeleteStore}
                  className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl font-semibold hover:bg-red-100 dark:hover:bg-red-900/30 transition-all flex items-center gap-2"
               >
                  <Trash2 size={18} />
                  Hapus Toko
               </button>
            </div>
         )}
      </div>

      {!myStore ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800">
           <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300 dark:text-slate-600">
              <StoreIcon className="w-10 h-10" />
           </div>
           <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Anda belum memiliki toko</h3>
           <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-2 mb-6">
             Mulai berjualan dengan membuat toko Anda sekarang.
           </p>
           <button 
             onClick={() => setIsStoreModalOpen(true)}
             className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
           >
             Buat Toko Sekarang
           </button>
        </div>
      ) : (
        <div className="space-y-6">
           {/* Store Info Card */}
           <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-8">
              <div className="w-full md:w-64 aspect-video md:aspect-square rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden relative group">
                 {myStore.image_url ? (
                    <Image 
                       src={getImageUrl(myStore.image_url)} 
                       alt={myStore.name}
                       fill
                       className="object-cover transition-transform group-hover:scale-105"
                    />
                 ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                       <StoreIcon size={48} />
                    </div>
                 )}
                 <div className="absolute top-3 right-3">
                    {myStore.status === 'verified' ? (
                       <span className="bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg shadow-blue-500/20 flex items-center gap-1.5">
                          <CheckCircle2 size={12} />
                          Terverifikasi
                       </span>
                    ) : myStore.status === 'pending' ? (
                       <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg shadow-orange-500/20 flex items-center gap-1.5">
                          <Loader2 size={12} className="animate-spin" />
                          Menunggu Verifikasi
                       </span>
                    ) : (
                       <span className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg shadow-red-500/20 flex items-center gap-1.5">
                          <AlertCircle size={12} />
                          Ditolak
                       </span>
                    )}
                 </div>
              </div>
              
              <div className="flex-1 space-y-4">
                 <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{myStore.name}</h2>
                            <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 ${
                                (myStore as any).is_open_now 
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                                <span className={`w-2 h-2 rounded-full ${(myStore as any).is_open_now ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                                {(myStore as any).is_open_now ? 'Buka Sekarang' : 'Tutup'}
                            </div>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{myStore.description || 'Tidak ada deskripsi'}</p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                            <div className="text-right">
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Status Manual</p>
                                <p className={`text-sm font-bold ${(myStore as any).is_open ? 'text-emerald-600' : 'text-slate-600'}`}>
                                    {(myStore as any).is_open ? 'Aktif' : 'Tutup Sementara'}
                                </p>
                            </div>
                            <Switch 
                                checked={(myStore as any).is_open || false} 
                                onChange={(e) => handleToggleOpen(e.target.checked)}
                                className="data-[state=checked]:bg-emerald-600"
                            />
                        </div>
                    </div>
                 </div>
                 
                 <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-4 py-2 rounded-xl">
                       <MapPin size={18} className="text-emerald-500" />
                       <span className="text-sm font-medium">{myStore.address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-4 py-2 rounded-xl">
                       <Phone size={18} className="text-emerald-500" />
                       <span className="text-sm font-medium">{formatPhoneNumber(myStore.contact)}</span>
                    </div>
                 </div>
              </div>
           </div>

           {/* Products Section */}
           <div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                 <ShoppingBag className="text-emerald-500" />
                 Produk Anda
              </h3>
              
              {!myStore.products || myStore.products.length === 0 ? (
                 <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-slate-500 dark:text-slate-400">Belum ada produk yang ditambahkan.</p>
                 </div>
              ) : (
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {myStore.products.map((product) => (
                       <ProductCard 
                          key={product.id}
                          product={product}
                          isAdmin={true}
                          onDelete={handleDeleteProduct}
                          onEdit={openEditProduct}
                          onClick={openEditProduct} // Allow clicking card to edit too
                          getImageUrl={getImageUrl}
                          formatRupiah={formatCurrency}
                       />
                    ))}
                 </div>
              )}
           </div>
        </div>
      )}

      {/* Modals */}
      {isStoreModalOpen && (
        <StoreForm 
          isOpen={isStoreModalOpen}
          initialData={myStore || undefined}
          onClose={() => setIsStoreModalOpen(false)}
          onSuccess={fetchMyStore}
        />
      )}

      {isProductModalOpen && (
        <ProductForm 
          isOpen={isProductModalOpen}
          initialData={selectedProduct}
          onClose={() => setIsProductModalOpen(false)}
          onSuccess={fetchMyStore}
        />
      )}
    </div>
  );
}
