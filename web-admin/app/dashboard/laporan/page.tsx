'use client';

import { useState, useEffect } from 'react';
import axios from '@/lib/axios';
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  XCircle, 
  MoreVertical, 
  Search,
  Filter,
  AlertCircle,
  Loader2,
  Trash2,
  Eye,
  X,
  MessageSquare,
  ChevronDown
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useTenant } from '@/context/TenantContext';
import { DemoLabel } from '@/components/TenantStatusComponents';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import Image from 'next/image';

interface User {
  id: number;
  name: string;
  photo_url?: string;
}

interface Report {
  id: number;
  title: string;
  description: string;
  category: string;
  status: 'PENDING' | 'PROCESS' | 'RESOLVED' | 'REJECTED';
  photo_url?: string;
  created_at: string;
  user: User;
}

export default function LaporanWargaPage() {
  const { isDemo, isExpired } = useTenant();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterStatus !== 'ALL') {
        params.status = filterStatus;
      }
      
      const response = await axios.get('/reports', { params });
      const data = response.data.data.data || response.data.data;
      setReports(data);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Gagal memuat laporan warga');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [filterStatus]);

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    if (isDemo) {
        toast.error('Mode Demo: Update status laporan tidak diizinkan');
        return;
    }
    if (isExpired) {
        toast.error('Akses Terbatas: Silakan perpanjang langganan');
        return;
    }

    const loadingToast = toast.loading('Memperbarui status...');
    try {
      await axios.put(`/reports/${id}`, { status: newStatus });
      toast.success(`Status berhasil diperbarui`, { id: loadingToast });
      fetchReports();
      
      // Update local state if detail modal is open
      if (selectedReport?.id === id) {
        setSelectedReport(prev => prev ? { ...prev, status: newStatus as any } : null);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Gagal mengubah status', { id: loadingToast });
    }
  };

  const confirmDelete = (id: number) => {
    if (isDemo) {
        toast.error('Mode Demo: Hapus laporan tidak diizinkan');
        return;
    }
    if (isExpired) {
        toast.error('Akses Terbatas: Silakan perpanjang langganan');
        return;
    }

    setReportToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (isDemo) {
        toast.error('Mode Demo: Hapus laporan tidak diizinkan');
        return;
    }
    if (isExpired) {
        toast.error('Akses Terbatas: Silakan perpanjang langganan');
        return;
    }

    if (!reportToDelete) return;
    
    setIsDeleting(true);
    try {
      await axios.delete(`/reports/${reportToDelete}`);
      toast.success('Laporan berhasil dihapus');
      fetchReports();
      setIsDeleteModalOpen(false);
      if (selectedReport?.id === reportToDelete) {
        setIsDetailOpen(false);
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Gagal menghapus laporan');
    } finally {
      setIsDeleting(false);
      setReportToDelete(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
            <Clock className="w-3.5 h-3.5" /> Menunggu
          </span>
        );
      case 'PROCESS':
        return (
          <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Diproses
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
            <CheckCircle className="w-3.5 h-3.5" /> Selesai
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-100 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
            <XCircle className="w-3.5 h-3.5" /> Ditolak
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-xs font-bold">
            {status}
          </span>
        );
    }
  };

  const filteredReports = reports.filter(report => 
    report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    report.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-12 font-sans">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 dark:bg-emerald-900/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50 pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">Laporan Warga</h1>
            <DemoLabel />
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">Kelola aduan, keluhan, dan laporan dari warga secara real-time.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-5 group hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-300 hover:-translate-y-1">
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl group-hover:scale-110 transition-transform">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Laporan</p>
            <p className="text-3xl font-extrabold text-slate-800 dark:text-white mt-1">{reports.length}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-5 group hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-300 hover:-translate-y-1">
          <div className="p-4 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl group-hover:scale-110 transition-transform">
            <Clock className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Menunggu</p>
            <p className="text-3xl font-extrabold text-slate-800 dark:text-white mt-1">{reports.filter(r => r.status === 'PENDING').length}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-5 group hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-300 hover:-translate-y-1">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl group-hover:scale-110 transition-transform">
            <CheckCircle className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Selesai</p>
            <p className="text-3xl font-extrabold text-slate-800 dark:text-white mt-1">{reports.filter(r => r.status === 'RESOLVED').length}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-5 group hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-300 hover:-translate-y-1">
          <div className="p-4 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-2xl group-hover:scale-110 transition-transform">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Ditolak</p>
            <p className="text-3xl font-extrabold text-slate-800 dark:text-white mt-1">{reports.filter(r => r.status === 'REJECTED').length}</p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-6 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Cari laporan berdasarkan judul, nama, atau kategori..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-6 py-3.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-slate-700 placeholder:text-slate-400 bg-slate-50 focus:bg-white"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          {[
            { id: 'ALL', label: 'Semua' },
            { id: 'PENDING', label: 'Menunggu' },
            { id: 'PROCESS', label: 'Diproses' },
            { id: 'RESOLVED', label: 'Selesai' },
            { id: 'REJECTED', label: 'Ditolak' }
          ].map((status) => (
            <button
              key={status.id}
              onClick={() => setFilterStatus(status.id)}
              className={`px-5 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                filterStatus === status.id
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 translate-y-[-1px]'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-emerald-600 border border-slate-200/50'
              }`}
            >
              {status.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        {loading ? (
          <div className="p-20 text-center flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 animate-spin mb-4 text-emerald-500" />
            <p className="text-slate-500 font-medium">Memuat data laporan...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <FileText className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Belum ada laporan</h3>
            <p className="text-slate-500 mt-2 font-medium">Tidak ditemukan data laporan yang sesuai dengan filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-8 py-6 font-bold text-slate-600 uppercase tracking-wider text-xs">Tanggal</th>
                  <th className="px-6 py-6 font-bold text-slate-600 uppercase tracking-wider text-xs">Pelapor</th>
                  <th className="px-6 py-6 font-bold text-slate-600 uppercase tracking-wider text-xs">Kategori</th>
                  <th className="px-6 py-6 font-bold text-slate-600 uppercase tracking-wider text-xs">Judul</th>
                  <th className="px-6 py-6 font-bold text-slate-600 uppercase tracking-wider text-xs">Status</th>
                  <th className="px-8 py-6 font-bold text-slate-600 uppercase tracking-wider text-xs text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-8 py-5 text-slate-600">
                      <div className="font-bold text-slate-800">
                        {format(new Date(report.created_at), 'dd MMM yyyy', { locale: id })}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 font-medium bg-slate-100 px-2 py-0.5 rounded w-fit">
                        {format(new Date(report.created_at), 'HH:mm', { locale: id })} WIB
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden border-2 border-slate-100 shadow-sm">
                          {report.user.photo_url ? (
                             <img src={report.user.photo_url} alt={report.user.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-extrabold text-slate-400">{report.user.name.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{report.user.name}</p>
                          <p className="text-xs text-slate-500">Warga</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="inline-block px-3 py-1 bg-white text-slate-600 text-xs font-bold rounded-lg border border-slate-200 shadow-sm">
                        {report.category}
                      </span>
                    </td>
                    <td className="px-6 py-5 font-bold text-slate-700 max-w-xs truncate group-hover:text-emerald-600 transition-colors">
                      {report.title}
                    </td>
                    <td className="px-6 py-5">
                      {getStatusBadge(report.status)}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setSelectedReport(report);
                            setIsDetailOpen(true);
                          }}
                          className="p-2.5 bg-white border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 rounded-xl transition-all shadow-sm text-slate-500"
                          title="Lihat Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => confirmDelete(report.id)}
                          className="p-2.5 bg-white border border-slate-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 rounded-xl transition-all shadow-sm text-slate-500"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Detail Modal */}
      {isDetailOpen && selectedReport && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-white/20 dark:border-slate-800">
            <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-10">
              <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-3">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
                   <MessageSquare className="w-6 h-6" />
                </div>
                Detail Laporan
              </h2>
              <button 
                onClick={() => setIsDetailOpen(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 md:p-8 space-y-8">
              {/* Status Bar */}
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700">
                <div>
                   <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Status Saat Ini</span>
                   <div className="scale-100 origin-left">
                    {getStatusBadge(selectedReport.status)}
                   </div>
                </div>
                <div className="text-right">
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Tanggal Laporan</span>
                    <span className="text-sm font-bold text-slate-700 dark:text-white">{format(new Date(selectedReport.created_at), 'dd MMMM yyyy, HH:mm', { locale: id })}</span>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-6">
                <div>
                  <div className="flex items-start gap-4">
                     <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-snug mb-3">{selectedReport.title}</h3>
                        <span className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider">
                            <FileText className="w-3.5 h-3.5" />
                            {selectedReport.category}
                        </span>
                     </div>
                  </div>
                </div>

                <div className="prose prose-slate max-w-none bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
                    {selectedReport.description}
                  </p>
                </div>

                {selectedReport.photo_url && (
                  <div className="space-y-2">
                     <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Bukti Foto</p>
                     <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shadow-sm">
                        <img 
                        src={`${process.env.NEXT_PUBLIC_API_URL}/storage/${selectedReport.photo_url}`} 
                        alt="Bukti Laporan" 
                        className="w-full h-auto object-contain max-h-[500px]"
                        />
                     </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                <p className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    Tindakan Penyelesaian
                </p>
                <div className="flex flex-wrap gap-3">
                  {selectedReport.status !== 'PROCESS' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedReport.id, 'PROCESS')}
                      className="flex-1 min-w-[120px] px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:scale-95"
                    >
                      <Loader2 className="w-4 h-4" />
                      Proses
                    </button>
                  )}
                  {selectedReport.status !== 'RESOLVED' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedReport.id, 'RESOLVED')}
                      className="flex-1 min-w-[120px] px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:scale-95"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Selesai
                    </button>
                  )}
                  {selectedReport.status !== 'REJECTED' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedReport.id, 'REJECTED')}
                      className="flex-1 min-w-[120px] px-6 py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:scale-95"
                    >
                      <XCircle className="w-4 h-4" />
                      Tolak
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] max-w-sm w-full p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-white/20">
            <div className="flex items-center justify-center w-16 h-16 bg-rose-50 text-rose-600 rounded-full mx-auto mb-6 shadow-sm ring-8 ring-rose-50/50">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-extrabold text-center text-slate-800 mb-2">Hapus Laporan?</h3>
            <p className="text-center text-slate-500 mb-8 font-medium">
              Apakah Anda yakin ingin menghapus laporan ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                disabled={isDeleting}
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-6 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 shadow-lg shadow-rose-600/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:-translate-y-0.5"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  'Hapus'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
