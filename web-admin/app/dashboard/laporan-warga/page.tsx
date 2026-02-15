'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  ChevronDown, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MoreHorizontal,
  Eye,
  AlertCircle,
  MessageSquare,
  MessageSquareWarning,
  Image as ImageIcon,
  MapPin,
  Calendar,
  User,
  Trash2,
  Loader2,
  X
} from 'lucide-react';
import Cookies from 'js-cookie';
import { Toaster, toast } from 'react-hot-toast';
import { useTenant } from '@/context/TenantContext';
import { DemoLabel } from '@/components/TenantStatusComponents';
import { format } from 'date-fns';

interface IssueReport {
  id: number;
  user_id: number;
  rt_id: number;
  title: string;
  description: string;
  category: 'KEBERSIHAN' | 'KEAMANAN' | 'INFRASTRUKTUR' | 'LAINNYA';
  photo_url: string | null;
  status: 'PENDING' | 'PROCESSED' | 'DONE' | 'REJECTED';
  created_at: string;
  user: {
    id: number;
    name: string;
    photo_url: string | null;
    phone: string;
  };
}

const TABS = [
  { label: 'Semua', value: '' },
  { label: 'Menunggu', value: 'PENDING' },
  { label: 'Diproses', value: 'PROCESSED' },
  { label: 'Selesai', value: 'DONE' },
  { label: 'Ditolak', value: 'REJECTED' },
];

export default function LaporanWargaPage() {
  const { isDemo, isExpired, status } = useTenant();
  const [reports, setReports] = useState<IssueReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('');
  
  // Modal State
  const [selectedReport, setSelectedReport] = useState<IssueReport | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<IssueReport | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!status) return;
    fetchReports();
  }, [status, activeTab]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const adminToken = Cookies.get('admin_token');
      if (isDemo || !adminToken) {
        const now = new Date();
        const isoNow = now.toISOString();
        const earlier = new Date(now);
        earlier.setDate(earlier.getDate() - 1);
        const isoEarlier = earlier.toISOString();
        const demoReports: IssueReport[] = [
          {
            id: 1,
            user_id: 1,
            rt_id: 1,
            title: 'Lampu Jalan Padam di Gang Buntu',
            description: 'Sudah 3 hari lampu jalan di dekat rumah padam sehingga gang menjadi gelap.',
            category: 'INFRASTRUKTUR',
            photo_url: null,
            status: 'PENDING',
            created_at: isoNow,
            user: {
              id: 1,
              name: 'Budi Santoso',
              photo_url: null,
              phone: '081234567801'
            }
          },
          {
            id: 2,
            user_id: 2,
            rt_id: 1,
            title: 'Sampah Menumpuk di Pojok Blok C',
            description: 'Ada tumpukan sampah yang belum diangkut di pojok Blok C sejak kemarin.',
            category: 'KEBERSIHAN',
            photo_url: null,
            status: 'PROCESSED',
            created_at: isoEarlier,
            user: {
              id: 2,
              name: 'Siti Aminah',
              photo_url: null,
              phone: '081234567802'
            }
          },
          {
            id: 3,
            user_id: 3,
            rt_id: 1,
            title: 'Tamu Tidak Lapor di Rumah Blok D-12',
            description: 'Sering ada tamu menginap tanpa laporan, mohon penertiban.',
            category: 'KEAMANAN',
            photo_url: null,
            status: 'DONE',
            created_at: isoEarlier,
            user: {
              id: 3,
              name: 'Andi Wijaya',
              photo_url: null,
              phone: '081234567803'
            }
          }
        ];
        const filtered = activeTab ? demoReports.filter((r) => r.status === activeTab) : demoReports;
        setReports(filtered);
        setLoading(false);
        return;
      }
      const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '') || '';
      let url = `${baseUrl}/api/admin/issues`;
      if (activeTab) {
        url += `?status=${activeTab}`;
      }

      const token = Cookies.get('token') || localStorage.getItem('token');

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        setReports(data.data);
      }
    } catch (error) {
      if (!isDemo) {
        console.error('Error fetching reports:', error);
        toast.error('Gagal memuat data laporan');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedReport) return;

    if (isDemo) {
        toast.error('Mode Demo: Update status laporan tidak diizinkan');
        return;
    }
    if (isExpired) {
        toast.error('Akses Terbatas: Silakan perpanjang langganan');
        return;
    }

    setUpdating(true);
    try {
      const token = Cookies.get('token') || localStorage.getItem('token');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '') || '';
      const response = await fetch(`${baseUrl}/api/issues/${selectedReport.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Status laporan berhasil diperbarui');
        setReports(reports.map(r => r.id === selectedReport.id ? { ...r, status: status as any } : r));
        setSelectedReport({ ...selectedReport, status: status as any });
        setIsModalOpen(false);
      } else {
        toast.error(data.message || 'Gagal memperbarui status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Terjadi kesalahan saat memperbarui status');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = (e: React.MouseEvent, report: IssueReport) => {
    e.stopPropagation();
    setReportToDelete(report);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!reportToDelete) return;

    if (isDemo) {
        toast.error('Mode Demo: Hapus laporan tidak diizinkan');
        return;
    }
    if (isExpired) {
        toast.error('Akses Terbatas: Silakan perpanjang langganan');
        return;
    }
    
    setIsDeleting(true);
    try {
      const token = Cookies.get('token') || localStorage.getItem('token');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, '') || '';
      const response = await fetch(`${baseUrl}/api/issues/${reportToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success || response.ok) {
        toast.success('Laporan berhasil dihapus');
        setReports(reports.filter(r => r.id !== reportToDelete.id));
        setIsDeleteModalOpen(false);
      } else {
        toast.error(data.message || 'Gagal menghapus laporan');
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Terjadi kesalahan saat menghapus laporan');
    } finally {
      setIsDeleting(false);
      setReportToDelete(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DONE':
        return <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm"><CheckCircle className="w-3.5 h-3.5" /> Selesai</span>;
      case 'PROCESSED':
        return <span className="px-3 py-1 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm"><Clock className="w-3.5 h-3.5" /> Diproses</span>;
      case 'REJECTED':
        return <span className="px-3 py-1 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm"><XCircle className="w-3.5 h-3.5" /> Ditolak</span>;
      default:
        return <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm"><AlertCircle className="w-3.5 h-3.5" /> Menunggu</span>;
    }
  };

  const getCategoryBadge = (category: string) => {
    return <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] uppercase tracking-wider rounded-lg font-bold">{category}</span>;
  };

  const getImageUrl = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') || '';
    return `${baseUrl}/storage/${path}`;
  };

  return (
    <div className="space-y-8 pb-12 font-sans">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
        <div className="absolute right-0 top-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
          <MessageSquareWarning size={120} className="text-emerald-600 dark:text-emerald-500" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400 shadow-sm">
              <MessageSquareWarning size={24} />
            </div>
            <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">Laporan Warga</h1>
            <DemoLabel />
          </div>
            <DemoLabel />
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium max-w-lg">
            Pantau dan tindak lanjuti laporan serta aduan dari warga lingkungan Anda secara real-time.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(tab.value)}
            className={`px-5 py-3 text-sm font-bold rounded-xl transition-all duration-200 border ${
              activeTab === tab.value
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20 translate-y-[-1px]'
                : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800 hover:text-emerald-600 dark:hover:text-emerald-400 hover:shadow-sm'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
              <div className="h-48 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse"></div>
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full w-3/4 animate-pulse"></div>
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full w-1/2 animate-pulse"></div>
              <div className="flex justify-between pt-4">
                <div className="h-10 w-10 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse"></div>
                <div className="h-8 w-24 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800">
          <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <FileText className="w-10 h-10 text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Belum ada laporan</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto font-medium">
            Tidak ada laporan yang sesuai dengan filter saat ini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <div 
              key={report.id} 
              className="group bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-xl hover:-translate-y-1 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all duration-300 cursor-pointer flex flex-col h-full relative"
              onClick={() => {
                setSelectedReport(report);
                setIsModalOpen(true);
              }}
            >
              {/* Card Image Area */}
              <div className="h-56 w-full bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                 {report.photo_url ? (
                   <img 
                      src={getImageUrl(report.photo_url) || ''} 
                      alt={report.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                   />
                 ) : (
                   <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 bg-slate-50 dark:bg-slate-800">
                     <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                     <span className="text-xs font-bold uppercase tracking-wider">Tanpa Foto</span>
                   </div>
                 )}
                 
                 <div className="absolute top-4 right-4 z-10">
                   {getStatusBadge(report.status)}
                 </div>
                 <div className="absolute top-4 left-4 z-10">
                   {getCategoryBadge(report.category)}
                 </div>
                 
                 {/* Gradient Overlay */}
                 <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>
              </div>
              
              <div className="p-6 flex flex-col flex-1">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-2 line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{report.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2 mb-6 flex-1 leading-relaxed font-medium">{report.description}</p>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 mt-auto">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-sm border border-emerald-100 dark:border-emerald-800 shadow-sm">
                      {report.user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">{report.user.name}</p>
                      <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 text-xs font-medium">
                        <Calendar size={12} />
                        {new Date(report.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm">
                      <Eye size={18} />
                    </div>
                    <button 
                      onClick={(e) => handleDelete(e, report)}
                      className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-400 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition-all shadow-sm hover:shadow-rose-200 z-20"
                      title="Hapus Laporan"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {isModalOpen && selectedReport && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-200 border border-white/20 dark:border-slate-800">
            
            {/* Left Side: Image */}
            <div className="w-full md:w-1/2 bg-slate-900 flex items-center justify-center p-8 relative group">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
              {selectedReport.photo_url ? (
                <img 
                  src={getImageUrl(selectedReport.photo_url) || ''} 
                  alt={selectedReport.title}
                  className="max-w-full max-h-[60vh] object-contain shadow-2xl rounded-xl relative z-10"
                />
              ) : (
                <div className="text-slate-500 flex flex-col items-center relative z-10">
                  <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                     <ImageIcon className="w-10 h-10 text-slate-600" />
                  </div>
                  <p className="font-bold text-slate-400">Tidak ada foto lampiran</p>
                </div>
              )}
              <div className="absolute top-6 left-6 z-20">
                <span className="px-4 py-1.5 bg-black/50 text-white text-xs font-bold uppercase tracking-wider rounded-full backdrop-blur-md border border-white/10">
                   Lampiran Bukti
                </span>
              </div>
            </div>

            {/* Right Side: Details & Actions */}
            <div className="w-full md:w-1/2 flex flex-col bg-white dark:bg-slate-900">
              {/* Modal Header */}
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50/50 dark:bg-slate-800/50">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    {getCategoryBadge(selectedReport.category)}
                    {getStatusBadge(selectedReport.status)}
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white leading-tight">{selectedReport.title}</h2>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  <XCircle className="w-8 h-8" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                
                {/* User Info */}
                <div className="flex items-center gap-4 mb-8 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                   <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-700 border-2 border-emerald-100 dark:border-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-lg shadow-sm">
                      {selectedReport.user.name.charAt(0)}
                   </div>
                   <div>
                      <p className="font-bold text-slate-800 dark:text-white text-lg">{selectedReport.user.name}</p>
                      <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                        <span className="flex items-center gap-1.5"><MapPin size={14} className="text-slate-400" /> Warga RT 0{selectedReport.rt_id}</span>
                        <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></span>
                        <span className="flex items-center gap-1.5"><Clock size={14} className="text-slate-400" /> {new Date(selectedReport.created_at).toLocaleString('id-ID')}</span>
                      </div>
                   </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <FileText size={14} className="text-emerald-500" />
                    Deskripsi Masalah
                  </h4>
                  <div className="text-slate-600 dark:text-slate-300 text-base leading-relaxed whitespace-pre-wrap bg-white dark:bg-slate-900 p-2 font-medium">
                    {selectedReport.description}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Update Status Laporan</h4>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => handleUpdateStatus('PROCESSED')}
                    disabled={updating || selectedReport.status === 'PROCESSED'}
                    className={`px-4 py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                      selectedReport.status === 'PROCESSED'
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-400 cursor-not-allowed border border-blue-100 dark:border-blue-900/30'
                        : 'bg-white dark:bg-slate-800 border-2 border-blue-100 dark:border-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 shadow-sm hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-0.5 transition-all duration-300'
                    }`}
                  >
                    <Clock size={16} />
                    Proses
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('DONE')}
                    disabled={updating || selectedReport.status === 'DONE'}
                    className={`px-4 py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                      selectedReport.status === 'DONE'
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-400 cursor-not-allowed border border-emerald-100 dark:border-emerald-900/30'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200 dark:shadow-none shadow-lg hover:shadow-xl hover:-translate-y-0.5'
                    }`}
                  >
                    <CheckCircle size={16} />
                    Selesai
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('REJECTED')}
                    disabled={updating || selectedReport.status === 'REJECTED'}
                    className={`px-4 py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                      selectedReport.status === 'REJECTED'
                        ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-400 cursor-not-allowed border border-rose-100 dark:border-rose-900/30'
                        : 'bg-white dark:bg-slate-800 border-2 border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:border-rose-200 shadow-sm hover:shadow-lg hover:shadow-rose-500/10 hover:-translate-y-0.5 transition-all duration-300'
                    }`}
                  >
                    <XCircle size={16} />
                    Tolak
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- DELETE MODAL --- */}
      {isDeleteModalOpen && reportToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] max-w-md w-full p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-white/20 dark:border-slate-800">
            <div className="flex items-center justify-center w-20 h-20 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-3xl mx-auto mb-6 shadow-sm ring-8 ring-rose-50/50 dark:ring-rose-900/10">
              <Trash2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-extrabold text-center text-slate-800 dark:text-white mb-2">Hapus Laporan?</h3>
            <p className="text-center text-slate-500 dark:text-slate-400 mb-8 leading-relaxed font-medium">
              Apakah Anda yakin ingin menghapus laporan <span className="font-bold text-slate-800 dark:text-white">"{reportToDelete.title}"</span>? 
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
                className="flex-1 px-6 py-4 bg-rose-600 text-white font-bold rounded-2xl hover:bg-rose-700 shadow-xl shadow-rose-600/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:-translate-y-0.5"
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
