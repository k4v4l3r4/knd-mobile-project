'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/axios';
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Filter, 
  User, 
  Calendar,
  X,
  Send,
  Download,
  Plus,
  Mail,
  Search,
  ChevronRight,
  AlertCircle,
  Loader2,
  Trash2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTenant } from '@/context/TenantContext';
import { DemoLabel } from '@/components/TenantStatusComponents';

// Interfaces
interface UserData {
  id: number;
  name: string;
  phone: string;
}

interface LetterType {
  id: number;
  name: string;
  code: string;
}

interface Letter {
  id: number;
  user_id: number;
  user: UserData;
  type: string;
  purpose: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  admin_note: string | null;
  file_url: string | null;
  letter_number: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_LABELS = {
  PENDING: 'Menunggu',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak'
};

const STATUS_STYLES = {
  PENDING: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  APPROVED: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  REJECTED: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
};

const TABS = [
  { label: 'Semua', value: '' },
  { label: 'Menunggu', value: 'PENDING' },
  { label: 'Disetujui', value: 'APPROVED' },
  { label: 'Ditolak', value: 'REJECTED' }
];

export default function SuratPage() {
  const { isDemo, isExpired } = useTenant();
  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('');

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [wargas, setWargas] = useState<UserData[]>([]);
  const [letterTypes, setLetterTypes] = useState<LetterType[]>([]);
  const [createForm, setCreateForm] = useState({
    user_id: '',
    type: '',
    purpose: ''
  });
  const [creating, setCreating] = useState(false);

  // Detail Modal State
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [processing, setProcessing] = useState(false);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [letterToDelete, setLetterToDelete] = useState<Letter | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchLetters();
    fetchWargas();
    fetchLetterTypes();
  }, [activeTab]);

  const fetchWargas = async () => {
    try {
      const response = await api.get('/warga'); 
      if (response.data.success) {
        setWargas(response.data.data.data || response.data.data); 
      }
    } catch (error) {
      console.error('Error fetching wargas:', error);
      toast.error('Gagal memuat data warga');
    }
  };

  const fetchLetterTypes = async () => {
    try {
      const response = await api.get('/letter-types');
      if (response.data.success) {
        const types = response.data.data;
        setLetterTypes(types);
        // Set default type if available and not set
        if (types.length > 0 && !createForm.type) {
          setCreateForm(prev => ({ ...prev, type: types[0].code }));
        }
      }
    } catch (error) {
      console.error('Error fetching letter types:', error);
      toast.error('Gagal memuat jenis surat');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemo) {
        toast.error('Mode Demo: Pembuatan surat tidak diizinkan');
        return;
    }
    if (isExpired) {
        toast.error('Akses Terbatas: Silakan perpanjang langganan');
        return;
    }

    if (!createForm.user_id || !createForm.purpose) {
      toast.error('Mohon lengkapi data surat');
      return;
    }

    setCreating(true);
    try {
      const response = await api.post('/letters', createForm);
      if (response.data.success) {
        setIsCreateModalOpen(false);
        setCreateForm({
          user_id: '',
          type: letterTypes.length > 0 ? letterTypes[0].code : '',
          purpose: ''
        });
        fetchLetters();
        toast.success('Surat berhasil dibuat');
      }
    } catch (error) {
      console.error('Error creating letter:', error);
      toast.error('Gagal membuat surat');
    } finally {
      setCreating(false);
    }
  };

  const fetchLetters = async () => {
    setLoading(true);
    try {
      const params = activeTab ? { status: activeTab } : {};
      const response = await api.get('/letters', { params });
      if (response.data.success) {
        setLetters(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching letters:', error);
      toast.error('Gagal mengambil data surat');
    } finally {
      setLoading(false);
    }
  };

  const openDetail = (letter: Letter) => {
    setSelectedLetter(letter);
    setAdminNote(letter.admin_note || '');
    setIsModalOpen(true);
  };

  const handleProcess = async (status: 'APPROVED' | 'REJECTED') => {
    if (isDemo) {
        toast.error('Mode Demo: Proses surat tidak diizinkan');
        return;
    }
    if (isExpired) {
        toast.error('Akses Terbatas: Silakan perpanjang langganan');
        return;
    }

    if (!selectedLetter) return;

    if (status === 'REJECTED' && !adminNote.trim()) {
      toast.error('Mohon isi catatan alasan penolakan');
      return;
    }

    setProcessing(true);
    try {
      const response = await api.put(`/letters/${selectedLetter.id}`, {
        status,
        admin_note: adminNote
      });

      if (response.data.success) {
        setIsModalOpen(false);
        fetchLetters(); 
        toast.success(`Surat berhasil ${status === 'APPROVED' ? 'disetujui' : 'ditolak'}`);
      }
    } catch (error) {
      console.error('Error processing letter:', error);
      toast.error('Gagal memproses surat');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = (letter: Letter) => {
    setLetterToDelete(letter);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (isDemo) {
        toast.error('Mode Demo: Hapus surat tidak diizinkan');
        return;
    }
    if (isExpired) {
        toast.error('Akses Terbatas: Silakan perpanjang langganan');
        return;
    }

    if (!letterToDelete) return;
    
    setIsDeleting(true);
    try {
      await api.delete(`/letters/${letterToDelete.id}`);
      toast.success('Surat berhasil dihapus');
      fetchLetters();
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error('Error deleting letter:', error);
      toast.error('Gagal menghapus surat');
    } finally {
      setIsDeleting(false);
      setLetterToDelete(null);
    }
  };

  const formatType = (type: string) => {
    return type.replace(/_/g, ' ');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileUrl = (path: string) => {
    if (path.startsWith('http')) return path;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';
    return `${baseUrl}${path}`;
  };

  return (
    <div className="space-y-8 pb-10">
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-emerald-100 dark:border-emerald-900/20 shadow-sm relative overflow-hidden group">
         <div className="absolute right-0 top-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Mail size={120} className="text-emerald-600 dark:text-emerald-500" />
         </div>
         <div className="relative z-10">
           <div className="flex items-center gap-3 mb-2">
             <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
               <Mail size={24} />
             </div>
             <h1 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Layanan Surat</h1>
             <DemoLabel />
           </div>
           <p className="text-slate-500 dark:text-slate-400 font-medium max-w-lg">
             Kelola pengajuan surat pengantar, verifikasi permohonan, dan arsip surat warga.
           </p>
         </div>
         
         <div className="relative z-10 flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-semibold hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all hover:-translate-y-0.5 active:scale-95 whitespace-nowrap"
            >
                <Plus size={20} strokeWidth={2.5} />
                <span>Buat Surat</span>
            </button>
         </div>
      </div>

      {/* --- FILTER TABS --- */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === tab.value
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 scale-105'
                : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-800 shadow-sm'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* --- DATA TABLE --- */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
           <div className="p-20 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                <Loader2 className="w-16 h-16 text-emerald-500 animate-spin mb-4" />
                <p className="font-medium">Memuat data surat...</p>
           </div>
        ) : letters.length === 0 ? (
           <div className="p-20 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-full mb-4">
                    <FileText size={48} className="text-slate-300 dark:text-slate-600" />
                </div>
                <p className="font-medium text-slate-600 dark:text-slate-300">Belum ada data surat</p>
                <p className="text-sm">Silakan buat surat baru atau tunggu pengajuan dari warga.</p>
           </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50/50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pemohon</th>
                  <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Jenis Surat</th>
                  <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Keperluan</th>
                  <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tanggal</th>
                  <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-8 py-5 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {letters.map((letter) => (
                  <tr key={letter.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-sm shadow-sm border border-emerald-200/50 dark:border-emerald-800/50">
                          {letter.user.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 dark:text-white text-sm">{letter.user.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <User size={10} />
                            {letter.user.phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {formatType(letter.type)}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm text-slate-600 dark:text-slate-300 max-w-xs truncate font-medium">
                        {letter.purpose}
                      </p>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-lg w-fit">
                        <Calendar size={12} />
                        {formatDate(letter.created_at)}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${STATUS_STYLES[letter.status]}`}>
                        {letter.status === 'PENDING' && <Clock size={12} />}
                        {letter.status === 'APPROVED' && <CheckCircle size={12} />}
                        {letter.status === 'REJECTED' && <XCircle size={12} />}
                        {STATUS_LABELS[letter.status]}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                            onClick={() => openDetail(letter)}
                            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                                letter.status === 'PENDING' 
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200'
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                            }`}
                        >
                            {letter.status === 'PENDING' ? 'Proses' : 'Detail'}
                            <ChevronRight size={14} />
                        </button>
                        <button
                            onClick={() => handleDelete(letter)}
                            className="p-2 text-rose-600 dark:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-colors border border-transparent hover:border-rose-100 dark:hover:border-rose-900/30 shadow-sm opacity-0 group-hover:opacity-100"
                            title="Hapus"
                        >
                            <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- CREATE MODAL --- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 border border-transparent dark:border-slate-800">
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Buat Surat Baru</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Buat pengajuan surat untuk warga.</p>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Pemohon</label>
                    <div className="relative">
                        <select
                            required
                            className="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all appearance-none text-slate-800 dark:text-white"
                            value={createForm.user_id}
                            onChange={(e) => setCreateForm({...createForm, user_id: e.target.value})}
                        >
                            <option value="">Pilih Warga</option>
                            {wargas.map((warga) => (
                                <option key={warga.id} value={warga.id}>
                                {warga.name} - {warga.phone}
                                </option>
                            ))}
                        </select>
                        <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Jenis Surat</label>
                    <div className="relative">
                        <select
                            required
                            className="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all appearance-none text-slate-800 dark:text-white"
                            value={createForm.type}
                            onChange={(e) => setCreateForm({...createForm, type: e.target.value})}
                        >
                            <option value="" disabled>Pilih Jenis Surat</option>
                            {letterTypes.map((type) => (
                                <option key={type.id} value={type.code}>
                                    {type.name}
                                </option>
                            ))}
                        </select>
                        <FileText className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Keperluan</label>
                    <textarea
                        required
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-slate-800 dark:text-white placeholder-slate-400"
                        rows={3}
                        placeholder="Jelaskan keperluan surat..."
                        value={createForm.purpose}
                        onChange={(e) => setCreateForm({...createForm, purpose: e.target.value})}
                    />
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 px-6 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-6 py-3.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <Clock className="w-5 h-5 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Buat Surat</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DETAIL MODAL --- */}
      {isModalOpen && selectedLetter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 border border-transparent dark:border-slate-800">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                  {selectedLetter.status === 'PENDING' ? 'Proses Pengajuan' : 'Detail Surat'}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${STATUS_STYLES[selectedLetter.status]}`}>
                        {STATUS_LABELS[selectedLetter.status]}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(selectedLetter.created_at)}</span>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pemohon</label>
                  <div className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                        {selectedLetter.user.name.charAt(0)}
                    </div>
                    <div>
                        <p>{selectedLetter.user.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">{selectedLetter.user.phone}</p>
                    </div>
                  </div>
                </div>
                
                {selectedLetter.letter_number && (
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nomor Surat</label>
                        <div className="font-mono font-medium text-slate-800 dark:text-white text-sm bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 h-full flex items-center">
                            {selectedLetter.letter_number}
                        </div>
                    </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Jenis Surat</label>
                <div className="font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center gap-2">
                    <FileText size={18} className="text-emerald-500" />
                    {formatType(selectedLetter.type)}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Keperluan</label>
                <div className="text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 text-sm leading-relaxed">
                  {selectedLetter.purpose}
                </div>
              </div>

              {/* Admin Note Section */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle size={14} />
                  Catatan Admin {selectedLetter.status !== 'PENDING' && '(Read Only)'}
                </label>
                <textarea
                  className="w-full px-4 py-3 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 dark:text-white disabled:bg-slate-50 dark:disabled:bg-slate-900 disabled:text-slate-500 dark:disabled:text-slate-400"
                  rows={3}
                  placeholder="Tambahkan catatan untuk warga (opsional jika disetujui, wajib jika ditolak)..."
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  disabled={selectedLetter.status !== 'PENDING' || processing}
                />
              </div>
            </div>

            {/* Modal Footer (Action Buttons) */}
            <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all"
                disabled={processing}
              >
                Tutup
              </button>
              
              {selectedLetter.status === 'APPROVED' && selectedLetter.file_url && (
                <a
                  href={getFileUrl(selectedLetter.file_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </a>
              )}

              {selectedLetter.status === 'PENDING' && (
                <>
                  <button
                    onClick={() => handleProcess('REJECTED')}
                    className="px-6 py-3 text-sm font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-800 rounded-xl transition-all flex items-center justify-center gap-2"
                    disabled={processing}
                  >
                    {processing ? '...' : (
                      <>
                        <XCircle className="w-4 h-4" />
                        Tolak
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleProcess('APPROVED')}
                    className="px-6 py-3 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                    disabled={processing}
                  >
                    {processing ? 'Memproses...' : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Setujui
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- DELETE MODAL --- */}
      {isDeleteModalOpen && letterToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] max-w-md w-full p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-white/20 dark:border-slate-800">
            <div className="flex items-center justify-center w-20 h-20 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-3xl mx-auto mb-6">
              <Trash2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-center text-slate-800 dark:text-white mb-2">Hapus Surat?</h3>
            <p className="text-center text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
              Apakah Anda yakin ingin menghapus surat dari <span className="font-bold text-slate-800 dark:text-white">"{letterToDelete.user.name}"</span>? 
              <br/>Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                disabled={isDeleting}
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 px-6 py-4 bg-rose-600 text-white font-bold rounded-2xl hover:bg-rose-700 shadow-xl shadow-rose-600/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  'Ya, Hapus'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
