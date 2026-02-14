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

export default function InventarisPage() {
  const { isDemo, isExpired } = useTenant();
  const [activeTab, setActiveTab] = useState<'assets' | 'loans'>('assets');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loans, setLoans] = useState<AssetLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    id: 0,
    name: '',
    description: '',
    total_quantity: 0,
    condition: 'BAIK',
    image: null as File | null
  });

  useEffect(() => {
    if (activeTab === 'assets') {
      fetchAssets();
    } else {
      fetchLoans();
    }
  }, [activeTab]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const res = await api.get('/assets', { params: { search } });
      if (res.data.data) setAssets(res.data.data);
    } catch (error) {
      console.error(error);
      toast.error('Gagal memuat data aset');
    } finally {
      setLoading(false);
    }
  };

  const fetchLoans = async () => {
    setLoading(true);
    try {
      const res = await api.get('/assets/loans/requests');
      if (res.data.data) setLoans(res.data.data);
    } catch (error) {
      console.error(error);
      toast.error('Gagal memuat data peminjaman');
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
      if (formData.id) {
        data.append('_method', 'PUT');
        await api.post(`/assets/${formData.id}`, data);
        toast.success('Aset berhasil diperbarui');
      } else {
        await api.post('/assets', data);
        toast.success('Aset berhasil ditambahkan');
      }
      setShowForm(false);
      resetForm();
      fetchAssets();
    } catch (error) {
      toast.error('Gagal menyimpan aset');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoanAction = async (id: number, action: 'approve' | 'reject' | 'return') => {
    if (isDemo) {
        toast.error('Mode Demo: Proses peminjaman tidak diizinkan');
        return;
    }
    if (isExpired) {
        toast.error('Akses Terbatas: Silakan perpanjang langganan');
        return;
    }

    let note = '';
    if (action === 'reject') {
        note = prompt('Alasan penolakan (opsional):') || '';
    } else if (action === 'approve') {
        note = prompt('Catatan persetujuan (opsional):') || '';
    }

    try {
      await api.post(`/assets/loans/${id}/${action}`, { admin_note: note });
      toast.success(`Berhasil memproses peminjaman`);
      fetchLoans();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal memproses');
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

  const getImageUrl = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://127.0.0.1:8000';
    return `${baseUrl}/storage/${path}`;
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
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                                                        onClick={() => handleLoanAction(loan.id, 'approve')}
                                                        className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors tooltip border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800"
                                                        title="Setujui"
                                                    >
                                                        <Check size={16} strokeWidth={3} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleLoanAction(loan.id, 'reject')}
                                                        className="p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-lg hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors tooltip border border-transparent hover:border-rose-200 dark:hover:border-rose-800"
                                                        title="Tolak"
                                                    >
                                                        <X size={16} strokeWidth={3} />
                                                    </button>
                                                </>
                                            )}
                                            {loan.status === 'APPROVED' && (
                                                <button
                                                    onClick={() => handleLoanAction(loan.id, 'return')}
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

      {/* --- ASSET FORM MODAL --- */}
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
    </div>
  );
}
