'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/axios';
import { 
  Package, 
  History,
  Plus,
  Trash2,
  Edit,
  Check,
  X,
  RotateCcw,
  Search,
  Box,
  ClipboardList,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  Calendar
} from 'lucide-react';
import { Asset, AssetLoan } from '@/types/asset';
import { toast } from 'react-hot-toast';
import { useTenant } from '@/context/TenantContext';
import { DemoLabel } from '@/components/TenantStatusComponents';
import { getImageUrl } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import Cookies from 'js-cookie';

export default function InventarisPage() {
  const { isDemo, isExpired, status } = useTenant();
  const [activeTab, setActiveTab] = useState<'assets' | 'loans'>('assets');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loans, setLoans] = useState<AssetLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    id: 0,
    name: '',
    description: '',
    total_quantity: 0,
    condition: 'BAIK',
    image: null as File | null
  });

  // Loan Action Modal State
  const [showLoanActionModal, setShowLoanActionModal] = useState(false);
  const [loanActionType, setLoanActionType] = useState<'approve' | 'reject' | null>(null);
  const [selectedLoanId, setSelectedLoanId] = useState<number | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  useEffect(() => {
    if (!status) return;
    if (activeTab === 'assets') {
      fetchAssets();
    } else {
      fetchLoans();
    }
  }, [status, activeTab]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const token = Cookies.get('admin_token');
      if (isDemo || !token) {
        const demoAssets: Asset[] = [
          {
            id: 1,
            name: 'Kursi Plastik',
            description: 'Kursi plastik untuk acara warga',
            total_quantity: 50,
            available_quantity: 35,
            condition: 'BAIK',
            image_url: null
          } as Asset,
          {
            id: 2,
            name: 'Sound System',
            description: 'Sound system untuk rapat dan acara 17 Agustus',
            total_quantity: 2,
            available_quantity: 1,
            condition: 'BAIK',
            image_url: null
          } as Asset,
          {
            id: 3,
            name: 'Tenda Lipat',
            description: 'Tenda lipat untuk kegiatan outdoor',
            total_quantity: 3,
            available_quantity: 2,
            condition: 'RUSAK',
            image_url: null
          } as Asset
        ];
        setAssets(demoAssets);
        return;
      }
      const res = await api.get('/assets', { params: { search } });
      if (res.data.data) setAssets(res.data.data);
    } catch (error) {
      if (!isDemo) {
        console.error(error);
        toast.error('Gagal memuat data aset');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const token = Cookies.get('admin_token');
      if (isDemo || !token) {
        const demoLoans: AssetLoan[] = [
          {
            id: 1,
            user: { id: 1, name: 'Budi Santoso', phone: '081234567801' } as any,
            asset: {
              id: 2,
              name: 'Sound System',
              description: 'Sound system untuk rapat warga',
              total_quantity: 2,
              available_quantity: 1,
              condition: 'BAIK',
              image_url: null
            } as any,
            quantity: 1,
            status: 'PENDING',
            loan_date: new Date().toISOString(),
            admin_note: null
          } as any,
          {
            id: 2,
            user: { id: 2, name: 'Siti Aminah', phone: '081234567802' } as any,
            asset: {
              id: 1,
              name: 'Kursi Plastik',
              description: 'Kursi plastik untuk acara arisan',
              total_quantity: 50,
              available_quantity: 40,
              condition: 'BAIK',
              image_url: null
            } as any,
            quantity: 10,
            status: 'APPROVED',
            loan_date: new Date().toISOString(),
            admin_note: 'Dipinjam untuk arisan RT'
          } as any
        ];
        setLoans(demoLoans);
        return;
      }
      console.log('[INVENTARIS] Fetching loans from API...');
      const res = await api.get('/assets/loans/requests');
      console.log('[INVENTARIS] Loans API response:', res.data);
      console.log('[INVENTARIS] Loans count:', res.data.data?.length || 0);
      
      if (res.data.data) {
        setLoans(res.data.data);
        console.log('[INVENTARIS] Loans state updated. First loan status:', res.data.data[0]?.status);
      }
    } catch (error) {
      if (!isDemo) {
        console.error('[INVENTARIS] Error fetching loans:', error);
        toast.error('Gagal memuat data peminjaman');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (isDemo) {
        toast.error('Mode Demo: Hapus aset tidak diizinkan');
        return;
    }
    if (isExpired) {
        toast.error('Akses Terbatas: Silakan perpanjang langganan');
        return;
    }

    if (!confirm('Hapus aset ini?')) return;
    try {
      await api.delete(`/assets/${id}`);
      toast.success('Aset berhasil dihapus');
      fetchAssets();
    } catch (error) {
      toast.error('Gagal menghapus aset');
    }
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isDemo) {
        toast.error('Mode Demo: Simpan aset tidak diizinkan');
        return;
    }
    if (isExpired) {
        toast.error('Akses Terbatas: Silakan perpanjang langganan');
        return;
    }

    setIsSaving(true);
    const data = new FormData();
    data.append('name', formData.name);
    data.append('description', formData.description);
    data.append('total_quantity', formData.total_quantity.toString());
    data.append('condition', formData.condition);
    if (formData.image) {
      data.append('image', formData.image);
    }

    try {
      // Use undefined to let the browser set the Content-Type with boundary
      const config = {
        headers: {
          'Content-Type': undefined,
        },
      };

      if (formData.id) {
        data.append('_method', 'PUT');
        await api.post(`/assets/${formData.id}`, data, config);
        toast.success('Aset berhasil diperbarui');
      } else {
        await api.post('/assets', data, config);
        toast.success('Aset berhasil ditambahkan');
      }
      setShowForm(false);
      resetForm();
      fetchAssets();
    } catch (error: any) {
      console.error('Save asset error:', error);
      const message = error.response?.data?.message || 'Gagal menyimpan aset';
      const errors = error.response?.data?.errors;
      
      if (errors) {
        // Show first validation error if available
        const firstError = Object.values(errors)[0] as string[];
        toast.error(`${message}: ${firstError[0]}`);
      } else {
        toast.error(message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const openLoanActionModal = (id: number, action: 'approve' | 'reject') => {
    setSelectedLoanId(id);
    setLoanActionType(action);
    setActionNote('');
    setShowLoanActionModal(true);
  };

  const closeLoanActionModal = () => {
    setShowLoanActionModal(false);
    setLoanActionType(null);
    setSelectedLoanId(null);
    setActionNote('');
  };

  const handleLoanActionSubmit = async () => {
    if (!selectedLoanId || !loanActionType) {
      console.error('Invalid loan action parameters');
      return;
    }

    setIsProcessingAction(true);
    const action = loanActionType;
    const id = selectedLoanId;
    const note = actionNote;

    try {
      console.log(`[INVENTARIS] Processing ${action} for loan ${id}`);
      console.log(`[INVENTARIS] Payload:`, { admin_note: note });
      
      const response = await api.post(`/assets/loans/${id}/${action}`, { 
        admin_note: note 
      });
      
      console.log(`[INVENTARIS] ${action} response status:`, response.status);
      console.log(`[INVENTARIS] ${action} response data:`, response.data);
      console.log(`[INVENTARIS] ${action} - Success:`, response.data.success);
      console.log(`[INVENTARIS] ${action} - Updated loan status:`, response.data.data?.status);
      
      // Verify the response is successful before proceeding
      if (!response.data.success) {
        throw new Error(response.data.message || 'Gagal memproses peminjaman');
      }
      
      let successMessage = 'Berhasil memproses peminjaman';
      if (action === 'approve') successMessage = 'Peminjaman berhasil disetujui';
      else if (action === 'reject') successMessage = 'Peminjaman berhasil ditolak';
      
      console.log(`[INVENTARIS] ${action} - Refreshing loans list...`);
      toast.success(successMessage);
      closeLoanActionModal();
      
      // Force refresh the loans list
      await fetchLoans();
      console.log(`[INVENTARIS] ${action} - Loans list refreshed`);
    } catch (error: any) {
      console.error(`[INVENTARIS] ${action} error:`, error);
      console.error(`[INVENTARIS] ${action} response status:`, error.response?.status);
      console.error(`[INVENTARIS] ${action} response data:`, error.response?.data);
      
      let errorMessage = 'Gagal memproses';
      
      if (error.response?.status === 401) {
        errorMessage = 'Sesi Anda telah berakhir. Silakan login ulang.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Anda tidak memiliki izin untuk melakukan tindakan ini.';
      } else if (error.response?.status === 400) {
        // Bad request - show specific message
        errorMessage = error.response?.data?.message || 'Data tidak valid';
      } else if (error.response?.status === 500) {
        errorMessage = 'Terjadi kesalahan pada server. Silakan coba lagi atau hubungi administrator.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast.error(errorMessage);
      closeLoanActionModal();
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleReturnAction = async (id: number) => {
    if (isDemo) {
        toast.error('Mode Demo: Proses pengembalian tidak diizinkan');
        return;
    }
    if (isExpired) {
        toast.error('Akses Terbatas: Silakan perpanjang langganan');
        return;
    }

    try {
      console.log(`Processing return for loan ${id}`);
      const response = await api.post(`/assets/loans/${id}/return`, { admin_note: '' });
      console.log(`return response:`, response.data);
      
      toast.success('Aset berhasil dikembalikan');
      fetchLoans();
    } catch (error: any) {
      console.error(`return error:`, error);
      console.error(`return response:`, error.response);
      
      let errorMessage = 'Gagal memproses';
      
      if (error.response?.status === 401) {
        errorMessage = 'Sesi Anda telah berakhir. Silakan login ulang.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Anda tidak memiliki izin untuk melakukan tindakan ini.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Terjadi kesalahan pada server. Silakan coba lagi atau hubungi administrator.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast.error(errorMessage);
    }
  };

  const resetForm = () => {
    setFormData({
      id: 0,
      name: '',
      description: '',
      total_quantity: 0,
      condition: 'BAIK',
      image: null
    });
  };

  return (
    <div className="space-y-8 pb-12">
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-emerald-100 dark:border-emerald-900/50 shadow-sm relative overflow-hidden group">
         <div className="absolute right-0 top-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Package size={120} className="text-emerald-600 dark:text-emerald-500" />
         </div>
         <div className="relative z-10">
           <div className="flex items-center gap-3 mb-2">
             <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
               <Box size={24} />
             </div>
             <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Inventaris & Peminjaman</h1>
             <DemoLabel />
           </div>
           <p className="text-slate-500 dark:text-slate-400 font-medium max-w-lg">
             Kelola aset inventaris RT, pantau kondisi barang, dan setujui peminjaman warga.
           </p>
         </div>
      </div>

      {/* --- TABS NAVIGATION --- */}
      <div className="flex p-1.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl w-fit shadow-sm">
        <button
          onClick={() => setActiveTab('assets')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
            activeTab === 'assets'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Box size={18} />
          Data Aset
        </button>
        <button
          onClick={() => setActiveTab('loans')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
            activeTab === 'loans'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <ClipboardList size={18} />
          Riwayat Peminjaman
          {loans.filter(l => l.status === 'PENDING').length > 0 && (
             <span className="bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-md text-xs font-bold">
               {loans.filter(l => l.status === 'PENDING').length}
             </span>
          )}
        </button>
      </div>

      {/* --- ASSETS TAB --- */}
      {activeTab === 'assets' && (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="relative flex-1 max-w-md group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-emerald-500 transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Cari nama barang atau deskripsi..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchAssets()}
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all shadow-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    />
                </div>
                <button
                    onClick={() => { resetForm(); setShowForm(true); }}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-semibold hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all hover:-translate-y-0.5 active:scale-95"
                >
                    <Plus size={20} strokeWidth={2.5} />
                    <span>Tambah Aset Baru</span>
                </button>
            </div>

            {/* Assets Grid/Table */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50/50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Barang</th>
                                <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Kondisi</th>
                                <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ketersediaan</th>
                                <th className="px-8 py-5 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-8 py-20 text-center text-slate-400 dark:text-slate-500">
                                        <div className="animate-pulse flex flex-col items-center">
                                            <div className="h-12 w-12 bg-slate-100 dark:bg-slate-800 rounded-full mb-3"></div>
                                            <div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 rounded"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : assets.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-full mb-3 text-emerald-200 dark:text-emerald-800"><Box size={40} /></div>
                                            <p className="font-medium text-slate-600 dark:text-slate-400">Belum ada aset inventaris.</p>
                                            <p className="text-sm text-slate-400 dark:text-slate-500">Tambahkan barang inventaris RT di sini.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                assets.map((asset) => (
                                    <tr key={asset.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-100 dark:border-slate-700 shrink-0">
                                                    {asset.image_url ? (
                                                        <img 
                                                            src={getImageUrl(asset.image_url)!} 
                                                            alt={asset.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                                                            <ImageIcon size={24} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800 dark:text-white text-lg">{asset.name}</div>
                                                    <div className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1 max-w-xs">{asset.description || 'Tidak ada deskripsi'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                                                asset.condition === 'BAIK' 
                                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' 
                                                : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                                            }`}>
                                                {asset.condition === 'BAIK' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                                {asset.condition}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-2">
                                                <div className="flex flex-col">
                                                    <span className="text-2xl font-bold text-slate-700 dark:text-slate-300">{asset.available_quantity}</span>
                                                    <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Tersedia</span>
                                                </div>
                                                <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
                                                <div className="flex flex-col">
                                                    <span className="text-lg font-semibold text-slate-400 dark:text-slate-500">{asset.total_quantity}</span>
                                                    <span className="text-[10px] uppercase font-bold text-slate-300 dark:text-slate-600 tracking-wider">Total</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedAsset(asset);
                                                        setShowDetail(true);
                                                    }}
                                                    className="p-2.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-colors tooltip border border-transparent hover:border-blue-100 dark:hover:border-blue-800"
                                                    title="Lihat Detail"
                                                >
                                                    <Search size={18} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setFormData({
                                                            id: asset.id,
                                                            name: asset.name,
                                                            description: asset.description || '',
                                                            total_quantity: asset.total_quantity,
                                                            condition: asset.condition,
                                                            image: null
                                                        });
                                                        setShowForm(true);
                                                    }}
                                                    className="p-2.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-xl transition-colors tooltip border border-transparent hover:border-emerald-100 dark:hover:border-emerald-800"
                                                    title="Edit Aset"
                                                >
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(asset.id)}
                                                    className="p-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-colors tooltip border border-transparent hover:border-rose-100 dark:hover:border-rose-800"
                                                    title="Hapus Aset"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {/* --- LOANS TAB --- */}
      {activeTab === 'loans' && (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50/50 dark:bg-slate-800/50">
                        <tr>
                            <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Peminjam</th>
                            <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Detail Barang</th>
                            <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Jadwal</th>
                            <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                            <th className="px-8 py-5 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loading ? (
                            <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-400 dark:text-slate-500">Memuat data...</td></tr>
                        ) : loans.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-8 py-20 text-center">
                                    <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-full mb-3"><ClipboardList size={32} /></div>
                                        <p className="font-medium text-slate-600 dark:text-slate-400">Belum ada riwayat peminjaman.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            loans.map((loan) => (
                                <tr key={loan.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-8 py-5">
                                        <div className="font-bold text-slate-800 dark:text-white">{loan.user.name}</div>
                                        <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">{loan.user.phone}</div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                                                {loan.asset.image_url ? (
                                                    <img src={getImageUrl(loan.asset.image_url)!} className="w-full h-full object-cover" />
                                                ) : <Box className="p-2 text-slate-400 dark:text-slate-600 w-full h-full" />}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800 dark:text-white">{loan.asset.name}</div>
                                                <div className="text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 w-fit mt-0.5">
                                                    {loan.quantity} Unit
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col gap-1 text-sm">
                                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                                <Calendar size={14} className="text-emerald-500" />
                                                <span className="font-medium">Pinjam: {new Date(loan.loan_date).toLocaleDateString('id-ID')}</span>
                                            </div>
                                            {/* Assuming return date exists or handled differently, using loan_date for now or add return date field if available in type */}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                                            loan.status === 'APPROVED' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800' :
                                            loan.status === 'RETURNED' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' :
                                            loan.status === 'REJECTED' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800' :
                                            'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                                        }`}>
                                            {loan.status === 'APPROVED' && 'Disetujui'}
                                            {loan.status === 'RETURNED' && 'Dikembalikan'}
                                            {loan.status === 'REJECTED' && 'Ditolak'}
                                            {loan.status === 'PENDING' && 'Menunggu'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex justify-end gap-2">
                                            {loan.status === 'PENDING' && (
                                                <>
                                                    <button
                                                        onClick={() => openLoanActionModal(loan.id, 'approve')}
                                                        className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors tooltip border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800"
                                                        title="Setujui"
                                                    >
                                                        <Check size={16} strokeWidth={3} />
                                                    </button>
                                                    <button
                                                        onClick={() => openLoanActionModal(loan.id, 'reject')}
                                                        className="p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-lg hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors tooltip border border-transparent hover:border-rose-200 dark:hover:border-rose-800"
                                                        title="Tolak"
                                                    >
                                                        <X size={16} strokeWidth={3} />
                                                    </button>
                                                </>
                                            )}
                                            {loan.status === 'APPROVED' && (
                                                <button
                                                    onClick={() => handleReturnAction(loan.id)}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors font-bold text-xs border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                                                >
                                                    <RotateCcw size={14} /> Terima Kembali
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* --- DETAIL MODAL --- */}
      {showDetail && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
                <div className="relative h-64 bg-gray-50 dark:bg-slate-800">
                    {selectedAsset.image_url ? (
                        <img 
                            src={getImageUrl(selectedAsset.image_url)!} 
                            alt={selectedAsset.name}
                            className="w-full h-full object-contain"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                            <ImageIcon size={64} />
                        </div>
                    )}
                    <button 
                        onClick={() => setShowDetail(false)}
                        className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                        <div>
                             <h2 className="text-3xl font-bold text-white drop-shadow-md mb-1">{selectedAsset.name}</h2>
                             <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md ${
                                selectedAsset.condition === 'BAIK' 
                                ? 'bg-emerald-500/20 text-emerald-100 border-emerald-500/30' 
                                : 'bg-rose-500/20 text-rose-100 border-rose-500/30'
                            }`}>
                                {selectedAsset.condition === 'BAIK' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                {selectedAsset.condition}
                            </span>
                        </div>
                    </div>
                </div>
                
                <div className="p-8">
                    <div className="grid grid-cols-2 gap-8 mb-8">
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                             <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Stok Tersedia</div>
                             <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{selectedAsset.available_quantity} <span className="text-sm font-medium text-slate-400">Unit</span></div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                             <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total Inventaris</div>
                             <div className="text-3xl font-bold text-slate-700 dark:text-slate-300">{selectedAsset.total_quantity} <span className="text-sm font-medium text-slate-400">Unit</span></div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <ClipboardList size={20} className="text-emerald-500" />
                            Deskripsi Barang
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/30 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                            {selectedAsset.description || 'Tidak ada deskripsi detail untuk barang ini.'}
                        </p>
                    </div>

                    <div className="mt-8 flex justify-end">
                        <button
                            onClick={() => setShowDetail(false)}
                            className="px-8 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* --- FORM MODAL --- */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800">
            {/* Modal Header */}
            <div className="bg-slate-50 dark:bg-slate-800/50 px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    {formData.id ? <Edit size={20} className="text-emerald-600 dark:text-emerald-400"/> : <Plus size={20} className="text-emerald-600 dark:text-emerald-400"/>}
                    {formData.id ? 'Edit Data Aset' : 'Tambah Aset Baru'}
                </h2>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                    <X size={24} />
                </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveAsset} className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Nama Barang</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 font-medium text-slate-800 dark:text-white"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Contoh: Tenda Besar, Kursi Plastik"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Deskripsi</label>
                <textarea
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 min-h-[100px] resize-none text-slate-800 dark:text-white"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Keterangan kondisi, warna, atau detail lainnya..."
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Jumlah Total</label>
                  <input
                    type="number"
                    required
                    min="0"
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium text-slate-800 dark:text-white"
                    value={formData.total_quantity}
                    onChange={e => setFormData({...formData, total_quantity: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Kondisi</label>
                  <div className="relative">
                    <select
                        value={formData.condition}
                        onChange={e => setFormData({...formData, condition: e.target.value as any})}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all appearance-none font-medium text-slate-800 dark:text-white"
                    >
                        <option value="BAIK">Baik</option>
                        <option value="RUSAK">Rusak</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <CheckCircle2 size={16} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Foto Barang</label>
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/20 transition-all cursor-pointer relative bg-slate-50 dark:bg-slate-800/50">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={e => setFormData({...formData, image: e.target.files?.[0] || null})}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-slate-500">
                        <ImageIcon size={32} />
                        <span className="text-sm font-medium">
                            {formData.image ? formData.image.name : 'Klik untuk upload foto'}
                        </span>
                    </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-6 py-3.5 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors border border-transparent dark:border-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-6 py-3.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Aset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- LOAN ACTION MODAL --- */}
      <Modal
        isOpen={showLoanActionModal}
        onClose={closeLoanActionModal}
        title={loanActionType === 'approve' ? 'Setujui Peminjaman' : 'Tolak Peminjaman'}
        headerColor={loanActionType === 'approve' ? 'emerald' : 'rose'}
      >
        <div className="space-y-6">
          {/* Info Box */}
          <div className={`p-4 rounded-xl border ${
            loanActionType === 'approve'
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800'
          }`}>
            <p className={`text-sm font-medium ${
                loanActionType === 'approve'
                    ? 'text-emerald-800 dark:text-emerald-300'
                    : 'text-rose-800 dark:text-rose-300'
            }`}>
                {loanActionType === 'approve' 
                    ? 'Anda akan menyetujui peminjaman ini. Stok aset akan berkurang.' 
                    : 'Anda akan menolak peminjaman ini. Stok aset tidak akan berubah.'}
            </p>
          </div>

          {/* Note Input */}
          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                {loanActionType === 'approve' ? 'Catatan Persetujuan (Opsional)' : 'Alasan Penolakan (Opsional)'}
            </label>
            <textarea
                className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 min-h-[100px] resize-none text-slate-800 dark:text-white font-medium"
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder={loanActionType === 'approve' 
                    ? 'Contoh: Disetujui, silakan ambil barang besok.' 
                    : 'Contoh: Ditolak karena stok tidak mencukupi.'}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-2">
            <button
                type="button"
                onClick={closeLoanActionModal}
                disabled={isProcessingAction}
                className="flex-1 px-6 py-3.5 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors border border-transparent dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Batal
            </button>
            <button
                type="button"
                onClick={handleLoanActionSubmit}
                disabled={isProcessingAction}
                className={`flex-1 px-6 py-3.5 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                    loanActionType === 'approve'
                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                        : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                }`}
            >
                {isProcessingAction ? (
                    <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Memproses...
                    </span>
                ) : (
                    loanActionType === 'approve' ? 'Ya, Setujui' : 'Ya, Tolak'
                )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
