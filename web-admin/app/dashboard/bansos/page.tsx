'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { 
  Users, 
  Gift, 
  History, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MoreVertical,
  Upload,
  Calendar,
  Loader2,
  Trash2,
  AlertCircle,
  X,
  ChevronRight,
  Save,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import { useTenant } from '@/context/TenantContext';
import { DemoLabel } from '@/components/TenantStatusComponents';
import Cookies from 'js-cookie';

export default function BansosPage() {
  const { isDemo, isExpired, status } = useTenant();
  const [activeTab, setActiveTab] = useState('dtks');
  const [isLoading, setIsLoading] = useState(false);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [histories, setHistories] = useState<any[]>([]);
  const [wargaList, setWargaList] = useState<any[]>([]);
  
  // Add Recipient Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newRecipient, setNewRecipient] = useState({
    user_id: '',
    no_kk: '',
    status: 'PENDING',
    notes: '',
    score: 0
  });

  // Distribute Form State
  const [distributeForm, setDistributeForm] = useState({
    recipient_id: '',
    program_name: '',
    date_received: new Date().toISOString().split('T')[0],
    amount: '',
    evidence_photo: null as File | null
  });
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);

  // Edit Status Modal State
  const [editingRecipient, setEditingRecipient] = useState<any>(null);

  useEffect(() => {
    if (!status) return;
    fetchRecipients();
    if (activeTab === 'riwayat') fetchHistories();
    if (activeTab === 'dtks') fetchWargaList();
  }, [status, activeTab]);

  const fetchRecipients = async () => {
    setIsLoading(true);
    try {
      const token = Cookies.get('admin_token');
      if (isDemo || !token) {
        const demoRecipients = [
          {
            id: 1,
            user: { id: 1, name: 'Budi Santoso' },
            no_kk: '3201010101010001',
            status: 'LAYAK',
            score: 9,
            notes: 'Keluarga prasejahtera dengan tanggungan 3 anak'
          },
          {
            id: 2,
            user: { id: 2, name: 'Siti Aminah' },
            no_kk: '3201010101010002',
            status: 'PENDING',
            score: 7,
            notes: 'Proses verifikasi lapangan'
          },
          {
            id: 3,
            user: { id: 3, name: 'Andi Wijaya' },
            no_kk: '3201010101010003',
            status: 'TIDAK_LAYAK',
            score: 4,
            notes: 'Pendapatan di atas batas penerima bansos'
          }
        ];
        setRecipients(demoRecipients);
        return;
      }
      const response = await api.get('/bansos-recipients');
      setRecipients(response.data.data.data);
    } catch (error) {
      if (!isDemo) {
        console.error('Failed to fetch recipients', error);
        toast.error('Gagal memuat data penerima');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHistories = async () => {
    setIsLoading(true);
    try {
      const token = Cookies.get('admin_token');
      if (isDemo || !token) {
        const demoHistories = [
          {
            id: 1,
            date_received: new Date().toISOString(),
            recipient: {
              id: 1,
              user: { id: 1, name: 'Budi Santoso' }
            },
            program_name: 'Sembako Januari 2026',
            amount: '300000',
            evidence_photo: null
          },
          {
            id: 2,
            date_received: new Date().toISOString(),
            recipient: {
              id: 2,
              user: { id: 2, name: 'Siti Aminah' }
            },
            program_name: 'BLT Desa',
            amount: '500000',
            evidence_photo: null
          }
        ];
        setHistories(demoHistories);
        return;
      }
      const response = await api.get('/bansos-histories');
      setHistories(response.data.data.data);
    } catch (error) {
      if (!isDemo) {
        console.error('Failed to fetch histories', error);
        toast.error('Gagal memuat riwayat');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWargaList = async () => {
    try {
      const token = Cookies.get('admin_token');
      if (isDemo || !token) {
        const warga = [
          { id: 1, name: 'Budi Santoso' },
          { id: 2, name: 'Siti Aminah' },
          { id: 3, name: 'Andi Wijaya' }
        ];
        setWargaList(warga);
        return;
      }
      const response = await api.get('/warga');
      setWargaList(response.data.data.data);
    } catch (error) {
      if (!isDemo) {
        console.error('Failed to fetch warga list', error);
      }
    }
  };

  const handleAddRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isDemo) {
      toast.error('Mode Demo: Penambahan penerima bansos tidak diizinkan');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan untuk mengelola bansos');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/bansos-recipients', newRecipient);
      toast.success('Penerima berhasil ditambahkan');
      setShowAddModal(false);
      fetchRecipients();
      setNewRecipient({ user_id: '', no_kk: '', status: 'PENDING', notes: '', score: 0 });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal menambahkan penerima');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: number, data: any) => {
    if (isDemo) {
      toast.error('Mode Demo: Update status tidak diizinkan');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }
    const loadingToast = toast.loading('Memperbarui status...');
    try {
      await api.put(`/bansos-recipients/${id}`, data);
      toast.success('Status berhasil diperbarui', { id: loadingToast });
      setEditingRecipient(null);
      fetchRecipients();
    } catch (error: any) {
      toast.error('Gagal memperbarui status', { id: loadingToast });
    }
  };

  const handleDistribute = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isDemo) {
      toast.error('Mode Demo: Penyaluran bansos tidak diizinkan');
      return;
    }
    if (isExpired) {
      toast.error('Akses Terbatas: Silakan perpanjang langganan');
      return;
    }

    if (!distributeForm.recipient_id) {
        toast.error('Pilih penerima terlebih dahulu');
        return;
    }
    
    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('program_name', distributeForm.program_name);
    formData.append('date_received', distributeForm.date_received);
    if (distributeForm.amount) formData.append('amount', distributeForm.amount);
    if (distributeForm.evidence_photo) formData.append('evidence_photo', distributeForm.evidence_photo);

    try {
      await api.post(`/bansos-recipients/${distributeForm.recipient_id}/distribute`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Penyaluran berhasil dicatat');
      setDistributeForm({
        recipient_id: '',
        program_name: '',
        date_received: new Date().toISOString().split('T')[0],
        amount: '',
        evidence_photo: null
      });
      setEvidencePreview(null);
      setActiveTab('riwayat');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal mencatat penyaluran');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'LAYAK': return <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 w-fit"><CheckCircle size={14}/> Layak</span>;
      case 'TIDAK_LAYAK': return <span className="bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 w-fit"><XCircle size={14}/> Tidak Layak</span>;
      default: return <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 w-fit"><Clock size={14}/> Pending</span>;
    }
  };

  const getImageUrl = (path: string) => {
    if (!path) return '';
    return `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/storage/${path}`;
  };

  const TABS = [
    { id: 'dtks', label: 'Data DTKS', icon: Users },
    { id: 'penyaluran', label: 'Penyaluran', icon: Gift },
    { id: 'riwayat', label: 'Riwayat', icon: History }
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-emerald-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
         <div className="absolute right-0 top-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Gift size={120} className="text-emerald-600 dark:text-emerald-500" />
         </div>
         <div className="relative z-10">
           <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
              <Gift size={24} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Manajemen Bansos</h1>
            <DemoLabel />
          </div>
           <p className="text-slate-500 dark:text-slate-400 font-medium max-w-lg">
             Kelola data penerima bantuan sosial dan riwayat penyaluran secara transparan.
           </p>
         </div>
      </div>

      {/* --- TABS --- */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 scale-105'
                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700 shadow-sm'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden min-h-[500px]">
        <div className="p-8">
          {/* TAB 1: DATA DTKS */}
          {activeTab === 'dtks' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative w-full md:w-80 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
                  <input 
                    type="text" 
                    placeholder="Cari penerima bansos..." 
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                  />
                </div>
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="bg-emerald-600 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-emerald-700 flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20 hover:-translate-y-0.5 active:scale-95"
                >
                  <Plus size={20} /> Tambah Calon
                </button>
              </div>
              
              <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                  <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-xs border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-8 py-5">Nama Warga</th>
                      <th className="px-8 py-5">No KK</th>
                      <th className="px-8 py-5">Status</th>
                      <th className="px-8 py-5">Skor</th>
                      <th className="px-8 py-5">Keterangan</th>
                      <th className="px-8 py-5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {isLoading ? (
                       [...Array(5)].map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td colSpan={6} className="px-8 py-5">
                            <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded w-full"></div>
                          </td>
                        </tr>
                      ))
                    ) : recipients.length > 0 ? (
                      recipients.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                          <td className="px-8 py-5">
                            <div className="font-bold text-slate-800 dark:text-slate-200">{item.user?.name}</div>
                          </td>
                          <td className="px-8 py-5 font-mono text-slate-500 dark:text-slate-400">{item.no_kk || '-'}</td>
                          <td className="px-8 py-5">{getStatusBadge(item.status)}</td>
                          <td className="px-8 py-5 font-bold text-slate-700 dark:text-slate-300">{item.score}</td>
                          <td className="px-8 py-5 text-slate-500 dark:text-slate-400 italic max-w-xs truncate">{item.notes || '-'}</td>
                          <td className="px-8 py-5 text-right">
                            <button 
                              onClick={() => setEditingRecipient(item)}
                              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-bold text-xs border border-emerald-200 dark:border-emerald-800 px-4 py-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-all inline-flex items-center gap-2 shadow-sm"
                            >
                              <Filter size={14} /> Update Status
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-full mb-4 text-slate-300 dark:text-slate-600">
                              <Users size={48} />
                            </div>
                            <p className="font-medium text-slate-600 dark:text-slate-400">Belum ada data penerima bansos.</p>
                            <p className="text-sm">Silakan tambah calon penerima baru.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: PENYALURAN */}
          {activeTab === 'penyaluran' && (
            <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-3xl p-8 mb-8 flex items-start gap-4">
                 <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 rounded-2xl text-emerald-600 dark:text-emerald-400 shadow-sm">
                    <Gift size={28} />
                 </div>
                 <div>
                    <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-100">Form Penyaluran Bantuan</h3>
                    <p className="text-emerald-700 dark:text-emerald-300 mt-1 leading-relaxed">
                      Catat penyaluran bantuan kepada warga yang berhak. <br/>
                      <span className="font-bold">Catatan:</span> Hanya warga berstatus <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs font-bold"><CheckCircle size={10} /> LAYAK</span> yang dapat menerima bantuan.
                    </p>
                 </div>
              </div>
              
              <form onSubmit={handleDistribute} className="space-y-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 dark:shadow-none">
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Pilih Penerima</label>
                    <div className="relative">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} />
                      <select 
                        required
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none font-medium text-slate-700 dark:text-white"
                        value={distributeForm.recipient_id}
                        onChange={(e) => setDistributeForm({...distributeForm, recipient_id: e.target.value})}
                      >
                        <option value="">-- Pilih Warga --</option>
                        {recipients.filter(r => r.status === 'LAYAK').map(r => (
                          <option key={r.id} value={r.id}>{r.user?.name} - KK: {r.no_kk || '-'}</option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <ChevronRight className="rotate-90 text-slate-400" size={16} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Nama Program Bantuan</label>
                    <div className="relative">
                        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                          type="text" 
                          required
                          placeholder="Contoh: Sembako Januari 2026"
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
                          value={distributeForm.program_name}
                          onChange={(e) => setDistributeForm({...distributeForm, program_name: e.target.value})}
                        />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Tanggal Terima</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                          type="date" 
                          required
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-600 dark:text-white"
                          value={distributeForm.date_received}
                          onChange={(e) => setDistributeForm({...distributeForm, date_received: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Nominal (Opsional)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">Rp</span>
                        <input 
                          type="number" 
                          placeholder="0"
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
                          value={distributeForm.amount}
                          onChange={(e) => setDistributeForm({...distributeForm, amount: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Bukti Foto (Opsional)</label>
                    <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl p-8 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-emerald-400 dark:hover:border-emerald-500 transition-all cursor-pointer relative group bg-slate-50/50 dark:bg-slate-800/30">
                      <input 
                        type="file" 
                        accept="image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setDistributeForm({...distributeForm, evidence_photo: file});
                            setEvidencePreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                      {evidencePreview ? (
                        <div className="relative w-full h-56">
                           <Image 
                              src={evidencePreview} 
                              alt="Preview" 
                              fill
                              className="object-contain rounded-2xl"
                           />
                           <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl backdrop-blur-sm">
                              <span className="text-white font-bold flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl backdrop-blur-md border border-white/30"><Upload size={20} /> Ganti Foto</span>
                           </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center text-slate-500 dark:text-slate-400 py-4">
                          <div className="p-5 bg-white dark:bg-slate-700 rounded-full mb-4 text-emerald-500 shadow-sm group-hover:scale-110 transition-transform duration-300">
                             <Upload className="w-10 h-10" />
                          </div>
                          <span className="font-bold text-slate-700 dark:text-slate-300 text-lg">Klik untuk upload bukti</span>
                          <span className="text-sm mt-1 text-slate-400">Format JPG, PNG (Maks. 5MB)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-0.5 active:scale-95 text-lg"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
                    Simpan Penyaluran
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: RIWAYAT */}
          {activeTab === 'riwayat' && (
            <div className="space-y-6">
               <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                    <History size={20} />
                  </div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white">Riwayat Penyaluran Terakhir</h2>
               </div>
               
              <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                  <thead className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-xs border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-8 py-5">Tanggal</th>
                      <th className="px-8 py-5">Penerima</th>
                      <th className="px-8 py-5">Program</th>
                      <th className="px-8 py-5">Nominal</th>
                      <th className="px-8 py-5">Bukti</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {isLoading ? (
                        [...Array(5)].map((_, i) => (
                          <tr key={i} className="animate-pulse">
                            <td colSpan={5} className="px-8 py-5">
                              <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded w-full"></div>
                            </td>
                          </tr>
                        ))
                    ) : histories.length > 0 ? (
                      histories.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-8 py-5">
                             <div className="flex items-center gap-2 font-medium">
                                <Calendar size={14} className="text-emerald-500" />
                                {new Date(item.date_received).toLocaleDateString('id-ID', {
                                  day: 'numeric', month: 'long', year: 'numeric'
                                })}
                             </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="font-bold text-slate-800 dark:text-slate-200">{item.recipient?.user?.name}</div>
                          </td>
                          <td className="px-8 py-5">
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700">
                              {item.program_name}
                            </span>
                          </td>
                          <td className="px-8 py-5 font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                            {item.amount ? `Rp ${parseInt(item.amount).toLocaleString('id-ID')}` : '-'}
                          </td>
                          <td className="px-8 py-5">
                            {item.evidence_photo ? (
                              <a 
                                href={getImageUrl(item.evidence_photo)} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-emerald-600 hover:text-emerald-700 hover:underline text-xs font-bold flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg w-fit transition-colors"
                              >
                                <ImageIcon size={14} /> Lihat Foto
                              </a>
                            ) : (
                              <span className="text-slate-400 text-xs italic">Tidak ada</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-8 py-20 text-center text-slate-400 dark:text-slate-500">
                          <div className="flex flex-col items-center justify-center w-full">
                            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-full mb-4 text-slate-300 dark:text-slate-600">
                               <History size={48} />
                            </div>
                            <p className="font-medium text-slate-600 dark:text-slate-400">Belum ada riwayat penyaluran.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: TAMBAH CALON */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Tambah Penerima</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Tambahkan data warga ke DTKS.</p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAddRecipient} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Pilih Warga</label>
                  <div className="relative">
                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    <select 
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none text-slate-900 dark:text-white"
                      required
                      value={newRecipient.user_id}
                      onChange={(e) => setNewRecipient({...newRecipient, user_id: e.target.value})}
                    >
                      <option value="">-- Pilih Warga --</option>
                      {wargaList.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <ChevronRight className="rotate-90 text-slate-400" size={16} />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">No KK</label>
                  <input 
                    type="text"
                    placeholder="Nomor Kartu Keluarga"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono text-slate-900 dark:text-white placeholder:text-slate-400"
                    value={newRecipient.no_kk}
                    onChange={(e) => setNewRecipient({...newRecipient, no_kk: e.target.value})}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Status Awal</label>
                  <div className="relative">
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all appearance-none text-slate-900 dark:text-white"
                      value={newRecipient.status}
                      onChange={(e) => setNewRecipient({...newRecipient, status: e.target.value})}
                    >
                      <option value="PENDING">PENDING - Menunggu Verifikasi</option>
                      <option value="LAYAK">LAYAK - Berhak Menerima</option>
                      <option value="TIDAK_LAYAK">TIDAK LAYAK - Ditolak</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <ChevronRight className="rotate-90 text-slate-400" size={16} />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Alasan / Keterangan</label>
                  <textarea 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all min-h-[100px] text-slate-900 dark:text-white placeholder:text-slate-400"
                    placeholder="Tambahkan catatan..."
                    value={newRecipient.notes}
                    onChange={(e) => setNewRecipient({...newRecipient, notes: e.target.value})}
                  ></textarea>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-6 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors active:scale-95"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-70 active:scale-95"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT STATUS */}
      {editingRecipient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
              <div>
                 <h3 className="text-xl font-bold text-slate-800 dark:text-white">Update Status</h3>
                 <p className="text-sm text-slate-500 dark:text-slate-400">Perbarui status kelayakan bansos.</p>
              </div>
              <button 
                onClick={() => setEditingRecipient(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-lg">
                    {editingRecipient.user?.name.charAt(0)}
                </div>
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nama Warga</p>
                    <p className="text-lg font-bold text-slate-800 dark:text-white">{editingRecipient.user?.name}</p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Pilih Status Baru</label>
                <div className="grid grid-cols-1 gap-3">
                  {['PENDING', 'LAYAK', 'TIDAK_LAYAK'].map(status => (
                    <button
                      key={status}
                      onClick={() => setEditingRecipient({...editingRecipient, status})}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between group ${
                        editingRecipient.status === status 
                          ? status === 'LAYAK' 
                             ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                             : status === 'TIDAK_LAYAK'
                                ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400'
                                : 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                          : 'border-slate-100 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                         {status === 'LAYAK' && <CheckCircle size={20} className={editingRecipient.status === status ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'} />}
                         {status === 'TIDAK_LAYAK' && <XCircle size={20} className={editingRecipient.status === status ? 'text-rose-500' : 'text-slate-300 dark:text-slate-600'} />}
                         {status === 'PENDING' && <Clock size={20} className={editingRecipient.status === status ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'} />}
                         <span className="font-bold">{status.replace('_', ' ')}</span>
                      </div>
                      {editingRecipient.status === status && (
                          <div className={`w-3 h-3 rounded-full ${
                              status === 'LAYAK' ? 'bg-emerald-500' : status === 'TIDAK_LAYAK' ? 'bg-rose-500' : 'bg-amber-500'
                          }`} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Skor Prioritas (1-10)</label>
                    <input 
                      type="number"
                      min="0"
                      max="10"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold text-center text-slate-900 dark:text-white"
                      value={editingRecipient.score || 0}
                      onChange={(e) => setEditingRecipient({...editingRecipient, score: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-1.5">
                     <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Keterangan</label>
                     <input 
                        type="text"
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 dark:text-white placeholder:text-slate-400"
                        placeholder="Catatan..."
                        value={editingRecipient.notes || ''}
                        onChange={(e) => setEditingRecipient({...editingRecipient, notes: e.target.value})}
                     />
                  </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setEditingRecipient(null)}
                  className="flex-1 px-6 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors active:scale-95"
                >
                  Batal
                </button>
                <button 
                  onClick={() => handleUpdateStatus(editingRecipient.id, {
                    status: editingRecipient.status,
                    notes: editingRecipient.notes,
                    score: editingRecipient.score
                  })}
                  className="flex-1 px-6 py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 active:scale-95"
                >
                  <Save size={20} />
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
